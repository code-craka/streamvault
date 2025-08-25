/**
 * Integration tests for AI Content Analysis API
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/ai/content-analysis/route'

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => ({ userId: 'test-user-123' })),
}))

// Mock AI Content Enhancement
jest.mock('@/lib/ai/content-enhancement', () => ({
  aiContentEnhancement: {
    processUploadedVideo: jest.fn(),
    getStoredAnalysis: jest.fn(),
  },
}))

describe('/api/ai/content-analysis', () => {
  const mockAnalysisResult = {
    videoId: 'test-video-123',
    transcription: {
      text: 'This is a test transcription',
      confidence: 0.97,
      language: 'en-US',
      segments: [],
      duration: 120,
      wordCount: 5,
    },
    multiLanguageSubtitles: [
      {
        language: 'English',
        languageCode: 'en-US',
        subtitles: [],
        confidence: 0.97,
      },
    ],
    scenes: [],
    highlights: [],
    contentOptimization: {
      overallScore: 85,
      recommendations: [],
      performanceInsights: [],
      audienceEngagement: {
        retentionCurve: [1.0, 0.9, 0.8],
        dropOffPoints: [],
        peakEngagementTimes: [],
        averageWatchTime: 100,
        completionRate: 0.8,
      },
      contentQuality: {
        videoQuality: 0.9,
        audioQuality: 0.85,
        contentClarity: 0.8,
        pacing: 0.75,
        visualAppeal: 0.82,
      },
    },
    sentimentAnalysis: {
      overall: {
        polarity: 0.3,
        magnitude: 0.7,
        confidence: 0.85,
        label: 'positive' as const,
      },
      segments: [],
      emotions: {
        joy: 0.3,
        anger: 0.1,
        fear: 0.05,
        sadness: 0.1,
        surprise: 0.2,
        disgust: 0.05,
        trust: 0.15,
        anticipation: 0.05,
      },
      topics: [],
      trends: [],
    },
    moderationResult: {
      approved: true,
      confidence: 0.95,
      violations: [],
      categories: [],
      severity: 'low' as const,
      action: {
        type: 'approve' as const,
        reason: 'Content approved',
        autoApplied: true,
        reviewRequired: false,
        appealable: false,
      },
      reason: 'Content approved',
    },
    copyrightScan: {
      hasViolation: false,
      confidence: 0.1,
      matches: [],
      riskLevel: 'low' as const,
      recommendation: {
        type: 'approve' as const,
        reason: 'No copyright violations detected',
        autoApplied: true,
        appealable: false,
      },
      scanDuration: 1500,
    },
    aiGenerated: {
      thumbnails: ['thumb1.jpg', 'thumb2.jpg'],
      title: 'AI Generated Title',
      description: 'AI generated description',
      tags: ['ai', 'test', 'video'],
      categories: ['General'],
    },
    processedAt: new Date(),
    processingTime: 5000,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/ai/content-analysis', () => {
    it('should process video analysis request successfully', async () => {
      const { aiContentEnhancement } = require('@/lib/ai/content-enhancement')
      aiContentEnhancement.processUploadedVideo.mockResolvedValue(mockAnalysisResult)

      const requestBody = {
        videoId: 'test-video-123',
        videoPath: '/path/to/video.mp4',
        metadata: {
          title: 'Test Video',
          description: 'Test description',
          tags: ['test', 'video'],
        },
      }

      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analysis).toEqual(mockAnalysisResult)
      expect(data.message).toBe('Content analysis completed successfully')

      expect(aiContentEnhancement.processUploadedVideo).toHaveBeenCalledWith(
        'test-video-123',
        '/path/to/video.mp4',
        {
          title: 'Test Video',
          description: 'Test description',
          tags: ['test', 'video'],
        }
      )
    })

    it('should return 401 for unauthorized requests', async () => {
      const { auth } = require('@clerk/nextjs/server')
      auth.mockReturnValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid request data', async () => {
      const invalidRequestBody = {
        videoId: '', // Invalid: empty string
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
    })

    it('should handle processing errors gracefully', async () => {
      const { aiContentEnhancement } = require('@/lib/ai/content-enhancement')
      aiContentEnhancement.processUploadedVideo.mockRejectedValue(
        new Error('Processing failed')
      )

      const requestBody = {
        videoId: 'test-video-123',
        videoPath: '/path/to/video.mp4',
        metadata: {
          title: 'Test Video',
          description: 'Test description',
          tags: ['test', 'video'],
        },
      }

      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Content analysis failed')
      expect(data.message).toBe('Processing failed')
    })
  })

  describe('GET /api/ai/content-analysis', () => {
    it('should retrieve stored analysis successfully', async () => {
      const { aiContentEnhancement } = require('@/lib/ai/content-enhancement')
      aiContentEnhancement.getStoredAnalysis.mockResolvedValue(mockAnalysisResult)

      const request = new NextRequest(
        'http://localhost:3000/api/ai/content-analysis?videoId=test-video-123'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analysis).toEqual(mockAnalysisResult)

      expect(aiContentEnhancement.getStoredAnalysis).toHaveBeenCalledWith('test-video-123')
    })

    it('should return 400 when videoId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Video ID is required')
    })

    it('should return 404 when analysis is not found', async () => {
      const { aiContentEnhancement } = require('@/lib/ai/content-enhancement')
      aiContentEnhancement.getStoredAnalysis.mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/ai/content-analysis?videoId=non-existent'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Analysis not found')
    })

    it('should return 401 for unauthorized requests', async () => {
      const { auth } = require('@clerk/nextjs/server')
      auth.mockReturnValue({ userId: null })

      const request = new NextRequest(
        'http://localhost:3000/api/ai/content-analysis?videoId=test-video-123'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should handle service unavailable scenarios', async () => {
      const { aiContentEnhancement } = require('@/lib/ai/content-enhancement')
      aiContentEnhancement.processUploadedVideo.mockRejectedValue(
        new Error('Service temporarily unavailable')
      )

      const requestBody = {
        videoId: 'test-video-123',
        videoPath: '/path/to/video.mp4',
        metadata: {
          title: 'Test Video',
          description: 'Test description',
          tags: ['test', 'video'],
        },
      }

      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Content analysis failed')
      expect(data.message).toBe('Service temporarily unavailable')
    })
  })

  describe('performance', () => {
    it('should respond within reasonable time limits', async () => {
      const { aiContentEnhancement } = require('@/lib/ai/content-enhancement')
      aiContentEnhancement.processUploadedVideo.mockResolvedValue(mockAnalysisResult)

      const requestBody = {
        videoId: 'test-video-123',
        videoPath: '/path/to/video.mp4',
        metadata: {
          title: 'Test Video',
          description: 'Test description',
          tags: ['test', 'video'],
        },
      }

      const startTime = Date.now()

      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      await response.json()

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(response.status).toBe(200)
      // API should respond within 1 second (excluding actual AI processing)
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('data validation', () => {
    it('should validate video ID format', async () => {
      const requestBody = {
        videoId: 'invalid-video-id-with-special-chars!@#',
        videoPath: '/path/to/video.mp4',
        metadata: {
          title: 'Test Video',
          description: 'Test description',
          tags: ['test', 'video'],
        },
      }

      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      // Should still process as long as it's a string
      expect(response.status).toBe(200)
    })

    it('should validate metadata structure', async () => {
      const requestBody = {
        videoId: 'test-video-123',
        videoPath: '/path/to/video.mp4',
        metadata: {
          title: '', // Empty title should be valid
          description: 'Test description',
          tags: [], // Empty tags array should be valid
        },
      }

      const { aiContentEnhancement } = require('@/lib/ai/content-enhancement')
      aiContentEnhancement.processUploadedVideo.mockResolvedValue(mockAnalysisResult)

      const request = new NextRequest('http://localhost:3000/api/ai/content-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})