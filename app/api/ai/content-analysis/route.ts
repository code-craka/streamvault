/**
 * API endpoint for comprehensive AI content analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'
import { z } from 'zod'

const analysisRequestSchema = z.object({
  videoId: z.string(),
  videoPath: z.string(),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, videoPath, metadata } = analysisRequestSchema.parse(body)

    console.log(`Starting AI content analysis for video ${videoId}`)

    // Perform comprehensive AI analysis
    const analysis = await aiContentEnhancement.processUploadedVideo(
      videoId,
      videoPath,
      metadata
    )

    console.log(`AI content analysis completed for video ${videoId}`)

    return NextResponse.json({
      success: true,
      analysis,
      message: 'Content analysis completed successfully',
    })
  } catch (error) {
    console.error('Content analysis API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Content analysis failed', message: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Get stored analysis results
    const analysis = await aiContentEnhancement['getStoredAnalysis'](videoId)

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('Get analysis API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analysis' },
      { status: 500 }
    )
  }
}
