import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { AIContentEnhancement } from '@/lib/ai/content-enhancement'
import { ThumbnailGenerationService } from '@/lib/ai/thumbnail-generation'
import { ContentQualityAnalyzer } from '@/lib/ai/content-quality-analyzer'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  app: {}
}))

// Mock Firebase functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
}))

// Mock Firebase app initialization
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
}))

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}))

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
}))

// Mock Google Cloud Storage
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  })),
}))



describe('AIContentEnhancement', () => {
  let aiService: AIContentEnhancement
  
  beforeEach(() => {
    aiService = new AIContentEnhancement()
    jest.clearAllMocks()
  })

  describe('processUploadedVideo', () => {
    it('should process video and return metadata', async () => {
      const videoId = 'test-video-123'
      const videoPath = '/path/to/video.mp4'
      const userId = 'user-123'

      const result = await aiService.processUploadedVideo(videoId, videoPath, userId)

      expect(result).toBeDefined()
      expect(result.videoId).toBe(videoId)
      expect(result.title).toBeDefined()
      expect(result.description).toBeDefined()
      expect(result.tags).toBeInstanceOf(Array)
      expect(result.category).toBeDefined()
      expect(result.aiGenerated).toBeDefined()
      expect(result.aiGenerated.confidence).toBeGreaterThan(0)
      expect(result.processedAt).toBeInstanceOf(Date)
    })

    it('should handle processing errors gracefully', async () => {
      const videoId = 'test-video-123'
      const videoPath = '/invalid/path.mp4'
      const userId = 'user-123'

      await expect(aiService.processUploadedVideo(videoId, videoPath, userId))
        .rejects.toThrow('AI processing failed')
    })
  })

  describe('generateRecommendations', () => {
    it('should generate recommendations for user', async () => {
      const userId = 'user-123'
      const limit = 5

      const recommendations = await aiService.generateRecommendations(userId, undefined, limit)

      expect(recommendations).toBeInstanceOf(Array)
      expect(recommendations.length).toBeLessThanOrEqual(limit)
    })

    it('should generate content-based recommendations', async () => {
      const userId = 'user-123'
      const videoId = 'video-123'
      const limit = 3

      const recommendations = await aiService.generateRecommendations(userId, videoId, limit)

      expect(recommendations).toBeInstanceOf(Array)
      expect(recommendations.length).toBeLessThanOrEqual(limit)
    })
  })
})

describe('ThumbnailGenerationService', () => {
  let thumbnailService: ThumbnailGenerationService

  beforeEach(() => {
    thumbnailService = new ThumbnailGenerationService()
    jest.clearAllMocks()
  })

  describe('generateThumbnails', () => {
    it('should generate thumbnails from video', async () => {
      const videoId = 'test-video-123'
      const videoPath = '/path/to/video.mp4'

      const thumbnails = await thumbnailService.generateThumbnails(videoId, videoPath)

      expect(thumbnails).toBeInstanceOf(Array)
      expect(thumbnails.length).toBeGreaterThan(0)
      
      thumbnails.forEach(thumbnail => {
        expect(thumbnail.url).toBeDefined()
        expect(thumbnail.timestamp).toBeGreaterThanOrEqual(0)
        expect(thumbnail.confidence).toBeGreaterThan(0)
        expect(thumbnail.confidence).toBeLessThanOrEqual(1)
        expect(thumbnail.filename).toBeDefined()
        expect(thumbnail.size).toBeGreaterThan(0)
      })
    })

    it('should generate single thumbnail at timestamp', async () => {
      const videoId = 'test-video-123'
      const videoPath = '/path/to/video.mp4'
      const timestamp = 30

      const thumbnail = await thumbnailService.generateSingleThumbnail(
        videoId, 
        videoPath, 
        timestamp
      )

      expect(thumbnail.url).toBeDefined()
      expect(thumbnail.timestamp).toBe(timestamp)
      expect(thumbnail.confidence).toBe(1.0)
      expect(thumbnail.filename).toContain(videoId)
      expect(thumbnail.size).toBeGreaterThan(0)
    })

    it('should analyze thumbnail quality', async () => {
      const thumbnailUrl = 'https://example.com/thumbnail.jpg'

      const analysis = await thumbnailService.analyzeThumbnailQuality(thumbnailUrl)

      expect(analysis.score).toBeGreaterThanOrEqual(0)
      expect(analysis.score).toBeLessThanOrEqual(1)
      expect(analysis.suggestions).toBeInstanceOf(Array)
      expect(analysis.improvements).toBeDefined()
      expect(analysis.improvements.brightness).toBeGreaterThanOrEqual(0)
      expect(analysis.improvements.contrast).toBeGreaterThanOrEqual(0)
      expect(analysis.improvements.sharpness).toBeGreaterThanOrEqual(0)
      expect(analysis.improvements.composition).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('ContentQualityAnalyzer', () => {
  let qualityAnalyzer: ContentQualityAnalyzer

  beforeEach(() => {
    qualityAnalyzer = new ContentQualityAnalyzer()
    jest.clearAllMocks()
  })

  describe('analyzeContent', () => {
    it('should analyze content quality comprehensively', async () => {
      const videoId = 'test-video-123'
      const videoPath = '/path/to/video.mp4'
      const metadata = {
        title: 'Test Video Title',
        description: 'Test video description',
        tags: ['test', 'video', 'content'],
        thumbnails: ['https://example.com/thumb1.jpg']
      }

      const analysis = await qualityAnalyzer.analyzeContent(videoId, videoPath, metadata)

      expect(analysis.overall).toBeGreaterThanOrEqual(0)
      expect(analysis.overall).toBeLessThanOrEqual(1)
      
      expect(analysis.technical).toBeDefined()
      expect(analysis.technical.video.score).toBeGreaterThanOrEqual(0)
      expect(analysis.technical.audio.score).toBeGreaterThanOrEqual(0)
      expect(analysis.technical.encoding.score).toBeGreaterThanOrEqual(0)

      expect(analysis.engagement).toBeDefined()
      expect(analysis.engagement.score).toBeGreaterThanOrEqual(0)
      expect(analysis.engagement.pacing).toBeGreaterThanOrEqual(0)
      expect(analysis.engagement.visualInterest).toBeGreaterThanOrEqual(0)

      expect(analysis.accessibility).toBeDefined()
      expect(analysis.accessibility.score).toBeGreaterThanOrEqual(0)

      expect(analysis.seo).toBeDefined()
      expect(analysis.seo.score).toBeGreaterThanOrEqual(0)
      expect(analysis.seo.titleOptimization).toBeGreaterThanOrEqual(0)
      expect(analysis.seo.descriptionQuality).toBeGreaterThanOrEqual(0)

      expect(analysis.suggestions).toBeInstanceOf(Array)
      analysis.suggestions.forEach(suggestion => {
        expect(['technical', 'engagement', 'accessibility', 'seo']).toContain(suggestion.category)
        expect(['high', 'medium', 'low']).toContain(suggestion.priority)
        expect(suggestion.issue).toBeDefined()
        expect(suggestion.suggestion).toBeDefined()
        expect(suggestion.impact).toBeGreaterThanOrEqual(0)
        expect(suggestion.impact).toBeLessThanOrEqual(1)
      })

      expect(analysis.score).toBeDefined()
      expect(analysis.score.grade).toMatch(/^[A-F][+]?$/)
      expect(analysis.score.percentage).toBeGreaterThanOrEqual(0)
      expect(analysis.score.percentage).toBeLessThanOrEqual(100)
    })

    it('should handle missing metadata gracefully', async () => {
      const videoId = 'test-video-123'
      const videoPath = '/path/to/video.mp4'

      const analysis = await qualityAnalyzer.analyzeContent(videoId, videoPath)

      expect(analysis).toBeDefined()
      expect(analysis.overall).toBeGreaterThanOrEqual(0)
      expect(analysis.seo.titleOptimization).toBeLessThan(0.5) // Should be low without title
      expect(analysis.seo.descriptionQuality).toBeLessThan(0.5) // Should be low without description
    })
  })
})

describe('AI Integration Tests', () => {
  it('should work together for complete video processing', async () => {
    const aiService = new AIContentEnhancement()
    const thumbnailService = new ThumbnailGenerationService()
    const qualityAnalyzer = new ContentQualityAnalyzer()

    const videoId = 'integration-test-123'
    const videoPath = '/path/to/test-video.mp4'
    const userId = 'user-123'

    // Process video with AI
    const metadata = await aiService.processUploadedVideo(videoId, videoPath, userId)
    
    // Generate additional thumbnails
    const thumbnails = await thumbnailService.generateThumbnails(videoId, videoPath, { count: 3 })
    
    // Analyze quality
    const qualityAnalysis = await qualityAnalyzer.analyzeContent(videoId, videoPath, metadata)

    // Verify integration
    expect(metadata.videoId).toBe(videoId)
    expect(thumbnails.length).toBe(3)
    expect(qualityAnalysis.overall).toBeGreaterThan(0)
    
    // Verify data consistency
    expect(metadata.aiGenerated.thumbnails).toBeInstanceOf(Array)
    expect(qualityAnalysis.suggestions.length).toBeGreaterThan(0)
  })
})