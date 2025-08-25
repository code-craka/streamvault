/**
 * API endpoint for AI-assisted content appeal processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'
import { z } from 'zod'

const appealRequestSchema = z.object({
  contentId: z.string(),
  originalViolation: z.object({
    type: z.string(),
    description: z.string(),
    confidence: z.number(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  }),
  appealReason: z.string().min(10, 'Appeal reason must be at least 10 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, originalViolation, appealReason } = appealRequestSchema.parse(body)

    console.log(`Processing content appeal for content ${contentId} by user ${userId}`)

    // Process the appeal with AI assistance
    const appealProcess = await aiContentEnhancement.processContentAppeal(
      contentId,
      originalViolation,
      appealReason,
      userId
    )

    console.log(`Appeal processed: ${appealProcess.appealId}`)

    return NextResponse.json({
      success: true,
      appeal: appealProcess,
      message: appealProcess.humanReviewRequired 
        ? 'Appeal submitted for human review'
        : 'Appeal processed automatically',
    })
  } catch (error) {
    console.error('Content appeal API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid appeal data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Appeal processing failed', message: error.message },
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
    const appealId = searchParams.get('appealId')

    if (!appealId) {
      return NextResponse.json(
        { error: 'Appeal ID is required' },
        { status: 400 }
      )
    }

    // In production, would retrieve appeal status from database
    const mockAppealStatus = {
      appealId,
      status: 'under_review',
      submittedAt: new Date().toISOString(),
      estimatedReviewTime: '24-48 hours',
      updates: [
        {
          timestamp: new Date().toISOString(),
          status: 'submitted',
          message: 'Appeal submitted successfully',
        },
        {
          timestamp: new Date(Date.now() + 3600000).toISOString(),
          status: 'ai_reviewed',
          message: 'AI preliminary review completed - forwarded to human moderator',
        },
      ],
    }

    return NextResponse.json({
      success: true,
      appeal: mockAppealStatus,
    })
  } catch (error) {
    console.error('Get appeal status API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve appeal status' },
      { status: 500 }
    )
  }
}