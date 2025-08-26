import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { VODService } from '@/lib/database/vod-service'

const vodService = new VODService()

// POST /api/vods/[vodId]/publish - Publish VOD
export async function POST(
  request: NextRequest,
  { params }: { params: { vodId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { vodId } = params

    // Verify ownership
    const vodResult = await vodService.getById(vodId)
    if (!vodResult.success || !vodResult.data) {
      return NextResponse.json({ error: 'VOD not found' }, { status: 404 })
    }

    if (vodResult.data.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to publish this VOD' },
        { status: 403 }
      )
    }

    if (vodResult.data.status !== 'processing') {
      return NextResponse.json(
        { error: 'VOD must be in processing status to publish' },
        { status: 400 }
      )
    }

    const result = await vodService.publishVOD(vodId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      vod: result.data,
      message: 'VOD published successfully',
    })
  } catch (error) {
    console.error('Failed to publish VOD:', error)
    return NextResponse.json(
      { error: 'Failed to publish VOD' },
      { status: 500 }
    )
  }
}
