import { NextRequest, NextResponse } from 'next/server'
import { streamManager } from '@/lib/streaming/stream-manager'
import { z } from 'zod'

// Schema for RTMP authentication request
const rtmpAuthSchema = z.object({
  streamKey: z.string().min(1),
  clientIp: z.string().optional(),
  userAgent: z.string().optional(),
})

/**
 * POST /api/streams/auth - Authenticate RTMP stream connection
 * This endpoint is called by the RTMP server to validate stream keys
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validatedData = rtmpAuthSchema.parse(body)

    // Get stream by stream key
    const result = await streamManager.getStreamByKey(validatedData.streamKey)

    if (!result.success) {
      return NextResponse.json(
        { 
          authenticated: false, 
          error: result.error,
          code: result.code 
        },
        { status: result.code === 'INVALID_STREAM_KEY' ? 400 : 500 }
      )
    }

    const stream = result.data

    if (!stream) {
      return NextResponse.json(
        { 
          authenticated: false, 
          error: 'Invalid stream key' 
        },
        { status: 401 }
      )
    }

    // Check if stream is in a valid state for streaming
    if (stream.status === 'ended') {
      return NextResponse.json(
        { 
          authenticated: false, 
          error: 'Stream has ended' 
        },
        { status: 403 }
      )
    }

    // Log authentication attempt
    console.log(`RTMP authentication successful for stream ${stream.id}`, {
      streamKey: validatedData.streamKey,
      userId: stream.userId,
      clientIp: validatedData.clientIp,
      userAgent: validatedData.userAgent,
    })

    return NextResponse.json({
      authenticated: true,
      stream: {
        id: stream.id,
        userId: stream.userId,
        title: stream.title,
        status: stream.status,
        settings: stream.settings,
      },
    })
  } catch (error) {
    console.error('Error authenticating RTMP stream:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          authenticated: false, 
          error: 'Invalid authentication data', 
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/streams/auth - Health check for RTMP auth service
 */
export async function GET() {
  return NextResponse.json({
    service: 'RTMP Authentication',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
}