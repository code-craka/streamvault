import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { initializeNewUser, CLERK_WEBHOOK_EVENTS } from '@/lib/auth/clerk-config'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

if (!webhookSecret) {
  throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
}

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occurred -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(webhookSecret!)

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new NextResponse('Error occurred', {
      status: 400,
    })
  }

  // Handle the webhook
  const { id } = evt.data
  const eventType = evt.type

  console.log(`Webhook with an ID of ${id} and type of ${eventType}`)
  console.log('Webhook body:', body)

  try {
    switch (eventType) {
      case CLERK_WEBHOOK_EVENTS.USER_CREATED:
        // Initialize new user with default metadata
        await initializeNewUser(evt.data.id)
        console.log(`Initialized new user: ${evt.data.id}`)
        break

      case CLERK_WEBHOOK_EVENTS.USER_UPDATED:
        console.log(`User updated: ${evt.data.id}`)
        // Handle user updates if needed
        break

      case CLERK_WEBHOOK_EVENTS.USER_DELETED:
        console.log(`User deleted: ${evt.data.id}`)
        // Handle user deletion cleanup if needed
        break

      case CLERK_WEBHOOK_EVENTS.SESSION_CREATED:
        console.log(`Session created for user: ${evt.data.user_id}`)
        // Handle session creation if needed
        break

      case CLERK_WEBHOOK_EVENTS.SESSION_ENDED:
        console.log(`Session ended for user: ${evt.data.user_id}`)
        // Handle session cleanup if needed
        break

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new NextResponse('Error processing webhook', { status: 500 })
  }
}