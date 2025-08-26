// React hook for analytics tracking and data retrieval
'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { analyticsService } from '@/lib/analytics/analytics-service'
import type { RealtimeAnalytics, CreatorAnalytics } from '@/types/analytics'

// Generate unique session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get device information
const getDeviceInfo = () => {
  const userAgent = navigator.userAgent
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'

  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = 'tablet'
  } else if (
    /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
      userAgent
    )
  ) {
    deviceType = 'mobile'
  }

  const browser = userAgent.includes('Chrome')
    ? 'Chrome'
    : userAgent.includes('Firefox')
      ? 'Firefox'
      : userAgent.includes('Safari')
        ? 'Safari'
        : userAgent.includes('Edge')
          ? 'Edge'
          : 'Unknown'

  return { deviceType, browser }
}

// Hook for tracking viewer analytics
export function useViewerAnalytics(streamId: string | null) {
  const { user } = useUser()
  const sessionIdRef = useRef<string>(generateSessionId())
  const startTimeRef = useRef<number>(Date.now())
  const hasJoinedRef = useRef<boolean>(false)

  const trackViewerJoin = useCallback(async () => {
    if (!streamId || hasJoinedRef.current) return

    try {
      const deviceInfo = getDeviceInfo()

      // Get location if available (would need geolocation API)
      let location
      if (navigator.geolocation) {
        // For privacy, we'll skip actual geolocation in this implementation
        // In production, you'd want to get user consent first
      }

      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'viewer_join',
          streamId,
          sessionId: sessionIdRef.current,
          deviceInfo: {
            ...deviceInfo,
            location,
          },
        }),
      })

      hasJoinedRef.current = true
    } catch (error) {
      console.error('Error tracking viewer join:', error)
    }
  }, [streamId])

  const trackViewerLeave = useCallback(async () => {
    if (!streamId || !hasJoinedRef.current) return

    try {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)

      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'viewer_leave',
          streamId,
          sessionId: sessionIdRef.current,
          duration,
        }),
      })

      hasJoinedRef.current = false
    } catch (error) {
      console.error('Error tracking viewer leave:', error)
    }
  }, [streamId])

  const trackQualityChange = useCallback(
    async (
      newQuality: string,
      bufferingEvent?: boolean,
      bufferingDuration?: number
    ) => {
      if (!streamId) return

      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'quality_change',
            streamId,
            sessionId: sessionIdRef.current,
            newQuality,
            bufferingEvent,
            bufferingDuration,
          }),
        })
      } catch (error) {
        console.error('Error tracking quality change:', error)
      }
    },
    [streamId]
  )

  const trackEngagement = useCallback(
    async (
      eventType: string,
      eventData?: Record<string, any>,
      value?: number
    ) => {
      if (!streamId) return

      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'engagement',
            streamId,
            sessionId: sessionIdRef.current,
            eventType,
            eventData,
            value,
          }),
        })
      } catch (error) {
        console.error('Error tracking engagement:', error)
      }
    },
    [streamId]
  )

  // Track viewer join on mount
  useEffect(() => {
    if (streamId) {
      trackViewerJoin()
    }

    return () => {
      if (streamId) {
        trackViewerLeave()
      }
    }
  }, [streamId, trackViewerJoin, trackViewerLeave])

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEngagement('page_hidden')
      } else {
        trackEngagement('page_visible')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [trackEngagement])

  return {
    sessionId: sessionIdRef.current,
    trackQualityChange,
    trackEngagement,
  }
}

// Hook for tracking chat analytics
export function useChatAnalytics(streamId: string | null) {
  const trackChatMessage = useCallback(
    async (
      messageId: string,
      messageData: {
        messageLength: number
        containsEmotes: boolean
        sentiment?: 'positive' | 'negative' | 'neutral'
        engagementScore: number
      }
    ) => {
      if (!streamId) return

      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chat_message',
            streamId,
            messageId,
            messageData,
          }),
        })
      } catch (error) {
        console.error('Error tracking chat message:', error)
      }
    },
    [streamId]
  )

  return { trackChatMessage }
}

// Hook for real-time analytics
export function useRealtimeAnalytics(streamId: string | null) {
  const [analytics, setAnalytics] = useState<RealtimeAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!streamId) {
      setAnalytics(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Subscribe to real-time updates
    const unsubscribe = analyticsService.subscribeToRealtimeAnalytics(
      streamId,
      data => {
        setAnalytics(data)
        setLoading(false)
      }
    )

    // Initial fetch
    analyticsService
      .getRealtimeAnalytics(streamId)
      .then(data => {
        if (data) {
          setAnalytics(data)
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })

    return unsubscribe
  }, [streamId])

  return { analytics, loading, error }
}

// Hook for creator analytics
export function useCreatorAnalytics(
  creatorId: string | null,
  period: 'day' | 'week' | 'month' | 'year' = 'week',
  startDate?: Date,
  endDate?: Date
) {
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!creatorId) {
      setAnalytics(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      period,
      ...(startDate && { startDate: startDate.toISOString() }),
      ...(endDate && { endDate: endDate.toISOString() }),
    })

    fetch(`/api/analytics/creator/${creatorId}?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error)
        }
        setAnalytics(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [creatorId, period, startDate, endDate])

  const refetch = useCallback(() => {
    if (!creatorId) return

    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      period,
      ...(startDate && { startDate: startDate.toISOString() }),
      ...(endDate && { endDate: endDate.toISOString() }),
    })

    fetch(`/api/analytics/creator/${creatorId}?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.error)
        }
        setAnalytics(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [creatorId, period, startDate, endDate])

  return { analytics, loading, error, refetch }
}
