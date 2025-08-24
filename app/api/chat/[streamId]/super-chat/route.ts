import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { SuperChatService } from '@/lib/database/chat-service'
import { createSuperChatSchema } from '@/lib/validations/chat'

const superChatService = new SuperChatService()

// POST /api/chat/[streamId]/super-chat - Send a super chat
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

    // Get user details
    const user = await clerkClient.users.getUser(userId)
    const username = user.username || user.firstName || 'Anonymous'

    const body = await request.json()
    const { amount, message, currency = 'USD' } = body

    // Validate super chat data
    const validation = createSuperChatSchema.safeParse({
      messageId: `temp-${Date.now()}`, // This would be generated after creating the message
      streamId: params.streamId,
      amount,
      currency,
      message,
      displayDuration: calculateDisplayDuration(amount),
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid super chat data', details: validation.error.errors },
        { status: 400 }
      )
    }

    // In a real implementation, you would:
    // 1. Process payment through Stripe
    // 2. Create the super chat message
    // 3. Store in database
    // 4. Broadcast to real-time listeners

    // For now, we'll simulate the process
    const result = await superChatService.createSuperChat(
      userId,
      username,
      validation.data
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create super chat' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      superChat: result.data,
      success: true,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating super chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/chat/[streamId]/super-chat - Get super chats for stream
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
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await superChatService.getSuperChatsByStream(
      params.streamId,
      { limit }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch super chats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      superChats: result.data,
      count: result.data?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching super chats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate display duration based on amount
function calculateDisplayDuration(amount: number): number {
  if (amount >= 100) return 300 // 5 minutes
  if (amount >= 50) return 180  // 3 minutes
  if (amount >= 20) return 120  // 2 minutes
  if (amount >= 10) return 60   // 1 minute
  if (amount >= 5) return 30    // 30 seconds
  return 15 // 15 seconds
}