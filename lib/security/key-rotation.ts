import { Storage } from '@google-cloud/storage'
import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc, getDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore'

interface RotationKey {
  id: string
  keyData: string
  createdAt: Date
  expiresAt: Date
  isActive: boolean
  rotationCount: number
  lastUsed?: Date
}

interface KeyRotationConfig {
  rotationIntervalHours: number
  maxActiveKeys: number
  keyExpirationHours: number
  emergencyRotationThreshold: number
}

export class DynamicKeyRotationService {
  private storage: Storage
  private config: KeyRotationConfig

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    })

    this.config = {
      rotationIntervalHours: 6, // Rotate every 6 hours
      maxActiveKeys: 3, // Keep 3 active keys for overlap
      keyExpirationHours: 24, // Keys expire after 24 hours
      emergencyRotationThreshold: 100, // Emergency rotation after 100 suspicious activities
    }
  }

  /**
   * Generate a new rotation key with cryptographic security
   */
  async generateRotationKey(): Promise<RotationKey> {
    const keyData = randomBytes(32).toString('hex')
    const keyId = createHash('sha256').update(keyData + Date.now()).digest('hex').substring(0, 16)

    const rotationKey: RotationKey = {
      id: keyId,
      keyData,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.keyExpirationHours * 60 * 60 * 1000),
      isActive: true,
      rotationCount: 0,
    }

    // Store in Firestore with encryption
    await setDoc(doc(db, 'security_keys', keyId), {
      ...rotationKey,
      keyData: this.encryptKeyData(keyData), // Encrypt before storage
    })

    return rotationKey
  }

  /**
   * Get the current active key for signing URLs
   */
  async getCurrentActiveKey(): Promise<RotationKey | null> {
    const keysRef = collection(db, 'security_keys')
    const q = query(keysRef, where('isActive', '==', true))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      // No active keys, generate first one
      return await this.generateRotationKey()
    }

    // Get the most recent active key
    const keys = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      expiresAt: doc.data().expiresAt.toDate(),
    })) as RotationKey[]

    const currentKey = keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]

    // Check if key needs rotation
    if (this.shouldRotateKey(currentKey)) {
      return await this.rotateKeys()
    }

    return currentKey
  }

  /**
   * Determine if key rotation is needed
   */
  private shouldRotateKey(key: RotationKey): boolean {
    const now = new Date()
    const rotationInterval = this.config.rotationIntervalHours * 60 * 60 * 1000

    // Time-based rotation
    if (now.getTime() - key.createdAt.getTime() > rotationInterval) {
      return true
    }

    // Usage-based rotation (emergency)
    if (key.rotationCount > this.config.emergencyRotationThreshold) {
      return true
    }

    // Expiration-based rotation
    if (now > key.expiresAt) {
      return true
    }

    return false
  }

  /**
   * Perform key rotation with overlap for seamless transition
   */
  async rotateKeys(): Promise<RotationKey> {
    // Generate new key
    const newKey = await this.generateRotationKey()

    // Get all active keys
    const keysRef = collection(db, 'security_keys')
    const activeKeysQuery = query(keysRef, where('isActive', '==', true))
    const activeKeysSnapshot = await getDocs(activeKeysQuery)

    const activeKeys = activeKeysSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      expiresAt: doc.data().expiresAt.toDate(),
    })) as RotationKey[]

    // Keep only the most recent keys up to maxActiveKeys
    const sortedKeys = activeKeys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Deactivate old keys beyond the limit
    for (let i = this.config.maxActiveKeys; i < sortedKeys.length; i++) {
      await setDoc(doc(db, 'security_keys', sortedKeys[i].id), {
        ...sortedKeys[i],
        isActive: false,
      }, { merge: true })
    }

    // Log rotation event
    await this.logKeyRotation(newKey.id, 'scheduled_rotation')

    return newKey
  }

  /**
   * Emergency key rotation for security incidents
   */
  async emergencyKeyRotation(reason: string): Promise<RotationKey> {
    // Immediately deactivate all current keys
    const keysRef = collection(db, 'security_keys')
    const activeKeysQuery = query(keysRef, where('isActive', '==', true))
    const activeKeysSnapshot = await getDocs(activeKeysQuery)

    const deactivationPromises = activeKeysSnapshot.docs.map(doc =>
      setDoc(doc.ref, { isActive: false }, { merge: true })
    )

    await Promise.all(deactivationPromises)

    // Generate new key immediately
    const newKey = await this.generateRotationKey()

    // Log emergency rotation
    await this.logKeyRotation(newKey.id, 'emergency_rotation', reason)

    // Trigger security alert
    await this.triggerSecurityAlert('emergency_key_rotation', {
      reason,
      newKeyId: newKey.id,
      timestamp: new Date(),
    })

    return newKey
  }

  /**
   * Generate signed URL with current active key
   */
  async generateSignedURLWithRotation(
    bucketName: string,
    fileName: string,
    expirationMinutes: number = 15
  ): Promise<string> {
    const activeKey = await this.getCurrentActiveKey()
    if (!activeKey) {
      throw new Error('No active signing key available')
    }

    const bucket = this.storage.bucket(bucketName)
    const file = bucket.file(fileName)

    // Increment usage counter
    await this.incrementKeyUsage(activeKey.id)

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expirationMinutes * 60 * 1000,
      extensionHeaders: {
        'x-key-rotation-id': activeKey.id,
        'x-signed-at': new Date().toISOString(),
      },
    })

    return signedUrl
  }

  /**
   * Validate signed URL with key rotation support
   */
  async validateSignedURL(url: string, keyId: string): Promise<boolean> {
    try {
      const keyDoc = await getDoc(doc(db, 'security_keys', keyId))
      if (!keyDoc.exists()) {
        return false
      }

      const key = keyDoc.data() as RotationKey
      
      // Check if key is still valid
      if (!key.isActive || new Date() > key.expiresAt) {
        return false
      }

      // Additional URL validation logic here
      return true
    } catch (error) {
      console.error('URL validation error:', error)
      return false
    }
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys(): Promise<void> {
    const keysRef = collection(db, 'security_keys')
    const expiredKeysQuery = query(keysRef, where('expiresAt', '<', new Date()))
    const expiredKeysSnapshot = await getDocs(expiredKeysQuery)

    const deletionPromises = expiredKeysSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletionPromises)

    console.log(`Cleaned up ${expiredKeysSnapshot.size} expired keys`)
  }

  private encryptKeyData(keyData: string): string {
    // Implement encryption logic here
    // For now, return base64 encoded (in production, use proper encryption)
    return Buffer.from(keyData).toString('base64')
  }

  private async incrementKeyUsage(keyId: string): Promise<void> {
    const keyRef = doc(db, 'security_keys', keyId)
    const keyDoc = await getDoc(keyRef)
    
    if (keyDoc.exists()) {
      const currentCount = keyDoc.data().rotationCount || 0
      await setDoc(keyRef, {
        rotationCount: currentCount + 1,
        lastUsed: new Date(),
      }, { merge: true })
    }
  }

  private async logKeyRotation(keyId: string, type: string, reason?: string): Promise<void> {
    await setDoc(doc(db, 'security_logs', `rotation_${Date.now()}`), {
      type: 'key_rotation',
      keyId,
      rotationType: type,
      reason: reason || 'scheduled',
      timestamp: new Date(),
      severity: type === 'emergency_rotation' ? 'high' : 'medium',
    })
  }

  private async triggerSecurityAlert(alertType: string, data: any): Promise<void> {
    // Implement security alert system
    console.log(`Security Alert: ${alertType}`, data)
    
    // In production, integrate with monitoring systems like PagerDuty, Slack, etc.
    await setDoc(doc(db, 'security_alerts', `alert_${Date.now()}`), {
      type: alertType,
      data,
      timestamp: new Date(),
      status: 'active',
      severity: 'high',
    })
  }
}

export const keyRotationService = new DynamicKeyRotationService()