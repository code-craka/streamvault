import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { subscriptionService } from '@/lib/stripe/subscription-service'

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await subscriptionService.cancelSubscription(userId)

    return NextResponse.json({
      success: true,
      message: 'Subscription canceled successfully',
    })
  } catch (error) {
    console.error('Subscription cancellation error:', error)

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // Alias for POST to support different client preferences
  return POST()
}
