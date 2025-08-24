import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { signedURLService } from '@/lib/storage/signed-url-service'
import { z } from 'zod'

const RequestSchema = z.object({
  requiredTier: z.enum(['basic', 'premium', 'pro']).optional().default('basic'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const requiredTier = searchParams.get('tier') || 'basic'

    // Validate request
    const { requiredTier: validatedTier } = RequestSchema.parse({
      requiredTier,
    })

    // Generate signed URL
    const result = await signedURLService.generateSignedURL({
      videoId,
      userId,
      requiredTier: validatedTier,
    })

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: result.signedUrl,
        expiresAt: result.expiresAt.toISOString(),
        sessionId: result.sessionId,
        refreshToken: result.refreshToken,
      },
    })
  } catch (error: any) {
    console.error('Signed URL generation error:', error)

    if (error.name === 'VideoAccessError') {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const { requiredTier = 'basic' } = RequestSchema.parse(body)

    // Generate signed URL with custom tier
    const result = await signedURLService.generateSignedURL({
      videoId,
      userId,
      requiredTier,
    })

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: result.signedUrl,
        expiresAt: result.expiresAt.toISOString(),
        sessionId: result.sessionId,
        refreshToken: result.refreshToken,
      },
    })
  } catch (error: any) {
    console.error('Signed URL generation error:', error)

    if (error.name === 'VideoAccessError') {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
