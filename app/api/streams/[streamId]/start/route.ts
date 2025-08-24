import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { streamManager } from '@/lib/streaming/stream-manager'

/**
 * POST /api/streams/[streamId]/start - Start a stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Start stream using StreamManager
    const result = await streamManager.startStream(streamId, userId)

    if (!result.success) {
      const statusCode =
        result.code === 'STREAM_NOT_FOUND'
          ? 404
          : result.code === 'UNAUTHORIZED'
            ? 403
            : result.code === 'STREAM_ALREADY_ACTIVE'
              ? 409
              : 400

      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      message: 'Stream started successfully',
      stream: result.data,
    })
  } catch (error) {
    console.error('Error starting stream:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
