import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { VODService } from '@/lib/database/vod-service'
import { z } from 'zod'

const vodService = new VODService()

// GET /api/vods/recommendations - Get personalized recommendations
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)
    
    const querySchema = z.object({
      limit: z.string().transform(val => parseInt(val) || 20),
      userId: z.string().optional(),
    })

    const query = querySchema.parse(Object.fromEntries(searchParams))
    const targetUserId = userId || query.userId

    if (!targetUserId) {
      // For non-authenticated users, return popular content
      const popularResult = await vodService.getPopularVODs(query.limit)
      
      if (!popularResult.success) {
        return NextResponse.json(
          { error: popularResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        vods: popularResult.data || [],
        total: (popularResult.data || []).length,
        type: 'popular',
      })
    }

    // Get user's viewing history and preferences
    const userPreferences = await getUserPreferences(targetUserId)
    
    // Generate recommendations based on user preferences
    const recommendations = await generateRecommendations(userPreferences, query.limit)

    return NextResponse.json({
      vods: recommendations,
      total: recommendations.length,
      type: 'personalized',
    })

  } catch (error) {
    console.error('Failed to get recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}

async function getUserPreferences(userId: string) {
  // In a real implementation, this would analyze user's viewing history,
  // liked videos, subscriptions, etc. to determine preferences
  
  // For now, we'll return some default preferences
  return {
    preferredCategories: ['Technology', 'Education', 'Gaming'],
    preferredDuration: { min: 300, max: 1800 }, // 5-30 minutes
    viewingHistory: [],
    likedVideos: [],
  }
}

async function generateRecommendations(preferences: any, limit: number) {
  // Simple recommendation algorithm based on preferred categories
  const recommendations = []

  for (const category of preferences.preferredCategories) {
    const categoryResult = await vodService.getVODsByCategory(category, {
      limit: Math.ceil(limit / preferences.preferredCategories.length),
      orderBy: [{ field: 'viewCount', direction: 'desc' }],
    })

    if (categoryResult.success && categoryResult.data) {
      recommendations.push(...categoryResult.data)
    }
  }

  // Remove duplicates and shuffle
  const uniqueRecommendations = Array.from(
    new Map(recommendations.map(vod => [vod.id, vod])).values()
  )

  // Shuffle array
  for (let i = uniqueRecommendations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueRecommendations[i], uniqueRecommendations[j]] = [uniqueRecommendations[j], uniqueRecommendations[i]]
  }

  return uniqueRecommendations.slice(0, limit)
}