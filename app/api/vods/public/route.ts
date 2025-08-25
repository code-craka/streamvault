import { NextRequest, NextResponse } from 'next/server'
import { VODService } from '@/lib/database/vod-service'
import { z } from 'zod'

const vodService = new VODService()

// GET /api/vods/public - Get public VODs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const querySchema = z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      requiredTier: z.enum(['basic', 'premium', 'pro']).optional(),
      limit: z.string().transform(val => parseInt(val) || 20),
      offset: z.string().transform(val => parseInt(val) || 0),
      orderBy: z.enum(['createdAt', 'viewCount', 'duration', 'title']).default('createdAt'),
      orderDirection: z.enum(['asc', 'desc']).default('desc'),
    })

    const query = querySchema.parse(Object.fromEntries(searchParams))

    const result = await vodService.getPublicVODs({
      limit: query.limit,
      offset: query.offset,
      orderBy: [{ field: query.orderBy, direction: query.orderDirection }],
      where: [
        ...(query.category ? [{ field: 'category', operator: '==', value: query.category }] : []),
        ...(query.requiredTier ? [{ field: 'requiredTier', operator: '==', value: query.requiredTier }] : []),
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
    console.error('Failed to get public VODs:', error)
    return NextResponse.json(
      { error: 'Failed to get public VODs' },
      { status: 500 }
    )
  }
}