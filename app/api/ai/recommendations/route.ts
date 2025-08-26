import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'
import { z } from 'zod'

const recommendationsSchema = z.object({
  videoId: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
  category: z.string().optional(),
  includeReason: z.coerce.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = {
      videoId: searchParams.get('videoId') || undefined,
      limit: searchParams.get('limit') || '10',
      category: searchParams.get('category') || undefined,
      includeReason: searchParams.get('includeReason') || 'false',
    }

    const validatedParams = recommendationsSchema.parse(params)

    // Get AI-powered recommendations
    const recommendations = await aiContentEnhancement.generateRecommendations(
      userId,
      validatedParams.videoId,
      validatedParams.limit
    )

    // Transform recommendations for frontend
    const transformedRecommendations = recommendations.map(video => ({
      id: video.videoId,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnails[0] || '/placeholder-thumbnail.jpg',
      duration: video.duration,
      viewCount: Math.floor(Math.random() * 100000), // Simulate view count
      creatorName: 'Creator Name', // Would come from user data
      category: video.category,
      tags: video.tags,
      confidence: video.aiGenerated.confidence,
      reason: validatedParams.includeReason
        ? generateRecommendationReason(video, validatedParams.videoId)
        : '',
    }))

    return NextResponse.json({
      recommendations: transformedRecommendations,
      total: transformedRecommendations.length,
      hasMore: transformedRecommendations.length >= validatedParams.limit,
    })
  } catch (error) {
    console.error('Recommendations API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

function generateRecommendationReason(
  video: any,
  currentVideoId?: string
): string {
  const reasons = [
    `Similar to videos you've watched`,
    `Popular in ${video.category}`,
    `Based on your viewing history`,
    `Trending content you might like`,
    `From creators you follow`,
  ]

  if (currentVideoId) {
    reasons.unshift(`Similar to current video`)
  }

  return reasons[Math.floor(Math.random() * reasons.length)]
}
