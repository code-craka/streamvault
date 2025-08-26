import { z } from 'zod'
import { db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { createHash, randomBytes } from 'crypto'

// API Client schema
export const APIClientSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  apiKey: z.string(),
  secretHash: z.string(),
  permissions: z.array(z.string()),
  rateLimit: z.object({
    requestsPerMinute: z.number().min(1).max(10000),
    requestsPerHour: z.number().min(1).max(100000),
    requestsPerDay: z.number().min(1).max(1000000),
  }),
  isActive: z.boolean().default(true),
  instanceId: z.string().optional(),
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
})

export const APIPermissions = {
  // Stream permissions
  'stream:read': 'Read stream information',
  'stream:create': 'Create new streams',
  'stream:update': 'Update stream settings',
  'stream:delete': 'Delete streams',
  'stream:start': 'Start streams',
  'stream:stop': 'Stop streams',

  // VOD permissions
  'vod:read': 'Read VOD information',
  'vod:create': 'Create VODs',
  'vod:update': 'Update VOD metadata',
  'vod:delete': 'Delete VODs',

  // Chat permissions
  'chat:read': 'Read chat messages',
  'chat:send': 'Send chat messages',
  'chat:moderate': 'Moderate chat messages',

  // Analytics permissions
  'analytics:read': 'Read analytics data',
  'analytics:export': 'Export analytics data',

  // User permissions
  'user:read': 'Read user information',
  'user:update': 'Update user information',

  // Admin permissions
  'admin:all': 'Full administrative access',
} as const

export type APIClient = z.infer<typeof APIClientSchema>
export type APIPermission = keyof typeof APIPermissions

export class APIAuthService {
  private readonly COLLECTION = 'api_clients'
  private readonly RATE_LIMIT_COLLECTION = 'api_rate_limits'

  /**
   * Create a new API client
   */
  async createAPIClient(
    name: string,
    permissions: APIPermission[],
    rateLimit: APIClient['rateLimit'],
    instanceId?: string
  ): Promise<{ client: APIClient; apiKey: string; secret: string }> {
    const id = this.generateId()
    const apiKey = this.generateAPIKey()
    const secret = this.generateSecret()
    const secretHash = this.hashSecret(secret)

    const client: Omit<APIClient, 'createdAt'> = {
      id,
      name,
      apiKey,
      secretHash,
      permissions,
      rateLimit,
      isActive: true,
      instanceId,
    }

    const clientRef = doc(db, this.COLLECTION, id)
    await setDoc(clientRef, {
      ...client,
      createdAt: new Date(),
    })

    return {
      client: { ...client, createdAt: new Date() },
      apiKey,
      secret,
    }
  }

  /**
   * Validate API key and return client information
   */
  async validateAPIKey(apiKey: string): Promise<APIClient | null> {
    const clientsRef = collection(db, this.COLLECTION)
    const q = query(
      clientsRef,
      where('apiKey', '==', apiKey),
      where('isActive', '==', true)
    )
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    const doc = querySnapshot.docs[0]
    const data = doc.data()

    // Update last used timestamp
    await updateDoc(doc.ref, {
      lastUsedAt: new Date(),
    })

    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      lastUsedAt: new Date(),
    } as APIClient
  }

  /**
   * Check if client has specific permission
   */
  hasPermission(client: APIClient, permission: APIPermission): boolean {
    return (
      client.permissions.includes(permission) ||
      client.permissions.includes('admin:all')
    )
  }

  /**
   * Apply rate limiting for API client
   */
  async checkRateLimit(
    clientId: string,
    rateLimit: APIClient['rateLimit']
  ): Promise<{
    allowed: boolean
    remaining: number
    resetTime: Date
  }> {
    const now = new Date()
    const rateLimitRef = doc(db, this.RATE_LIMIT_COLLECTION, clientId)
    const rateLimitDoc = await getDoc(rateLimitRef)

    let rateLimitData = {
      requestsThisMinute: 0,
      requestsThisHour: 0,
      requestsThisDay: 0,
      lastMinute: now.getMinutes(),
      lastHour: now.getHours(),
      lastDay: now.getDate(),
      lastRequest: now,
    }

    if (rateLimitDoc.exists()) {
      const data = rateLimitDoc.data()
      rateLimitData = {
        ...rateLimitData,
        ...data,
        lastRequest: data.lastRequest.toDate(),
      }
    }

    // Reset counters if time periods have changed
    const currentMinute = now.getMinutes()
    const currentHour = now.getHours()
    const currentDay = now.getDate()

    if (currentMinute !== rateLimitData.lastMinute) {
      rateLimitData.requestsThisMinute = 0
      rateLimitData.lastMinute = currentMinute
    }

    if (currentHour !== rateLimitData.lastHour) {
      rateLimitData.requestsThisHour = 0
      rateLimitData.lastHour = currentHour
    }

    if (currentDay !== rateLimitData.lastDay) {
      rateLimitData.requestsThisDay = 0
      rateLimitData.lastDay = currentDay
    }

    // Check rate limits
    const minuteExceeded =
      rateLimitData.requestsThisMinute >= rateLimit.requestsPerMinute
    const hourExceeded =
      rateLimitData.requestsThisHour >= rateLimit.requestsPerHour
    const dayExceeded =
      rateLimitData.requestsThisDay >= rateLimit.requestsPerDay

    if (minuteExceeded || hourExceeded || dayExceeded) {
      return {
        allowed: false,
        remaining: Math.min(
          rateLimit.requestsPerMinute - rateLimitData.requestsThisMinute,
          rateLimit.requestsPerHour - rateLimitData.requestsThisHour,
          rateLimit.requestsPerDay - rateLimitData.requestsThisDay
        ),
        resetTime: new Date(now.getTime() + 60000), // Next minute
      }
    }

    // Increment counters
    rateLimitData.requestsThisMinute++
    rateLimitData.requestsThisHour++
    rateLimitData.requestsThisDay++
    rateLimitData.lastRequest = now

    // Update rate limit data
    await setDoc(rateLimitRef, rateLimitData)

    return {
      allowed: true,
      remaining: Math.min(
        rateLimit.requestsPerMinute - rateLimitData.requestsThisMinute,
        rateLimit.requestsPerHour - rateLimitData.requestsThisHour,
        rateLimit.requestsPerDay - rateLimitData.requestsThisDay
      ),
      resetTime: new Date(now.getTime() + 60000),
    }
  }

  /**
   * Revoke API client access
   */
  async revokeAPIClient(clientId: string): Promise<void> {
    const clientRef = doc(db, this.COLLECTION, clientId)
    await updateDoc(clientRef, {
      isActive: false,
      revokedAt: new Date(),
    })
  }

  /**
   * Generate unique API key
   */
  private generateAPIKey(): string {
    const prefix = 'sk_live_'
    const randomPart = randomBytes(32).toString('hex')
    return prefix + randomPart
  }

  /**
   * Generate API secret
   */
  private generateSecret(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Hash API secret for storage
   */
  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex')
  }

  /**
   * Generate unique client ID
   */
  private generateId(): string {
    return 'client_' + randomBytes(16).toString('hex')
  }

  /**
   * Get all API clients for an instance
   */
  async getInstanceClients(instanceId: string): Promise<APIClient[]> {
    const clientsRef = collection(db, this.COLLECTION)
    const q = query(clientsRef, where('instanceId', '==', instanceId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        lastUsedAt: data.lastUsedAt?.toDate(),
      } as APIClient
    })
  }
}

// Export singleton instance
export const apiAuthService = new APIAuthService()
