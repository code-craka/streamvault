import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { z } from 'zod'

// Poll validation schemas
const createPollSchema = z.object({
  question: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(100)).min(2).max(6),
  duration: z.number().min(30).max(3600), // 30 seconds to 1 hour
})

const voteSchema = z.object({
  optionId: z.string(),
})

// In-memory storage for demo (in production, use database)
const polls: Map<string, any> = new Map()

// POST /api/chat/[streamId]/polls - Create a poll
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user can create polls (streamer or admin)
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = user.publicMetadata?.role as string
    
    if (!['admin', 'streamer'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate poll data
    const validation = createPollSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid poll data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { question, options, duration } = validation.data

    // Create poll
    const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()
    const endsAt = new Date(now.getTime() + duration * 1000)

    const poll = {
      id: pollId,
      streamId: params.streamId,
      question,
      options: options.map((text, index) => ({
        id: `option_${index}`,
        text,
        votes: 0,
        voters: [],
      })),
      createdBy: userId,
      createdAt: now,
      endsAt,
      isActive: true,
      totalVotes: 0,
    }

    polls.set(pollId, poll)

    // Auto-close poll after duration
    setTimeout(() => {
      const existingPoll = polls.get(pollId)
      if (existingPoll) {
        existingPoll.isActive = false
        polls.set(pollId, existingPoll)
      }
    }, duration * 1000)

    return NextResponse.json({
      poll,
      success: true,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating poll:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/chat/[streamId]/polls - Get polls for stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Filter polls for this stream
    const streamPolls = Array.from(polls.values()).filter(
      poll => poll.streamId === params.streamId
    )

    // Sort by creation date (newest first)
    streamPolls.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json({
      polls: streamPolls,
      count: streamPolls.length,
    })
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}