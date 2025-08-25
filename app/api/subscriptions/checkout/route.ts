import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { subscriptionService } from '@/lib/stripe/subscription-service'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe/subscription-tiers'
import { z } from 'zod'

const checkoutSchema = z.object({
  tier: z.enum(['basic', 'premium', 'pro']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tier, successUrl, cancelUrl } = checkoutSchema.parse(body)

    // Validate tier exists
    if (!SUBSCRIPTION_TIERS[tier]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const defaultSuccessUrl = `${baseUrl}/dashboard?subscription=success&tier=${tier}`
    const defaultCancelUrl = `${baseUrl}/dashboard?subscription=canceled`

    const checkoutUrl = await subscriptionService.createCheckoutSession(
      userId,
      tier as SubscriptionTier,
      successUrl || defaultSuccessUrl,
      cancelUrl || defaultCancelUrl
    )

    return NextResponse.json({
      checkoutUrl,
      tier,
      price: SUBSCRIPTION_TIERS[tier].price,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}