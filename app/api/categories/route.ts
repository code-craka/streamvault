import { NextRequest, NextResponse } from 'next/server'
import { VODService } from '@/lib/database/vod-service'

const vodService = new VODService()

// GET /api/categories - Get all categories with video counts
export async function GET(request: NextRequest) {
  try {
    // Get all public VODs to calculate category statistics
    const result = await vodService.getPublicVODs({ limit: 10000 })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    const vods = result.data || []

    // Calculate category statistics
    const categoryStats = new Map<string, {
      name: string
      videoCount: number
      trending: boolean
      description: string
    }>()

    // Predefined category descriptions
    const categoryDescriptions: Record<string, string> = {
      Gaming: 'Gaming content, walkthroughs, and esports',
      Education: 'Educational content and tutorials',
      Entertainment: 'Movies, shows, and entertainment',
      Technology: 'Tech reviews, tutorials, and news',
      Music: 'Music videos, concerts, and performances',
      Sports: 'Sports highlights, analysis, and events',
      Art: 'Creative content, tutorials, and showcases',
      Cooking: 'Recipes, cooking shows, and food content',
      Travel: 'Travel vlogs, guides, and destinations',
      Fitness: 'Workout videos, health, and wellness',
      News: 'News, current events, and journalism',
      Comedy: 'Comedy sketches, stand-up, and humor',
      Science: 'Scientific content, experiments, and education',
      Business: 'Business advice, entrepreneurship, and finance',
      Health: 'Health tips, medical content, and wellness',
    }

    // Count videos per category
    vods.forEach(vod => {
      if (vod.category) {
        const existing = categoryStats.get(vod.category) || {
          name: vod.category,
          videoCount: 0,
          trending: false,
          description: categoryDescriptions[vod.category] || `${vod.category} content`,
        }
        
        existing.videoCount++
        categoryStats.set(vod.category, existing)
      }
    })

    // Determine trending categories (categories with recent uploads)
    const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const recentVods = vods.filter(vod => vod.createdAt > recentThreshold)
    
    const recentCategoryCounts = new Map<string, number>()
    recentVods.forEach(vod => {
      if (vod.category) {
        recentCategoryCounts.set(vod.category, (recentCategoryCounts.get(vod.category) || 0) + 1)
      }
    })

    // Mark top 3 categories with recent activity as trending
    const trendingCategories = Array.from(recentCategoryCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category)

    // Update trending status
    trendingCategories.forEach(category => {
      const stats = categoryStats.get(category)
      if (stats) {
        stats.trending = true
        categoryStats.set(category, stats)
      }
    })

    // Convert to array and sort by video count
    const categories = Array.from(categoryStats.values())
      .sort((a, b) => b.videoCount - a.videoCount)
      .map((category, index) => ({
        id: category.name.toLowerCase().replace(/\s+/g, '-'),
        ...category,
      }))

    return NextResponse.json({
      categories,
      total: categories.length,
    })

  } catch (error) {
    console.error('Failed to get categories:', error)
    return NextResponse.json(
      { error: 'Failed to get categories' },
      { status: 500 }
    )
  }
}