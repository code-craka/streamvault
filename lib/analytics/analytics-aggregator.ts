// Analytics aggregation service for processing and summarizing analytics data
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  CreatorAnalytics,
  StreamMetrics,
  ViewerMetrics,
  ChatMetrics,
  AnalyticsQuery,
  AnalyticsResponse,
} from '@/types/analytics'

export class AnalyticsAggregator {
  private static instance: AnalyticsAggregator

  static getInstance(): AnalyticsAggregator {
    if (!AnalyticsAggregator.instance) {
      AnalyticsAggregator.instance = new AnalyticsAggregator()
    }
    return AnalyticsAggregator.instance
  }

  // Aggregate creator analytics for a specific period
  async aggregateCreatorAnalytics(
    creatorId: string,
    period: 'day' | 'week' | 'month' | 'year',
    startDate: Date,
    endDate: Date
  ): Promise<CreatorAnalytics> {
    try {
      // Get all streams for the creator in the period
      const streamsData = await this.getCreatorStreams(
        creatorId,
        startDate,
        endDate
      )

      // Get viewer data for all streams
      const viewerData = await this.getViewerDataForStreams(
        streamsData.map(s => s.streamId),
        startDate,
        endDate
      )

      // Get chat data for all streams
      const chatData = await this.getChatDataForStreams(
        streamsData.map(s => s.streamId),
        startDate,
        endDate
      )

      // Calculate aggregated metrics
      const totalStreams = streamsData.length
      const totalStreamTime = streamsData.reduce(
        (sum, stream) => sum + (stream.duration || 0),
        0
      )
      const totalViewers = viewerData.length
      const uniqueViewers = new Set(
        viewerData.map(v => v.userId).filter(Boolean)
      ).size
      const averageViewers = totalViewers / totalStreams || 0
      const peakViewers = Math.max(
        ...streamsData.map(s => s.peakViewers || 0),
        0
      )

      // Calculate revenue (would integrate with subscription/payment data)
      const totalRevenue = streamsData.reduce(
        (sum, stream) => sum + (stream.revenue || 0),
        0
      )

      // Calculate chat metrics
      const chatMessages = chatData.length
      const chatParticipants = new Set(chatData.map(c => c.userId)).size

      // Calculate geographic distribution
      const geographicDistribution =
        this.calculateGeographicDistribution(viewerData)

      // Calculate device distribution
      const deviceDistribution = this.calculateDeviceDistribution(viewerData)

      // Calculate viewer retention
      const viewerRetention = this.calculateViewerRetention(viewerData)

      // Calculate peak hours
      const peakHours = this.calculatePeakHours(viewerData)

      // Get top streams
      const topStreams = streamsData
        .sort((a, b) => (b.totalViewers || 0) - (a.totalViewers || 0))
        .slice(0, 10)
        .map(stream => ({
          streamId: stream.streamId,
          title: stream.title,
          viewers: stream.totalViewers || 0,
          revenue: stream.revenue || 0,
          date: stream.startTime,
        }))

      return {
        creatorId,
        period,
        startDate,
        endDate,
        totalStreams,
        totalStreamTime,
        totalViewers,
        uniqueViewers,
        averageViewers,
        peakViewers,
        totalRevenue,
        subscriptionRevenue: totalRevenue * 0.7, // Estimate
        donationRevenue: totalRevenue * 0.3, // Estimate
        chatMessages,
        chatParticipants,
        followerGrowth: 0, // Would need follower tracking
        subscriptionConversions: 0, // Would need conversion tracking
        topStreams,
        viewerRetention,
        geographicDistribution,
        deviceDistribution,
        peakHours,
      }
    } catch (error) {
      console.error('Error aggregating creator analytics:', error)
      throw error
    }
  }

  // Get stream data for a creator
  private async getCreatorStreams(
    creatorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StreamMetrics[]> {
    const constraints: QueryConstraint[] = [
      where('creatorId', '==', creatorId),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('startTime', 'desc'),
    ]

    const q = query(
      collection(db, 'analytics', 'streams', 'performance'),
      ...constraints
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate() || undefined,
      } as StreamMetrics
    })
  }

  // Get viewer data for specific streams
  private async getViewerDataForStreams(
    streamIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<ViewerMetrics[]> {
    if (streamIds.length === 0) return []

    const constraints: QueryConstraint[] = [
      where('streamId', 'in', streamIds.slice(0, 10)), // Firestore limit
      where('joinedAt', '>=', Timestamp.fromDate(startDate)),
      where('joinedAt', '<=', Timestamp.fromDate(endDate)),
    ]

    const q = query(
      collection(db, 'analytics', 'viewers', 'sessions'),
      ...constraints
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        joinedAt: data.joinedAt?.toDate() || new Date(),
        leftAt: data.leftAt?.toDate() || undefined,
      } as ViewerMetrics
    })
  }

  // Get chat data for specific streams
  private async getChatDataForStreams(
    streamIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<ChatMetrics[]> {
    if (streamIds.length === 0) return []

    const constraints: QueryConstraint[] = [
      where('streamId', 'in', streamIds.slice(0, 10)), // Firestore limit
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
    ]

    const q = query(
      collection(db, 'analytics', 'chat', 'messages'),
      ...constraints
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as ChatMetrics
    })
  }

  // Calculate geographic distribution
  private calculateGeographicDistribution(
    viewerData: ViewerMetrics[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {}

    viewerData.forEach(viewer => {
      if (viewer.location?.country) {
        distribution[viewer.location.country] =
          (distribution[viewer.location.country] || 0) + 1
      }
    })

    return distribution
  }

  // Calculate device distribution
  private calculateDeviceDistribution(
    viewerData: ViewerMetrics[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {}

    viewerData.forEach(viewer => {
      distribution[viewer.deviceType] =
        (distribution[viewer.deviceType] || 0) + 1
    })

    return distribution
  }

  // Calculate viewer retention curve
  private calculateViewerRetention(
    viewerData: ViewerMetrics[]
  ): Array<{ timepoint: number; retentionRate: number }> {
    const retention: Array<{ timepoint: number; retentionRate: number }> = []
    const timepoints = [30, 60, 120, 300, 600, 1200, 1800, 3600] // seconds

    const totalViewers = viewerData.length
    if (totalViewers === 0) return retention

    timepoints.forEach(timepoint => {
      const retainedViewers = viewerData.filter(
        viewer => (viewer.duration || 0) >= timepoint
      ).length

      retention.push({
        timepoint,
        retentionRate: (retainedViewers / totalViewers) * 100,
      })
    })

    return retention
  }

  // Calculate peak viewing hours
  private calculatePeakHours(
    viewerData: ViewerMetrics[]
  ): Array<{ hour: number; averageViewers: number }> {
    const hourlyData: Record<number, number[]> = {}

    // Group viewers by hour
    viewerData.forEach(viewer => {
      const hour = viewer.joinedAt.getHours()
      if (!hourlyData[hour]) {
        hourlyData[hour] = []
      }
      hourlyData[hour].push(1)
    })

    // Calculate average for each hour
    const peakHours: Array<{ hour: number; averageViewers: number }> = []

    for (let hour = 0; hour < 24; hour++) {
      const viewers = hourlyData[hour] || []
      const averageViewers =
        viewers.length > 0
          ? viewers.reduce((a, b) => a + b, 0) / viewers.length
          : 0

      peakHours.push({ hour, averageViewers })
    }

    return peakHours.sort((a, b) => b.averageViewers - a.averageViewers)
  }

  // Execute custom analytics query
  async executeQuery(
    analyticsQuery: AnalyticsQuery
  ): Promise<AnalyticsResponse> {
    try {
      // This would implement a flexible query system
      // For now, return a basic structure
      return {
        data: [],
        summary: {},
        period: {
          start: analyticsQuery.startDate,
          end: analyticsQuery.endDate,
        },
        generatedAt: new Date(),
      }
    } catch (error) {
      console.error('Error executing analytics query:', error)
      throw error
    }
  }

  // Calculate engagement score for content
  calculateEngagementScore(
    viewerData: ViewerMetrics[],
    chatData: ChatMetrics[],
    streamDuration: number
  ): number {
    if (viewerData.length === 0) return 0

    const averageViewTime =
      viewerData.reduce((sum, viewer) => sum + (viewer.duration || 0), 0) /
      viewerData.length

    const chatEngagement = chatData.length / viewerData.length
    const retentionRate = averageViewTime / streamDuration
    const bufferingScore =
      1 -
      viewerData.reduce((sum, viewer) => sum + viewer.bufferingEvents, 0) /
        viewerData.length /
        10 // Normalize buffering events

    // Weighted engagement score (0-100)
    return Math.min(
      100,
      Math.max(
        0,
        retentionRate * 40 +
          chatEngagement * 30 +
          bufferingScore * 20 +
          Math.min(viewerData.length / 100, 1) * 10 // Viewer count bonus
      )
    )
  }
}

// Export singleton instance
export const analyticsAggregator = AnalyticsAggregator.getInstance()
