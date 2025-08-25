import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { VODService } from '@/lib/database/vod-service'
import { z } from 'zod'

const vodService = new VODService()

// GET /api/vods/user - Get user's VODs
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
    
    const querySchema = z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(['processing', 'ready', 'error', 'deleted']).optional(),
      limit: z.string().transform(val => parseInt(val) || 20),
      offset: z.string().transform(val => parseInt(val) || 0),
      orderBy: z.enum(['createdAt', 'viewCount', 'duration', 'title']).default('createdAt'),
      orderDirection: z.enum(['asc', 'desc']).default('desc'),
    })

    const query = querySchema.parse(Object.fromEntries(searchParams))

    const result = await vodService.getVODsByUser(userId, {
      limit: query.limit,
      offset: query.offset,
      orderBy: [{ field: query.orderBy, direction: query.orderDirection }],
      where: [
        ...(query.category ? [{ field: 'category', operator: '==' as const, value: query.category }] : []),
        ...(query.status ? [{ field: 'status', operator: '==' as const, value: query.status }] : []),
      ],
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    let vods = result.data || []

    // Apply text search filter
    if (query.search) {
      const searchTerm = query.search.toLowerCase()
      vods = vods.filter(vod =>
        vod.title.toLowerCase().includes(searchTerm) ||
        (vod.description && vod.description.toLowerCase().includes(searchTerm)) ||
        vod.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }

    return NextResponse.json({
      vods,
      total: vods.length,
      hasMore: vods.length === query.limit,
    })

  } catch (error) {
    console.error('Failed to get user VODs:', error)
    return NextResponse.json(
      { error: 'Failed to get user VODs' },
      { status: 500 }
    )
  }
}