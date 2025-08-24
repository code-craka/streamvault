import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { streamManager } from '@/lib/streaming/stream-manager'
import { StreamService } from '@/lib/database/stream-service'
import { createStreamSchema, streamQuerySchema } from '@/lib/validations/streaming'
import { z } from 'zod'

const streamService = new StreamService()

/**
 * GET /api/streams - Get streams with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Parse and validate query parameters
    const validatedQuery = streamQuerySchema.parse({
      ...queryParams,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
      isLive: queryParams.isLive ? queryParams.isLive === 'true' : undefined,
    })

    // If no userId specified in query, default to current user's streams
    if (!validatedQuery.userId) {
      validatedQuery.userId = userId
    }

    const result = await streamService.searchStreams(validatedQuery)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      streams: result.data,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: result.data!.length,
      },
    })
  } catch (error) {
    console.error('Error fetching streams:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
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
 * POST /api/streams - Create a new stream
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validatedData = createStreamSchema.parse(body)

    // Create stream using StreamManager
    const result = await streamManager.createStream(userId, validatedData)

    if (!result.success) {
      const statusCode = result.code === 'STREAM_LIMIT_EXCEEDED' ? 429 : 400
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusCode }
      )
    }

    return NextResponse.json(
      {
        message: 'Stream created successfully',
        stream: result.data,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating stream:', error)
    
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