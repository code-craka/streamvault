import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as generateSignedURL, GET as getSignedURL } from '@/app/api/videos/[videoId]/signed-url/route'
import { POST as refreshSignedURL } from '@/app/api/videos/[videoId]/refresh-url/route'
import { GET as getAnalytics } from '@/app/api/videos/[videoId]/analytics/route'
import { POST as cleanupSessions } from '@/app/api/videos/sessions/cleanup/route'

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: {
    users: {
      getUser: vi.fn(),
    },
  },
}))

vi.mock('@/lib/storage/signed-url-service', () => ({
  signedURLService: {
    generateSignedURL: vi.fn(),
    refreshSignedURL: vi.fn(),
    getVideoAccessAnalytics: vi.fn(),
    cleanupExpiredSessions: vi.fn(),
  },
  VideoAccessError: class VideoAccessError extends Error {
    constructor(message: string, public code: string, public statusCode: number = 403) {
      super(message)
      this.name = 'VideoAccessError'
    }
  },
}))

vi.mock('@/lib/auth/permissions', () => ({
  checkUserRole: vi.fn(),
}))

describe('Signed URL API Routes', () => {
  const mockAuth = vi.mocked(await import('@clerk/nextjs/server')).auth
  const mockClerkClient = vi.mocked(await import('@clerk/nextjs/server')).clerkClient
  const mockSignedURLService = vi.mocked(await import('@/lib/storage/signed-url-service')).signedURLService
  const mockCheckUserRole = vi.mocked(await import('@/lib/auth/permissions')).checkUserRole

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Default auth mock
    mockAuth.mockReturnValue({ userId: 'user_123' })

    // Default user mock
    mockClerkClient.users.getUser.mockResolvedValue({
      id: 'user_123',
      publicMetadata: {
        role: 'streamer',
        subscriptionTier: 'premium',
        subscriptionStatus: 'active',
      },
    } as any)

    // Default permission mock
    mockCheckUserRole.mockReturnValue(true)
  })

  describe('POST /api/videos/[videoId]/signed-url', () => {
    it('should generate signed URL for authenticated user', async () => {
      const mockResult = {
        signedUrl: 'https://signed-url.example.com',
        expiresAt: new Date(),
        sessionId: 'session_123',
        refreshToken: 'refresh_token_123',
      }

      mockSignedURLService.generateSignedURL.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/videos/video_123/signed-url', {
        method: 'POST',
        body: JSON.stringify({ requiredTier: 'basic' }),
        headers: { 'content-type': 'application/json' },
      })

      const response = await generateSignedURL(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('signedUrl')
      expect(data.data).toHaveProperty('expiresAt')
      expect(data.data).toHaveProperty('sessionId')
      expect(data.data).toHaveProperty('refreshToken')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockAuth.mockReturnValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/videos/video_123/signed-url', {
        method: 'POST',
        body: JSON.stringify({ requiredTier: 'basic' }),
        headers: { 'content-type': 'application/json' },
      })

      const response = await generateSignedURL(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 400 for missing video ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/videos//signed-url', {
        method: 'POST',
        body: JSON.stringify({ requiredTier: 'basic' }),
        headers: { 'content-type': 'application/json' },
      })

      const response = await generateSignedURL(request, { params: { videoId: '' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Video ID is required')
    })

    it('should handle VideoAccessError', async () => {
      const { VideoAccessError } = await import('@/lib/storage/signed-url-service')
      mockSignedURLService.generateSignedURL.mockRejectedValue(
        new VideoAccessError('Insufficient subscription tier', 'INSUFFICIENT_SUBSCRIPTION_TIER', 403)
      )

      const request = new NextRequest('http://localhost:3000/api/videos/video_123/signed-url', {
        method: 'POST',
        body: JSON.stringify({ requiredTier: 'pro' }),
        headers: { 'content-type': 'application/json' },
      })

      const response = await generateSignedURL(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient subscription tier')
      expect(data.code).toBe('INSUFFICIENT_SUBSCRIPTION_TIER')
    })
  })

  describe('GET /api/videos/[videoId]/signed-url', () => {
    it('should generate signed URL with query parameters', async () => {
      const mockResult = {
        signedUrl: 'https://signed-url.example.com',
        expiresAt: new Date(),
        sessionId: 'session_123',
        refreshToken: 'refresh_token_123',
      }

      mockSignedURLService.generateSignedURL.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/videos/video_123/signed-url?tier=premium', {
        method: 'GET',
      })

      const response = await getSignedURL(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSignedURLService.generateSignedURL).toHaveBeenCalledWith({
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'premium',
      })
    })

    it('should default to basic tier when no tier specified', async () => {
      const mockResult = {
        signedUrl: 'https://signed-url.example.com',
        expiresAt: new Date(),
        sessionId: 'session_123',
        refreshToken: 'refresh_token_123',
      }

      mockSignedURLService.generateSignedURL.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/videos/video_123/signed-url', {
        method: 'GET',
      })

      const response = await getSignedURL(request, { params: { videoId: 'video_123' } })

      expect(mockSignedURLService.generateSignedURL).toHaveBeenCalledWith({
        videoId: 'video_123',
        userId: 'user_123',
        requiredTier: 'basic',
      })
    })

    it('should return 400 for invalid tier parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/videos/video_123/signed-url?tier=invalid', {
        method: 'GET',
      })

      const response = await getSignedURL(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid subscription tier')
    })
  })

  describe('POST /api/videos/[videoId]/refresh-url', () => {
    it('should refresh signed URL with valid session and token', async () => {
      const mockResult = {
        signedUrl: 'https://new-signed-url.example.com',
        expiresAt: new Date(),
        sessionId: 'session_123',
        refreshToken: 'new_refresh_token_123',
      }

      mockSignedURLService.refreshSignedURL.mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/videos/video_123/refresh-url', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'session_123',
          refreshToken: 'refresh_token_123',
        }),
        headers: { 'content-type': 'application/json' },
      })

      const response = await refreshSignedURL(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('signedUrl')
      expect(mockSignedURLService.refreshSignedURL).toHaveBeenCalledWith(
        'session_123',
        'user_123',
        'refresh_token_123'
      )
    })

    it('should return 400 for missing session ID or refresh token', async () => {
      const request = new NextRequest('http://localhost:3000/api/videos/video_123/refresh-url', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session_123' }), // Missing refreshToken
        headers: { 'content-type': 'application/json' },
      })

      const response = await refreshSignedURL(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request parameters')
    })
  })

  describe('GET /api/videos/[videoId]/analytics', () => {
    it('should return analytics for authorized user', async () => {
      const mockAnalytics = {
        videoId: 'video_123',
        totalAccesses: 100,
        uniqueUsers: 50,
        accessesByTier: { basic: 20, premium: 30, pro: 50 },
        averageSessionDuration: 1800,
        peakConcurrentUsers: 25,
        geographicDistribution: { US: 60, UK: 20, CA: 20 },
        deviceTypes: { desktop: 70, mobile: 30 },
        errorRate: 0.02,
        lastAccessedAt: new Date(),
      }

      mockSignedURLService.getVideoAccessAnalytics.mockResolvedValue(mockAnalytics)

      const request = new NextRequest('http://localhost:3000/api/videos/video_123/analytics', {
        method: 'GET',
      })

      const response = await getAnalytics(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockAnalytics)
    })

    it('should return 403 for unauthorized user', async () => {
      mockCheckUserRole.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/videos/video_123/analytics', {
        method: 'GET',
      })

      const response = await getAnalytics(request, { params: { videoId: 'video_123' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions to view analytics')
    })
  })

  describe('POST /api/videos/sessions/cleanup', () => {
    it('should cleanup expired sessions for admin user', async () => {
      mockSignedURLService.cleanupExpiredSessions.mockResolvedValue(5)

      const request = new NextRequest('http://localhost:3000/api/videos/sessions/cleanup', {
        method: 'POST',
      })

      const response = await cleanupSessions(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.cleanedSessions).toBe(5)
      expect(data.data.message).toBe('Successfully cleaned up 5 expired sessions')
    })

    it('should return 403 for non-admin user', async () => {
      mockClerkClient.users.getUser.mockResolvedValue({
        id: 'user_123',
        publicMetadata: { role: 'viewer' },
      } as any)
      mockCheckUserRole.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/videos/sessions/cleanup', {
        method: 'POST',
      })

      const response = await cleanupSessions(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin permissions required')
    })
  })
})