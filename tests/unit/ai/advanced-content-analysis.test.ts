/**
 * Tests for Advanced Content Analysis Service
 */

import { AdvancedContentAnalysis, Scene, Highlight } from '@/lib/ai/advanced-content-analysis'

describe('AdvancedContentAnalysis', () => {
  let contentAnalysis: AdvancedContentAnalysis

  beforeEach(() => {
    contentAnalysis = new AdvancedContentAnalysis()
  })

  describe('detectScenes', () => {
    it('should detect scenes in video content', async () => {
      const videoPath = 'test-video.mp4'
      
      const scenes = await contentAnalysis.detectScenes(videoPath)
      
      expect(scenes).toBeDefined()
      expect(Array.isArray(scenes)).toBe(true)
      expect(scenes.length).toBeGreaterThan(0)
      
      // Verify scene structure
      scenes.forEach(scene => {
        expect(scene).toHaveProperty('id')
        expect(scene).toHaveProperty('startTime')
        expect(scene).toHaveProperty('endTime')
        expect(scene).toHaveProperty('type')
        expect(scene).toHaveProperty('confidence')
        expect(scene.confidence).toBeGreaterThanOrEqual(0)
        expect(scene.confidence).toBeLessThanOrEqual(1)
      })
    })

    it('should classify scene types correctly', async () => {
      const videoPath = 'test-video.mp4'
      
      const scenes = await contentAnalysis.detectScenes(videoPath)
      
      const validTypes = ['action', 'dialogue', 'transition', 'highlight', 'intro', 'outro']
      scenes.forEach(scene => {
        expect(validTypes).toContain(scene.type)
      })
    })
  })

  describe('createAutomaticHighlights', () => {
    it('should create highlights from scenes', async () => {
      const mockScenes: Scene[] = [
        {
          id: 'scene_1',
          startTime: 0,
          endTime: 30,
          duration: 30,
          type: 'action',
          confidence: 0.9,
          description: 'High action scene',
          keyFrames: ['frame1.jpg'],
          audioFeatures: {
            volume: 0.8,
            pitch: 220,
            tempo: 120,
            speechRate: 150,
            musicDetected: true,
            silenceRatio: 0.1,
          },
          visualFeatures: {
            brightness: 0.7,
            contrast: 0.6,
            colorfulness: 0.8,
            motionIntensity: 0.9,
            faceCount: 1,
            textDetected: false,
          },
        },
      ]

      const highlights = await contentAnalysis.createAutomaticHighlights(
        mockScenes,
        'This is an exciting action sequence'
      )

      expect(highlights).toBeDefined()
      expect(Array.isArray(highlights)).toBe(true)
      
      if (highlights.length > 0) {
        highlights.forEach(highlight => {
          expect(highlight).toHaveProperty('id')
          expect(highlight).toHaveProperty('startTime')
          expect(highlight).toHaveProperty('endTime')
          expect(highlight).toHaveProperty('title')
          expect(highlight).toHaveProperty('confidence')
          expect(highlight.confidence).toBeGreaterThanOrEqual(0)
          expect(highlight.confidence).toBeLessThanOrEqual(1)
        })
      }
    })

    it('should filter highlights by confidence threshold', async () => {
      const mockScenes: Scene[] = [
        {
          id: 'scene_1',
          startTime: 0,
          endTime: 30,
          duration: 30,
          type: 'action',
          confidence: 0.5, // Low confidence
          description: 'Low confidence scene',
          keyFrames: [],
          audioFeatures: {
            volume: 0.3,
            pitch: 220,
            tempo: 120,
            speechRate: 150,
            musicDetected: false,
            silenceRatio: 0.5,
          },
          visualFeatures: {
            brightness: 0.5,
            contrast: 0.5,
            colorfulness: 0.5,
            motionIntensity: 0.3,
            faceCount: 0,
            textDetected: false,
          },
        },
      ]

      const highlights = await contentAnalysis.createAutomaticHighlights(mockScenes)

      // Should not create highlights for low confidence scenes
      expect(highlights.length).toBe(0)
    })
  })

  describe('generateContentOptimization', () => {
    it('should generate optimization recommendations', async () => {
      const videoPath = 'test-video.mp4'
      const mockScenes: Scene[] = [
        {
          id: 'scene_1',
          startTime: 0,
          endTime: 30,
          duration: 30,
          type: 'dialogue',
          confidence: 0.8,
          description: 'Dialogue scene',
          keyFrames: [],
          audioFeatures: {
            volume: 0.6,
            pitch: 220,
            tempo: 120,
            speechRate: 150,
            musicDetected: false,
            silenceRatio: 0.2,
          },
          visualFeatures: {
            brightness: 0.7,
            contrast: 0.6,
            colorfulness: 0.8,
            motionIntensity: 0.4,
            faceCount: 1,
            textDetected: false,
          },
        },
      ]

      const optimization = await contentAnalysis.generateContentOptimization(
        videoPath,
        mockScenes,
        'Sample transcription text'
      )

      expect(optimization).toBeDefined()
      expect(optimization).toHaveProperty('overallScore')
      expect(optimization).toHaveProperty('recommendations')
      expect(optimization).toHaveProperty('performanceInsights')
      expect(optimization).toHaveProperty('audienceEngagement')
      expect(optimization).toHaveProperty('contentQuality')

      expect(optimization.overallScore).toBeGreaterThanOrEqual(0)
      expect(optimization.overallScore).toBeLessThanOrEqual(100)
      expect(Array.isArray(optimization.recommendations)).toBe(true)
      expect(Array.isArray(optimization.performanceInsights)).toBe(true)
    })

    it('should provide actionable recommendations', async () => {
      const videoPath = 'test-video.mp4'
      const mockScenes: Scene[] = []

      const optimization = await contentAnalysis.generateContentOptimization(
        videoPath,
        mockScenes
      )

      optimization.recommendations.forEach(recommendation => {
        expect(recommendation).toHaveProperty('type')
        expect(recommendation).toHaveProperty('priority')
        expect(recommendation).toHaveProperty('title')
        expect(recommendation).toHaveProperty('description')
        expect(recommendation).toHaveProperty('actionable')
        expect(recommendation).toHaveProperty('estimatedImprovement')
        
        expect(['audio', 'video', 'content', 'engagement', 'seo']).toContain(recommendation.type)
        expect(['high', 'medium', 'low']).toContain(recommendation.priority)
        expect(typeof recommendation.actionable).toBe('boolean')
        expect(recommendation.estimatedImprovement).toBeGreaterThanOrEqual(0)
        expect(recommendation.estimatedImprovement).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('error handling', () => {
    it('should handle invalid video paths gracefully', async () => {
      const invalidPath = 'non-existent-video.mp4'

      await expect(contentAnalysis.detectScenes(invalidPath)).rejects.toThrow()
    })

    it('should handle empty scenes array', async () => {
      const highlights = await contentAnalysis.createAutomaticHighlights([])
      
      expect(highlights).toBeDefined()
      expect(Array.isArray(highlights)).toBe(true)
      expect(highlights.length).toBe(0)
    })
  })

  describe('performance', () => {
    it('should complete scene detection within reasonable time', async () => {
      const startTime = Date.now()
      const videoPath = 'test-video.mp4'
      
      await contentAnalysis.detectScenes(videoPath)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within 5 seconds for mock implementation
      expect(duration).toBeLessThan(5000)
    })
  })
})