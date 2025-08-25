import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ChatService } from '@/lib/database/chat-service'
import { createChatMessageSchema, chatMessageQuerySchema } from '@/lib/validations/chat'
import { z } from 'zod'

const chatService = new ChatService()

// GET /api/chat/[streamId]/messages - Get chat messages for a stream
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

    const { searchParams } = new URL(request.url)
    const queryParams = {
      streamId: params.streamId,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      before: searchParams.get('before') ? new Date(searchParams.get('before')!) : undefined,
      after: searchParams.get('after') ? new Date(searchParams.get('after')!) : undefined,
      includeDeleted: searchParams.get('includeDeleted') === 'true',
    }

    // Validate query parameters
    const validation = chatMessageQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const result = await chatService.getStreamMessages(validation.data)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      messages: result.data,
      count: result.data?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching chat messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/chat/[streamId]/messages - Send a new chat message
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

    const body = await request.json()
    const messageData = {
      ...body,
      streamId: params.streamId,
    }

    // Validate message data
    const validation = createChatMessageSchema.safeParse(messageData)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid message data', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Get user info from Clerk
    // Note: In a real implementation, you'd fetch user details from Clerk
    // For now, we'll use a placeholder username
    const username = 'User' // This should be fetched from Clerk user data

    const result = await chatService.createMessage(
      userId,
      username,
      validation.data
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: result.data,
      success: true,
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending chat message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat/[streamId]/messages - Delete messages (bulk operation)
export async function DELETE(
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

    // Check if user has permission to delete messages
    // This should check if user is a streamer, moderator, or admin
    // For now, we'll implement basic permission checking

    const body = await request.json()
    const { messageIds } = body

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid message IDs' },
        { status: 400 }
      )
    }

    const results = []
    for (const messageId of messageIds) {
      const result = await chatService.deleteMessage(messageId, userId)
      results.push({
        messageId,
        success: result.success,
        error: result.error,
      })
    }

    return NextResponse.json({
      results,
      success: true,
    })
  } catch (error) {
    console.error('Error deleting chat messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}