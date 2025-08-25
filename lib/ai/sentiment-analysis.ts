/**
 * Sentiment Analysis Service
 * Provides content and audience engagement sentiment tracking
 */

export interface SentimentResult {
  overall: SentimentScore
  segments: SentimentSegment[]
  emotions: EmotionAnalysis
  topics: TopicSentiment[]
  trends: SentimentTrend[]
}

export interface SentimentScore {
  polarity: number // -1 to 1 (negative to positive)
  magnitude: number // 0 to 1 (intensity)
  confidence: number // 0 to 1
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
}

export interface SentimentSegment {
  startTime: number
  endTime: number
  text: string
  sentiment: SentimentScore
  keyPhrases: string[]
}

export interface EmotionAnalysis {
  joy: number
  anger: number
  fear: number
  sadness: number
  surprise: number
  disgust: number
  trust: number
  anticipation: number
}

export interface TopicSentiment {
  topic: string
  sentiment: SentimentScore
  mentions: number
  relevance: number
}

export interface SentimentTrend {
  timeWindow: string
  sentiment: SentimentScore
  volume: number
  keyEvents: string[]
}

export interface AudienceEngagementSentiment {
  chatSentiment: SentimentResult
  reactionSentiment: ReactionSentiment
  engagementMetrics: EngagementSentimentMetrics
  audienceMood: AudienceMood
}

export interface ReactionSentiment {
  likes: number
  dislikes: number
  shares: number
  comments: CommentSentiment[]
  overallReactionScore: number
}

export interface CommentSentiment {
  id: string
  text: string
  sentiment: SentimentScore
  timestamp: Date
  userId: string
  replies: CommentSentiment[]
}

export interface EngagementSentimentMetrics {
  positiveEngagementRate: number
  negativeEngagementRate: number
  neutralEngagementRate: number
  sentimentVolatility: number
  peakSentimentTimes: number[]
  lowSentimentTimes: number[]
}

export interface AudienceMood {
  currentMood: string
  moodHistory: MoodPoint[]
  moodPrediction: MoodPrediction
  influencingFactors: string[]
}

export interface MoodPoint {
  timestamp: Date
  mood: string
  intensity: number
  context: string
}

export interface MoodPrediction {
  predictedMood: string
  confidence: number
  timeframe: string
  factors: string[]
}

export class SentimentAnalysisService {
  /**
   * Analyze sentiment of content transcription
   */
  async analyzeContentSentiment(transcription: string): Promise<SentimentResult> {
    try {
      const segments = this.segmentTranscription(transcription)
      const sentimentSegments: SentimentSegment[] = []

      for (const segment of segments) {
        const sentiment = await this.analyzeSentiment(segment.text)
        const keyPhrases = await this.extractKeyPhrases(segment.text)

        sentimentSegments.push({
          startTime: segment.startTime,
          endTime: segment.endTime,
          text: segment.text,
          sentiment,
          keyPhrases,
        })
      }

      const overall = this.calculateOverallSentiment(sentimentSegments)
      const emotions = await this.analyzeEmotions(transcription)
      const topics = await this.analyzeTopicSentiment(transcription)
      const trends = this.calculateSentimentTrends(sentimentSegments)

      return {
        overall,
        segments: sentimentSegments,
        emotions,
        topics,
        trends,
      }
    } catch (error) {
      console.error('Content sentiment analysis failed:', error)
      throw new Error(`Sentiment analysis error: ${error.message}`)
    }
  }

  /**
   * Analyze audience engagement sentiment
   */
  async analyzeAudienceEngagement(
    chatMessages: any[],
    reactions: any[],
    comments: any[]
  ): Promise<AudienceEngagementSentiment> {
    try {
      // Analyze chat sentiment
      const chatText = chatMessages.map(msg => msg.message).join(' ')
      const chatSentiment = await this.analyzeContentSentiment(chatText)

      // Analyze reaction sentiment
      const reactionSentiment = this.analyzeReactions(reactions, comments)

      // Calculate engagement metrics
      const engagementMetrics = this.calculateEngagementSentimentMetrics(
        chatSentiment,
        reactionSentiment
      )

      // Determine audience mood
      const audienceMood = await this.analyzeAudienceMood(
        chatMessages,
        reactions,
        engagementMetrics
      )

      return {
        chatSentiment,
        reactionSentiment,
        engagementMetrics,
        audienceMood,
      }
    } catch (error) {
      console.error('Audience engagement analysis failed:', error)
      throw new Error(`Audience engagement analysis error: ${error.message}`)
    }
  }

  /**
   * Track sentiment trends over time
   */
  async trackSentimentTrends(
    contentId: string,
    timeWindow: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<SentimentTrend[]> {
    // Mock implementation - in production would query historical data
    const mockTrends: SentimentTrend[] = [
      {
        timeWindow: '2024-01-01T00:00:00Z',
        sentiment: {
          polarity: 0.3,
          magnitude: 0.7,
          confidence: 0.85,
          label: 'positive',
        },
        volume: 150,
        keyEvents: ['positive feedback', 'engaging content'],
      },
      {
        timeWindow: '2024-01-01T01:00:00Z',
        sentiment: {
          polarity: 0.1,
          magnitude: 0.5,
          confidence: 0.80,
          label: 'neutral',
        },
        volume: 120,
        keyEvents: ['technical issues', 'mixed reactions'],
      },
    ]

    return mockTrends
  }

  /**
   * Generate sentiment insights and recommendations
   */
  async generateSentimentInsights(
    contentSentiment: SentimentResult,
    audienceSentiment: AudienceEngagementSentiment
  ): Promise<{
    insights: string[]
    recommendations: string[]
    alerts: string[]
  }> {
    const insights: string[] = []
    const recommendations: string[] = []
    const alerts: string[] = []

    // Content sentiment insights
    if (contentSentiment.overall.polarity > 0.5) {
      insights.push('Content has very positive sentiment, likely to engage audience well')
    } else if (contentSentiment.overall.polarity < -0.3) {
      insights.push('Content has negative sentiment, may impact audience engagement')
      alerts.push('Negative content sentiment detected')
    }

    // Audience engagement insights
    if (audienceSentiment.engagementMetrics.positiveEngagementRate > 0.7) {
      insights.push('Audience is highly engaged with positive sentiment')
    } else if (audienceSentiment.engagementMetrics.negativeEngagementRate > 0.4) {
      insights.push('High negative engagement detected in audience')
      alerts.push('Audience showing negative sentiment')
    }

    // Recommendations
    if (contentSentiment.overall.magnitude < 0.5) {
      recommendations.push('Consider adding more emotional content to increase engagement')
    }

    if (audienceSentiment.engagementMetrics.sentimentVolatility > 0.7) {
      recommendations.push('Audience sentiment is volatile - consider moderating content tone')
    }

    return { insights, recommendations, alerts }
  }

  /**
   * Segment transcription into time-based chunks
   */
  private segmentTranscription(transcription: string): Array<{
    text: string
    startTime: number
    endTime: number
  }> {
    // Simple segmentation - in production would use actual timing data
    const sentences = transcription.split(/[.!?]+/).filter(s => s.trim())
    const segmentDuration = 30 // 30 seconds per segment

    return sentences.map((sentence, index) => ({
      text: sentence.trim(),
      startTime: index * segmentDuration,
      endTime: (index + 1) * segmentDuration,
    }))
  }

  /**
   * Analyze sentiment of text using AI
   */
  private async analyzeSentiment(text: string): Promise<SentimentScore> {
    // Mock implementation - in production would use Google Cloud Natural Language API
    const words = text.toLowerCase().split(' ')
    
    // Simple keyword-based sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'awesome']
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible']

    const positiveCount = words.filter(word => positiveWords.includes(word)).length
    const negativeCount = words.filter(word => negativeWords.includes(word)).length

    const polarity = (positiveCount - negativeCount) / Math.max(words.length, 1)
    const magnitude = (positiveCount + negativeCount) / Math.max(words.length, 1)

    let label: SentimentScore['label']
    if (polarity > 0.3) label = 'very_positive'
    else if (polarity > 0.1) label = 'positive'
    else if (polarity > -0.1) label = 'neutral'
    else if (polarity > -0.3) label = 'negative'
    else label = 'very_negative'

    return {
      polarity: Math.max(-1, Math.min(1, polarity)),
      magnitude: Math.max(0, Math.min(1, magnitude)),
      confidence: 0.85,
      label,
    }
  }

  /**
   * Extract key phrases from text
   */
  private async extractKeyPhrases(text: string): Promise<string[]> {
    // Simple implementation - in production would use NLP libraries
    const words = text.toLowerCase().split(' ')
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
    
    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5)
  }

  /**
   * Analyze emotions in text
   */
  private async analyzeEmotions(text: string): Promise<EmotionAnalysis> {
    // Mock implementation - in production would use emotion detection AI
    return {
      joy: 0.3,
      anger: 0.1,
      fear: 0.05,
      sadness: 0.1,
      surprise: 0.2,
      disgust: 0.05,
      trust: 0.15,
      anticipation: 0.05,
    }
  }

  /**
   * Analyze sentiment by topic
   */
  private async analyzeTopicSentiment(text: string): Promise<TopicSentiment[]> {
    // Mock implementation - in production would use topic modeling
    return [
      {
        topic: 'product features',
        sentiment: {
          polarity: 0.4,
          magnitude: 0.6,
          confidence: 0.8,
          label: 'positive',
        },
        mentions: 5,
        relevance: 0.8,
      },
    ]
  }

  /**
   * Calculate overall sentiment from segments
   */
  private calculateOverallSentiment(segments: SentimentSegment[]): SentimentScore {
    if (segments.length === 0) {
      return {
        polarity: 0,
        magnitude: 0,
        confidence: 0,
        label: 'neutral',
      }
    }

    const avgPolarity = segments.reduce((sum, seg) => sum + seg.sentiment.polarity, 0) / segments.length
    const avgMagnitude = segments.reduce((sum, seg) => sum + seg.sentiment.magnitude, 0) / segments.length
    const avgConfidence = segments.reduce((sum, seg) => sum + seg.sentiment.confidence, 0) / segments.length

    let label: SentimentScore['label']
    if (avgPolarity > 0.3) label = 'very_positive'
    else if (avgPolarity > 0.1) label = 'positive'
    else if (avgPolarity > -0.1) label = 'neutral'
    else if (avgPolarity > -0.3) label = 'negative'
    else label = 'very_negative'

    return {
      polarity: avgPolarity,
      magnitude: avgMagnitude,
      confidence: avgConfidence,
      label,
    }
  }

  /**
   * Calculate sentiment trends over time
   */
  private calculateSentimentTrends(segments: SentimentSegment[]): SentimentTrend[] {
    // Group segments into time windows and calculate trends
    const windowSize = 60 // 1 minute windows
    const trends: SentimentTrend[] = []

    for (let i = 0; i < segments.length; i += 3) {
      const windowSegments = segments.slice(i, i + 3)
      const windowSentiment = this.calculateOverallSentiment(windowSegments)

      trends.push({
        timeWindow: `${i * windowSize}s`,
        sentiment: windowSentiment,
        volume: windowSegments.length,
        keyEvents: windowSegments.flatMap(seg => seg.keyPhrases).slice(0, 3),
      })
    }

    return trends
  }

  /**
   * Analyze reactions and comments sentiment
   */
  private analyzeReactions(reactions: any[], comments: any[]): ReactionSentiment {
    const commentSentiments: CommentSentiment[] = comments.map(comment => ({
      id: comment.id,
      text: comment.text,
      sentiment: {
        polarity: 0.2, // Mock sentiment
        magnitude: 0.5,
        confidence: 0.8,
        label: 'positive' as const,
      },
      timestamp: new Date(comment.timestamp),
      userId: comment.userId,
      replies: [],
    }))

    return {
      likes: reactions.filter(r => r.type === 'like').length,
      dislikes: reactions.filter(r => r.type === 'dislike').length,
      shares: reactions.filter(r => r.type === 'share').length,
      comments: commentSentiments,
      overallReactionScore: 0.7,
    }
  }

  /**
   * Calculate engagement sentiment metrics
   */
  private calculateEngagementSentimentMetrics(
    chatSentiment: SentimentResult,
    reactionSentiment: ReactionSentiment
  ): EngagementSentimentMetrics {
    const positiveSegments = chatSentiment.segments.filter(s => s.sentiment.polarity > 0.1)
    const negativeSegments = chatSentiment.segments.filter(s => s.sentiment.polarity < -0.1)
    const neutralSegments = chatSentiment.segments.filter(s => 
      s.sentiment.polarity >= -0.1 && s.sentiment.polarity <= 0.1
    )

    const total = chatSentiment.segments.length

    return {
      positiveEngagementRate: positiveSegments.length / total,
      negativeEngagementRate: negativeSegments.length / total,
      neutralEngagementRate: neutralSegments.length / total,
      sentimentVolatility: this.calculateVolatility(chatSentiment.segments),
      peakSentimentTimes: this.findPeakSentimentTimes(chatSentiment.segments),
      lowSentimentTimes: this.findLowSentimentTimes(chatSentiment.segments),
    }
  }

  /**
   * Analyze audience mood
   */
  private async analyzeAudienceMood(
    chatMessages: any[],
    reactions: any[],
    engagementMetrics: EngagementSentimentMetrics
  ): Promise<AudienceMood> {
    let currentMood: string

    if (engagementMetrics.positiveEngagementRate > 0.6) {
      currentMood = 'excited'
    } else if (engagementMetrics.negativeEngagementRate > 0.4) {
      currentMood = 'frustrated'
    } else {
      currentMood = 'neutral'
    }

    return {
      currentMood,
      moodHistory: [
        {
          timestamp: new Date(),
          mood: currentMood,
          intensity: 0.7,
          context: 'Live stream engagement',
        },
      ],
      moodPrediction: {
        predictedMood: 'positive',
        confidence: 0.75,
        timeframe: 'next 30 minutes',
        factors: ['increasing engagement', 'positive chat sentiment'],
      },
      influencingFactors: ['chat activity', 'content quality', 'technical issues'],
    }
  }

  /**
   * Calculate sentiment volatility
   */
  private calculateVolatility(segments: SentimentSegment[]): number {
    if (segments.length < 2) return 0

    let volatility = 0
    for (let i = 1; i < segments.length; i++) {
      const diff = Math.abs(segments[i].sentiment.polarity - segments[i - 1].sentiment.polarity)
      volatility += diff
    }

    return volatility / (segments.length - 1)
  }

  /**
   * Find peak sentiment times
   */
  private findPeakSentimentTimes(segments: SentimentSegment[]): number[] {
    return segments
      .filter(seg => seg.sentiment.polarity > 0.5)
      .map(seg => seg.startTime)
  }

  /**
   * Find low sentiment times
   */
  private findLowSentimentTimes(segments: SentimentSegment[]): number[] {
    return segments
      .filter(seg => seg.sentiment.polarity < -0.3)
      .map(seg => seg.startTime)
  }
}