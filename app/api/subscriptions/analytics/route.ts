import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { subscriptionService } from '@/lib/stripe/subscription-service'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await (await clerkClient()).users.getUser(userId)
    const userRole = user.publicMetadata.role as string

    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const analytics = await subscriptionService.getSubscriptionAnalytics()

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Subscription analytics error:', error)
    
    return NextResponse.json(
      { error: 'Failed to get subscription analytics' },
      { status: 500 }
    )
  }
}