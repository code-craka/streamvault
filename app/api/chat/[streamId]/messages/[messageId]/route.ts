import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { ChatService } from '@/lib/database/chat-service'

const chatService = new ChatService()

// GET /api/chat/[streamId]/messages/[messageId] - Get a specific message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; messageId: string }> }
) {
  try {
    const { streamId, messageId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await chatService.getById(messageId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Message not found' },
        { status: result.code === 'NOT_FOUND' ? 404 : 500 }
      )
    }

    // Check if message belongs to the specified stream
    if (result.data?.streamId !== streamId) {
      return NextResponse.json(
        { error: 'Message not found in this stream' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: result.data,
    })
  } catch (error) {
    console.error('Error fetching chat message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/chat/[streamId]/messages/[messageId] - Update a message (for moderation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; messageId: string }> }
) {
  try {
    const { streamId, messageId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details to check permissions
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = user.publicMetadata?.role as string

    // Check if user has permission to moderate messages
    const canModerate = ['admin', 'streamer'].includes(userRole)

    if (!canModerate) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, reason } = body

    let updateData: any = {}

    switch (action) {
      case 'delete':
        updateData = {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
        }
        if (reason) {
          updateData.deletionReason = reason
        }
        break

      case 'flag':
        // Add moderation flag
        const message = await chatService.getById(messageId)
        if (!message.success || !message.data) {
          return NextResponse.json(
            { error: 'Message not found' },
            { status: 404 }
          )
        }

        const newFlag = {
          type: 'custom',
          confidence: 1.0,
          reason: reason || 'Flagged by moderator',
          autoModerated: false,
          reviewedBy: userId,
          reviewedAt: new Date(),
          action: 'warn',
        }

        updateData = {
          'metadata.moderationFlags': [
            ...message.data.metadata.moderationFlags,
            newFlag,
          ],
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const result = await chatService.update(messageId, updateData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: result.data,
      success: true,
    })
  } catch (error) {
    console.error('Error updating chat message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat/[streamId]/messages/[messageId] - Delete a specific message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; messageId: string }> }
) {
  try {
    const { streamId, messageId } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the message first to check ownership and permissions
    const messageResult = await chatService.getById(messageId)
    if (!messageResult.success || !messageResult.data) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const message = messageResult.data

    // Check if message belongs to the specified stream
    if (message.streamId !== streamId) {
      return NextResponse.json(
        { error: 'Message not found in this stream' },
        { status: 404 }
      )
    }

    // Get user details to check permissions
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = user.publicMetadata?.role as string

    // Check permissions: user can delete their own messages, or moderators can delete any
    const isMessageOwner = message.userId === userId
    const canModerate = ['admin', 'streamer'].includes(userRole)

    if (!isMessageOwner && !canModerate) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const result = await chatService.deleteMessage(messageId, userId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting chat message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
