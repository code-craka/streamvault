import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

const voteSchema = z.object({
  optionId: z.string(),
})

// In-memory storage for demo (should match the polls storage from the main route)
// In production, this would be a shared database
const polls: Map<string, any> = new Map()

// POST /api/chat/[streamId]/polls/[pollId]/vote - Vote on a poll
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string; pollId: string } }
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
    
    // Validate vote data
    const validation = voteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid vote data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { optionId } = validation.data

    // Get poll
    const poll = polls.get(params.pollId)
    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Check if poll is still active
    if (!poll.isActive || new Date() > poll.endsAt) {
      return NextResponse.json(
        { error: 'Poll is no longer active' },
        { status: 400 }
      )
    }

    // Check if poll belongs to the stream
    if (poll.streamId !== params.streamId) {
      return NextResponse.json(
        { error: 'Poll not found in this stream' },
        { status: 404 }
      )
    }

    // Check if user has already voted
    const hasVoted = poll.options.some((option: any) => 
      option.voters.includes(userId)
    )

    if (hasVoted) {
      return NextResponse.json(
        { error: 'You have already voted on this poll' },
        { status: 400 }
      )
    }

    // Find the option
    const optionIndex = poll.options.findIndex((option: any) => option.id === optionId)
    if (optionIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid option' },
        { status: 400 }
      )
    }

    // Add vote
    poll.options[optionIndex].votes += 1
    poll.options[optionIndex].voters.push(userId)
    poll.totalVotes += 1

    // Update poll in storage
    polls.set(params.pollId, poll)

    return NextResponse.json({
      success: true,
      poll,
      message: 'Vote recorded successfully',
    })
  } catch (error) {
    console.error('Error voting on poll:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/chat/[streamId]/polls/[pollId]/vote - Get poll results
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string; pollId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get poll
    const poll = polls.get(params.pollId)
    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Check if poll belongs to the stream
    if (poll.streamId !== params.streamId) {
      return NextResponse.json(
        { error: 'Poll not found in this stream' },
        { status: 404 }
      )
    }

    // Check if user has voted
    const userVote = poll.options.find((option: any) => 
      option.voters.includes(userId)
    )

    return NextResponse.json({
      poll,
      userVote: userVote?.id || null,
      hasVoted: !!userVote,
    })
  } catch (error) {
    console.error('Error fetching poll results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}