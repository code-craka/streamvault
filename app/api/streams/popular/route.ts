import { NextRequest, NextResponse } from 'next/server'
import { StreamService } from '@/lib/database/stream-service'
import { z } from 'zod'

const streamService = new StreamService()

// Schema for popular streams query
const popularStreamsQuerySchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  category: z.string().optional(),
})

/**
 * GET /api/streams/popular - Get popular streams (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Parse and validate query parameters
    const validatedQuery = popularStreamsQuerySchema.parse({
      ...queryParams,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
    })

    // Get popular streams
    const result = await streamService.getPopularStreams(validatedQuery.limit)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Filter by category if specified and filter out private streams
    let streams = result.data!.filter(stream => !stream.settings.isPrivate)

    if (validatedQuery.category) {
      streams = streams.filter(stream => stream.category === validatedQuery.category)
    }

    // Filter out sensitive information for public API
    const popularStreams = streams.map(stream => ({
      id: stream.id,
      userId: stream.userId,
      title: stream.title,
      description: stream.description,
      category: stream.category,
      tags: stream.tags,
      hlsUrl: stream.hlsUrl,
      status: stream.status,
      isLive: stream.isLive,
      viewerCount: stream.viewerCount,
      maxViewers: stream.maxViewers,
      startedAt: stream.startedAt,
      metadata: {
        thumbnailUrl: stream.metadata.thumbnailUrl,
        previewUrl: stream.metadata.previewUrl,
        language: stream.metadata.language,
        ageRating: stream.metadata.ageRating,
      },
      settings: {
        requireSubscription: stream.settings.requireSubscription,
        requiredTier: stream.settings.requiredTier,
      },
    }))

    return NextResponse.json({
      streams: popularStreams,
      metadata: {
        category: validatedQuery.category,
        limit: validatedQuery.limit,
        total: popularStreams.length,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching popular streams:', error)
    
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