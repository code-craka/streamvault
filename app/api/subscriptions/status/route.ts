import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { subscriptionService } from '@/lib/stripe/subscription-service'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptionDetails =
      await subscriptionService.getSubscriptionDetails(userId)

    return NextResponse.json({
      ...subscriptionDetails,
      hasActiveSubscription:
        subscriptionDetails.subscription?.status === 'active',
    })
  } catch (error) {
    console.error('Subscription status error:', error)

    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    )
  }
}
