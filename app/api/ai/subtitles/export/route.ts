/**
 * API endpoint for exporting multi-language subtitles
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { aiContentEnhancement } from '@/lib/ai/content-enhancement'
import { z } from 'zod'

const subtitleExportSchema = z.object({
  videoId: z.string(),
  language: z.string(),
  format: z.enum(['srt', 'vtt', 'ass']).default('srt'),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, language, format } = subtitleExportSchema.parse(body)

    console.log(
      `Exporting ${format} subtitles for video ${videoId} in ${language}`
    )

    // Export subtitles in requested format
    const subtitleContent = await aiContentEnhancement.exportSubtitles(
      videoId,
      language,
      format
    )

    // Set appropriate content type and filename
    const contentTypes = {
      srt: 'text/srt',
      vtt: 'text/vtt',
      ass: 'text/ass',
    }

    const filename = `${videoId}_${language}.${format}`

    return new NextResponse(subtitleContent, {
      status: 200,
      headers: {
        'Content-Type': contentTypes[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Subtitle export API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Video or subtitles not found' },
        { status: 404 }
      )
    }

    if (error.message.includes('not available')) {
      return NextResponse.json(
        { error: 'Subtitles not available for requested language' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Subtitle export failed', message: error.message },
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

    // Get available subtitle languages for the video
    const analysis = await aiContentEnhancement['getStoredAnalysis'](videoId)

    if (!analysis) {
      return NextResponse.json(
        { error: 'Video analysis not found' },
        { status: 404 }
      )
    }

    const availableLanguages = analysis.multiLanguageSubtitles.map(
      subtitle => ({
        language: subtitle.language,
        languageCode: subtitle.languageCode,
        confidence: subtitle.confidence,
        subtitleCount: subtitle.subtitles.length,
      })
    )

    return NextResponse.json({
      success: true,
      videoId,
      availableLanguages,
      supportedFormats: ['srt', 'vtt', 'ass'],
    })
  } catch (error) {
    console.error('Get available subtitles API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve available subtitles' },
      { status: 500 }
    )
  }
}
