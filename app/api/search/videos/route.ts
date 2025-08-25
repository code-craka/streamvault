import { NextRequest, NextResponse } from 'next/server'
import { VODService } from '@/lib/database/vod-service'
import { z } from 'zod'

const vodService = new VODService()

// GET /api/search/videos - Search videos with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const querySchema = z.object({
      q: z.string().min(1, 'Search query is required'),
      category: z.string().optional(),
      tier: z.enum(['basic', 'premium', 'pro']).optional(),
      sort: z.enum(['relevance', 'newest', 'oldest', 'popular', 'duration']).default('relevance'),
      date: z.enum(['1d', '7d', '30d', '365d']).optional(),
      minDuration: z.string().transform(val => parseInt(val) || 0).optional(),
      maxDuration: z.string().transform(val => parseInt(val) || 0).optional(),
      limit: z.string().transform(val => parseInt(val) || 20),
      offset: z.string().transform(val => parseInt(val) || 0),
    })

    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Build search query
    const searchQuery = {
      search: query.q,
      category: query.category,
      requiredTier: query.tier,
      limit: query.limit,
      offset: query.offset,
      orderBy: getOrderByField(query.sort),
      orderDirection: query.sort === 'oldest' ? 'asc' : 'desc',
    } as const

    // Perform search
    const result = await vodService.searchVODs(searchQuery)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    let vods = result.data || []

    // Apply date filter
    if (query.date) {
      const dateThreshold = getDateThreshold(query.date)
      vods = vods.filter(vod => vod.createdAt >= dateThreshold)
    }

    // Apply duration filters
    if (query.minDuration || query.maxDuration) {
      vods = vods.filter(vod => {
        if (query.minDuration && vod.duration < query.minDuration) return false
        if (query.maxDuration && vod.duration > query.maxDuration) return false
        return true
      })
    }

    // Generate search suggestions (simple implementation)
    const suggestions = generateSearchSuggestions(query.q, vods)

    // Calculate filter options based on results
    const filters = calculateFilterOptions(vods)

    return NextResponse.json({
      vods,
      total: vods.length,
      hasMore: vods.length === query.limit,
      suggestions,
      filters,
      query: query.q,
    })

  } catch (error) {
    console.error('Video search failed:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

function getOrderByField(sort: string): 'createdAt' | 'updatedAt' | 'title' | 'duration' | 'viewCount' {
  switch (sort) {
    case 'popular':
      return 'viewCount'
    case 'duration':
      return 'duration'
    case 'newest':
    case 'oldest':
      return 'createdAt'
    case 'relevance':
    default:
      return 'createdAt' // For now, fallback to newest for relevance
  }
}

function getDateThreshold(dateRange: string): Date {
  const now = Date.now()
  const hours = {
    '1d': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
    '365d': 24 * 365,
  }[dateRange] || 24

  return new Date(now - hours * 60 * 60 * 1000)
}

function generateSearchSuggestions(query: string, results: any[]): string[] {
  // Simple suggestion generation based on common typos and related terms
  const suggestions: string[] = []
  
  // If no results, suggest common alternatives
  if (results.length === 0) {
    const commonSuggestions = [
      query.replace(/ing$/, ''),
      query.replace(/s$/, ''),
      query + 's',
      query + 'ing',
    ].filter(s => s !== query && s.length > 2)
    
    suggestions.push(...commonSuggestions.slice(0, 3))
  }

  // Add category-based suggestions
  const categories = Array.from(new Set(results.map(vod => vod.category).filter(Boolean)))
  categories.slice(0, 2).forEach(category => {
    suggestions.push(`${query} ${category?.toLowerCase()}`)
  })

  return suggestions.slice(0, 5)
}

function calculateFilterOptions(vods: any[]) {
  // Calculate available filter options based on search results
  const categories = new Map<string, number>()
  const tiers = new Map<string, number>()

  vods.forEach(vod => {
    if (vod.category) {
      categories.set(vod.category, (categories.get(vod.category) || 0) + 1)
    }
    
    if (vod.requiredTier) {
      tiers.set(vod.requiredTier, (tiers.get(vod.requiredTier) || 0) + 1)
    }
  })

  return {
    categories: Array.from(categories.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    tiers: Array.from(tiers.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  }
}