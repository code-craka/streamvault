import { NextRequest, NextResponse } from 'next/server'
import { streamManager } from '@/lib/streaming/stream-manager'
import { hlsService } from '@/lib/streaming/hls-service'
import { StreamService } from '@/lib/database/stream-service'
import { z } from 'zod'

const streamService = new StreamService()

// Schema for streaming webhook events
const webhookEventSchema = z.object({
  event: z.enum([
    'stream_started',
    'stream_stopped',
    'stream_error',
    'heartbeat',
  ]),
  streamKey: z.string(),
  clientIp: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.string().datetime(),
  data: z.record(z.any()).optional(),
})

type WebhookEvent = z.infer<typeof webhookEventSchema>

/**
 * POST /api/streaming/webhook - Handle streaming server webhook events
 * This endpoint receives notifications from the RTMP/streaming server
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (in production, this should be validated)
    const webhookSecret = request.headers.get('x-webhook-secret')
    if (webhookSecret !== process.env.STREAMING_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedEvent = webhookEventSchema.parse(body)

    console.log('Received streaming webhook event:', validatedEvent)

    // Get stream by stream key
    const streamResult = await streamManager.getStreamByKey(
      validatedEvent.streamKey
    )

    if (!streamResult.success || !streamResult.data) {
      console.warn(
        `Webhook event for unknown stream key: ${validatedEvent.streamKey}`
      )
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    const stream = streamResult.data

    // Handle different event types
    switch (validatedEvent.event) {
      case 'stream_started':
        await handleStreamStarted(stream.id)
        break

      case 'stream_stopped':
        await handleStreamStopped(stream.id)
        break

      case 'stream_error':
        await handleStreamError(stream.id, validatedEvent)
        break

      case 'heartbeat':
        await handleStreamHeartbeat(stream.id, validatedEvent)
        break

      default:
        console.warn(`Unknown webhook event type: ${validatedEvent.event}`)
    }

    return NextResponse.json({
      message: 'Webhook processed successfully',
      streamId: stream.id,
      event: validatedEvent.event,
    })
  } catch (error) {
    console.error('Error processing streaming webhook:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid webhook data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle stream started event
 */
async function handleStreamStarted(streamId: string): Promise<void> {
  try {
    console.log(`Stream ${streamId} started via RTMP`)

    // Get stream details
    const streamResult = await streamService.getById(streamId)
    if (!streamResult.success || !streamResult.data) {
      throw new Error('Stream not found')
    }

    const stream = streamResult.data

    // Start the stream if it's not already active
    if (stream.status !== 'active') {
      await streamManager.startStream(streamId, stream.userId)
    }

    // Initialize HLS delivery
    await hlsService.initializeHLSDelivery(stream)

    console.log(`HLS delivery initialized for stream ${streamId}`)
  } catch (error) {
    console.error(`Error handling stream started event for ${streamId}:`, error)
    throw error
  }
}

/**
 * Handle stream stopped event
 */
async function handleStreamStopped(streamId: string): Promise<void> {
  try {
    console.log(`Stream ${streamId} stopped via RTMP`)

    // Get stream details
    const streamResult = await streamService.getById(streamId)
    if (!streamResult.success || !streamResult.data) {
      throw new Error('Stream not found')
    }

    const stream = streamResult.data

    // End the stream if it's still active
    if (stream.status === 'active') {
      await streamManager.endStream(streamId, stream.userId)
    }

    // Stop HLS delivery
    await hlsService.stopHLSDelivery(streamId)

    console.log(`Stream ${streamId} ended and HLS delivery stopped`)
  } catch (error) {
    console.error(`Error handling stream stopped event for ${streamId}:`, error)
    throw error
  }
}

/**
 * Handle stream error event
 */
async function handleStreamError(
  streamId: string,
  event: WebhookEvent
): Promise<void> {
  try {
    console.error(`Stream ${streamId} encountered an error:`, event.data)

    // Update stream status to error
    await streamService.update(streamId, {
      status: 'error',
      isLive: false,
      endedAt: new Date(),
    })

    // Stop HLS delivery
    await hlsService.stopHLSDelivery(streamId)

    // TODO: Send notification to stream owner about the error
    console.log(`Stream ${streamId} marked as error and HLS delivery stopped`)
  } catch (error) {
    console.error(`Error handling stream error event for ${streamId}:`, error)
    throw error
  }
}

/**
 * Handle stream heartbeat event
 */
async function handleStreamHeartbeat(
  streamId: string,
  event: WebhookEvent
): Promise<void> {
  try {
    const healthData = event.data || {}

    // Update stream health metrics
    await streamManager.updateStreamHealth(streamId, {
      bitrate: healthData.bitrate || 0,
      frameRate: healthData.frameRate || 0,
      droppedFrames: healthData.droppedFrames || 0,
      totalFrames: healthData.totalFrames || 0,
    })

    // Update HLS service health
    hlsService.updateStreamHealth(streamId, {
      bitrate: healthData.bitrate || 0,
      frameRate: healthData.frameRate || 0,
      resolution: healthData.resolution || '1280x720',
    })

    // Update viewer count if provided
    if (healthData.viewerCount !== undefined) {
      await streamManager.updateViewerCount(streamId, healthData.viewerCount)
    }
  } catch (error) {
    console.error(`Error handling stream heartbeat for ${streamId}:`, error)
    // Don't throw error for heartbeat failures to avoid disrupting the stream
  }
}

/**
 * GET /api/streaming/webhook - Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Streaming Webhook Handler',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supportedEvents: [
      'stream_started',
      'stream_stopped',
      'stream_error',
      'heartbeat',
    ],
  })
}
