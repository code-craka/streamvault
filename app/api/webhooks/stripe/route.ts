import { NextRequest, NextResponse } from 'next/server'
import { stripeWebhookHandler } from '@/lib/stripe/webhook-handler'

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature header')
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      )
    }

    // Construct and verify the webhook event
    const event = stripeWebhookHandler.constructEvent(body, signature)

    // Handle the webhook event
    await stripeWebhookHandler.handleWebhook(event)

    // Return success response
    return NextResponse.json(
      { received: true, eventType: event.type },
      { status: 200 }
    )
  } catch (error) {
    console.error('Webhook error:', error)

    if (error instanceof Error) {
      if (error.message === 'Invalid webhook signature') {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// Disable body parsing for webhooks
export const runtime = 'nodejs'