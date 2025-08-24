import { NextRequest, NextResponse } from 'next/server'
import { VODService } from '@/lib/database/vod-service'
import { z } from 'zod'

const vodService = new VODService()

// GET /api/vods/trending - Get trending VODs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const querySchema = z.object({
      limit: z.string().transform(val => parseInt(val) || 20),
      timeframe: z.enum(['1d', '7d', '30d']).default('7d'),
    })

    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Calculate trending based on recent view growth
    const timeframeHours = {
      '1d': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
    }[query.timeframe]

    const cutoffDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000)

    // Get recent VODs
    const result = await vodService.getPublicVODs({
      limit: 1000, // Get more to calculate trending
      where: [
        { field: 'createdAt', operator: '>=', value: cutoffDate },
      ],
      orderBy: [{ field: 'viewCount', direction: 'desc' }],
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    let vods = result.data || []

    // Calculate trending score based on views per day since creation
    const now = Date.now()
    vods = vods.map(vod => {
      const ageInDays = Math.max(1, (now - vod.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      const viewsPerDay = vod.viewCount / ageInDays
      
      return {
        ...vod,
        trendingScore: viewsPerDay,
      }
    })

    // Sort by trending score and take top results
    vods.sort((a, b) => (b as any).trendingScore - (a as any).trendingScore)
    const trendingVods = vods.slice(0, query.limit)

    return NextResponse.json({
      vods: trendingVods,
      total: trendingVods.length,
      timeframe: query.timeframe,
    })

  } catch (error) {
    console.error('Failed to get trending VODs:', error)
    return NextResponse.json(
      { error: 'Failed to get trending VODs' },
      { status: 500 }
    )
  }
}