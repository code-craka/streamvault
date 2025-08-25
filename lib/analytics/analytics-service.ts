// Analytics service for user engagement tracking and metrics collection
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot,
  increment,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { 
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

export class AnalyticsService {
  private static instance: AnalyticsService
  private realtimeListeners: Map<string, () => void> = new Map()

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  // Track viewer joining a stream
  async trackViewerJoin(
    streamId: string, 
    userId: string | null, 
    sessionId: string,
    deviceInfo: {
      deviceType: 'desktop' | 'mobile' | 'tablet'
      browser: string
      location?: any
    }
  ): Promise<void> {
    try {
      const viewerMetric: Partial<ViewerMetrics> = {
        streamId,
        userId: userId || undefined,
        sessionId,
        joinedAt: new Date(),
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        location: deviceInfo.location,
        quality: '720p', // Default quality
        bufferingEvents: 0,
        totalBufferingTime: 0
      }

      // Add to viewer metrics collection
      await addDoc(collection(db, 'analytics', 'viewers', 'sessions'), {
        ...viewerMetric,
        joinedAt: serverTimestamp()
      })

      // Update real-time stream metrics
      await this.updateRealtimeMetrics(streamId, {
        currentViewers: increment(1) as any
      })

      // Track engagement event
      await this.trackEngagementEvent({
        streamId,
        userId: userId || undefined,
        timestamp: new Date(),
        eventType: 'view_start',
        sessionId,
        eventData: deviceInfo
      })

    } catch (error) {
      console.error('Error tracking viewer join:', error)
    }
  }

  // Track viewer leaving a stream
  async trackViewerLeave(
    streamId: string,
    sessionId: string,
    duration: number
  ): Promise<void> {
    try {
      // Find and update the viewer session
      const sessionsRef = collection(db, 'analytics', 'viewers', 'sessions')
      const q = query(
        sessionsRef,
        where('streamId', '==', streamId),
        where('sessionId', '==', sessionId),
        where('leftAt', '==', null)
      )

      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0]
        await updateDoc(sessionDoc.ref, {
          leftAt: serverTimestamp(),
          duration
        })
      }

      // Update real-time stream metrics
      await this.updateRealtimeMetrics(streamId, {
        currentViewers: increment(-1) as any
      })

      // Track engagement event
      await this.trackEngagementEvent({
        streamId,
        timestamp: new Date(),
        eventType: 'view_end',
        sessionId,
        eventData: { duration }
      })

    } catch (error) {
      console.error('Error tracking viewer leave:', error)
    }
  }

  // Track chat message metrics
  async trackChatMessage(
    streamId: string,
    messageId: string,
    userId: string,
    messageData: {
      messageLength: number
      containsEmotes: boolean
      sentiment?: 'positive' | 'negative' | 'neutral'
      engagementScore: number
    }
  ): Promise<void> {
    try {
      const chatMetric: ChatMetrics = {
        streamId,
        messageId,
        userId,
        timestamp: new Date(),
        ...messageData
      }

      // Add to chat metrics collection
      await addDoc(collection(db, 'analytics', 'chat', 'messages'), {
        ...chatMetric,
        timestamp: serverTimestamp()
      })

      // Update real-time metrics
      await this.updateRealtimeMetrics(streamId, {
        chatMessagesPerMinute: increment(1) as any
      })

    } catch (error) {
      console.error('Error tracking chat message:', error)
    }
  }

  // Track general engagement events
  async trackEngagementEvent(event: EngagementMetrics): Promise<void> {
    try {
      await addDoc(collection(db, 'analytics', 'engagement', 'events'), {
        ...event,
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Error tracking engagement event:', error)
    }
  }

  // Update real-time analytics for a stream
  private async updateRealtimeMetrics(
    streamId: string, 
    updates: Partial<RealtimeAnalytics>
  ): Promise<void> {
    try {
      const realtimeRef = doc(db, 'analytics', 'realtime', 'streams', streamId)
      await updateDoc(realtimeRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      })
    } catch (error) {
      // If document doesn't exist, create it
      await this.initializeRealtimeMetrics(streamId)
      await updateDoc(doc(db, 'analytics', 'realtime', 'streams', streamId), {
        ...updates,
        lastUpdated: serverTimestamp()
      })
    }
  }

  // Initialize real-time metrics for a new stream
  async initializeRealtimeMetrics(streamId: string): Promise<void> {
    try {
      const realtimeMetrics: RealtimeAnalytics = {
        streamId,
        currentViewers: 0,
        chatMessagesPerMinute: 0,
        averageViewTime: 0,
        topCountries: [],
        qualityDistribution: {},
        revenueToday: 0,
        newSubscribers: 0,
        lastUpdated: new Date()
      }

      await addDoc(collection(db, 'analytics', 'realtime', 'streams'), {
        ...realtimeMetrics,
        lastUpdated: serverTimestamp()
      })
    } catch (error) {
      console.error('Error initializing real-time metrics:', error)
    }
  }

  // Get real-time analytics for a stream
  async getRealtimeAnalytics(streamId: string): Promise<RealtimeAnalytics | null> {
    try {
      const realtimeRef = doc(db, 'analytics', 'realtime', 'streams', streamId)
      const snapshot = await getDocs(query(
        collection(db, 'analytics', 'realtime', 'streams'),
        where('streamId', '==', streamId),
        limit(1)
      ))

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data()
        return {
          ...data,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        } as RealtimeAnalytics
      }

      return null
    } catch (error) {
      console.error('Error getting real-time analytics:', error)
      return null
    }
  }

  // Subscribe to real-time analytics updates
  subscribeToRealtimeAnalytics(
    streamId: string, 
    callback: (analytics: RealtimeAnalytics) => void
  ): () => void {
    const q = query(
      collection(db, 'analytics', 'realtime', 'streams'),
      where('streamId', '==', streamId)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data()
        const analytics: RealtimeAnalytics = {
          ...data,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        } as RealtimeAnalytics

        callback(analytics)
      }
    })

    this.realtimeListeners.set(streamId, unsubscribe)
    return unsubscribe
  }

  // Track stream performance metrics
  async trackStreamMetrics(streamMetrics: StreamMetrics): Promise<void> {
    try {
      await addDoc(collection(db, 'analytics', 'streams', 'performance'), {
        ...streamMetrics,
        startTime: Timestamp.fromDate(streamMetrics.startTime),
        endTime: streamMetrics.endTime ? Timestamp.fromDate(streamMetrics.endTime) : null
      })
    } catch (error) {
      console.error('Error tracking stream metrics:', error)
    }
  }

  // Get creator analytics for a specific period
  async getCreatorAnalytics(
    creatorId: string,
    period: 'day' | 'week' | 'month' | 'year',
    startDate: Date,
    endDate: Date
  ): Promise<CreatorAnalytics> {
    try {
      // This would involve complex aggregation queries
      // For now, return a basic structure
      const analytics: CreatorAnalytics = {
        creatorId,
        period,
        startDate,
        endDate,
        totalStreams: 0,
        totalStreamTime: 0,
        totalViewers: 0,
        uniqueViewers: 0,
        averageViewers: 0,
        peakViewers: 0,
        totalRevenue: 0,
        subscriptionRevenue: 0,
        donationRevenue: 0,
        chatMessages: 0,
        chatParticipants: 0,
        followerGrowth: 0,
        subscriptionConversions: 0,
        topStreams: [],
        viewerRetention: [],
        geographicDistribution: {},
        deviceDistribution: {},
        peakHours: []
      }

      // TODO: Implement actual aggregation logic
      return analytics
    } catch (error) {
      console.error('Error getting creator analytics:', error)
      throw error
    }
  }

  // Track quality changes and buffering events
  async trackQualityChange(
    streamId: string,
    sessionId: string,
    newQuality: string,
    bufferingEvent?: boolean,
    bufferingDuration?: number
  ): Promise<void> {
    try {
      // Update session quality
      const sessionsRef = collection(db, 'analytics', 'viewers', 'sessions')
      const q = query(
        sessionsRef,
        where('streamId', '==', streamId),
        where('sessionId', '==', sessionId)
      )

      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0]
        const updates: any = { quality: newQuality }
        
        if (bufferingEvent) {
          updates.bufferingEvents = increment(1) as any
          if (bufferingDuration) {
            updates.totalBufferingTime = increment(bufferingDuration) as any
          }
        }

        await updateDoc(sessionDoc.ref, updates)
      }

      // Track as engagement event
      await this.trackEngagementEvent({
        streamId,
        timestamp: new Date(),
        eventType: 'quality_change',
        sessionId,
        eventData: { 
          newQuality, 
          bufferingEvent, 
          bufferingDuration 
        }
      })

    } catch (error) {
      console.error('Error tracking quality change:', error)
    }
  }

  // Cleanup listeners
  cleanup(): void {
    this.realtimeListeners.forEach(unsubscribe => unsubscribe())
    this.realtimeListeners.clear()
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance()