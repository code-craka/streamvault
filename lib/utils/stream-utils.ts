import { randomBytes } from 'crypto'

/**
 * Generate a unique stream key
 */
export function generateStreamKey(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Generate RTMP URL for a stream key
 */
export function generateRTMPUrl(streamKey: string): string {
  const rtmpEndpoint =
    process.env.NEXT_PUBLIC_RTMP_ENDPOINT ||
    'rtmp://ingest.streamvault.app/live'
  return `${rtmpEndpoint}/${streamKey}`
}

/**
 * Generate HLS URL for a stream key
 */
export function generateHLSUrl(streamKey: string): string {
  const hlsEndpoint =
    process.env.NEXT_PUBLIC_HLS_ENDPOINT || 'https://cdn.streamvault.app/hls'
  return `${hlsEndpoint}/${streamKey}/playlist.m3u8`
}

/**
 * Generate signed URL for VOD access
 */
export function generateSignedVODUrl(
  gcsPath: string,
  expirationMinutes = 15
): string {
  // This would integrate with Google Cloud Storage signed URLs
  // For now, return a placeholder URL
  const baseUrl =
    process.env.NEXT_PUBLIC_CDN_ENDPOINT || 'https://cdn.streamvault.app'
  const expiration = Date.now() + expirationMinutes * 60 * 1000
  return `${baseUrl}/vod/${gcsPath}?expires=${expiration}&signature=placeholder`
}

/**
 * Validate stream key format
 */
export function isValidStreamKey(streamKey: string): boolean {
  return /^[a-f0-9]{32}$/.test(streamKey)
}

/**
 * Extract stream key from RTMP URL
 */
export function extractStreamKeyFromRTMP(rtmpUrl: string): string | null {
  const match = rtmpUrl.match(/\/([a-f0-9]{32})$/)
  return match ? match[1] : null
}

/**
 * Generate thumbnail URL for stream
 */
export function generateStreamThumbnailUrl(streamKey: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_CDN_ENDPOINT || 'https://cdn.streamvault.app'
  return `${baseUrl}/thumbnails/streams/${streamKey}/thumb.jpg`
}

/**
 * Generate preview URL for stream
 */
export function generateStreamPreviewUrl(streamKey: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_CDN_ENDPOINT || 'https://cdn.streamvault.app'
  return `${baseUrl}/previews/streams/${streamKey}/preview.gif`
}

/**
 * Calculate stream bitrate based on quality
 */
export function getStreamBitrate(quality: string): number {
  const bitrateMap: Record<string, number> = {
    '480p': 1500, // 1.5 Mbps
    '720p': 3000, // 3 Mbps
    '1080p': 6000, // 6 Mbps
    '4K': 15000, // 15 Mbps
  }

  return bitrateMap[quality] || 3000
}

/**
 * Get stream resolution from quality
 */
export function getStreamResolution(quality: string): {
  width: number
  height: number
} {
  const resolutionMap: Record<string, { width: number; height: number }> = {
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4K': { width: 3840, height: 2160 },
  }

  return resolutionMap[quality] || { width: 1280, height: 720 }
}

/**
 * Format stream duration
 */
export function formatStreamDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate stream health score
 */
export function calculateStreamHealth(
  bitrate: number,
  frameRate: number,
  droppedFrames: number,
  totalFrames: number
): number {
  const bitrateScore = Math.min(bitrate / 6000, 1) // Normalize to 6 Mbps
  const frameRateScore = Math.min(frameRate / 60, 1) // Normalize to 60 FPS
  const dropScore = totalFrames > 0 ? 1 - droppedFrames / totalFrames : 1

  return Math.round(
    (bitrateScore * 0.4 + frameRateScore * 0.3 + dropScore * 0.3) * 100
  )
}

/**
 * Generate stream analytics URL
 */
export function generateStreamAnalyticsUrl(streamId: string): string {
  return `/dashboard/streams/${streamId}/analytics`
}

/**
 * Check if stream is live based on last heartbeat
 */
export function isStreamLive(
  lastHeartbeat: Date,
  toleranceMinutes = 2
): boolean {
  const now = new Date()
  const timeDiff = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60)
  return timeDiff <= toleranceMinutes
}
