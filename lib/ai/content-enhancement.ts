/**
 * Advanced AI Content Enhancement Service
 * Integrates all AI features for comprehensive content processing
 */

import { Storage } from '@google-cloud/storage'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc, getDoc } from 'firebase/firestore'
import {
  TranscriptionService,
  TranscriptionResult,
  MultiLanguageSubtitles,
} from './transcription-service'
import {
  AdvancedContentAnalysis,
  Scene,
  Highlight,
  ContentOptimization,
} from './advanced-content-analysis'
import {
  SentimentAnalysisService,
  SentimentResult,
  AudienceEngagementSentiment,
} from './sentiment-analysis'
import {
  ContentModerationService,
  ModerationResult,
} from './content-moderation'
import {
  CopyrightDetectionService,
  CopyrightScanResult,
  DMCATakedown,
  CounterClaim,
} from './copyright-detection'

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!)

export interface ComprehensiveVideoAnalysis {
  videoId: string
  transcription: TranscriptionResult
  multiLanguageSubtitles: MultiLanguageSubtitles[]
  scenes: Scene[]
  highlights: Highlight[]
  contentOptimization: ContentOptimization
  sentimentAnalysis: SentimentResult
  moderationResult: ModerationResult
  copyrightScan: CopyrightScanResult
  aiGenerated: {
    thumbnails: string[]
    title: string
    description: string
    tags: string[]
    categories: string[]
  }
  processedAt: Date
  processingTime: number
}

export interface LiveStreamAnalysis {
  streamId: string
  realTimeModeration: ModerationResult[]
  audienceEngagement: AudienceEngagementSentiment
  contentSentiment: SentimentResult
  copyrightAlerts: CopyrightScanResult[]
  recommendedActions: string[]
  timestamp: Date
}

export interface ContentAppealProcess {
  appealId: string
  originalViolation: any
  appealReason: string
  aiRecommendation: {
    decision: 'approve' | 'reject' | 'needs_review'
    confidence: number
    reasoning: string
  }
  humanReviewRequired: boolean
  status: 'pending' | 'approved' | 'rejected' | 'under_review'
}

export interface VideoMetadata {
  videoId: string
  title: string
  description: string
  tags: string[]
  category: string
  duration: number
  thumbnails: string[]
  quality: VideoQuality
  aiGenerated: {
    thumbnails: string[]
    title: string
    description: string
    tags: string[]
    category: string
    confidence: number
    highlights: Highlight[]
    scenes: Scene[]
    transcription?: string
  }
  processedAt: Date
  createdAt: Date
}

export interface ContentQualityScore {
  overall: number
  video: number
  audio: number
  engagement: number
  suggestions: string[]
}

export type VideoQuality = '480p' | '720p' | '1080p' | '4K'

export class AIContentEnhancement {
  private transcriptionService: TranscriptionService
  private contentAnalysis: AdvancedContentAnalysis
  private sentimentService: SentimentAnalysisService
  private moderationService: ContentModerationService
  private copyrightService: CopyrightDetectionService
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY
  private readonly GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

  constructor() {
    this.transcriptionService = new TranscriptionService()
    this.contentAnalysis = new AdvancedContentAnalysis()
    this.sentimentService = new SentimentAnalysisService()
    this.moderationService = new ContentModerationService()
    this.copyrightService = new CopyrightDetectionService()
  }

  /**
   * Comprehensive video processing with all AI features
   */
  async processUploadedVideo(
    videoId: string,
    videoPath: string,
    metadata: {
      title: string
      description: string
      tags: string[]
    }
  ): Promise<ComprehensiveVideoAnalysis> {
    const startTime = Date.now()

    try {
      console.log(`Starting comprehensive AI analysis for video ${videoId}`)

      // Step 1: High-accuracy transcription (>95%)
      const transcription = await this.transcriptionService.transcribeVideo(
        videoPath,
        'en-US'
      )
      console.log(
        `Transcription completed with ${transcription.confidence * 100}% confidence`
      )

      // Step 2: Multi-language subtitle generation
      const multiLanguageSubtitles =
        await this.transcriptionService.generateMultiLanguageSubtitles(
          videoPath,
          ['en-US', 'es-ES', 'fr-FR', 'de-DE']
        )
      console.log(
        `Generated subtitles in ${multiLanguageSubtitles.length} languages`
      )

      // Step 3: AI scene detection and analysis
      const scenes = await this.contentAnalysis.detectScenes(videoPath)
      console.log(`Detected ${scenes.length} scenes`)

      // Step 4: Automatic highlight creation
      const highlights = await this.contentAnalysis.createAutomaticHighlights(
        scenes,
        transcription.text
      )
      console.log(`Created ${highlights.length} highlights`)

      // Step 5: Content optimization recommendations
      const contentOptimization =
        await this.contentAnalysis.generateContentOptimization(
          videoPath,
          scenes,
          transcription.text
        )
      console.log(
        `Generated ${contentOptimization.recommendations.length} optimization recommendations`
      )

      // Step 6: Sentiment analysis
      const sentimentAnalysis =
        await this.sentimentService.analyzeContentSentiment(transcription.text)
      console.log(
        `Content sentiment: ${sentimentAnalysis.overall.label} (${sentimentAnalysis.overall.polarity})`
      )

      // Step 7: Content moderation
      const moderationResult = await this.moderationService.moderateVideo(
        videoPath,
        metadata
      )
      console.log(
        `Moderation result: ${moderationResult.approved ? 'APPROVED' : 'FLAGGED'}`
      )

      // Step 8: Copyright detection
      const copyrightScan = await this.copyrightService.scanContent(
        videoPath,
        'video',
        {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
        }
      )
      console.log(
        `Copyright scan: ${copyrightScan.hasViolation ? 'VIOLATIONS FOUND' : 'CLEAR'}`
      )

      // Step 9: AI-generated metadata
      const aiGenerated = await this.generateEnhancedMetadata(
        videoPath,
        transcription.text,
        scenes,
        sentimentAnalysis
      )

      const processingTime = Date.now() - startTime

      const result: ComprehensiveVideoAnalysis = {
        videoId,
        transcription,
        multiLanguageSubtitles,
        scenes,
        highlights,
        contentOptimization,
        sentimentAnalysis,
        moderationResult,
        copyrightScan,
        aiGenerated,
        processedAt: new Date(),
        processingTime,
      }

      // Store comprehensive analysis results
      await this.storeComprehensiveAnalysis(videoId, result)

      return result
    } catch (error) {
      console.error('Comprehensive video analysis failed:', error)
      throw new Error(`AI content enhancement failed: ${error.message}`)
    }
  }

  /**
   * Real-time live stream analysis and moderation
   */
  async analyzeLiveStream(
    streamId: string,
    audioChunk: Buffer,
    chatMessages: string[],
    reactions: any[]
  ): Promise<LiveStreamAnalysis> {
    try {
      // Real-time content moderation
      const realTimeModeration: ModerationResult[] = []
      for (const message of chatMessages) {
        const modResult = await this.moderationService.moderateText(
          message,
          'chat'
        )
        if (!modResult.approved) {
          realTimeModeration.push(modResult)
        }
      }

      // Audience engagement sentiment analysis
      const audienceEngagement =
        await this.sentimentService.analyzeAudienceEngagement(
          chatMessages.map((msg, i) => ({
            id: i.toString(),
            message: msg,
            timestamp: new Date(),
          })),
          reactions,
          []
        )

      // Content sentiment from chat
      const chatText = chatMessages.join(' ')
      const contentSentiment =
        await this.sentimentService.analyzeContentSentiment(chatText)

      // Copyright monitoring (for music/audio)
      const copyrightAlerts: CopyrightScanResult[] = []
      if (audioChunk.length > 0) {
        // In production, would analyze audio chunk for copyright
        const mockScan = await this.copyrightService.scanContent(
          'audio_chunk',
          'audio'
        )
        if (mockScan.hasViolation) {
          copyrightAlerts.push(mockScan)
        }
      }

      // Generate recommended actions
      const recommendedActions = this.generateLiveStreamRecommendations(
        realTimeModeration,
        audienceEngagement,
        copyrightAlerts
      )

      return {
        streamId,
        realTimeModeration,
        audienceEngagement,
        contentSentiment,
        copyrightAlerts,
        recommendedActions,
        timestamp: new Date(),
      }
    } catch (error) {
      console.error('Live stream analysis failed:', error)
      throw new Error(`Live stream AI analysis failed: ${error.message}`)
    }
  }

  /**
   * Process content appeal with AI assistance
   */
  async processContentAppeal(
    contentId: string,
    originalViolation: any,
    appealReason: string,
    userId: string
  ): Promise<ContentAppealProcess> {
    try {
      const appealId = `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Use AI to analyze the appeal
      const aiRecommendation =
        await this.moderationService.processContentAppeal({
          id: appealId,
          contentId,
          userId,
          originalViolation,
          appealReason,
          status: 'pending',
          submittedAt: new Date(),
        })

      // Determine if human review is needed
      const humanReviewRequired =
        aiRecommendation.confidence < 0.8 ||
        aiRecommendation.recommendation === 'needs_human_review'

      return {
        appealId,
        originalViolation,
        appealReason,
        aiRecommendation: {
          decision: aiRecommendation.recommendation,
          confidence: aiRecommendation.confidence,
          reasoning: aiRecommendation.reasoning,
        },
        humanReviewRequired,
        status: humanReviewRequired ? 'under_review' : 'pending',
      }
    } catch (error) {
      console.error('Content appeal processing failed:', error)
      throw new Error(`Content appeal processing failed: ${error.message}`)
    }
  }

  /**
   * Export subtitles in various formats
   */
  async exportSubtitles(
    videoId: string,
    language: string,
    format: 'srt' | 'vtt' | 'ass' = 'srt'
  ): Promise<string> {
    try {
      // Get stored analysis
      const analysis = await this.getStoredAnalysis(videoId)
      if (!analysis) {
        throw new Error('Video analysis not found')
      }

      // Find subtitles for requested language
      const subtitles = analysis.multiLanguageSubtitles.find(
        sub => sub.languageCode === language
      )

      if (!subtitles) {
        throw new Error(`Subtitles not available for language: ${language}`)
      }

      return await this.transcriptionService.exportSubtitles(subtitles, format)
    } catch (error) {
      console.error('Subtitle export failed:', error)
      throw new Error(`Subtitle export failed: ${error.message}`)
    }
  }

  /**
   * Generate enhanced metadata using AI
   */
  private async generateEnhancedMetadata(
    videoPath: string,
    transcription: string,
    scenes: Scene[],
    sentiment: SentimentResult
  ): Promise<{
    thumbnails: string[]
    title: string
    description: string
    tags: string[]
    categories: string[]
  }> {
    // Generate AI thumbnails from key scenes
    const thumbnails = await this.generateAIThumbnails(scenes, videoPath)

    // Generate optimized title
    const title = await this.generateOptimizedTitle(transcription, sentiment)

    // Generate comprehensive description
    const description = await this.generateOptimizedDescription(
      transcription,
      scenes,
      sentiment
    )

    // Generate relevant tags
    const tags = await this.generateOptimizedTags(
      transcription,
      scenes,
      sentiment
    )

    // Categorize content
    const categories = await this.categorizeContent(
      transcription,
      scenes,
      sentiment
    )

    return {
      thumbnails,
      title,
      description,
      tags,
      categories,
    }
  }

  /**
   * Generate AI thumbnails from key scenes
   */
  private async generateAIThumbnails(
    scenes: Scene[],
    videoPath: string
  ): Promise<string[]> {
    const thumbnails: string[] = []

    // Select best scenes for thumbnails
    const bestScenes = scenes
      .filter(scene => scene.confidence > 0.8)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)

    for (const scene of bestScenes) {
      // Extract frame at scene midpoint
      const frameTime = (scene.startTime + scene.endTime) / 2
      const thumbnailUrl = await this.extractFrameAsThumbnail(
        videoPath,
        frameTime
      )
      thumbnails.push(thumbnailUrl)
    }

    return thumbnails
  }

  /**
   * Generate optimized title using AI
   */
  private async generateOptimizedTitle(
    transcription: string,
    sentiment: SentimentResult
  ): Promise<string> {
    // Extract key topics and phrases
    const keyPhrases = sentiment.topics.slice(0, 3).map(topic => topic.topic)

    // Generate title based on content and sentiment
    if (sentiment.overall.label === 'very_positive') {
      return `Amazing ${keyPhrases.join(' & ')} - Must Watch!`
    } else if (sentiment.overall.label === 'positive') {
      return `Great ${keyPhrases.join(' and ')} Content`
    } else {
      return `${keyPhrases.join(' - ')} Discussion`
    }
  }

  /**
   * Generate optimized description using AI
   */
  private async generateOptimizedDescription(
    transcription: string,
    scenes: Scene[],
    sentiment: SentimentResult
  ): Promise<string> {
    const summary = transcription.substring(0, 200) + '...'
    const sceneCount = scenes.length
    const sentimentLabel = sentiment.overall.label

    return `
This video features ${sceneCount} distinct scenes with ${sentimentLabel} content.

${summary}

Key topics covered:
${sentiment.topics
  .slice(0, 5)
  .map(topic => `• ${topic.topic}`)
  .join('\n')}

Generated with AI-powered content analysis for optimal discoverability.
    `.trim()
  }

  /**
   * Generate optimized tags using AI
   */
  private async generateOptimizedTags(
    transcription: string,
    scenes: Scene[],
    sentiment: SentimentResult
  ): Promise<string[]> {
    const tags: string[] = []

    // Add sentiment-based tags
    tags.push(sentiment.overall.label.replace('_', ' '))

    // Add topic-based tags
    tags.push(...sentiment.topics.slice(0, 5).map(topic => topic.topic))

    // Add scene-based tags
    const sceneTypes = [...new Set(scenes.map(scene => scene.type))]
    tags.push(...sceneTypes)

    // Add AI-generated tags
    tags.push('ai-enhanced', 'auto-generated', 'optimized')

    return [...new Set(tags)].slice(0, 15) // Remove duplicates and limit
  }

  /**
   * Categorize content using AI
   */
  private async categorizeContent(
    transcription: string,
    scenes: Scene[],
    sentiment: SentimentResult
  ): Promise<string[]> {
    const categories: string[] = []

    // Categorize based on content analysis
    if (scenes.some(scene => scene.type === 'action')) {
      categories.push('Action')
    }

    if (sentiment.emotions.joy > 0.5) {
      categories.push('Entertainment')
    }

    if (
      transcription.toLowerCase().includes('learn') ||
      transcription.toLowerCase().includes('tutorial')
    ) {
      categories.push('Education')
    }

    if (sentiment.overall.label.includes('positive')) {
      categories.push('Positive Content')
    }

    // Default category
    if (categories.length === 0) {
      categories.push('General')
    }

    return categories
  }

  /**
   * Generate live stream recommendations
   */
  private generateLiveStreamRecommendations(
    moderation: ModerationResult[],
    engagement: AudienceEngagementSentiment,
    copyrightAlerts: CopyrightScanResult[]
  ): string[] {
    const recommendations: string[] = []

    if (moderation.length > 0) {
      recommendations.push('Enable stricter chat moderation due to violations')
    }

    if (engagement.engagementMetrics.negativeEngagementRate > 0.3) {
      recommendations.push(
        'Consider adjusting content tone - audience sentiment declining'
      )
    }

    if (copyrightAlerts.length > 0) {
      recommendations.push(
        'Copyright content detected - consider muting audio or changing music'
      )
    }

    if (engagement.audienceMood.currentMood === 'excited') {
      recommendations.push(
        'Audience is highly engaged - great time for call-to-action'
      )
    }

    return recommendations
  }

  /**
   * Extract frame as thumbnail
   */
  private async extractFrameAsThumbnail(
    videoPath: string,
    timeInSeconds: number
  ): Promise<string> {
    // Mock implementation - in production would use FFmpeg or similar
    return `https://storage.example.com/thumbnails/frame_${timeInSeconds}.jpg`
  }

  /**
   * Store comprehensive analysis results
   */
  private async storeComprehensiveAnalysis(
    videoId: string,
    analysis: ComprehensiveVideoAnalysis
  ): Promise<void> {
    try {
      const analysisRef = doc(db, 'video_analysis', videoId)
      await setDoc(analysisRef, analysis)
    } catch (error) {
      console.error('Failed to store comprehensive analysis:', error)
      throw error
    }
  }

  /**
   * Get stored analysis results
   */
  private async getStoredAnalysis(
    videoId: string
  ): Promise<ComprehensiveVideoAnalysis | null> {
    try {
      const analysisRef = doc(db, 'video_analysis', videoId)
      const analysisDoc = await getDoc(analysisRef)

      if (analysisDoc.exists()) {
        return analysisDoc.data() as ComprehensiveVideoAnalysis
      }

      return null
    } catch (error) {
      console.error('Failed to get stored analysis:', error)
      return null
    }
  }

  // Legacy methods for backward compatibility
  async generateThumbnails(videoPath: string): Promise<string[]> {
    const keyFrames = await this.extractKeyFrames(videoPath)
    const thumbnails: string[] = []

    for (let i = 0; i < Math.min(keyFrames.length, 5); i++) {
      const frame = keyFrames[i]
      const thumbnailUrl = await this.uploadThumbnail(frame, `thumbnail_${i}`)
      thumbnails.push(thumbnailUrl)
    }

    return thumbnails
  }

  private async extractKeyFrames(videoPath: string): Promise<Buffer[]> {
    // Simulate key frame extraction
    return [Buffer.from('frame1'), Buffer.from('frame2'), Buffer.from('frame3')]
  }

  private async uploadThumbnail(
    frameBuffer: Buffer,
    filename: string
  ): Promise<string> {
    try {
      const file = bucket.file(`thumbnails/${filename}.jpg`)
      await file.save(frameBuffer, {
        metadata: {
          contentType: 'image/jpeg',
        },
      })

      return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/thumbnails/${filename}.jpg`
    } catch (error) {
      console.error('Thumbnail upload failed:', error)
      return ''
    }
  }
}

// Export singleton instance
export const aiContentEnhancement = new AIContentEnhancement()
