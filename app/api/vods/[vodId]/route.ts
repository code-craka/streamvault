import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { VODService } from '@/lib/database/vod-service'
import { vodProcessor } from '@/lib/streaming/vod-processor'
import { z } from 'zod'

const vodService = new VODService()

// GET /api/vods/[vodId] - Get VOD by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { vodId: string } }
) {
  try {
    const { vodId } = params

    const result = await vodService.getById(vodId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'NOT_FOUND' ? 404 : 500 }
      )
    }

    const vod = result.data!

    // Check if user has access to this VOD
    const { userId } = await auth()
    
    // Private VODs can only be accessed by owner
    if (vod.visibility === 'private' && vod.userId !== userId) {
      return NextResponse.json(
        { error: 'VOD not found' },
        { status: 404 }
      )
    }

    // Increment view count if not the owner
    if (userId && userId !== vod.userId) {
      await vodService.incrementViewCount(vodId, userId)
    }

    return NextResponse.json({ vod })

  } catch (error) {
    console.error('Failed to get VOD:', error)
    return NextResponse.json(
      { error: 'Failed to get VOD' },
      { status: 500 }
    )
  }
}

// PUT /api/vods/[vodId] - Update VOD
export async function PUT(
  request: NextRequest,
  { params }: { params: { vodId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { vodId } = params
    const body = await request.json()

    const updateSchema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      visibility: z.enum(['public', 'unlisted', 'private']).optional(),
      requiredTier: z.enum(['basic', 'premium', 'pro']).optional(),
    })

    const updates = updateSchema.parse(body)

    const result = await vodProcessor.updateVODMetadata(vodId, userId, updates)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'UNAUTHORIZED' ? 403 : 
                 result.code === 'VOD_NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      vod: result.data,
      message: 'VOD updated successfully',
    })

  } catch (error) {
    console.error('Failed to update VOD:', error)
    return NextResponse.json(
      { error: 'Failed to update VOD' },
      { status: 500 }
    )
  }
}

// DELETE /api/vods/[vodId] - Delete VOD
export async function DELETE(
  request: NextRequest,
  { params }: { params: { vodId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { vodId } = params

    const result = await vodProcessor.deleteVOD(vodId, userId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'UNAUTHORIZED' ? 403 : 
                 result.code === 'VOD_NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      message: 'VOD deleted successfully',
    })

  } catch (error) {
    console.error('Failed to delete VOD:', error)
    return NextResponse.json(
      { error: 'Failed to delete VOD' },
      { status: 500 }
    )
  }
}