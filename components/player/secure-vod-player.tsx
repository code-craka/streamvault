'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { HLSPlayer } from './hls-player'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Lock,
} from 'lucide-react'
import type { SubscriptionTier } from '@/types/auth'

interface SecureVODPlayerProps {
  videoId: string
  requiredTier?: SubscriptionTier
  videoMetadata?: {
    title?: string
    description?: string
    duration?: number
    createdAt?: Date
    creatorName?: string
    thumbnailUrl?: string
    tags?: string[]
  }
  onError?: (error: any) => void
  onPlay?: () => void
  onPause?: () => void
  className?: string
}

interface VideoSession {
  signedUrl: string
  expiresAt: string
  sessionId: string
  refreshToken: string
}

interface PlayerState {
  isLoading: boolean
  error: string | null
  session: VideoSession | null
  isRefreshing: boolean
  accessGranted: boolean
  retryCount: number
}

const TIER_COLORS = {
  basic: 'bg-gray-100 text-gray-800',
  premium: 'bg-yellow-100 text-yellow-800',
  pro: 'bg-purple-100 text-purple-800',
}

const TIER_ICONS = {
  basic: '🥉',
  premium: '🥈',
  pro: '🥇',
}

export function SecureVODPlayer({
  videoId,
  requiredTier = 'basic',
  videoMetadata,
  onError,
  onPlay,
  onPause,
  className = '',
}: SecureVODPlayerProps) {
  const { user, isLoaded } = useUser()
  const refreshIntervalRef = useRef<NodeJS.Timeout>()
  const playerRef = useRef<HTMLDivElement>(null)

  const [playerState, setPlayerState] = useState<PlayerState>({
    isLoading: true,
    error: null,
    session: null,
    isRefreshing: false,
    accessGranted: false,
    retryCount: 0,
  })

  // Fetch initial signed URL
  const fetchSignedURL = useCallback(async () => {
    if (!user) return

    setPlayerState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(
        `/api/videos/${videoId}/signed-url?tier=${requiredTier}`,
        {
          headers: {
            Authorization: `Bearer ${await (user as any).getToken()}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get video access')
      }

      const session: VideoSession = data.data
      setPlayerState(prev => ({
        ...prev,
        isLoading: false,
        session,
        accessGranted: true,
        error: null,
        retryCount: 0,
      }))

      // Set up automatic refresh (12 minutes before expiration)
      setupAutoRefresh(session)
    } catch (error: any) {
      console.error('Failed to fetch signed URL:', error)
      setPlayerState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        accessGranted: false,
        retryCount: prev.retryCount + 1,
      }))
      onError?.(error)
    }
  }, [user, videoId, requiredTier, onError])

  // Refresh signed URL
  const refreshSignedURL = useCallback(async () => {
    if (!user || !playerState.session) return

    setPlayerState(prev => ({ ...prev, isRefreshing: true }))

    try {
      const response = await fetch(`/api/videos/${videoId}/refresh-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await (user as any).getToken()}`,
        },
        body: JSON.stringify({
          sessionId: playerState.session.sessionId,
          refreshToken: playerState.session.refreshToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh video access')
      }

      const newSession: VideoSession = data.data
      setPlayerState(prev => ({
        ...prev,
        session: newSession,
        isRefreshing: false,
        error: null,
      }))

      // Set up next refresh
      setupAutoRefresh(newSession)
    } catch (error: any) {
      console.error('Failed to refresh signed URL:', error)
      setPlayerState(prev => ({
        ...prev,
        isRefreshing: false,
        error: error.message,
      }))

      // If refresh fails, try to get a new session
      if (playerState.retryCount < 3) {
        setTimeout(() => fetchSignedURL(), 2000)
      }
    }
  }, [user, videoId, playerState.session, fetchSignedURL])

  // Setup automatic refresh
  const setupAutoRefresh = useCallback(
    (session: VideoSession) => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }

      const expiresAt = new Date(session.expiresAt).getTime()
      const now = Date.now()
      const timeUntilRefresh = Math.max(expiresAt - now - 3 * 60 * 1000, 30000) // Refresh 3 minutes before expiry, minimum 30 seconds

      refreshIntervalRef.current = setTimeout(() => {
        refreshSignedURL()
      }, timeUntilRefresh)
    },
    [refreshSignedURL]
  )

  // Initialize on mount
  useEffect(() => {
    if (isLoaded && user) {
      fetchSignedURL()
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current)
      }
    }
  }, [isLoaded, user, fetchSignedURL])

  // Handle player errors
  const handlePlayerError = (error: any) => {
    console.error('Player error:', error)
    onError?.(error)

    // If it's a network error, try refreshing the URL
    if (error.type === 'networkError' && playerState.session) {
      refreshSignedURL()
    }
  }

  // Format time remaining
  const getTimeRemaining = () => {
    if (!playerState.session) return null

    const expiresAt = new Date(playerState.session.expiresAt).getTime()
    const now = Date.now()
    const remaining = Math.max(0, expiresAt - now)

    const minutes = Math.floor(remaining / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Retry access
  const retryAccess = () => {
    fetchSignedURL()
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-lg bg-gray-100 ${className}`}
      >
        <div className="text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold">
              Authentication Required
            </h3>
            <p className="mb-4 text-gray-600">
              Please sign in to watch this video
            </p>
            <Button onClick={() => (window.location.href = '/sign-in')}>
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (playerState.error && !playerState.accessGranted) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h3 className="mb-2 text-lg font-semibold">Access Denied</h3>
            <p className="mb-4 text-gray-600">{playerState.error}</p>

            {requiredTier !== 'basic' && (
              <div className="mb-4">
                <Badge className={TIER_COLORS[requiredTier]}>
                  {TIER_ICONS[requiredTier]} {requiredTier.toUpperCase()}{' '}
                  Required
                </Badge>
              </div>
            )}

            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={retryAccess}
                disabled={playerState.isLoading}
              >
                {playerState.isLoading ? 'Retrying...' : 'Retry'}
              </Button>

              {requiredTier !== 'basic' && (
                <Button
                  onClick={() => (window.location.href = '/settings/billing')}
                >
                  Upgrade Subscription
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (playerState.isLoading) {
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-lg bg-black ${className}`}
      >
        <div className="text-center text-white">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
          <p className="text-sm">Securing video access...</p>
        </div>
      </div>
    )
  }

  if (!playerState.session) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
            <h3 className="mb-2 text-lg font-semibold">Video Unavailable</h3>
            <p className="mb-4 text-gray-600">Unable to load video content</p>
            <Button variant="outline" onClick={retryAccess}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Video Player */}
      <div ref={playerRef} className="relative">
        <HLSPlayer
          src={playerState.session.signedUrl}
          isLive={false}
          onError={handlePlayerError}
          onPlay={onPlay}
          onPause={onPause}
          className="w-full"
        />

        {/* Security Indicator */}
        <div className="absolute right-4 top-4 flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Shield className="mr-1 h-3 w-3" />
            Secure
          </Badge>

          {playerState.isRefreshing && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              Refreshing
            </Badge>
          )}
        </div>
      </div>

      {/* Video Metadata */}
      {videoMetadata && (
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="mb-2 text-xl">
                  {videoMetadata.title || `Video ${videoId}`}
                </CardTitle>

                <div className="mb-2 flex items-center space-x-4 text-sm text-gray-600">
                  {videoMetadata.creatorName && (
                    <div className="flex items-center">
                      <User className="mr-1 h-4 w-4" />
                      {videoMetadata.creatorName}
                    </div>
                  )}

                  {videoMetadata.duration && (
                    <div className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      {Math.floor(videoMetadata.duration / 60)}:
                      {(videoMetadata.duration % 60)
                        .toString()
                        .padStart(2, '0')}
                    </div>
                  )}

                  {videoMetadata.createdAt && (
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {videoMetadata.createdAt.toLocaleDateString()}
                    </div>
                  )}
                </div>

                {videoMetadata.tags && videoMetadata.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {videoMetadata.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Badge className={TIER_COLORS[requiredTier]}>
                {TIER_ICONS[requiredTier]} {requiredTier.toUpperCase()}
              </Badge>
            </div>

            {videoMetadata.description && (
              <CardDescription className="text-sm">
                {videoMetadata.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Session Info (Debug) */}
      {process.env.NODE_ENV === 'development' && playerState.session && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Session Info (Debug)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div>Session ID: {playerState.session.sessionId}</div>
            <div>
              Expires:{' '}
              {new Date(playerState.session.expiresAt).toLocaleString()}
            </div>
            <div>Time Remaining: {getTimeRemaining()}</div>
            <div>
              Auto-refresh: {refreshIntervalRef.current ? 'Active' : 'Inactive'}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
