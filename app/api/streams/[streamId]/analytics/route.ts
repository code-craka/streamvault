import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { StreamService } from '@/lib/database/stream-service'

const streamService = new StreamService()

/**
 * GET /api/streams/[streamId]/analytics - Get stream analytics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify stream exists and user has access
    const stream = await streamService.getById(streamId)
    if (!stream.success || !stream.data) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    // Only stream owner can access analytics
    if (stream.data.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to access analytics for this stream' },
        { status: 403 }
      )
    }

    // Get analytics data
    const analyticsResult = await streamService.getStreamAnalytics(streamId)

    if (!analyticsResult.success) {
      return NextResponse.json(
        { error: analyticsResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      analytics: analyticsResult.data,
    })
  } catch (error) {
    console.error('Error fetching stream analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
