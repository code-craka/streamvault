/**
 * API endpoint for real-time live stream AI analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'
import { z } from 'zod'

const liveAnalysisRequestSchema = z.object({
  streamId: z.string(),
  audioChunk: z.string().optional(), // Base64 encoded audio
  chatMessages: z.array(z.string()),
  reactions: z.array(z.object({
    type: z.string(),
    userId: z.string(),
    timestamp: z.string(),
  })),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { streamId, audioChunk, chatMessages, reactions } = liveAnalysisRequestSchema.parse(body)

    // Convert base64 audio to buffer if provided
    const audioBuffer = audioChunk ? Buffer.from(audioChunk, 'base64') : Buffer.alloc(0)

    // Perform real-time analysis
    const analysis = await aiContentEnhancement.analyzeLiveStream(
      streamId,
      audioBuffer,
      chatMessages,
      reactions
    )

    return NextResponse.json({
      success: true,
      analysis,
      message: 'Live stream analysis completed',
    })
  } catch (error) {
    console.error('Live stream analysis API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Live stream analysis failed', message: error.message },
      { status: 500 }
    )
  }
}