/**
 * Webhook event types for StreamVault
 */

export interface BaseWebhookEvent {
  event: 'stream_started' | 'stream_stopped' | 'stream_error' | 'heartbeat'
  streamKey: string
  clientIp?: string
  userAgent?: string
  timestamp: string
}

export interface StreamStartedEvent extends BaseWebhookEvent {
  event: 'stream_started'
  data?: {
    bitrate?: number
    frameRate?: number
    resolution?: string
    codec?: string
  }
}

export interface StreamStoppedEvent extends BaseWebhookEvent {
  event: 'stream_stopped'
  data?: {
    duration?: number
    totalFrames?: number
    reason?: string
  }
}

export interface StreamErrorEvent extends BaseWebhookEvent {
  event: 'stream_error'
  data: {
    errorCode: string
    errorMessage: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    timestamp: string
  }
}

export interface StreamHeartbeatEvent extends BaseWebhookEvent {
  event: 'heartbeat'
  data: {
    bitrate: number
    frameRate: number
    droppedFrames: number
    totalFrames: number
    viewerCount?: number
    resolution?: string
    uptime?: number
  }
}

export type WebhookEvent = StreamStartedEvent | StreamStoppedEvent | StreamErrorEvent | StreamHeartbeatEvent

export interface WebhookResponse {
  message: string
  streamId: string
  event: string
  timestamp?: string
}

export interface WebhookErrorResponse {
  error: string
  details?: unknown
  timestamp?: string
}

export interface StreamHealthMetrics {
  bitrate: number
  frameRate: number
  droppedFrames: number
  totalFrames: number
}

export interface HLSHealthMetrics {
  bitrate: number
  frameRate: number
  resolution: string
}