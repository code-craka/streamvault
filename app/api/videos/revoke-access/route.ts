import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  signedURLService,
  VideoAccessError,
} from '@/lib/storage/signed-url-service'
import { checkUserRole } from '@/lib/auth/permissions'
import { clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'

// Request validation schema
const RevokeAccessRequestSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  videoId: z.string().optional(),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin or streamer permissions
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = (user.publicMetadata?.role as string) || 'viewer'
    const hasPermission =
      checkUserRole(userRole as any, 'admin') ||
      checkUserRole(userRole as any, 'streamer')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to revoke access' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { targetUserId, videoId, reason } =
      RevokeAccessRequestSchema.parse(body)

    // Revoke access
    await signedURLService.revokeAccess(targetUserId, videoId)

    // Log the revocation (in a real implementation, you might want to store this in an audit log)
    console.log(
      `Access revoked by ${userId} for user ${targetUserId}${videoId ? ` on video ${videoId}` : ''}. Reason: ${reason || 'No reason provided'}`
    )

    return NextResponse.json({
      success: true,
      data: {
        message: `Access revoked for user ${targetUserId}${videoId ? ` on video ${videoId}` : ''}`,
        revokedBy: userId,
        revokedAt: new Date().toISOString(),
        reason: reason || null,
      },
    })
  } catch (error) {
    console.error('Access revocation error:', error)

    if (error instanceof VideoAccessError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
