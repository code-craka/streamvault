import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { streamManager } from '@/lib/streaming/stream-manager'
import { StreamService } from '@/lib/database/stream-service'
import { z } from 'zod'

const streamService = new StreamService()

// Schema for health metrics update
const healthMetricsSchema = z.object({
  bitrate: z.number().min(0).optional(),
  frameRate: z.number().min(0).optional(),
  droppedFrames: z.number().min(0).optional(),
  totalFrames: z.number().min(0).optional(),
  viewerCount: z.number().min(0).optional(),
})

/**
 * GET /api/streams/[streamId]/health - Get stream health metrics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify stream exists and user has access
    const stream = await streamService.getById(streamId)
    if (!stream.success || !stream.data) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      )
    }

    // Check if user has access (owner or public stream)
    const isOwner = stream.data.userId === userId
    const isPublic = !stream.data.settings.isPrivate

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get health metrics
    const healthMetrics = streamManager.getStreamHealth(streamId)

    if (!healthMetrics) {
      return NextResponse.json(
        { error: 'Stream is not active or health data not available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      streamId,
      health: healthMetrics,
      stream: {
        status: stream.data.status,
        isLive: stream.data.isLive,
        viewerCount: stream.data.viewerCount,
        maxViewers: stream.data.maxViewers,
      },
    })
  } catch (error) {
    console.error('Error fetching stream health:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/streams/[streamId]/health - Update stream health metrics
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validatedData = healthMetricsSchema.parse(body)

    // Verify stream ownership
    const stream = await streamService.getById(streamId)
    if (!stream.success || !stream.data) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      )
    }

    if (stream.data.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this stream' },
        { status: 403 }
      )
    }

    if (stream.data.status !== 'active') {
      return NextResponse.json(
        { error: 'Stream is not active' },
        { status: 409 }
      )
    }

    // Update health metrics
    await streamManager.updateStreamHealth(streamId, validatedData)

    // Update viewer count if provided
    if (validatedData.viewerCount !== undefined) {
      await streamManager.updateViewerCount(streamId, validatedData.viewerCount)
    }

    // Get updated health metrics
    const updatedHealth = streamManager.getStreamHealth(streamId)

    return NextResponse.json({
      message: 'Health metrics updated successfully',
      health: updatedHealth,
    })
  } catch (error) {
    console.error('Error updating stream health:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid health metrics data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}