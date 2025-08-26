import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { signedURLService } from '@/lib/storage/signed-url-service'
import { z } from 'zod'

const RefreshRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

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

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { sessionId, refreshToken } = RefreshRequestSchema.parse(body)

    // Refresh signed URL
    const result = await signedURLService.refreshSignedURL(
      sessionId,
      userId,
      refreshToken
    )

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
    console.error('Signed URL refresh error:', error)

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

// GET method for simple refresh (using query parameters)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId: _videoId } = await params
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams

    const sessionId = searchParams.get('sessionId')
    const refreshToken = searchParams.get('refreshToken')

    if (!sessionId || !refreshToken) {
      return NextResponse.json(
        { error: 'Session ID and refresh token are required' },
        { status: 400 }
      )
    }

    // Refresh signed URL
    const result = await signedURLService.refreshSignedURL(
      sessionId,
      userId,
      refreshToken
    )

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
    console.error('Signed URL refresh error:', error)

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
