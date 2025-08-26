import { NextRequest, NextResponse } from 'next/server'
import { VODService } from '@/lib/database/vod-service'
import { z } from 'zod'

const vodService = new VODService()

// GET /api/vods/popular - Get popular VODs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const querySchema = z.object({
      limit: z.string().transform(val => parseInt(val) || 20),
      timeframe: z.enum(['all', '30d', '7d', '1d']).default('all'),
    })

    const query = querySchema.parse(Object.fromEntries(searchParams))

    const whereConditions = []

    // Add timeframe filter if specified
    if (query.timeframe !== 'all') {
      const timeframeMap = {
        '1d': 24,
        '7d': 24 * 7,
        '30d': 24 * 30,
      }
      const timeframeHours: number =
        timeframeMap[query.timeframe as keyof typeof timeframeMap]

      if (timeframeHours) {
        const cutoffDate = new Date(
          Date.now() - timeframeHours * 60 * 60 * 1000
        )
        whereConditions.push({
          field: 'createdAt',
          operator: '>=',
          value: cutoffDate,
        })
      }
    }

    const result = await vodService.getPopularVODs(query.limit)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const vods = result.data || []

    return NextResponse.json({
      vods,
      total: vods.length,
      timeframe: query.timeframe,
    })
  } catch (error) {
    console.error('Failed to get popular VODs:', error)
    return NextResponse.json(
      { error: 'Failed to get popular VODs' },
      { status: 500 }
    )
  }
}
