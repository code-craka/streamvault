import {
  SignedURLService,
  VideoAccessError,
} from '@/lib/storage/sign-url-service'

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
}))

jest.mock('@/lib/storage/gcs-client', () => ({
  bucket: {
    file: jest.fn(),
  },
}))

jest.mock('@/lib/firebase/firestore', () => ({
  db: {},
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}))

import { clerkClient } from '@clerk/nextjs/server'
import { bucket } from '@/lib/storage/gcs-client'

describe('SignedURLService', () => {
  let signedURLService: SignedURLService
  let mockClerkUser: any
  let mockGCSFile: any

  beforeEach(() => {
    signedURLService = new SignedURLService()

    // Mock Clerk user
    mockClerkUser = {
      id: 'user_123',
      publicMetadata: {
        subscriptionTier: 'premium',
        subscriptionStatus: 'active',
      },
    }

    // Mock GCS file
    mockGCSFile = {
      exists: jest.fn().mockResolvedValue([true]),
      getSignedUrl: jest
        .fn()
        .mockResolvedValue(['https://signed-url.example.com']),
    }

    // Setup mocks
    ;(clerkClient.users.getUser as jest.Mock).mockResolvedValue(mockClerkUser)
    ;(bucket.file as jest.Mock).mockReturnValue(mockGCSFile)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateSignedURL', () => {
    it('should generate signed URL for valid user with sufficient subscription', async () => {
      // Mock Firestore operations
      const mockAddDoc = await import('firebase/firestore')
      ;(mockAddDoc.addDoc as jest.Mock).mockResolvedValue({ id: 'session_123' })

      const request = {
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'basic' as const,
      }

      const result = await signedURLService.generateSignedURL(request)

      expect(result).toHaveProperty('signedUrl')
      expect(result).toHaveProperty('expiresAt')
      expect(result).toHaveProperty('sessionId')
      expect(result).toHaveProperty('refreshToken')
      expect(result.signedUrl).toBe('https://signed-url.example.com')
    })

    it('should throw error for inactive subscription', async () => {
      mockClerkUser.publicMetadata.subscriptionStatus = 'canceled'

      const request = {
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'basic' as const,
      }

      await expect(signedURLService.generateSignedURL(request)).rejects.toThrow(
        VideoAccessError
      )
    })

    it('should throw error for insufficient subscription tier', async () => {
      mockClerkUser.publicMetadata.subscriptionTier = 'basic'

      const request = {
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'pro' as const,
      }

      await expect(signedURLService.generateSignedURL(request)).rejects.toThrow(
        VideoAccessError
      )
    })

    it('should throw error for non-existent video', async () => {
      mockGCSFile.exists.mockResolvedValue([false])

      const request = {
        videoId: 'nonexistent_video',
        userId: 'user_123',
        requiredTier: 'basic' as const,
      }

      await expect(signedURLService.generateSignedURL(request)).rejects.toThrow(
        VideoAccessError
      )
    })

    it('should validate input parameters', async () => {
      const invalidRequest = {
        videoId: '',
        userId: 'user_123',
        requiredTier: 'basic' as const,
      }

      await expect(
        signedURLService.generateSignedURL(invalidRequest)
      ).rejects.toThrow()
    })
  })

  describe('refreshSignedURL', () => {
    it('should refresh signed URL with valid session and token', async () => {
      // Mock session retrieval
      const mockSession = {
        id: 'session_123',
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'basic' as const,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastRefreshedAt: new Date(),
        accessCount: 1,
        expired: false,
      }

      // Mock Firestore query
      const mockGetDocs = await import('firebase/firestore')
      ;(mockGetDocs.getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'session_123',
            data: () => ({
              ...mockSession,
              startedAt: { toDate: () => mockSession.startedAt },
              expiresAt: { toDate: () => mockSession.expiresAt },
              lastRefreshedAt: { toDate: () => mockSession.lastRefreshedAt },
            }),
            ref: {
              update: jest.fn(),
            },
          },
        ],
      })

      const refreshToken = Buffer.from(
        JSON.stringify({
          sessionId: 'session_123',
          userId: 'user_123',
          timestamp: Date.now(),
        })
      ).toString('base64')

      const result = await signedURLService.refreshSignedURL(
        'session_123',
        'user_123',
        refreshToken
      )

      expect(result).toHaveProperty('signedUrl')
      expect(result).toHaveProperty('expiresAt')
      expect(result).toHaveProperty('sessionId')
      expect(result).toHaveProperty('refreshToken')
    })

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid_token'

      await expect(
        signedURLService.refreshSignedURL(
          'session_123',
          'user_123',
          invalidToken
        )
      ).rejects.toThrow(VideoAccessError)
    })

    it('should throw error for expired session', async () => {
      // Mock expired session
      const mockGetDocs = await import('firebase/firestore')
      ;(mockGetDocs.getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [
          {
            id: 'session_123',
            data: () => ({
              videoId: 'video_123',
              userId: 'user_123',
              requiredTier: 'basic',
              startedAt: {
                toDate: () => new Date(Date.now() - 25 * 60 * 60 * 1000),
              },
              expiresAt: {
                toDate: () => new Date(Date.now() - 1 * 60 * 60 * 1000),
              },
              lastRefreshedAt: {
                toDate: () => new Date(Date.now() - 1 * 60 * 60 * 1000),
              },
              accessCount: 1,
              expired: true,
            }),
          },
        ],
      })

      const refreshToken = Buffer.from(
        JSON.stringify({
          sessionId: 'session_123',
          userId: 'user_123',
          timestamp: Date.now(),
        })
      ).toString('base64')

      await expect(
        signedURLService.refreshSignedURL(
          'session_123',
          'user_123',
          refreshToken
        )
      ).rejects.toThrow(VideoAccessError)
    })
  })

  describe('getVideoAccessAnalytics', () => {
    it('should return analytics for video', async () => {
      // Mock Firestore query for analytics
      const mockGetDocs = await import('firebase/firestore')
      ;(mockGetDocs.getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: 'log_1',
            data: () => ({
              videoId: 'video_123',
              userId: 'user_1',
              userTier: 'premium',
              accessedAt: { toDate: () => new Date() },
              success: true,
            }),
          },
          {
            id: 'log_2',
            data: () => ({
              videoId: 'video_123',
              userId: 'user_2',
              userTier: 'basic',
              accessedAt: { toDate: () => new Date() },
              success: true,
            }),
          },
        ],
      })

      const analytics =
        await signedURLService.getVideoAccessAnalytics('video_123')

      expect(analytics).toHaveProperty('videoId', 'video_123')
      expect(analytics).toHaveProperty('totalAccesses', 2)
      expect(analytics).toHaveProperty('uniqueUsers', 2)
      expect(analytics).toHaveProperty('accessesByTier')
      expect(analytics.accessesByTier).toHaveProperty('premium', 1)
      expect(analytics.accessesByTier).toHaveProperty('basic', 1)
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      // Mock Firestore query for expired sessions
      const mockGetDocs = await import('firebase/firestore')
      const mockUpdate = jest.fn()

      ;(mockGetDocs.getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: 'expired_session_1',
            ref: { update: mockUpdate },
          },
          {
            id: 'expired_session_2',
            ref: { update: mockUpdate },
          },
        ],
      })

      const cleanedCount = await signedURLService.cleanupExpiredSessions()

      expect(cleanedCount).toBe(2)
      expect(mockUpdate).toHaveBeenCalledTimes(2)
      expect(mockUpdate).toHaveBeenCalledWith({ expired: true })
    })
  })

  describe('revokeAccess', () => {
    it('should revoke access for user', async () => {
      // Mock Firestore query for user sessions
      const mockGetDocs = await import('firebase/firestore')
      const mockUpdate = jest.fn()

      ;(mockGetDocs.getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: 'session_1',
            ref: { update: mockUpdate },
          },
        ],
      })

      await signedURLService.revokeAccess('user_123')

      expect(mockUpdate).toHaveBeenCalledWith({ expired: true })
    })

    it('should revoke access for specific user and video', async () => {
      // Mock Firestore query for specific user/video sessions
      const mockGetDocs = await import('firebase/firestore')
      const mockUpdate = jest.fn()

      ;(mockGetDocs.getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            id: 'session_1',
            ref: { update: mockUpdate },
          },
        ],
      })

      await signedURLService.revokeAccess('user_123', 'video_123')

      expect(mockUpdate).toHaveBeenCalledWith({ expired: true })
    })
  })

  describe('subscription tier validation', () => {
    it('should allow basic tier access with basic subscription', async () => {
      mockClerkUser.publicMetadata.subscriptionTier = 'basic'

      const mockAddDoc = await import('firebase/firestore')
      ;(mockAddDoc.addDoc as jest.Mock).mockResolvedValue({ id: 'session_123' })

      const request = {
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'basic' as const,
      }

      const result = await signedURLService.generateSignedURL(request)
      expect(result).toHaveProperty('signedUrl')
    })

    it('should allow premium tier access with pro subscription', async () => {
      mockClerkUser.publicMetadata.subscriptionTier = 'pro'

      const mockAddDoc = await import('firebase/firestore')
      ;(mockAddDoc.addDoc as jest.Mock).mockResolvedValue({ id: 'session_123' })

      const request = {
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'premium' as const,
      }

      const result = await signedURLService.generateSignedURL(request)
      expect(result).toHaveProperty('signedUrl')
    })

    it('should deny pro tier access with basic subscription', async () => {
      mockClerkUser.publicMetadata.subscriptionTier = 'basic'

      const request = {
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'pro' as const,
      }

      await expect(signedURLService.generateSignedURL(request)).rejects.toThrow(
        VideoAccessError
      )
    })
  })
})
