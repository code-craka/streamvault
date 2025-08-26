import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { ChatRoomService } from '@/lib/database/chat-service'
import {
  createChatRoomSchema,
  updateChatRoomSchema,
} from '@/lib/validations/chat'

const chatRoomService = new ChatRoomService()

// GET /api/chat/[streamId]/room - Get chat room settings
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await chatRoomService.getChatRoomByStreamId(params.streamId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch chat room' },
        { status: result.code === 'NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      room: result.data,
    })
  } catch (error) {
    console.error('Error fetching chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/chat/[streamId]/room - Create chat room
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create chat room (streamer or admin)
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = user.publicMetadata?.role as string

    if (!['admin', 'streamer'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const roomData = {
      ...body,
      streamId: params.streamId,
    }

    // Validate room data
    const validation = createChatRoomSchema.safeParse(roomData)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid room data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const result = await chatRoomService.createChatRoom(validation.data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create chat room' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        room: result.data,
        success: true,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/chat/[streamId]/room - Update chat room settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to modify chat room (streamer or admin)
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = user.publicMetadata?.role as string

    if (!['admin', 'streamer'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get existing room
    const existingRoom = await chatRoomService.getChatRoomByStreamId(
      params.streamId
    )
    if (!existingRoom.success || !existingRoom.data) {
      return NextResponse.json(
        { error: 'Chat room not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData = {
      id: existingRoom.data.id,
      ...body,
    }

    // Validate update data
    const validation = updateChatRoomSchema.safeParse(updateData)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const result = await chatRoomService.updateChatRoom(validation.data)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update chat room' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      room: result.data,
      success: true,
    })
  } catch (error) {
    console.error('Error updating chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
