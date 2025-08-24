import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { streamManager } from '@/lib/streaming/stream-manager'

/**
 * POST /api/streams/[streamId]/regenerate-key - Regenerate stream key
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

    // Regenerate stream key using StreamManager
    const result = await streamManager.regenerateStreamKey(streamId, userId)

    if (!result.success) {
      const statusCode =
        result.code === 'STREAM_NOT_FOUND'
          ? 404
          : result.code === 'UNAUTHORIZED'
            ? 403
            : result.code === 'STREAM_ACTIVE'
              ? 409
              : 400

      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      message: 'Stream key regenerated successfully',
      stream: {
        id: result.data!.id,
        streamKey: result.data!.streamKey,
        rtmpUrl: result.data!.rtmpUrl,
        hlsUrl: result.data!.hlsUrl,
      },
    })
  } catch (error) {
    console.error('Error regenerating stream key:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
