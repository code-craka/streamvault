import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { streamManager } from '@/lib/streaming/stream-manager'
import { hlsService } from '@/lib/streaming/hls-service'
import { transcodingService } from '@/lib/streaming/transcoding-service'
import type { CreateStreamInput } from '@/lib/validations/streaming'

/**
 * GET /api/streaming/test - Test streaming system health
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    // Get system status
    const activeStreams = streamManager.getActiveStreamsHealth()
    const hlsHealth = hlsService.getAllStreamHealth()
    const activeJobs = transcodingService.getActiveJobs()

    const systemStatus = {
      timestamp: new Date().toISOString(),
      authenticated: !!userId,
      services: {
        streamManager: {
          status: 'healthy',
          activeStreams: activeStreams.size,
        },
        hlsService: {
          status: 'healthy',
          activeStreams: hlsHealth.length,
        },
        transcodingService: {
          status: 'healthy',
          activeJobs: activeJobs.length,
        },
      },
      configuration: {
        rtmpEndpoint:
          process.env.NEXT_PUBLIC_RTMP_ENDPOINT ||
          'rtmp://ingest.streamvault.app/live',
        hlsEndpoint:
          process.env.NEXT_PUBLIC_HLS_ENDPOINT ||
          'https://cdn.streamvault.app/hls',
        maxConcurrentStreams: 5,
      },
    }

    return NextResponse.json(systemStatus)
  } catch (error) {
    console.error('Error in streaming test endpoint:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        services: {
          streamManager: { status: 'error' },
          hlsService: { status: 'error' },
          transcodingService: { status: 'error' },
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/streaming/test - Create a test stream
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create a test stream
    const testStreamData: CreateStreamInput = {
      title: 'Test Stream',
      description: 'A test stream for development',
      category: 'Testing',
      tags: ['test', 'development'],
      settings: {
        quality: ['720p', '1080p'],
        enableChat: true,
        enableRecording: true,
        isPrivate: false,
        requireSubscription: false,
        moderationLevel: 'medium',
      },
      metadata: {
        language: 'en',
        ageRating: 'all',
      },
    }

    const result = await streamManager.createStream(userId, testStreamData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      )
    }

    const stream = result.data!

    return NextResponse.json({
      message: 'Test stream created successfully',
      stream: {
        id: stream.id,
        title: stream.title,
        streamKey: stream.streamKey,
        rtmpUrl: stream.rtmpUrl,
        hlsUrl: stream.hlsUrl,
        status: stream.status,
      },
      instructions: {
        rtmp: `Use OBS or similar software to stream to: ${stream.rtmpUrl}`,
        hls: `View the stream at: ${stream.hlsUrl}`,
        api: {
          start: `/api/streams/${stream.id}/start`,
          end: `/api/streams/${stream.id}/end`,
          health: `/api/streams/${stream.id}/health`,
        },
      },
    })
  } catch (error) {
    console.error('Error creating test stream:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
