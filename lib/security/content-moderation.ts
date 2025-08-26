import { z } from 'zod'
import { securityLogger } from './logging'

export interface ModerationResult {
  approved: boolean
  confidence: number
  reasons: string[]
  detectedCategories: string[]
  suggestedAction: 'approve' | 'review' | 'reject' | 'flag'
  detectedEmotes?: string[]
  filteredContent?: string
}

export interface ContentModerationConfig {
  enableProfanityFilter: boolean
  enableSpamDetection: boolean
  enableToxicityDetection: boolean
  enablePersonalInfoDetection: boolean
  enableLinkFiltering: boolean
  customBlockedWords: string[]
  allowedDomains: string[]
  maxMessageLength: number
  maxRepeatedCharacters: number
}

export interface ModerationAction {
  id: string
  contentId: string
  userId: string
  moderatorId: string
  action: 'approve' | 'reject' | 'flag' | 'timeout' | 'ban'
  reason: string
  timestamp: number
  automated: boolean
}

class ContentModerator {
  private config: ContentModerationConfig
  private profanityList!: Set<string>
  private spamPatterns!: RegExp[]
  private personalInfoPatterns!: RegExp[]
  private linkPattern!: RegExp

  constructor(config: ContentModerationConfig) {
    this.config = config
    this.initializeFilters()
  }

  private initializeFilters(): void {
    // Common profanity words (this would be loaded from a comprehensive database)
    this.profanityList = new Set([
      // Basic profanity - in production, use a comprehensive database
      'spam',
      'scam',
      'fake',
      'bot',
      'hack',
      'cheat',
      'exploit',
      ...this.config.customBlockedWords,
    ])

    // Spam detection patterns
    this.spamPatterns = [
      /(.)\1{4,}/g, // Repeated characters (5 or more)
      /[A-Z]{10,}/g, // Excessive caps
      /(.{1,10})\1{3,}/g, // Repeated phrases
      /(buy|sell|cheap|free|money|cash|prize|winner|click|visit|download)\s+(now|here|today)/gi,
      /\b(www\.|http|\.com|\.net|\.org)\b/gi, // URLs (if link filtering enabled)
    ]

    // Personal information patterns
    this.personalInfoPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone number pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email pattern
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, // Credit card pattern
    ]

    // Link pattern for filtering
    this.linkPattern =
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
  }

  async moderateContent(
    content: string,
    contentType: 'text' | 'image' | 'video' | 'audio',
    userId: string,
    context?: Record<string, any>
  ): Promise<ModerationResult> {
    const result: ModerationResult = {
      approved: true,
      confidence: 1.0,
      reasons: [],
      detectedCategories: [],
      suggestedAction: 'approve',
      filteredContent: content,
    }

    try {
      // Text-based moderation
      if (contentType === 'text') {
        await this.moderateText(content, result)
      }

      // Media-based moderation (placeholder for AI services)
      if (['image', 'video', 'audio'].includes(contentType)) {
        await this.moderateMedia(
          content,
          contentType as 'image' | 'video' | 'audio',
          result
        )
      }

      // Determine final action based on results
      this.determineFinalAction(result)

      // Log moderation result if content was flagged
      if (!result.approved || result.suggestedAction !== 'approve') {
        await securityLogger.logSecurityEvent({
          eventType: 'content_violation',
          userId,
          ipAddress: context?.ipAddress || 'unknown',
          userAgent: context?.userAgent || 'unknown',
          timestamp: Date.now(),
          severity: this.getSeverityFromAction(result.suggestedAction),
          details: {
            contentType,
            reasons: result.reasons,
            detectedCategories: result.detectedCategories,
            confidence: result.confidence,
            originalContent: content.substring(0, 100), // First 100 chars for logging
          },
        })
      }

      return result
    } catch (error) {
      console.error('Content moderation error:', error)

      // Fail safe - reject content if moderation fails
      return {
        approved: false,
        confidence: 0,
        reasons: ['Moderation system error'],
        detectedCategories: ['system_error'],
        suggestedAction: 'review',
        filteredContent: content,
      }
    }
  }

  private async moderateText(
    content: string,
    result: ModerationResult
  ): Promise<void> {
    let filteredContent = content

    // Length check
    if (content.length > this.config.maxMessageLength) {
      result.reasons.push('Content exceeds maximum length')
      result.detectedCategories.push('length_violation')
      result.confidence *= 0.8
    }

    // Profanity filter
    if (this.config.enableProfanityFilter) {
      const profanityFound = this.detectProfanity(content)
      if (profanityFound.length > 0) {
        result.reasons.push('Profanity detected')
        result.detectedCategories.push('profanity')
        result.confidence *= 0.6
        filteredContent = this.filterProfanity(filteredContent)
      }
    }

    // Spam detection
    if (this.config.enableSpamDetection) {
      const spamScore = this.detectSpam(content)
      if (spamScore > 0.7) {
        result.reasons.push('Spam-like content detected')
        result.detectedCategories.push('spam')
        result.confidence *= 1 - spamScore
      }
    }

    // Personal information detection
    if (this.config.enablePersonalInfoDetection) {
      const personalInfoFound = this.detectPersonalInfo(content)
      if (personalInfoFound.length > 0) {
        result.reasons.push('Personal information detected')
        result.detectedCategories.push('personal_info')
        result.confidence *= 0.5
        filteredContent = this.filterPersonalInfo(filteredContent)
      }
    }

    // Link filtering
    if (this.config.enableLinkFiltering) {
      const linksFound = this.detectLinks(content)
      if (linksFound.length > 0) {
        const unauthorizedLinks = linksFound.filter(
          link =>
            !this.config.allowedDomains.some(domain => link.includes(domain))
        )

        if (unauthorizedLinks.length > 0) {
          result.reasons.push('Unauthorized links detected')
          result.detectedCategories.push('unauthorized_links')
          result.confidence *= 0.7
          filteredContent = this.filterLinks(filteredContent)
        }
      }
    }

    // Toxicity detection (placeholder for AI service)
    if (this.config.enableToxicityDetection) {
      const toxicityScore = await this.detectToxicity(content)
      if (toxicityScore > 0.8) {
        result.reasons.push('Toxic content detected')
        result.detectedCategories.push('toxicity')
        result.confidence *= 1 - toxicityScore
      }
    }

    result.filteredContent = filteredContent
  }

  private async moderateMedia(
    content: string,
    contentType: 'image' | 'video' | 'audio',
    result: ModerationResult
  ): Promise<void> {
    // Placeholder for AI-based media moderation
    // In production, this would integrate with services like:
    // - Google Cloud Vision API for image moderation
    // - AWS Rekognition for video content analysis
    // - Azure Content Moderator for comprehensive media analysis

    try {
      // Simulate AI moderation call
      const moderationScore = await this.callAIModerationService(
        content,
        contentType
      )

      if (moderationScore.inappropriate > 0.8) {
        result.reasons.push(`Inappropriate ${contentType} content detected`)
        result.detectedCategories.push('inappropriate_media')
        result.confidence *= 1 - moderationScore.inappropriate
      }

      if (moderationScore.violence > 0.7) {
        result.reasons.push('Violent content detected')
        result.detectedCategories.push('violence')
        result.confidence *= 1 - moderationScore.violence
      }

      if (moderationScore.adult > 0.9) {
        result.reasons.push('Adult content detected')
        result.detectedCategories.push('adult_content')
        result.confidence *= 1 - moderationScore.adult
      }
    } catch (error) {
      console.error('AI moderation service error:', error)
      result.reasons.push('Unable to verify media content')
      result.detectedCategories.push('moderation_error')
      result.confidence *= 0.5
    }
  }

  private detectProfanity(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/)
    return words.filter(word => this.profanityList.has(word))
  }

  private filterProfanity(content: string): string {
    let filtered = content
    this.profanityList.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      filtered = filtered.replace(regex, '*'.repeat(word.length))
    })
    return filtered
  }

  private detectSpam(content: string): number {
    let spamScore = 0
    let matches = 0

    this.spamPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        matches++
      }
    })

    // Calculate spam score based on pattern matches
    spamScore = Math.min(matches / this.spamPatterns.length, 1)

    // Additional spam indicators
    const repeatedChars = (content.match(/(.)\1{3,}/g) || []).length
    if (repeatedChars > this.config.maxRepeatedCharacters) {
      spamScore += 0.3
    }

    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
    if (capsRatio > 0.7) {
      spamScore += 0.2
    }

    return Math.min(spamScore, 1)
  }

  private detectPersonalInfo(content: string): string[] {
    const detected: string[] = []

    this.personalInfoPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern)
      if (matches) {
        const types = ['ssn', 'phone', 'email', 'credit_card']
        detected.push(types[index] || 'personal_info')
      }
    })

    return detected
  }

  private filterPersonalInfo(content: string): string {
    let filtered = content

    this.personalInfoPatterns.forEach(pattern => {
      filtered = filtered.replace(pattern, '[REDACTED]')
    })

    return filtered
  }

  private detectLinks(content: string): string[] {
    const matches = content.match(this.linkPattern)
    return matches || []
  }

  private filterLinks(content: string): string {
    return content.replace(this.linkPattern, '[LINK REMOVED]')
  }

  private async detectToxicity(content: string): Promise<number> {
    // Placeholder for AI toxicity detection
    // In production, integrate with services like:
    // - Google Perspective API
    // - OpenAI Moderation API
    // - Custom trained models

    // Simple keyword-based toxicity detection for now
    const toxicKeywords = [
      'hate',
      'kill',
      'die',
      'stupid',
      'idiot',
      'loser',
      'trash',
      'garbage',
    ]

    const words = content.toLowerCase().split(/\s+/)
    const toxicWords = words.filter(word => toxicKeywords.includes(word))

    return Math.min((toxicWords.length / words.length) * 2, 1)
  }

  private async callAIModerationService(
    content: string,
    contentType: string
  ): Promise<{
    inappropriate: number
    violence: number
    adult: number
    spam: number
  }> {
    // Placeholder for actual AI service integration
    // Return mock scores for now
    return {
      inappropriate: Math.random() * 0.3, // Low random score
      violence: Math.random() * 0.2,
      adult: Math.random() * 0.1,
      spam: Math.random() * 0.4,
    }
  }

  private determineFinalAction(result: ModerationResult): void {
    if (result.confidence < 0.3) {
      result.approved = false
      result.suggestedAction = 'reject'
    } else if (result.confidence < 0.6) {
      result.approved = false
      result.suggestedAction = 'review'
    } else if (result.confidence < 0.8) {
      result.approved = true
      result.suggestedAction = 'flag'
    } else {
      result.approved = true
      result.suggestedAction = 'approve'
    }

    // Override for critical violations
    const criticalCategories = ['personal_info', 'adult_content', 'violence']
    if (
      result.detectedCategories.some(cat => criticalCategories.includes(cat))
    ) {
      result.approved = false
      result.suggestedAction = 'reject'
    }
  }

  private getSeverityFromAction(
    action: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (action) {
      case 'reject':
        return 'high'
      case 'review':
        return 'medium'
      case 'flag':
        return 'low'
      default:
        return 'low'
    }
  }
}

// Default moderation configuration
const defaultConfig: ContentModerationConfig = {
  enableProfanityFilter: true,
  enableSpamDetection: true,
  enableToxicityDetection: true,
  enablePersonalInfoDetection: true,
  enableLinkFiltering: true,
  customBlockedWords: [],
  allowedDomains: ['youtube.com', 'twitch.tv', 'twitter.com', 'instagram.com'],
  maxMessageLength: 500,
  maxRepeatedCharacters: 3,
}

// Export singleton instance
export const contentModerator = new ContentModerator(defaultConfig)

// Helper functions
export async function moderateText(
  text: string,
  userId: string,
  context?: Record<string, any>
): Promise<ModerationResult> {
  return contentModerator.moderateContent(text, 'text', userId, context)
}

export async function moderateMedia(
  mediaUrl: string,
  mediaType: 'image' | 'video' | 'audio',
  userId: string,
  context?: Record<string, any>
): Promise<ModerationResult> {
  return contentModerator.moderateContent(mediaUrl, mediaType, userId, context)
}

// Validation schemas
export const moderationRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  contentType: z.enum(['text', 'image', 'video', 'audio']),
  userId: z.string().min(1, 'User ID is required'),
  context: z.record(z.any()).optional(),
})

export const moderationActionSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  action: z.enum(['approve', 'reject', 'flag', 'timeout', 'ban']),
  reason: z.string().min(1, 'Reason is required'),
  moderatorId: z.string().min(1, 'Moderator ID is required'),
})
