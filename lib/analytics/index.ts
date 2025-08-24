// Analytics module exports
export { analyticsService, AnalyticsService } from './analytics-service'
export { analyticsAggregator, AnalyticsAggregator } from './analytics-aggregator'

// Re-export types
export type {
  ViewerMetrics,
  StreamMetrics,
  ChatMetrics,
  EngagementMetrics,
  RealtimeAnalytics,
  CreatorAnalytics,
  AnalyticsEvent,
  AnalyticsQuery,
  AnalyticsResponse
} from '@/types/analytics'