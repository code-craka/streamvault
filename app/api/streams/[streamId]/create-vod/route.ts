import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { vodProcessor } from '@/lib/streaming/vod-processor'
import { z } from 'zod'

// POST /api/streams/[streamId]/create-vod - Create VOD from stream
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { streamId } = params
    const body = await request.json()

    const optionsSchema = z.object({
      enableAIProcessing: z.boolean().default(true),
      generateThumbnails: z.boolean().default(true),
      generateTranscription: z.boolean().default(true),
      generateHighlights: z.boolean().default(true),
      autoPublish: z.boolean().default(false),
      retentionDays: z.number().default(-1),
    })

    const options = optionsSchema.parse(body)

    const result = await vodProcessor.createVODFromStream(streamId, options)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'STREAM_NOT_FOUND' ? 404 :
                 result.code === 'UNAUTHORIZED' ? 403 :
                 result.code === 'STREAM_NOT_ENDED' ? 400 :
                 result.code === 'RECORDING_NOT_ENABLED' ? 400 :
                 result.code === 'VOD_ALREADY_EXISTS' ? 409 : 500 }
      )
    }

    return NextResponse.json({
      vod: result.data?.vod,
      processingJob: result.data?.processingJob,
      aiResults: result.data?.aiResults,
      message: 'VOD creation started successfully',
    })

  } catch (error) {
    console.error('Failed to create VOD from stream:', error)
    return NextResponse.json(
      { error: 'Failed to create VOD from stream' },
      { status: 500 }
    )
  }
}