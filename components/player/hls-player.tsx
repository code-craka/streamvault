'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { Button } from '@/components/ui/button'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Settings,
  Loader2
} from 'lucide-react'

interface HLSPlayerProps {
  src: string
  isLive?: boolean
  autoPlay?: boolean
  muted?: boolean
  onError?: (error: any) => void
  onLoadedData?: () => void
  onPlay?: () => void
  onPause?: () => void
  className?: string
}

interface PlayerState {
  isPlaying: boolean
  isMuted: boolean
  isFullscreen: boolean
  volume: number
  currentTime: number
  duration: number
  buffered: number
  isLoading: boolean
  error: string | null
}

export function HLSPlayer({ 
  src, 
  isLive = false, 
  autoPlay = false,
  muted = false,
  onError, 
  onLoadedData,
  onPlay,
  onPause,
  className = ""
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    isMuted: muted,
    isFullscreen: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    isLoading: true,
    error: null
  })

  const [showControls, setShowControls] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)

  // Initialize HLS player
  useEffect(() => {
    if (!videoRef.current || !src) return

    const video = videoRef.current

    // Clear any existing error
    setPlayerState(prev => ({ ...prev, error: null, isLoading: true }))

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 4 : 30,
        maxBufferLength: isLive ? 10 : 60,
        maxMaxBufferLength: isLive ? 20 : 120,
        liveSyncDurationCount: isLive ? 3 : 1,
        liveMaxLatencyDurationCount: isLive ? 5 : Infinity,
      })

      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerState(prev => ({ ...prev, isLoading: false }))
        onLoadedData?.()
        
        if (autoPlay) {
          video.play().catch(console.error)
        }
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data)
        
        if (data.fatal) {
          const errorMessage = `HLS Error: ${data.type} - ${data.details}`
          setPlayerState(prev => ({ 
            ...prev, 
            error: errorMessage,
            isLoading: false 
          }))
          onError?.(data)
        }
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('Quality switched to level:', data.level)
      })

      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src
      video.addEventListener('loadedmetadata', () => {
        setPlayerState(prev => ({ ...prev, isLoading: false }))
        onLoadedData?.()
      })
      
      video.addEventListener('error', (e) => {
        const errorMessage = 'Video playback error'
        setPlayerState(prev => ({ 
          ...prev, 
          error: errorMessage,
          isLoading: false 
        }))
        onError?.(e)
      })
    } else {
      const errorMessage = 'HLS is not supported in this browser'
      setPlayerState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }))
      onError?.(new Error(errorMessage))
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, isLive, autoPlay, onError, onLoadedData])

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: true }))
      onPlay?.()
    }

    const handlePause = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false }))
      onPause?.()
    }

    const handleTimeUpdate = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: video.currentTime,
        duration: video.duration || 0
      }))
    }

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1)
        setPlayerState(prev => ({ ...prev, buffered }))
      }
    }

    const handleVolumeChange = () => {
      setPlayerState(prev => ({
        ...prev,
        volume: video.volume,
        isMuted: video.muted
      }))
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [onPlay, onPause])

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setPlayerState(prev => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement
      }))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
    }
    
    setShowControls(true)
    
    if (playerState.isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)
      setControlsTimeout(timeout)
    }
  }, [controlsTimeout, playerState.isPlaying])

  useEffect(() => {
    resetControlsTimeout()
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout)
      }
    }
  }, [playerState.isPlaying])

  // Player controls
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (playerState.isPlaying) {
      video.pause()
    } else {
      video.play().catch(console.error)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
  }

  const handleVolumeChange = (value: number) => {
    const video = videoRef.current
    if (!video) return

    video.volume = value
    video.muted = value === 0
  }

  const handleSeek = (value: number) => {
    const video = videoRef.current
    if (!video || isLive) return

    video.currentTime = value
  }

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (playerState.isFullscreen) {
        await document.exitFullscreen()
      } else {
        await container.requestFullscreen()
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (playerState.error) {
    return (
      <div className={`relative aspect-video bg-black rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-white p-4">
          <div className="text-red-400 mb-2">⚠️ Playback Error</div>
          <div className="text-sm opacity-75">{playerState.error}</div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`relative aspect-video bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={playerState.isMuted}
        onClick={togglePlay}
      />

      {/* Loading Spinner */}
      {playerState.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      )}

      {/* Live Indicator */}
      {isLive && (
        <div className="absolute top-4 left-4 bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">
          🔴 LIVE
        </div>
      )}

      {/* Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        {!isLive && (
          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={playerState.duration || 0}
              value={playerState.currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-white/75 mt-1">
              <span>{formatTime(playerState.currentTime)}</span>
              <span>{formatTime(playerState.duration)}</span>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {playerState.isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {playerState.isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={playerState.isMuted ? 0 : playerState.volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {playerState.isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}