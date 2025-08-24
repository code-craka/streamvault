import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { streamManager } from '@/lib/streaming/stream-manager'
import { StreamService } from '@/lib/database/stream-service'
import { updateStreamSchema } from '@/lib/validations/streaming'
import { z } from 'zod'

const streamService = new StreamService()

/**
 * GET /api/streams/[streamId] - Get stream details
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

    const result = await streamService.getById(streamId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'NOT_FOUND' ? 404 : 500 }
      )
    }

    const stream = result.data!

    // Check if user has access to this stream
    const isOwner = stream.userId === userId
    const isPublic = !stream.settings.isPrivate

    if (!isOwner && !isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get health metrics if stream is active
    let healthMetrics = null
    if (stream.status === 'active') {
      healthMetrics = streamManager.getStreamHealth(streamId)
    }

    return NextResponse.json({
      stream,
      healthMetrics,
      isOwner,
    })
  } catch (error) {
    console.error('Error fetching stream:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/streams/[streamId] - Update stream
 */
export async function PUT(
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
    const validatedData = updateStreamSchema.parse({
      id: streamId,
      ...body,
    })

    // Update stream using StreamManager
    const result = await streamManager.updateStream(streamId, userId, validatedData)

    if (!result.success) {
      const statusCode = 
        result.code === 'STREAM_NOT_FOUND' ? 404 :
        result.code === 'UNAUTHORIZED' ? 403 :
        result.code === 'UPDATE_RESTRICTED_WHILE_ACTIVE' ? 409 : 400

      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      message: 'Stream updated successfully',
      stream: result.data,
    })
  } catch (error) {
    console.error('Error updating stream:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
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
 * DELETE /api/streams/[streamId] - Delete stream
 */
export async function DELETE(
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
        { error: 'Unauthorized to delete this stream' },
        { status: 403 }
      )
    }

    if (stream.data.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete active stream. End the stream first.' },
        { status: 409 }
      )
    }

    // Delete stream
    const result = await streamService.delete(streamId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Stream deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting stream:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}