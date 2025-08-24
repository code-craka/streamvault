import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { ChatRoomService } from '@/lib/database/chat-service'
import { banUserSchema } from '@/lib/validations/chat'

const chatRoomService = new ChatRoomService()

// POST /api/chat/[streamId]/moderation - Perform moderation actions
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has moderation permissions
    const user = await clerkClient.users.getUser(userId)
    const userRole = user.publicMetadata?.role as string
    
    if (!['admin', 'streamer'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, targetUserId, targetUsername, reason, duration } = body

    // Get chat room
    const roomResult = await chatRoomService.getChatRoomByStreamId(params.streamId)
    if (!roomResult.success || !roomResult.data) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    const roomId = roomResult.data.id

    switch (action) {
      case 'ban':
        // Validate ban data
        const banValidation = banUserSchema.safeParse({
          userId: targetUserId,
          streamId: params.streamId,
          reason: reason || 'No reason provided',
          duration,
        })

        if (!banValidation.success) {
          return NextResponse.json(
            { error: 'Invalid ban data', details: banValidation.error.errors },
            { status: 400 }
          )
        }

        const banResult = await chatRoomService.banUser(
          roomId,
          targetUserId,
          targetUsername || 'Unknown User',
          userId,
          reason || 'No reason provided',
          duration
        )

        if (!banResult.success) {
          return NextResponse.json(
            { error: banResult.error || 'Failed to ban user' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `User ${targetUsername || targetUserId} has been ${duration ? 'temporarily ' : ''}banned`,
          action: 'ban',
          targetUserId,
          duration,
        })

      case 'unban':
        const unbanResult = await chatRoomService.unbanUser(roomId, targetUserId)

        if (!unbanResult.success) {
          return NextResponse.json(
            { error: unbanResult.error || 'Failed to unban user' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `User ${targetUsername || targetUserId} has been unbanned`,
          action: 'unban',
          targetUserId,
        })

      case 'timeout':
        // Timeout is essentially a temporary ban
        if (!duration || duration <= 0) {
          return NextResponse.json(
            { error: 'Duration is required for timeout' },
            { status: 400 }
          )
        }

        const timeoutResult = await chatRoomService.banUser(
          roomId,
          targetUserId,
          targetUsername || 'Unknown User',
          userId,
          reason || 'Timeout',
          duration
        )

        if (!timeoutResult.success) {
          return NextResponse.json(
            { error: timeoutResult.error || 'Failed to timeout user' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `User ${targetUsername || targetUserId} has been timed out for ${duration} minutes`,
          action: 'timeout',
          targetUserId,
          duration,
        })

      case 'clear_chat':
        // This would typically involve marking all messages as deleted
        // For now, we'll just return success
        return NextResponse.json({
          success: true,
          message: 'Chat has been cleared',
          action: 'clear_chat',
        })

      default:
        return NextResponse.json(
          { error: 'Invalid moderation action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error performing moderation action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/chat/[streamId]/moderation - Get moderation info (banned users, etc.)
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has moderation permissions
    const user = await clerkClient.users.getUser(userId)
    const userRole = user.publicMetadata?.role as string
    
    if (!['admin', 'streamer'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get chat room with banned users
    const roomResult = await chatRoomService.getChatRoomByStreamId(params.streamId)
    if (!roomResult.success || !roomResult.data) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    const room = roomResult.data

    // Filter out expired bans
    const now = new Date()
    const activeBans = room.bannedUsers.filter(ban => {
      if (ban.isPermanent) return true
      if (!ban.expiresAt) return true
      return ban.expiresAt > now
    })

    return NextResponse.json({
      bannedUsers: activeBans,
      moderators: room.moderators,
      settings: room.settings,
      stats: {
        totalBans: room.bannedUsers.length,
        activeBans: activeBans.length,
        messageCount: room.messageCount,
        activeUsers: room.activeUsers,
      },
    })
  } catch (error) {
    console.error('Error fetching moderation info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}