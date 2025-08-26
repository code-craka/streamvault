import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { signedURLService } from '@/lib/storage/signed-url-service'
import { checkUserRole } from '@/lib/auth/permissions'
import { clerkClient } from '@clerk/nextjs/server'
import type { UserRole } from '@/types/auth'

export async function POST(_request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = (user.publicMetadata?.role as UserRole) || 'viewer'
    const hasPermission = checkUserRole(userRole, 'admin')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      )
    }

    // Cleanup expired sessions
    const cleanedCount = await signedURLService.cleanupExpiredSessions()

    return NextResponse.json({
      success: true,
      data: {
        cleanedSessions: cleanedCount,
        message: `Successfully cleaned up ${cleanedCount} expired sessions`,
      },
    })
  } catch (error) {
    console.error('Session cleanup error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = (user.publicMetadata?.role as UserRole) || 'viewer'
    const hasPermission = checkUserRole(userRole, 'admin')

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      )
    }

    // Return cleanup status (in a real implementation, you might return session statistics)
    return NextResponse.json({
      success: true,
      data: {
        message: 'Session cleanup endpoint available',
        lastCleanup: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Session cleanup status error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
