import { VideoQuality, Stream } from '@/types/streaming'
import { transcodingService } from './transcoding-service'

export interface HLSPlaylist {
  type: 'master' | 'media'
  content: string
  lastModified: Date
}

export interface HLSSegment {
  filename: string
  duration: number
  sequence: number
  url: string
}

export interface StreamHealth {
  streamId: string
  isOnline: boolean
  bitrate: number
  frameRate: number
  resolution: string
  lastUpdate: Date
  segments: {
    quality: VideoQuality
    segmentCount: number
    lastSegment: Date
  }[]
}

export class HLSService {
  private streamHealth: Map<string, StreamHealth> = new Map()
  private playlists: Map<string, HLSPlaylist> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startHealthMonitoring()
  }

  /**
   * Initialize HLS delivery for a stream
   */
  async initializeHLSDelivery(stream: Stream): Promise<void> {
    try {
      console.log(`Initializing HLS delivery for stream ${stream.id}`)

      // Generate master playlist
      const masterPlaylist = this.generateMasterPlaylist(
        stream.id,
        stream.settings.quality
      )
      this.playlists.set(`${stream.id}/master.m3u8`, {
        type: 'master',
        content: masterPlaylist,
        lastModified: new Date(),
      })

      // Initialize health tracking
      this.streamHealth.set(stream.id, {
        streamId: stream.id,
        isOnline: true,
        bitrate: 0,
        frameRate: 0,
        resolution: '1280x720',
        lastUpdate: new Date(),
        segments: stream.settings.quality.map(quality => ({
          quality,
          segmentCount: 0,
          lastSegment: new Date(),
        })),
      })

      // Start transcoding
      await transcodingService.startLiveTranscoding(
        stream.id,
        stream.rtmpUrl,
        stream.settings.quality
      )

      console.log(`HLS delivery initialized for stream ${stream.id}`)
    } catch (error) {
      console.error(
        `Failed to initialize HLS delivery for stream ${stream.id}:`,
        error
      )
      throw error
    }
  }

  /**
   * Stop HLS delivery for a stream
   */
  async stopHLSDelivery(streamId: string): Promise<void> {
    try {
      console.log(`Stopping HLS delivery for stream ${streamId}`)

      // Stop transcoding
      const activeJobs = transcodingService.getActiveJobs()
      const streamJob = activeJobs.find(job => job.streamId === streamId)

      if (streamJob) {
        await transcodingService.stopTranscoding(streamJob.id)
      }

      // Clean up playlists
      const playlistKeys = Array.from(this.playlists.keys())
      playlistKeys.forEach(key => {
        if (key.startsWith(streamId)) {
          this.playlists.delete(key)
        }
      })

      // Remove health tracking
      this.streamHealth.delete(streamId)

      console.log(`HLS delivery stopped for stream ${streamId}`)
    } catch (error) {
      console.error(
        `Failed to stop HLS delivery for stream ${streamId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Get HLS playlist content
   */
  getPlaylist(streamId: string, playlistPath: string): HLSPlaylist | null {
    const key = `${streamId}/${playlistPath}`
    return this.playlists.get(key) || null
  }

  /**
   * Update stream health metrics
   */
  updateStreamHealth(streamId: string, metrics: Partial<StreamHealth>): void {
    const currentHealth = this.streamHealth.get(streamId)
    if (!currentHealth) {
      return
    }

    const updatedHealth: StreamHealth = {
      ...currentHealth,
      ...metrics,
      lastUpdate: new Date(),
    }

    this.streamHealth.set(streamId, updatedHealth)
  }

  /**
   * Get stream health status
   */
  getStreamHealth(streamId: string): StreamHealth | null {
    return this.streamHealth.get(streamId) || null
  }

  /**
   * Get all active streams health
   */
  getAllStreamHealth(): StreamHealth[] {
    return Array.from(this.streamHealth.values())
  }

  /**
   * Generate master HLS playlist
   */
  private generateMasterPlaylist(
    streamId: string,
    qualities: VideoQuality[]
  ): string {
    const lines = ['#EXTM3U', '#EXT-X-VERSION:6']

    for (const quality of qualities) {
      const settings = this.getQualitySettings(quality)

      lines.push(
        `#EXT-X-STREAM-INF:BANDWIDTH=${settings.bitrate * 1000},RESOLUTION=${settings.resolution},FRAME-RATE=${settings.frameRate}`,
        `${quality}/playlist.m3u8`
      )
    }

    return lines.join('\n')
  }

  /**
   * Generate media playlist for a specific quality
   */
  generateMediaPlaylist(
    streamId: string,
    quality: VideoQuality,
    segments: HLSSegment[]
  ): string {
    const lines = [
      '#EXTM3U',
      '#EXT-X-VERSION:6',
      '#EXT-X-TARGETDURATION:4',
      `#EXT-X-MEDIA-SEQUENCE:${segments.length > 0 ? segments[0].sequence : 0}`,
    ]

    // Add segments
    for (const segment of segments) {
      lines.push(`#EXTINF:${segment.duration.toFixed(3)},`, segment.filename)
    }

    return lines.join('\n')
  }

  /**
   * Update media playlist with new segment
   */
  updateMediaPlaylist(
    streamId: string,
    quality: VideoQuality,
    newSegment: HLSSegment
  ): void {
    const playlistKey = `${streamId}/${quality}/playlist.m3u8`
    const currentPlaylist = this.playlists.get(playlistKey)

    // For now, we'll generate a simple playlist
    // In a real implementation, this would maintain a sliding window of segments
    const segments = [newSegment] // This would be a maintained list of recent segments

    const playlistContent = this.generateMediaPlaylist(
      streamId,
      quality,
      segments
    )

    this.playlists.set(playlistKey, {
      type: 'media',
      content: playlistContent,
      lastModified: new Date(),
    })

    // Update health metrics
    this.updateStreamHealth(streamId, {
      segments:
        this.streamHealth.get(streamId)?.segments.map(s =>
          s.quality === quality
            ? {
                ...s,
                segmentCount: s.segmentCount + 1,
                lastSegment: new Date(),
              }
            : s
        ) || [],
    })
  }

  /**
   * Get quality-specific settings
   */
  private getQualitySettings(quality: VideoQuality) {
    const settings = {
      '480p': {
        bitrate: 1500,
        resolution: '854x480',
        frameRate: 30,
      },
      '720p': {
        bitrate: 3000,
        resolution: '1280x720',
        frameRate: 30,
      },
      '1080p': {
        bitrate: 6000,
        resolution: '1920x1080',
        frameRate: 30,
      },
      '4K': {
        bitrate: 15000,
        resolution: '3840x2160',
        frameRate: 30,
      },
    }

    return settings[quality]
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 30000) // Check every 30 seconds
  }

  /**
   * Perform health check on all active streams
   */
  private performHealthCheck(): void {
    const now = Date.now()
    const healthTimeout = 2 * 60 * 1000 // 2 minutes

    for (const [streamId, health] of this.streamHealth.entries()) {
      const timeSinceLastUpdate = now - health.lastUpdate.getTime()

      if (timeSinceLastUpdate > healthTimeout) {
        console.warn(
          `Stream ${streamId} appears to be unhealthy - no updates for ${timeSinceLastUpdate}ms`
        )

        // Mark stream as offline
        health.isOnline = false
        this.streamHealth.set(streamId, health)

        // TODO: Notify StreamManager about unhealthy stream
        // This could trigger automatic stream cleanup or notifications
      }
    }
  }

  /**
   * Get HLS URLs for a stream
   */
  getStreamUrls(streamId: string): {
    masterPlaylist: string
    qualities: { quality: VideoQuality; url: string }[]
  } {
    const hlsEndpoint =
      process.env.NEXT_PUBLIC_HLS_ENDPOINT || 'https://cdn.streamvault.app/hls'
    const masterPlaylist = `${hlsEndpoint}/${streamId}/master.m3u8`

    const health = this.streamHealth.get(streamId)
    const qualities =
      health?.segments.map(s => ({
        quality: s.quality,
        url: `${hlsEndpoint}/${streamId}/${s.quality}/playlist.m3u8`,
      })) || []

    return {
      masterPlaylist,
      qualities,
    }
  }

  /**
   * Check if stream is live and healthy
   */
  isStreamLive(streamId: string): boolean {
    const health = this.streamHealth.get(streamId)
    if (!health) return false

    const now = Date.now()
    const maxAge = 60 * 1000 // 1 minute

    return health.isOnline && now - health.lastUpdate.getTime() < maxAge
  }

  /**
   * Get stream statistics
   */
  getStreamStats(streamId: string): {
    isLive: boolean
    uptime: number
    totalSegments: number
    averageBitrate: number
    currentQuality: VideoQuality[]
  } | null {
    const health = this.streamHealth.get(streamId)
    if (!health) return null

    const totalSegments = health.segments.reduce(
      (sum, s) => sum + s.segmentCount,
      0
    )
    const uptime = Date.now() - health.lastUpdate.getTime()

    return {
      isLive: health.isOnline,
      uptime,
      totalSegments,
      averageBitrate: health.bitrate,
      currentQuality: health.segments.map(s => s.quality),
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    this.streamHealth.clear()
    this.playlists.clear()
  }
}

// Export singleton instance
export const hlsService = new HLSService()
