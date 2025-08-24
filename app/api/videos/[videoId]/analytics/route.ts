import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  signedURLService,
  VideoAccessError,
} from '@/lib/storage/signed-url-service'
import { checkUserRole } from '@/lib/auth/permissions'
import { clerkClient } from '@clerk/nextjs/server'

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

    // Check if user has permission to view analytics
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = (user.publicMetadata?.role as string) || 'viewer'
    const hasPermission =
      checkUserRole(userRole as any, 'streamer') ||
      checkUserRole(userRole as any, 'admin')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view analytics' },
        { status: 403 }
      )
    }

    // Get video access analytics
    const analytics = await signedURLService.getVideoAccessAnalytics(videoId)

    return NextResponse.json({
      success: true,
      data: analytics,
    })
  } catch (error) {
    console.error('Analytics retrieval error:', error)

    if (error instanceof VideoAccessError) {
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
