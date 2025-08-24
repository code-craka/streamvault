import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { subscriptionService } from '@/lib/stripe/subscription-service'
import { z } from 'zod'

const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
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
    const { returnUrl } = portalSchema.parse(body)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const defaultReturnUrl = `${baseUrl}/dashboard/settings/billing`

    const portalUrl = await subscriptionService.createBillingPortalSession(
      userId,
      returnUrl || defaultReturnUrl
    )

    return NextResponse.json({
      portalUrl,
    })
  } catch (error) {
    console.error('Billing portal error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}