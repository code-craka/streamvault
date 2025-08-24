import { StreamService } from '@/lib/database/stream-service'
import { generateStreamKey, generateRTMPUrl, generateHLSUrl, isValidStreamKey } from '@/lib/utils/stream-utils'
import type { Stream, StreamConfig, StreamSettings, StreamMetadata } from '@/types/streaming'
import type { CreateStreamInput, UpdateStreamInput } from '@/lib/validations/streaming'
import type { DatabaseResult } from '@/types/database'

export interface StreamManagerConfig {
  rtmpEndpoint?: string
  hlsEndpoint?: string
  maxConcurrentStreams?: number
  defaultStreamSettings?: Partial<StreamSettings>
}

export interface StreamHealthMetrics {
  bitrate: number
  frameRate: number
  droppedFrames: number
  totalFrames: number
  lastHeartbeat: Date
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor'
  healthScore: number
}

export interface StreamNotification {
  type: 'stream_started' | 'stream_ended' | 'stream_error' | 'viewer_joined' | 'viewer_left'
  streamId: string
  userId: string
  data?: any
  timestamp: Date
}

export class StreamManager {
  private streamService: StreamService
  private config: StreamManagerConfig
  private activeStreams: Map<string, StreamHealthMetrics> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(config: StreamManagerConfig = {}) {
    this.streamService = new StreamService()
    this.config = {
      rtmpEndpoint: process.env.NEXT_PUBLIC_RTMP_ENDPOINT || 'rtmp://ingest.streamvault.app/live',
      hlsEndpoint: process.env.NEXT_PUBLIC_HLS_ENDPOINT || 'https://cdn.streamvault.app/hls',
      maxConcurrentStreams: 5,
      defaultStreamSettings: {
        quality: ['720p', '1080p'],
        enableChat: true,
        enableRecording: true,
        isPrivate: false,
        requireSubscription: false,
        moderationLevel: 'medium',
        maxDuration: 480, // 8 hours
      },
      ...config,
    }

    // Start health monitoring
    this.startHealthMonitoring()
  }

  /**
   * Create a new stream configuration
   */
  async createStream(userId: string, streamData: CreateStreamInput): Promise<DatabaseResult<Stream>> {
    try {
      // Check concurrent stream limit
      const userStreams = await this.streamService.getStreamsByUser(userId, {
        where: [{ field: 'status', operator: '==', value: 'active' }],
      })

      if (userStreams.success && userStreams.data!.length >= this.config.maxConcurrentStreams!) {
        return {
          success: false,
          error: `Maximum concurrent streams limit reached (${this.config.maxConcurrentStreams})`,
          code: 'STREAM_LIMIT_EXCEEDED',
        }
      }

      // Merge with default settings
      const settings: StreamSettings = {
        ...this.config.defaultStreamSettings,
        ...streamData.settings,
      } as StreamSettings

      const streamToCreate: CreateStreamInput = {
        ...streamData,
        settings,
      }

      // Create stream in database
      const result = await this.streamService.createStream(userId, streamToCreate)

      if (result.success) {
        // Initialize stream health tracking
        this.initializeStreamHealth(result.data!.id)

        // Send notification
        await this.sendNotification({
          type: 'stream_started',
          streamId: result.data!.id,
          userId,
          timestamp: new Date(),
        })
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create stream',
        code: 'STREAM_CREATION_ERROR',
      }
    }
  }

  /**
   * Start a stream (transition from inactive to active)
   */
  async startStream(streamId: string, userId: string): Promise<DatabaseResult<Stream>> {
    try {
      // Verify stream ownership
      const stream = await this.streamService.getById(streamId)
      if (!stream.success || !stream.data) {
        return {
          success: false,
          error: 'Stream not found',
          code: 'STREAM_NOT_FOUND',
        }
      }

      if (stream.data.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to start this stream',
          code: 'UNAUTHORIZED',
        }
      }

      if (stream.data.status === 'active') {
        return {
          success: false,
          error: 'Stream is already active',
          code: 'STREAM_ALREADY_ACTIVE',
        }
      }

      // Start the stream
      const result = await this.streamService.startStream(streamId)

      if (result.success) {
        // Initialize health monitoring
        this.initializeStreamHealth(streamId)

        // Initialize transcoding pipeline
        await this.initializeTranscoding(streamId, stream.data.settings.quality)

        // Send notification
        await this.sendNotification({
          type: 'stream_started',
          streamId,
          userId,
          data: { title: stream.data.title },
          timestamp: new Date(),
        })
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start stream',
        code: 'STREAM_START_ERROR',
      }
    }
  }

  /**
   * End a stream (transition from active to ended)
   */
  async endStream(streamId: string, userId: string): Promise<DatabaseResult<Stream>> {
    try {
      // Verify stream ownership
      const stream = await this.streamService.getById(streamId)
      if (!stream.success || !stream.data) {
        return {
          success: false,
          error: 'Stream not found',
          code: 'STREAM_NOT_FOUND',
        }
      }

      if (stream.data.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to end this stream',
          code: 'UNAUTHORIZED',
        }
      }

      if (stream.data.status !== 'active') {
        return {
          success: false,
          error: 'Stream is not active',
          code: 'STREAM_NOT_ACTIVE',
        }
      }

      // End the stream
      const result = await this.streamService.endStream(streamId)

      if (result.success) {
        // Stop health monitoring
        this.stopStreamHealth(streamId)

        // Stop HLS delivery
        const { hlsService } = await import('./hls-service')
        await hlsService.stopHLSDelivery(streamId)

        // Finalize transcoding and create VOD if recording was enabled
        if (stream.data.settings.enableRecording) {
          await this.finalizeRecording(streamId)
        }

        // Send notification
        await this.sendNotification({
          type: 'stream_ended',
          streamId,
          userId,
          data: { 
            title: stream.data.title,
            duration: result.data!.endedAt && result.data!.startedAt 
              ? Math.floor((result.data!.endedAt.getTime() - result.data!.startedAt.getTime()) / 1000)
              : 0
          },
          timestamp: new Date(),
        })
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end stream',
        code: 'STREAM_END_ERROR',
      }
    }
  }

  /**
   * Update stream configuration
   */
  async updateStream(streamId: string, userId: string, updateData: Partial<UpdateStreamInput>): Promise<DatabaseResult<Stream>> {
    try {
      // Verify stream ownership
      const stream = await this.streamService.getById(streamId)
      if (!stream.success || !stream.data) {
        return {
          success: false,
          error: 'Stream not found',
          code: 'STREAM_NOT_FOUND',
        }
      }

      if (stream.data.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to update this stream',
          code: 'UNAUTHORIZED',
        }
      }

      // Prevent certain updates while stream is active
      if (stream.data.status === 'active') {
        const restrictedFields = ['settings.quality', 'settings.enableRecording']
        for (const field of restrictedFields) {
          if (this.hasNestedProperty(updateData, field)) {
            return {
              success: false,
              error: `Cannot update ${field} while stream is active`,
              code: 'UPDATE_RESTRICTED_WHILE_ACTIVE',
            }
          }
        }
      }

      const updateInput: UpdateStreamInput = {
        id: streamId,
        ...updateData,
      }

      return await this.streamService.updateStream(streamId, updateInput)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stream',
        code: 'STREAM_UPDATE_ERROR',
      }
    }
  }

  /**
   * Get stream by stream key (for RTMP authentication)
   */
  async getStreamByKey(streamKey: string): Promise<DatabaseResult<Stream | null>> {
    if (!isValidStreamKey(streamKey)) {
      return {
        success: false,
        error: 'Invalid stream key format',
        code: 'INVALID_STREAM_KEY',
      }
    }

    return await this.streamService.getStreamByKey(streamKey)
  }

  /**
   * Update viewer count for a stream
   */
  async updateViewerCount(streamId: string, viewerCount: number): Promise<DatabaseResult<Stream>> {
    const result = await this.streamService.updateViewerCount(streamId, viewerCount)

    if (result.success) {
      // Update health metrics
      const health = this.activeStreams.get(streamId)
      if (health) {
        // Viewer count changes can indicate stream health
        this.activeStreams.set(streamId, {
          ...health,
          lastHeartbeat: new Date(),
        })
      }
    }

    return result
  }

  /**
   * Update stream health metrics
   */
  async updateStreamHealth(streamId: string, metrics: Partial<StreamHealthMetrics>): Promise<void> {
    const currentHealth = this.activeStreams.get(streamId)
    if (!currentHealth) {
      return
    }

    const updatedHealth: StreamHealthMetrics = {
      ...currentHealth,
      ...metrics,
      lastHeartbeat: new Date(),
    }

    // Calculate health score
    updatedHealth.healthScore = this.calculateHealthScore(updatedHealth)

    // Determine connection quality
    updatedHealth.connectionQuality = this.determineConnectionQuality(updatedHealth)

    this.activeStreams.set(streamId, updatedHealth)

    // Check for stream issues
    if (updatedHealth.healthScore < 50) {
      await this.handleStreamIssue(streamId, updatedHealth)
    }
  }

  /**
   * Get stream health metrics
   */
  getStreamHealth(streamId: string): StreamHealthMetrics | null {
    return this.activeStreams.get(streamId) || null
  }

  /**
   * Get all active streams with health metrics
   */
  getActiveStreamsHealth(): Map<string, StreamHealthMetrics> {
    return new Map(this.activeStreams)
  }

  /**
   * Regenerate stream key (for security purposes)
   */
  async regenerateStreamKey(streamId: string, userId: string): Promise<DatabaseResult<Stream>> {
    try {
      // Verify stream ownership
      const stream = await this.streamService.getById(streamId)
      if (!stream.success || !stream.data) {
        return {
          success: false,
          error: 'Stream not found',
          code: 'STREAM_NOT_FOUND',
        }
      }

      if (stream.data.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to regenerate stream key',
          code: 'UNAUTHORIZED',
        }
      }

      if (stream.data.status === 'active') {
        return {
          success: false,
          error: 'Cannot regenerate stream key while stream is active',
          code: 'STREAM_ACTIVE',
        }
      }

      // Generate new stream key and URLs
      const newStreamKey = generateStreamKey()
      const newRtmpUrl = generateRTMPUrl(newStreamKey)
      const newHlsUrl = generateHLSUrl(newStreamKey)

      // Note: streamKey, rtmpUrl, hlsUrl are not part of UpdateStreamInput
      // They would need to be updated through a different mechanism
      // For now, we'll update the stream record directly
      const result = await this.streamService.update(streamId, {
        streamKey: newStreamKey,
        rtmpUrl: newRtmpUrl,
        hlsUrl: newHlsUrl,
      })

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate stream key',
        code: 'STREAM_KEY_REGENERATION_ERROR',
      }
    }
  }

  /**
   * Initialize stream health monitoring
   */
  private initializeStreamHealth(streamId: string): void {
    this.activeStreams.set(streamId, {
      bitrate: 0,
      frameRate: 0,
      droppedFrames: 0,
      totalFrames: 0,
      lastHeartbeat: new Date(),
      connectionQuality: 'good',
      healthScore: 100,
    })
  }

  /**
   * Stop stream health monitoring
   */
  private stopStreamHealth(streamId: string): void {
    this.activeStreams.delete(streamId)
  }

  /**
   * Initialize transcoding pipeline
   */
  private async initializeTranscoding(streamId: string, qualities: string[]): Promise<void> {
    // Import HLS service dynamically to avoid circular dependencies
    const { hlsService } = await import('./hls-service')
    
    console.log(`Initializing transcoding for stream ${streamId} with qualities:`, qualities)
    
    try {
      // Get stream data for HLS initialization
      const streamResult = await this.streamService.getById(streamId)
      if (streamResult.success && streamResult.data) {
        await hlsService.initializeHLSDelivery(streamResult.data)
      }
    } catch (error) {
      console.error(`Failed to initialize transcoding for stream ${streamId}:`, error)
      throw error
    }
  }

  /**
   * Finalize recording and create VOD
   */
  private async finalizeRecording(streamId: string): Promise<void> {
    // This would finalize the recording and create a VOD entry
    console.log(`Finalizing recording for stream ${streamId}`)
    
    // TODO: Implement VOD creation from stream recording
    // This could involve:
    // 1. Stopping recording processes
    // 2. Processing recorded segments into a single file
    // 3. Uploading to Google Cloud Storage
    // 4. Creating VOD database entry
  }

  /**
   * Send stream notification
   */
  private async sendNotification(notification: StreamNotification): Promise<void> {
    // This would integrate with a notification system
    console.log('Stream notification:', notification)
    
    // TODO: Implement actual notification system
    // This could involve:
    // 1. WebSocket notifications to connected clients
    // 2. Push notifications to mobile apps
    // 3. Email notifications for important events
    // 4. Webhook notifications to third-party services
  }

  /**
   * Calculate stream health score
   */
  private calculateHealthScore(metrics: StreamHealthMetrics): number {
    const bitrateScore = Math.min(metrics.bitrate / 6000, 1) * 40 // 40% weight
    const frameRateScore = Math.min(metrics.frameRate / 60, 1) * 30 // 30% weight
    const dropScore = metrics.totalFrames > 0 
      ? (1 - (metrics.droppedFrames / metrics.totalFrames)) * 30 // 30% weight
      : 30

    return Math.round(bitrateScore + frameRateScore + dropScore)
  }

  /**
   * Determine connection quality based on metrics
   */
  private determineConnectionQuality(metrics: StreamHealthMetrics): 'excellent' | 'good' | 'fair' | 'poor' {
    if (metrics.healthScore >= 90) return 'excellent'
    if (metrics.healthScore >= 70) return 'good'
    if (metrics.healthScore >= 50) return 'fair'
    return 'poor'
  }

  /**
   * Handle stream issues
   */
  private async handleStreamIssue(streamId: string, metrics: StreamHealthMetrics): Promise<void> {
    console.warn(`Stream ${streamId} has health issues:`, metrics)
    
    // Send notification about stream issues
    await this.sendNotification({
      type: 'stream_error',
      streamId,
      userId: '', // Would need to get from stream data
      data: {
        healthScore: metrics.healthScore,
        connectionQuality: metrics.connectionQuality,
        issues: this.identifyStreamIssues(metrics),
      },
      timestamp: new Date(),
    })
  }

  /**
   * Identify specific stream issues
   */
  private identifyStreamIssues(metrics: StreamHealthMetrics): string[] {
    const issues: string[] = []

    if (metrics.bitrate < 1000) {
      issues.push('Low bitrate detected')
    }

    if (metrics.frameRate < 15) {
      issues.push('Low frame rate detected')
    }

    if (metrics.totalFrames > 0 && (metrics.droppedFrames / metrics.totalFrames) > 0.05) {
      issues.push('High frame drop rate detected')
    }

    const timeSinceLastHeartbeat = Date.now() - metrics.lastHeartbeat.getTime()
    if (timeSinceLastHeartbeat > 30000) { // 30 seconds
      issues.push('Connection timeout detected')
    }

    return issues
  }

  /**
   * Start health monitoring interval
   */
  private startHealthMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkStreamHealth()
    }, 30000) // Check every 30 seconds
  }

  /**
   * Check health of all active streams
   */
  private async checkStreamHealth(): Promise<void> {
    const now = Date.now()
    const timeoutThreshold = 2 * 60 * 1000 // 2 minutes

    for (const [streamId, health] of this.activeStreams.entries()) {
      const timeSinceLastHeartbeat = now - health.lastHeartbeat.getTime()

      if (timeSinceLastHeartbeat > timeoutThreshold) {
        console.warn(`Stream ${streamId} appears to be disconnected`)
        
        // Mark stream as ended due to timeout
        try {
          await this.streamService.update(streamId, {
            status: 'ended',
            isLive: false,
            endedAt: new Date(),
          })

          this.stopStreamHealth(streamId)
        } catch (error) {
          console.error(`Failed to mark stream ${streamId} as ended:`, error)
        }
      }
    }
  }

  /**
   * Check if object has nested property
   */
  private hasNestedProperty(obj: any, path: string): boolean {
    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return false
      }
    }

    return true
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.activeStreams.clear()
  }
}

// Export singleton instance
export const streamManager = new StreamManager()