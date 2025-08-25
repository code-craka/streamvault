/**
 * AI-Powered Content Moderation Service
 * Provides real-time content filtering for uploads and live streams
 */

export interface ModerationResult {
  approved: boolean
  confidence: number
  violations: Violation[]
  categories: ModerationCategory[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: ModerationAction
  reason: string
  detectedEmotes?: string[]
}

export interface Violation {
  type: ViolationType
  description: string
  confidence: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  startTime?: number
  endTime?: number
  context: string
}

export interface ModerationCategory {
  category: string
  score: number
  threshold: number
  violated: boolean
}

export interface ModerationAction {
  type: 'approve' | 'flag' | 'block' | 'review' | 'quarantine'
  reason: string
  autoApplied: boolean
  reviewRequired: boolean
  appealable: boolean
}

export interface LiveStreamModeration {
  streamId: string
  isActive: boolean
  violations: Violation[]
  warningCount: number
  lastViolation?: Date
  moderationLevel: 'strict' | 'moderate' | 'lenient'
  autoActions: boolean
}

export interface ContentAppeal {
  id: string
  contentId: string
  userId: string
  originalViolation: Violation
  appealReason: string
  status: 'pending' | 'approved' | 'rejected' | 'under_review'
  submittedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  reviewNotes?: string
  aiRecommendation?: string
}

export type ViolationType = 
  | 'hate_speech'
  | 'harassment'
  | 'violence'
  | 'adult_content'
  | 'spam'
  | 'copyright'
  | 'misinformation'
  | 'self_harm'
  | 'illegal_content'
  | 'inappropriate_language'
  | 'personal_information'
  | 'impersonation'

export class ContentModerationService {
  private moderationThresholds = {
    hate_speech: 0.8,
    harassment: 0.75,
    violence: 0.85,
    adult_content: 0.9,
    spam: 0.7,
    copyright: 0.95,
    misinformation: 0.8,
    self_harm: 0.9,
    illegal_content: 0.95,
    inappropriate_language: 0.6,
    personal_information: 0.8,
    impersonation: 0.85,
  }

  /**
   * Moderate text content (chat messages, comments, descriptions)
   */
  async moderateText(
    text: string,
    context: 'chat' | 'comment' | 'description' | 'title' = 'chat'
  ): Promise<ModerationResult> {
    try {
      const violations: Violation[] = []
      const categories: ModerationCategory[] = []

      // Check for various violation types
      for (const [type, threshold] of Object.entries(this.moderationThresholds)) {
        const score = await this.analyzeViolationType(text, type as ViolationType)
        const violated = score > threshold

        categories.push({
          category: type,
          score,
          threshold,
          violated,
        })

        if (violated) {
          violations.push({
            type: type as ViolationType,
            description: this.getViolationDescription(type as ViolationType),
            confidence: score,
            severity: this.getSeverity(score),
            context: text.substring(0, 100),
          })
        }
      }

      // Determine overall result
      const highestViolation = violations.reduce((max, v) => 
        v.confidence > max.confidence ? v : max, 
        { confidence: 0 } as Violation
      )

      const approved = violations.length === 0
      const severity = highestViolation.severity || 'low'
      const action = this.determineAction(violations, severity, context)

      // Detect custom emotes
      const detectedEmotes = await this.detectCustomEmotes(text)

      return {
        approved,
        confidence: Math.max(...categories.map(c => c.score), 0),
        violations,
        categories,
        severity,
        action,
        reason: approved ? 'Content approved' : this.generateReason(violations),
        detectedEmotes,
      }
    } catch (error) {
      console.error('Text moderation failed:', error)
      // Fail safe - block content if moderation fails
      return {
        approved: false,
        confidence: 0,
        violations: [],
        categories: [],
        severity: 'critical',
        action: {
          type: 'review',
          reason: 'Moderation service error',
          autoApplied: false,
          reviewRequired: true,
          appealable: true,
        },
        reason: 'Moderation service temporarily unavailable',
      }
    }
  }

  /**
   * Moderate video content for uploads
   */
  async moderateVideo(
    videoPath: string,
    metadata: {
      title: string
      description: string
      tags: string[]
    }
  ): Promise<ModerationResult> {
    try {
      // Moderate metadata first
      const titleResult = await this.moderateText(metadata.title, 'title')
      const descriptionResult = await this.moderateText(metadata.description, 'description')

      // Analyze video content
      const videoAnalysis = await this.analyzeVideoContent(videoPath)
      const audioAnalysis = await this.analyzeAudioContent(videoPath)

      // Combine all results
      const allViolations = [
        ...titleResult.violations,
        ...descriptionResult.violations,
        ...videoAnalysis.violations,
        ...audioAnalysis.violations,
      ]

      const approved = allViolations.length === 0
      const highestSeverity = this.getHighestSeverity(allViolations)
      const action = this.determineAction(allViolations, highestSeverity, 'upload')

      return {
        approved,
        confidence: Math.max(
          titleResult.confidence,
          descriptionResult.confidence,
          videoAnalysis.confidence,
          audioAnalysis.confidence
        ),
        violations: allViolations,
        categories: [
          ...titleResult.categories,
          ...descriptionResult.categories,
          ...videoAnalysis.categories,
          ...audioAnalysis.categories,
        ],
        severity: highestSeverity,
        action,
        reason: approved ? 'Video approved for upload' : this.generateReason(allViolations),
      }
    } catch (error) {
      console.error('Video moderation failed:', error)
      return {
        approved: false,
        confidence: 0,
        violations: [],
        categories: [],
        severity: 'critical',
        action: {
          type: 'review',
          reason: 'Video moderation service error',
          autoApplied: false,
          reviewRequired: true,
          appealable: true,
        },
        reason: 'Video moderation service temporarily unavailable',
      }
    }
  }

  /**
   * Monitor live stream for real-time moderation
   */
  async moderateLiveStream(
    streamId: string,
    audioChunk: Buffer,
    chatMessages: string[]
  ): Promise<LiveStreamModeration> {
    try {
      const violations: Violation[] = []

      // Moderate chat messages
      for (const message of chatMessages) {
        const result = await this.moderateText(message, 'chat')
        if (!result.approved) {
          violations.push(...result.violations)
        }
      }

      // Analyze audio chunk for violations
      const audioViolations = await this.analyzeAudioChunk(audioChunk)
      violations.push(...audioViolations)

      // Get existing stream moderation state
      const existingModeration = await this.getStreamModeration(streamId)
      const warningCount = existingModeration.warningCount + violations.length

      // Determine if stream should be automatically actioned
      const autoActions = this.shouldTakeAutoAction(violations, warningCount)

      return {
        streamId,
        isActive: true,
        violations: [...existingModeration.violations, ...violations],
        warningCount,
        lastViolation: violations.length > 0 ? new Date() : existingModeration.lastViolation,
        moderationLevel: this.determineModerationLevel(warningCount),
        autoActions,
      }
    } catch (error) {
      console.error('Live stream moderation failed:', error)
      return {
        streamId,
        isActive: false,
        violations: [],
        warningCount: 0,
        moderationLevel: 'strict',
        autoActions: false,
      }
    }
  }

  /**
   * Process content appeal with AI assistance
   */
  async processContentAppeal(appeal: ContentAppeal): Promise<{
    recommendation: 'approve' | 'reject' | 'needs_human_review'
    confidence: number
    reasoning: string
    suggestedAction?: string
  }> {
    try {
      // Re-analyze the original content with current models
      const reanalysis = await this.moderateText(appeal.appealReason)

      // Analyze the appeal reasoning
      const appealSentiment = await this.analyzeAppealSentiment(appeal.appealReason)

      // Check if original violation was borderline
      const originalConfidence = appeal.originalViolation.confidence
      const wasBorderline = originalConfidence < (this.moderationThresholds[appeal.originalViolation.type] + 0.1)

      let recommendation: 'approve' | 'reject' | 'needs_human_review'
      let confidence: number
      let reasoning: string

      if (reanalysis.approved && wasBorderline && appealSentiment.isGenuine) {
        recommendation = 'approve'
        confidence = 0.85
        reasoning = 'Re-analysis suggests content may have been incorrectly flagged. Appeal appears genuine.'
      } else if (!reanalysis.approved && originalConfidence > 0.9) {
        recommendation = 'reject'
        confidence = 0.9
        reasoning = 'Re-analysis confirms original violation. High confidence in moderation decision.'
      } else {
        recommendation = 'needs_human_review'
        confidence = 0.6
        reasoning = 'Case requires human judgment due to borderline violation or complex context.'
      }

      return {
        recommendation,
        confidence,
        reasoning,
        suggestedAction: this.getSuggestedAppealAction(recommendation, appeal),
      }
    } catch (error) {
      console.error('Appeal processing failed:', error)
      return {
        recommendation: 'needs_human_review',
        confidence: 0,
        reasoning: 'Unable to process appeal automatically due to system error',
      }
    }
  }

  /**
   * Analyze specific violation type in text
   */
  private async analyzeViolationType(text: string, type: ViolationType): Promise<number> {
    // Mock implementation - in production would use specialized AI models
    const keywords = this.getViolationKeywords(type)
    const lowerText = text.toLowerCase()
    
    let score = 0
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += 0.3
      }
    }

    // Add some randomness to simulate AI confidence
    score += Math.random() * 0.2

    return Math.min(score, 1.0)
  }

  /**
   * Get violation keywords for different types
   */
  private getViolationKeywords(type: ViolationType): string[] {
    const keywordMap = {
      hate_speech: ['hate', 'racist', 'bigot', 'nazi'],
      harassment: ['harass', 'bully', 'threaten', 'stalk'],
      violence: ['kill', 'murder', 'violence', 'attack'],
      adult_content: ['explicit', 'nsfw', 'adult', 'sexual'],
      spam: ['spam', 'scam', 'fake', 'bot'],
      copyright: ['copyright', 'dmca', 'stolen', 'pirated'],
      misinformation: ['fake news', 'conspiracy', 'hoax', 'false'],
      self_harm: ['suicide', 'self harm', 'cutting', 'depression'],
      illegal_content: ['illegal', 'drugs', 'weapons', 'fraud'],
      inappropriate_language: ['profanity', 'curse', 'swear', 'offensive'],
      personal_information: ['phone', 'address', 'ssn', 'credit card'],
      impersonation: ['impersonate', 'fake account', 'pretend', 'identity'],
    }

    return keywordMap[type] || []
  }

  /**
   * Get violation description
   */
  private getViolationDescription(type: ViolationType): string {
    const descriptions = {
      hate_speech: 'Content contains hate speech or discriminatory language',
      harassment: 'Content appears to harass or bully individuals',
      violence: 'Content contains violent or threatening language',
      adult_content: 'Content contains adult or sexually explicit material',
      spam: 'Content appears to be spam or promotional',
      copyright: 'Content may violate copyright laws',
      misinformation: 'Content may contain false or misleading information',
      self_harm: 'Content discusses self-harm or suicide',
      illegal_content: 'Content may promote illegal activities',
      inappropriate_language: 'Content contains inappropriate language',
      personal_information: 'Content contains personal information',
      impersonation: 'Content may involve impersonation',
    }

    return descriptions[type] || 'Content violates community guidelines'
  }

  /**
   * Determine severity based on confidence score
   */
  private getSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score > 0.9) return 'critical'
    if (score > 0.8) return 'high'
    if (score > 0.6) return 'medium'
    return 'low'
  }

  /**
   * Determine moderation action
   */
  private determineAction(
    violations: Violation[],
    severity: string,
    context: string
  ): ModerationAction {
    if (violations.length === 0) {
      return {
        type: 'approve',
        reason: 'No violations detected',
        autoApplied: true,
        reviewRequired: false,
        appealable: false,
      }
    }

    if (severity === 'critical') {
      return {
        type: 'block',
        reason: 'Critical violation detected',
        autoApplied: true,
        reviewRequired: false,
        appealable: true,
      }
    }

    if (severity === 'high') {
      return {
        type: context === 'chat' ? 'flag' : 'quarantine',
        reason: 'High severity violation',
        autoApplied: true,
        reviewRequired: true,
        appealable: true,
      }
    }

    return {
      type: 'flag',
      reason: 'Potential violation detected',
      autoApplied: false,
      reviewRequired: true,
      appealable: true,
    }
  }

  /**
   * Generate reason for moderation decision
   */
  private generateReason(violations: Violation[]): string {
    if (violations.length === 0) return 'Content approved'
    
    const primaryViolation = violations[0]
    return `Content blocked due to: ${primaryViolation.description}`
  }

  /**
   * Detect custom emotes in text
   */
  private async detectCustomEmotes(text: string): Promise<string[]> {
    // Simple emote detection - in production would use more sophisticated matching
    const emotePattern = /:[a-zA-Z0-9_]+:/g
    const matches = text.match(emotePattern)
    return matches || []
  }

  /**
   * Analyze video content for violations
   */
  private async analyzeVideoContent(videoPath: string): Promise<{
    violations: Violation[]
    categories: ModerationCategory[]
    confidence: number
  }> {
    // Mock implementation - in production would use computer vision
    return {
      violations: [],
      categories: [],
      confidence: 0.1,
    }
  }

  /**
   * Analyze audio content for violations
   */
  private async analyzeAudioContent(videoPath: string): Promise<{
    violations: Violation[]
    categories: ModerationCategory[]
    confidence: number
  }> {
    // Mock implementation - in production would use audio analysis
    return {
      violations: [],
      categories: [],
      confidence: 0.1,
    }
  }

  /**
   * Analyze audio chunk for live stream violations
   */
  private async analyzeAudioChunk(audioChunk: Buffer): Promise<Violation[]> {
    // Mock implementation - in production would analyze audio in real-time
    return []
  }

  /**
   * Get existing stream moderation state
   */
  private async getStreamModeration(streamId: string): Promise<LiveStreamModeration> {
    // Mock implementation - in production would query database
    return {
      streamId,
      isActive: true,
      violations: [],
      warningCount: 0,
      moderationLevel: 'moderate',
      autoActions: false,
    }
  }

  /**
   * Determine if auto action should be taken
   */
  private shouldTakeAutoAction(violations: Violation[], warningCount: number): boolean {
    const criticalViolations = violations.filter(v => v.severity === 'critical')
    const highViolations = violations.filter(v => v.severity === 'high')

    return criticalViolations.length > 0 || highViolations.length > 2 || warningCount > 5
  }

  /**
   * Determine moderation level based on warning count
   */
  private determineModerationLevel(warningCount: number): 'strict' | 'moderate' | 'lenient' {
    if (warningCount > 10) return 'strict'
    if (warningCount > 5) return 'moderate'
    return 'lenient'
  }

  /**
   * Get highest severity from violations
   */
  private getHighestSeverity(violations: Violation[]): 'low' | 'medium' | 'high' | 'critical' {
    if (violations.some(v => v.severity === 'critical')) return 'critical'
    if (violations.some(v => v.severity === 'high')) return 'high'
    if (violations.some(v => v.severity === 'medium')) return 'medium'
    return 'low'
  }

  /**
   * Analyze appeal sentiment to determine if it's genuine
   */
  private async analyzeAppealSentiment(appealText: string): Promise<{
    isGenuine: boolean
    confidence: number
  }> {
    // Simple implementation - in production would use sentiment analysis
    const genuineIndicators = ['mistake', 'misunderstood', 'context', 'explain', 'sorry']
    const lowerText = appealText.toLowerCase()
    
    const genuineScore = genuineIndicators.reduce((score, indicator) => {
      return lowerText.includes(indicator) ? score + 0.2 : score
    }, 0)

    return {
      isGenuine: genuineScore > 0.4,
      confidence: Math.min(genuineScore, 1.0),
    }
  }

  /**
   * Get suggested action for appeal
   */
  private getSuggestedAppealAction(
    recommendation: 'approve' | 'reject' | 'needs_human_review',
    appeal: ContentAppeal
  ): string {
    switch (recommendation) {
      case 'approve':
        return 'Restore content and notify user of successful appeal'
      case 'reject':
        return 'Maintain original decision and provide detailed explanation'
      case 'needs_human_review':
        return 'Escalate to human moderator for detailed review'
      default:
        return 'No action recommended'
    }
  }
}