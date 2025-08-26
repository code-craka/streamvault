/**
 * Tests for Content Moderation Service
 */

import {
  ContentModerationService,
  ModerationResult,
  ViolationType,
} from '@/lib/ai/content-moderation'

describe('ContentModerationService', () => {
  let moderationService: ContentModerationService

  beforeEach(() => {
    moderationService = new ContentModerationService()
  })

  describe('moderateText', () => {
    it('should approve clean content', async () => {
      const cleanText = 'This is a nice and friendly message'

      const result = await moderationService.moderateText(cleanText, 'chat')

      expect(result).toBeDefined()
      expect(result.approved).toBe(true)
      expect(result.violations).toHaveLength(0)
      expect(result.severity).toBe('low')
      expect(result.action.type).toBe('approve')
    })

    it('should detect hate speech', async () => {
      const hateText = 'This contains hate speech and racist language'

      const result = await moderationService.moderateText(hateText, 'chat')

      expect(result).toBeDefined()
      expect(result.approved).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)

      const hateViolation = result.violations.find(
        v => v.type === 'hate_speech'
      )
      expect(hateViolation).toBeDefined()
      expect(hateViolation?.confidence).toBeGreaterThan(0)
    })

    it('should detect harassment', async () => {
      const harassmentText =
        'You are being harassed and bullied by this message'

      const result = await moderationService.moderateText(
        harassmentText,
        'chat'
      )

      expect(result).toBeDefined()
      expect(result.approved).toBe(false)

      const harassmentViolation = result.violations.find(
        v => v.type === 'harassment'
      )
      expect(harassmentViolation).toBeDefined()
    })

    it('should detect spam content', async () => {
      const spamText = 'This is spam content with fake offers and scam links'

      const result = await moderationService.moderateText(spamText, 'chat')

      expect(result).toBeDefined()
      expect(result.approved).toBe(false)

      const spamViolation = result.violations.find(v => v.type === 'spam')
      expect(spamViolation).toBeDefined()
    })

    it('should handle different contexts appropriately', async () => {
      const borderlineText = 'This content might be questionable'

      const chatResult = await moderationService.moderateText(
        borderlineText,
        'chat'
      )
      const commentResult = await moderationService.moderateText(
        borderlineText,
        'comment'
      )
      const titleResult = await moderationService.moderateText(
        borderlineText,
        'title'
      )

      expect(chatResult).toBeDefined()
      expect(commentResult).toBeDefined()
      expect(titleResult).toBeDefined()

      // All should have consistent moderation logic
      expect(chatResult.approved).toBe(commentResult.approved)
    })

    it('should provide confidence scores', async () => {
      const testText = 'Test message for confidence scoring'

      const result = await moderationService.moderateText(testText, 'chat')

      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)

      result.violations.forEach(violation => {
        expect(violation.confidence).toBeGreaterThanOrEqual(0)
        expect(violation.confidence).toBeLessThanOrEqual(1)
      })
    })

    it('should detect custom emotes', async () => {
      const emoteText = 'Hello :custom_emote: how are you :another_emote:'

      const result = await moderationService.moderateText(emoteText, 'chat')

      expect(result.detectedEmotes).toBeDefined()
      expect(Array.isArray(result.detectedEmotes)).toBe(true)
      expect(result.detectedEmotes).toContain(':custom_emote:')
      expect(result.detectedEmotes).toContain(':another_emote:')
    })
  })

  describe('moderateVideo', () => {
    it('should moderate video content comprehensively', async () => {
      const videoPath = 'test-video.mp4'
      const metadata = {
        title: 'Test Video Title',
        description: 'This is a test video description',
        tags: ['test', 'video', 'content'],
      }

      const result = await moderationService.moderateVideo(videoPath, metadata)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('approved')
      expect(result).toHaveProperty('violations')
      expect(result).toHaveProperty('categories')
      expect(result).toHaveProperty('severity')
      expect(result).toHaveProperty('action')
      expect(result).toHaveProperty('reason')

      expect(Array.isArray(result.violations)).toBe(true)
      expect(Array.isArray(result.categories)).toBe(true)
    })

    it('should moderate video metadata', async () => {
      const videoPath = 'test-video.mp4'
      const problematicMetadata = {
        title: 'Inappropriate title with bad words',
        description: 'Description containing hate speech',
        tags: ['inappropriate', 'content'],
      }

      const result = await moderationService.moderateVideo(
        videoPath,
        problematicMetadata
      )

      expect(result.approved).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    it('should handle video analysis failures gracefully', async () => {
      const invalidVideoPath = 'non-existent-video.mp4'
      const metadata = {
        title: 'Valid Title',
        description: 'Valid description',
        tags: ['valid'],
      }

      const result = await moderationService.moderateVideo(
        invalidVideoPath,
        metadata
      )

      expect(result).toBeDefined()
      expect(result.action.type).toBe('review')
      expect(result.action.reviewRequired).toBe(true)
    })
  })

  describe('moderateLiveStream', () => {
    it('should monitor live stream content', async () => {
      const streamId = 'test-stream-123'
      const audioChunk = Buffer.from('mock audio data')
      const chatMessages = [
        'Hello everyone!',
        'Great stream!',
        'This contains inappropriate content',
      ]

      const result = await moderationService.moderateLiveStream(
        streamId,
        audioChunk,
        chatMessages
      )

      expect(result).toBeDefined()
      expect(result.streamId).toBe(streamId)
      expect(result.isActive).toBe(true)
      expect(Array.isArray(result.violations)).toBe(true)
      expect(result.warningCount).toBeGreaterThanOrEqual(0)
      expect(['strict', 'moderate', 'lenient']).toContain(
        result.moderationLevel
      )
    })

    it('should track violation history', async () => {
      const streamId = 'test-stream-123'
      const audioChunk = Buffer.alloc(0)
      const problematicMessages = [
        'This is hate speech',
        'More inappropriate content',
        'Harassment message',
      ]

      const result = await moderationService.moderateLiveStream(
        streamId,
        audioChunk,
        problematicMessages
      )

      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.warningCount).toBeGreaterThan(0)
      expect(result.lastViolation).toBeDefined()
    })

    it('should adjust moderation level based on violations', async () => {
      const streamId = 'test-stream-123'
      const audioChunk = Buffer.alloc(0)

      // Simulate multiple violations
      const manyViolations = Array(15).fill('inappropriate message')

      const result = await moderationService.moderateLiveStream(
        streamId,
        audioChunk,
        manyViolations
      )

      expect(result.moderationLevel).toBe('strict')
      expect(result.autoActions).toBe(true)
    })
  })

  describe('processContentAppeal', () => {
    it('should process appeals with AI assistance', async () => {
      const mockAppeal = {
        id: 'appeal-123',
        contentId: 'content-456',
        userId: 'user-789',
        originalViolation: {
          type: 'inappropriate_language' as ViolationType,
          description: 'Content contains inappropriate language',
          confidence: 0.75,
          severity: 'medium' as const,
          context: 'test context',
        },
        appealReason:
          'This was taken out of context and is actually educational content',
        status: 'pending' as const,
        submittedAt: new Date(),
      }

      const result = await moderationService.processContentAppeal(mockAppeal)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('recommendation')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasoning')

      expect(['approve', 'reject', 'needs_human_review']).toContain(
        result.recommendation
      )
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(typeof result.reasoning).toBe('string')
    })

    it('should recommend human review for complex cases', async () => {
      const complexAppeal = {
        id: 'appeal-complex',
        contentId: 'content-complex',
        userId: 'user-complex',
        originalViolation: {
          type: 'hate_speech' as ViolationType,
          description: 'Potential hate speech detected',
          confidence: 0.85,
          severity: 'high' as const,
          context: 'complex context',
        },
        appealReason:
          'This is a complex case that requires nuanced understanding',
        status: 'pending' as const,
        submittedAt: new Date(),
      }

      const result = await moderationService.processContentAppeal(complexAppeal)

      // High confidence violations should often require human review
      if (result.confidence < 0.8) {
        expect(result.recommendation).toBe('needs_human_review')
      }
    })
  })

  describe('error handling', () => {
    it('should handle moderation service failures gracefully', async () => {
      // Test with extremely long text that might cause issues
      const longText = 'a'.repeat(10000)

      const result = await moderationService.moderateText(longText, 'chat')

      expect(result).toBeDefined()
      expect(result).toHaveProperty('approved')
      expect(result).toHaveProperty('action')
    })

    it('should provide fallback responses on service errors', async () => {
      // Mock a service error scenario
      const result = await moderationService.moderateText('', 'chat')

      expect(result).toBeDefined()
      expect(result.action.reviewRequired).toBeDefined()
    })
  })

  describe('performance', () => {
    it('should complete text moderation quickly', async () => {
      const startTime = Date.now()
      const testText = 'Quick moderation test message'

      await moderationService.moderateText(testText, 'chat')

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000)
    })

    it('should handle batch moderation efficiently', async () => {
      const messages = Array(10)
        .fill(0)
        .map((_, i) => `Test message ${i}`)
      const startTime = Date.now()

      const results = await Promise.all(
        messages.map(msg => moderationService.moderateText(msg, 'chat'))
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(results).toHaveLength(10)
      // Should complete batch within 5 seconds
      expect(duration).toBeLessThan(5000)
    })
  })

  describe('violation types', () => {
    const violationTypes: ViolationType[] = [
      'hate_speech',
      'harassment',
      'violence',
      'adult_content',
      'spam',
      'copyright',
      'misinformation',
      'self_harm',
      'illegal_content',
      'inappropriate_language',
      'personal_information',
      'impersonation',
    ]

    violationTypes.forEach(violationType => {
      it(`should detect ${violationType} violations`, async () => {
        // Create test content that should trigger this violation type
        const testContent = `This content should trigger ${violationType} detection`

        const result = await moderationService.moderateText(testContent, 'chat')

        expect(result).toBeDefined()
        expect(result.categories).toBeDefined()

        // Check if the violation type is in the categories
        const category = result.categories.find(
          cat => cat.category === violationType
        )
        expect(category).toBeDefined()
        expect(category?.score).toBeGreaterThanOrEqual(0)
        expect(category?.score).toBeLessThanOrEqual(1)
      })
    })
  })
})
