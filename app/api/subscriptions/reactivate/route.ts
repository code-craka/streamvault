import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { subscriptionService } from '@/lib/stripe/subscription-service'

export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await subscriptionService.reactivateSubscription(userId)

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
    })
  } catch (error) {
    console.error('Subscription reactivation error:', error)
    
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    )
  }
}