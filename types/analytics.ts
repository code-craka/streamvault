// Analytics type definitions for StreamVault
export interface ViewerMetrics {
  streamId: string
  userId?: string
  sessionId: string
  joinedAt: Date
  leftAt?: Date
  duration?: number
  deviceType: 'desktop' | 'mobile' | 'tablet'
  browser: string
  location?: {
    country: string
    region: string
    city: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  quality: string
  bufferingEvents: number
  totalBufferingTime: number
}

export interface StreamMetrics {
  streamId: string
  creatorId: string
  title: string
  category: string
  startTime: Date
  endTime?: Date
  duration?: number
  peakViewers: number
  totalViewers: number
  uniqueViewers: number
  averageViewTime: number
  chatMessages: number
  chatParticipants: number
  revenue: number
  subscriptionConversions: number
  qualityDistribution: Record<string, number>
  deviceDistribution: Record<string, number>
  geographicDistribution: Record<string, number>
}

export interface ChatMetrics {
  streamId: string
  messageId: string
  userId: string
  timestamp: Date
  messageLength: number
  containsEmotes: boolean
  sentiment?: 'positive' | 'negative' | 'neutral'
  engagementScore: number
  moderationFlags?: string[]
}

export interface EngagementMetrics {
  streamId: string
  userId?: string
  timestamp: Date
  eventType: 'view_start' | 'view_end' | 'chat_message' | 'subscription' | 'donation' | 'share' | 'like' | 'quality_change'
  eventData?: Record<string, any>
  sessionId: string
  value?: number // For revenue events
}

export interface RealtimeAnalytics {
  streamId: string
  currentViewers: number
  chatMessagesPerMinute: number
  averageViewTime: number
  topCountries: Array<{ country: string; viewers: number }>
  qualityDistribution: Record<string, number>
  revenueToday: number
  newSubscribers: number
  lastUpdated: Date
}

export interface CreatorAnalytics {
  creatorId: string
  period: 'day' | 'week' | 'month' | 'year'
  startDate: Date
  endDate: Date
  totalStreams: number
  totalStreamTime: number
  totalViewers: number
  uniqueViewers: number
  averageViewers: number
  peakViewers: number
  totalRevenue: number
  subscriptionRevenue: number
  donationRevenue: number
  chatMessages: number
  chatParticipants: number
  followerGrowth: number
  subscriptionConversions: number
  topStreams: Array<{
    streamId: string
    title: string
    viewers: number
    revenue: number
    date: Date
  }>
  viewerRetention: Array<{
    timepoint: number // seconds
    retentionRate: number // percentage
  }>
  geographicDistribution: Record<string, number>
  deviceDistribution: Record<string, number>
  peakHours: Array<{
    hour: number
    averageViewers: number
  }>
}

export interface AnalyticsEvent {
  id: string
  streamId?: string
  userId?: string
  sessionId: string
  eventType: string
  eventData: Record<string, any>
  timestamp: Date
  processed: boolean
}

export interface AnalyticsQuery {
  streamId?: string
  creatorId?: string
  startDate: Date
  endDate: Date
  metrics: string[]
  groupBy?: 'hour' | 'day' | 'week' | 'month'
  filters?: Record<string, any>
}

export interface AnalyticsResponse {
  data: Record<string, any>[]
  summary: Record<string, number>
  period: {
    start: Date
    end: Date
  }
  generatedAt: Date
}