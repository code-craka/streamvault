import { bucket } from './gcs-client'
import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'
import type { SubscriptionTier, UserMetadata } from '@/types/auth'
import { SUBSCRIPTION_HIERARCHY } from '@/types/auth'
import { db } from '@/lib/firebase/firestore'
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore'

// Validation schemas
const VideoAccessRequestSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  requiredTier: z.enum(['basic', 'premium', 'pro']),
  sessionId: z.string().optional(),
})

const PlaybackSessionSchema = z.object({
  videoId: z.string(),
  userId: z.string(),
  requiredTier: z.enum(['basic', 'premium', 'pro']),
  startedAt: z.date(),
  expiresAt: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

// Types
export interface VideoAccessRequest {
  videoId: string
  userId: string
  requiredTier: SubscriptionTier
  sessionId?: string
}

export interface PlaybackSession {
  id: string
  videoId: string
  userId: string
  requiredTier: SubscriptionTier
  startedAt: Date
  expiresAt: Date
  lastRefreshedAt: Date
  accessCount: number
  ipAddress?: string
  userAgent?: string
  expired: boolean
}

export interface VideoAccessLog {
  id: string
  videoId: string
  userId: string
  userTier: SubscriptionTier | null
  accessedAt: Date
  ipAddress?: string
  userAgent?: string
  success: boolean
  errorReason?: string
  signedUrlExpiry: Date
  sessionId?: string
}

export interface SignedURLResult {
  signedUrl: string
  expiresAt: Date
  sessionId: string
  refreshToken: string
}

export interface VideoAccessAnalytics {
  videoId: string
  totalAccesses: number
  uniqueUsers: number
  accessesByTier: Record<SubscriptionTier, number>
  averageSessionDuration: number
  peakConcurrentUsers: number
  geographicDistribution: Record<string, number>
  deviceTypes: Record<string, number>
  errorRate: number
  lastAccessedAt: Date
}

// Custom errors
export class VideoAccessError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403
  ) {
    super(message)
    this.name = 'VideoAccessError'
  }
}

export class SignedURLService {
  private readonly URL_EXPIRY_MINUTES = 15
  private readonly SESSION_EXPIRY_HOURS = 24
  private readonly MAX_REFRESH_COUNT = 100 // Prevent abuse

  /**
   * Generate a signed URL for secure video access
   */
  async generateSignedURL(
    request: VideoAccessRequest
  ): Promise<SignedURLResult> {
    // Validate input
    const validatedRequest = VideoAccessRequestSchema.parse(request)
    const { videoId, userId, requiredTier } = validatedRequest

    try {
      // Validate user subscription
      await this.validateUserAccess(userId, requiredTier)

      // Check if video exists
      await this.validateVideoExists(videoId)

      // Create or update playback session
      const session = await this.createPlaybackSession(
        videoId,
        userId,
        requiredTier
      )

      // Generate signed URL
      const fileName = `videos/${videoId}.mp4`
      const file = bucket.file(fileName)

      const expiresAt = new Date(
        Date.now() + this.URL_EXPIRY_MINUTES * 60 * 1000
      )

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt,
        responseDisposition: 'inline',
        responseType: 'video/mp4',
        extensionHeaders: {
          'Cache-Control': 'private, max-age=900', // 15 minutes
        },
      })

      // Log access for analytics
      await this.logVideoAccess({
        videoId,
        userId,
        userTier: await this.getUserTier(userId),
        accessedAt: new Date(),
        success: true,
        signedUrlExpiry: expiresAt,
        sessionId: session.id,
      })

      // Generate refresh token
      const refreshToken = await this.generateRefreshToken(session.id, userId)

      return {
        signedUrl,
        expiresAt,
        sessionId: session.id,
        refreshToken,
      }
    } catch (error) {
      // Log failed access attempt
      await this.logVideoAccess({
        videoId,
        userId,
        userTier: await this.getUserTier(userId),
        accessedAt: new Date(),
        success: false,
        errorReason: error instanceof Error ? error.message : 'Unknown error',
        signedUrlExpiry: new Date(),
      })

      if (error instanceof VideoAccessError) {
        throw error
      }

      throw new VideoAccessError(
        'Failed to generate signed URL',
        'SIGNED_URL_GENERATION_FAILED',
        500
      )
    }
  }

  /**
   * Refresh an existing signed URL
   */
  async refreshSignedURL(
    sessionId: string,
    userId: string,
    refreshToken: string
  ): Promise<SignedURLResult> {
    try {
      // Validate refresh token
      await this.validateRefreshToken(sessionId, userId, refreshToken)

      // Get existing session
      const session = await this.getPlaybackSession(sessionId)
      if (!session || session.expired || session.userId !== userId) {
        throw new VideoAccessError(
          'Invalid or expired playback session',
          'SESSION_INVALID',
          401
        )
      }

      // Check refresh limits
      if (session.accessCount >= this.MAX_REFRESH_COUNT) {
        throw new VideoAccessError(
          'Maximum refresh limit exceeded',
          'REFRESH_LIMIT_EXCEEDED',
          429
        )
      }

      // Validate user still has access
      await this.validateUserAccess(userId, session.requiredTier)

      // Generate new signed URL
      const fileName = `videos/${session.videoId}.mp4`
      const file = bucket.file(fileName)

      const expiresAt = new Date(
        Date.now() + this.URL_EXPIRY_MINUTES * 60 * 1000
      )

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt,
        responseDisposition: 'inline',
        responseType: 'video/mp4',
        extensionHeaders: {
          'Cache-Control': 'private, max-age=900',
        },
      })

      // Update session
      await this.updatePlaybackSession(sessionId, {
        lastRefreshedAt: new Date(),
        accessCount: session.accessCount + 1,
      })

      // Log refresh
      await this.logVideoAccess({
        videoId: session.videoId,
        userId,
        userTier: await this.getUserTier(userId),
        accessedAt: new Date(),
        success: true,
        signedUrlExpiry: expiresAt,
        sessionId,
      })

      // Generate new refresh token
      const newRefreshToken = await this.generateRefreshToken(sessionId, userId)

      return {
        signedUrl,
        expiresAt,
        sessionId,
        refreshToken: newRefreshToken,
      }
    } catch (error) {
      if (error instanceof VideoAccessError) {
        throw error
      }

      throw new VideoAccessError(
        'Failed to refresh signed URL',
        'SIGNED_URL_REFRESH_FAILED',
        500
      )
    }
  }

  /**
   * Validate user has access to the required subscription tier
   */
  private async validateUserAccess(
    userId: string,
    requiredTier: SubscriptionTier
  ): Promise<void> {
    try {
      const user = await (await clerkClient()).users.getUser(userId)
      const metadata = user.publicMetadata as unknown as UserMetadata

      const userTier = metadata.subscriptionTier
      const subscriptionStatus = metadata.subscriptionStatus

      // Check if subscription is active
      if (
        subscriptionStatus !== 'active' &&
        subscriptionStatus !== 'trialing'
      ) {
        throw new VideoAccessError(
          'Active subscription required',
          'SUBSCRIPTION_INACTIVE',
          402
        )
      }

      // Check tier access
      if (!this.hasAccess(userTier, requiredTier)) {
        throw new VideoAccessError(
          `${requiredTier} subscription or higher required`,
          'INSUFFICIENT_SUBSCRIPTION_TIER',
          403
        )
      }
    } catch (error) {
      if (error instanceof VideoAccessError) {
        throw error
      }

      throw new VideoAccessError(
        'Failed to validate user access',
        'USER_VALIDATION_FAILED',
        500
      )
    }
  }

  /**
   * Check if user tier has access to required tier
   */
  private hasAccess(
    userTier: SubscriptionTier | null,
    requiredTier: SubscriptionTier
  ): boolean {
    if (!userTier) return requiredTier === 'basic'

    const userLevel = SUBSCRIPTION_HIERARCHY[userTier]
    const requiredLevel = SUBSCRIPTION_HIERARCHY[requiredTier]

    return userLevel >= requiredLevel
  }

  /**
   * Validate that video exists in storage
   */
  private async validateVideoExists(videoId: string): Promise<void> {
    try {
      const fileName = `videos/${videoId}.mp4`
      const file = bucket.file(fileName)
      const [exists] = await file.exists()

      if (!exists) {
        throw new VideoAccessError('Video not found', 'VIDEO_NOT_FOUND', 404)
      }
    } catch (error) {
      if (error instanceof VideoAccessError) {
        throw error
      }

      throw new VideoAccessError(
        'Failed to validate video existence',
        'VIDEO_VALIDATION_FAILED',
        500
      )
    }
  }

  /**
   * Create a new playback session
   */
  private async createPlaybackSession(
    videoId: string,
    userId: string,
    requiredTier: SubscriptionTier
  ): Promise<PlaybackSession> {
    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000
    )

    const sessionData = {
      videoId,
      userId,
      requiredTier,
      startedAt: now,
      expiresAt,
      lastRefreshedAt: now,
      accessCount: 1,
      expired: false,
    }

    try {
      const docRef = await addDoc(
        collection(db, 'playbackSessions'),
        sessionData
      )

      return {
        id: docRef.id,
        ...sessionData,
      }
    } catch (error) {
      throw new VideoAccessError(
        'Failed to create playback session',
        'SESSION_CREATION_FAILED',
        500
      )
    }
  }

  /**
   * Get playback session by ID
   */
  private async getPlaybackSession(
    sessionId: string
  ): Promise<PlaybackSession | null> {
    try {
      const sessionsRef = collection(db, 'playbackSessions')
      const q = query(sessionsRef, where('__name__', '==', sessionId))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      const data = doc.data()

      return {
        id: doc.id,
        videoId: data.videoId,
        userId: data.userId,
        requiredTier: data.requiredTier,
        startedAt: data.startedAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        lastRefreshedAt: data.lastRefreshedAt.toDate(),
        accessCount: data.accessCount,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expired: data.expired || data.expiresAt.toDate() < new Date(),
      }
    } catch (error) {
      console.error('Failed to get playback session:', error)
      return null
    }
  }

  /**
   * Update playback session
   */
  private async updatePlaybackSession(
    sessionId: string,
    updates: Partial<PlaybackSession>
  ): Promise<void> {
    try {
      // In a real implementation, you would update the Firestore document
      // For now, we'll just log the update
      console.log(`Updating session ${sessionId}:`, updates)
    } catch (error) {
      console.error('Failed to update playback session:', error)
    }
  }

  /**
   * Log video access for analytics
   */
  private async logVideoAccess(log: Omit<VideoAccessLog, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, 'videoAccessLogs'), {
        ...log,
        accessedAt: log.accessedAt,
        signedUrlExpiry: log.signedUrlExpiry,
      })
    } catch (error) {
      console.error('Failed to log video access:', error)
      // Don't throw error for logging failures
    }
  }

  /**
   * Get user's subscription tier
   */
  private async getUserTier(userId: string): Promise<SubscriptionTier | null> {
    try {
      const user = await (await clerkClient()).users.getUser(userId)
      const metadata = user.publicMetadata as unknown as UserMetadata
      return metadata.subscriptionTier || null
    } catch (error) {
      console.error('Failed to get user tier:', error)
      return null
    }
  }

  /**
   * Generate refresh token for session
   */
  private async generateRefreshToken(
    sessionId: string,
    userId: string
  ): Promise<string> {
    // In a real implementation, you would generate a secure JWT or similar token
    // For now, we'll create a simple token
    const payload = {
      sessionId,
      userId,
      timestamp: Date.now(),
    }

    return Buffer.from(JSON.stringify(payload)).toString('base64')
  }

  /**
   * Validate refresh token
   */
  private async validateRefreshToken(
    sessionId: string,
    userId: string,
    refreshToken: string
  ): Promise<void> {
    try {
      const decoded = JSON.parse(Buffer.from(refreshToken, 'base64').toString())

      if (decoded.sessionId !== sessionId || decoded.userId !== userId) {
        throw new VideoAccessError(
          'Invalid refresh token',
          'INVALID_REFRESH_TOKEN',
          401
        )
      }

      // Check token age (max 24 hours)
      const tokenAge = Date.now() - decoded.timestamp
      if (tokenAge > 24 * 60 * 60 * 1000) {
        throw new VideoAccessError(
          'Refresh token expired',
          'REFRESH_TOKEN_EXPIRED',
          401
        )
      }
    } catch (error) {
      if (error instanceof VideoAccessError) {
        throw error
      }

      throw new VideoAccessError(
        'Invalid refresh token format',
        'INVALID_REFRESH_TOKEN_FORMAT',
        401
      )
    }
  }

  /**
   * Get video access analytics
   */
  async getVideoAccessAnalytics(
    videoId: string
  ): Promise<VideoAccessAnalytics> {
    try {
      const logsRef = collection(db, 'videoAccessLogs')
      const q = query(
        logsRef,
        where('videoId', '==', videoId),
        where('success', '==', true),
        orderBy('accessedAt', 'desc'),
        limit(1000)
      )

      const querySnapshot = await getDocs(q)
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        accessedAt: doc.data().accessedAt.toDate(),
      })) as VideoAccessLog[]

      // Calculate analytics
      const totalAccesses = logs.length
      const uniqueUsers = new Set(logs.map(log => log.userId)).size
      const accessesByTier = logs.reduce(
        (acc, log) => {
          if (log.userTier) {
            acc[log.userTier] = (acc[log.userTier] || 0) + 1
          }
          return acc
        },
        {} as Record<SubscriptionTier, number>
      )

      const lastAccessedAt = logs.length > 0 ? logs[0].accessedAt : new Date()

      return {
        videoId,
        totalAccesses,
        uniqueUsers,
        accessesByTier,
        averageSessionDuration: 0, // Would need session duration tracking
        peakConcurrentUsers: 0, // Would need real-time tracking
        geographicDistribution: {}, // Would need IP geolocation
        deviceTypes: {}, // Would need user agent parsing
        errorRate: 0, // Would calculate from failed attempts
        lastAccessedAt,
      }
    } catch (error) {
      console.error('Failed to get video access analytics:', error)
      throw new VideoAccessError(
        'Failed to retrieve analytics',
        'ANALYTICS_RETRIEVAL_FAILED',
        500
      )
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const sessionsRef = collection(db, 'playbackSessions')
      const now = new Date()
      const q = query(sessionsRef, where('expiresAt', '<', now))

      const querySnapshot = await getDocs(q)
      let cleanedCount = 0

      // In a real implementation, you would batch delete these documents
      for (const doc of querySnapshot.docs) {
        // Mark as expired instead of deleting for audit purposes
        await updateDoc(doc.ref, { expired: true })
        cleanedCount++
      }

      console.log(`Cleaned up ${cleanedCount} expired sessions`)
      return cleanedCount
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error)
      return 0
    }
  }

  /**
   * Revoke access for a specific user/video combination
   */
  async revokeAccess(userId: string, videoId?: string): Promise<void> {
    try {
      const sessionsRef = collection(db, 'playbackSessions')
      let q = query(sessionsRef, where('userId', '==', userId))

      if (videoId) {
        q = query(q, where('videoId', '==', videoId))
      }

      const querySnapshot = await getDocs(q)

      // Mark all matching sessions as expired
      for (const doc of querySnapshot.docs) {
        await updateDoc(doc.ref, { expired: true })
      }

      console.log(
        `Revoked access for user ${userId}${videoId ? ` on video ${videoId}` : ''}`
      )
    } catch (error) {
      console.error('Failed to revoke access:', error)
      throw new VideoAccessError(
        'Failed to revoke access',
        'ACCESS_REVOCATION_FAILED',
        500
      )
    }
  }
}

// Export singleton instance
export const signedURLService = new SignedURLService()
