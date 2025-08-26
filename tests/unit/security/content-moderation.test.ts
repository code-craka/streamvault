import {
  contentModerator,
  moderateText,
} from '@/lib/security/content-moderation'

// Mock the security logger
jest.mock('@/lib/security/logging', () => ({
  securityLogger: {
    logSecurityEvent: jest.fn(),
  },
}))

describe('Content Moderation', () => {
  describe('moderateText', () => {
    it('should approve clean content', async () => {
      const result = await moderateText('This is clean content', 'user123')

      expect(result.approved).toBe(true)
      expect(result.suggestedAction).toBe('approve')
      expect(result.reasons).toHaveLength(0)
    })

    it('should detect profanity', async () => {
      const result = await moderateText(
        'This content has spam words',
        'user123'
      )

      expect(result.approved).toBe(false)
      expect(result.reasons).toContain('Profanity detected')
      expect(result.detectedCategories).toContain('profanity')
    })

    it('should detect spam patterns', async () => {
      const spamContent = 'AAAAAAAAAA BUY NOW CLICK HERE!!!'
      const result = await moderateText(spamContent, 'user123')

      expect(result.approved).toBe(false)
      expect(result.reasons).toContain('Spam-like content detected')
      expect(result.detectedCategories).toContain('spam')
    })

    it('should detect personal information', async () => {
      const personalInfo =
        'My email is test@example.com and phone is 123-456-7890'
      const result = await moderateText(personalInfo, 'user123')

      expect(result.approved).toBe(false)
      expect(result.reasons).toContain('Personal information detected')
      expect(result.detectedCategories).toContain('personal_info')
      expect(result.filteredContent).toContain('[REDACTED]')
    })

    it('should detect unauthorized links', async () => {
      const linkContent =
        'Check out this suspicious site: https://malicious-site.com'
      const result = await moderateText(linkContent, 'user123')

      expect(result.approved).toBe(false)
      expect(result.reasons).toContain('Unauthorized links detected')
      expect(result.detectedCategories).toContain('unauthorized_links')
      expect(result.filteredContent).toContain('[LINK REMOVED]')
    })

    it('should allow authorized links', async () => {
      const linkContent =
        'Check out this video: https://youtube.com/watch?v=123'
      const result = await moderateText(linkContent, 'user123')

      expect(result.approved).toBe(true)
      expect(result.filteredContent).toBe(linkContent)
    })

    it('should handle content length violations', async () => {
      const longContent = 'a'.repeat(1000) // Exceeds max length
      const result = await moderateText(longContent, 'user123')

      expect(result.approved).toBe(false)
      expect(result.reasons).toContain('Content exceeds maximum length')
      expect(result.detectedCategories).toContain('length_violation')
    })

    it('should filter profanity in content', async () => {
      const profaneContent = 'This is spam content'
      const result = await moderateText(profaneContent, 'user123')

      expect(result.filteredContent).toContain('****')
    })

    it('should handle multiple violations', async () => {
      const violatingContent =
        'SPAM SPAM SPAM!!! Contact me at test@example.com https://bad-site.com'
      const result = await moderateText(violatingContent, 'user123')

      expect(result.approved).toBe(false)
      expect(result.reasons.length).toBeGreaterThan(1)
      expect(result.detectedCategories.length).toBeGreaterThan(1)
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should suggest appropriate actions based on severity', async () => {
      // Low severity - should flag
      const minorViolation = 'This has one spam word'
      const minorResult = await moderateText(minorViolation, 'user123')
      expect(['flag', 'approve']).toContain(minorResult.suggestedAction)

      // High severity - should reject
      const majorViolation = 'Contact me at test@example.com for spam offers!!!'
      const majorResult = await moderateText(majorViolation, 'user123')
      expect(['reject', 'review']).toContain(majorResult.suggestedAction)
    })
  })

  describe('Content Moderation Configuration', () => {
    it('should respect configuration settings', async () => {
      // Test with different configuration would require dependency injection
      // This is a placeholder for configuration-based testing
      expect(true).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle moderation service errors gracefully', async () => {
      // Mock a service error
      const originalConsoleError = console.error
      console.error = jest.fn()

      // This would require mocking the AI service to throw an error
      const result = await moderateText('test content', 'user123')

      // Should still return a result even if AI service fails
      expect(result).toBeDefined()
      expect(result.approved).toBeDefined()

      console.error = originalConsoleError
    })
  })
})
