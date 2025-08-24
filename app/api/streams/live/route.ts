import { NextRequest, NextResponse } from 'next/server'
import { StreamService } from '@/lib/database/stream-service'
import { z } from 'zod'

const streamService = new StreamService()

// Schema for live streams query
const liveStreamsQuerySchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  category: z.string().optional(),
  orderBy: z.enum(['viewerCount', 'startedAt', 'title']).default('viewerCount'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * GET /api/streams/live - Get live streams (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Parse and validate query parameters
    const validatedQuery = liveStreamsQuerySchema.parse({
      ...queryParams,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
    })

    // Get live streams (only public ones)
    const result = await streamService.getLiveStreams({
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      where: [
        // Only include public streams
        { field: 'settings.isPrivate', operator: '==', value: false },
        // Add category filter if specified
        ...(validatedQuery.category ? [
          { field: 'category', operator: '==' as const, value: validatedQuery.category }
        ] : []),
      ],
      orderBy: [
        { field: validatedQuery.orderBy, direction: validatedQuery.orderDirection },
        // Secondary sort by startedAt for consistent ordering
        { field: 'startedAt', direction: 'desc' },
      ],
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Filter out sensitive information for public API
    const publicStreams = result.data!.map(stream => ({
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
      streams: publicStreams,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: publicStreams.length,
        hasMore: publicStreams.length === validatedQuery.limit,
      },
    })
  } catch (error) {
    console.error('Error fetching live streams:', error)
    
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