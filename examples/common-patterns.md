# StreamVault - Common Patterns & Examples

This file provides code examples and patterns commonly used in StreamVault to help GitHub Copilot understand the project conventions and provide better suggestions.

## Authentication Patterns

### Server-Side Authentication Check
```typescript
// app/api/streams/[streamId]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Your authenticated logic here
    return Response.json({ streamId: params.streamId, userId })
  } catch (error) {
    return Response.json(
      { 
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
```

### Client-Side Authentication Hook
```typescript
// hooks/use-auth.ts
import { useUser } from '@clerk/nextjs'

export function useAuthenticatedUser() {
  const { user, isLoaded, isSignedIn } = useUser()
  
  if (!isLoaded) {
    return { user: null, loading: true, isAuthenticated: false }
  }
  
  return {
    user: isSignedIn ? user : null,
    loading: false,
    isAuthenticated: isSignedIn
  }
}
```

## Database Operations (Firebase)

### Firestore Query with Validation
```typescript
// lib/database/streams.ts
import { db } from '@/lib/firebase-admin'
import { z } from 'zod'

const createStreamSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  isLive: z.boolean().default(false),
  categoryId: z.string().optional()
})

export async function createStream(userId: string, data: unknown) {
  const validatedData = createStreamSchema.parse(data)
  
  const streamData = {
    ...validatedData,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    viewCount: 0,
    status: 'draft' as const
  }
  
  const docRef = await db.collection('streams').add(streamData)
  return { id: docRef.id, ...streamData }
}

export async function getUserStreams(userId: string) {
  const snapshot = await db
    .collection('streams')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()
    
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}
```

### Firestore Transaction Pattern
```typescript
// lib/database/transactions.ts
import { db } from '@/lib/firebase-admin'

export async function updateStreamViewCount(streamId: string) {
  const streamRef = db.collection('streams').doc(streamId)
  
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(streamRef)
    if (!doc.exists) {
      throw new Error('Stream not found')
    }
    
    const currentViews = doc.data()?.viewCount || 0
    transaction.update(streamRef, { 
      viewCount: currentViews + 1,
      updatedAt: new Date()
    })
  })
}
```

## Stripe Payment Integration

### Webhook Validation Pattern
```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return Response.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }
  
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
  
  return Response.json({ received: true })
}
```

### Subscription Management
```typescript
// lib/payments/subscriptions.ts
import { stripe } from '@/lib/stripe'

export async function createSubscription(customerId: string, priceId: string) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    })
    
    return subscription
  } catch (error) {
    console.error('Subscription creation failed:', error)
    throw new Error('Failed to create subscription')
  }
}
```

## Video Streaming (HLS)

### HLS Player Component
```typescript
// components/player/hls-player.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface HLSPlayerProps {
  src: string
  poster?: string
  autoPlay?: boolean
  controls?: boolean
}

export function HLSPlayer({ src, poster, autoPlay = false, controls = true }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false, // Disable for better compatibility
      })
      
      hlsRef.current = hls
      
      hls.loadSource(src)
      hls.attachMedia(video)
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError(`HLS Error: ${data.details}`)
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
    } else {
      setError('HLS is not supported in this browser')
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [src])
  
  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }
  
  return (
    <video
      ref={videoRef}
      poster={poster}
      autoPlay={autoPlay}
      controls={controls}
      className="w-full h-auto"
    />
  )
}
```

## Error Handling Patterns

### API Error Response
```typescript
// lib/errors/api-errors.ts
export class APIError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  
  console.error('Unexpected error:', error)
  return Response.json(
    { 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    },
    { status: 500 }
  )
}
```

### Component Error Boundary
```typescript
// components/error-boundary.tsx
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('Error caught by boundary:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-red-500 p-4">
          Something went wrong: {this.state.error?.message}
        </div>
      )
    }
    
    return this.props.children
  }
}
```

## Form Handling with Validation

### Contact Form with Zod
```typescript
// components/forms/contact-form.tsx
'use client'

import { useState } from 'react'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters')
})

type ContactFormData = z.infer<typeof contactSchema>

export function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    message: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    try {
      const validatedData = contactSchema.parse(formData)
      setIsSubmitting(true)
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      // Success handling
      setFormData({ name: '', email: '', message: '' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Name</label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300"
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
```

## Performance Optimization Patterns

### Image Optimization
```typescript
// components/ui/optimized-image.tsx
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function OptimizedImage({ 
  src, 
  alt, 
  width = 800, 
  height = 600,
  className = '',
  priority = false
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  )
}
```

### Lazy Loading Component
```typescript
// components/ui/lazy-wrapper.tsx
import { Suspense, lazy } from 'react'

const LazyComponent = lazy(() => import('./heavy-component'))

export function LazyWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  )
}
```

## Testing Patterns

### API Route Testing
```typescript
// tests/api/streams.test.ts
import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/streams/route'

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}))

describe('/api/streams', () => {
  it('returns streams for authenticated user', async () => {
    const mockAuth = require('@clerk/nextjs/server').auth
    mockAuth.mockResolvedValue({ userId: 'user_123' })
    
    const { req } = createMocks({ method: 'GET' })
    const response = await GET(req)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('streams')
  })
  
  it('returns 401 for unauthenticated user', async () => {
    const mockAuth = require('@clerk/nextjs/server').auth
    mockAuth.mockResolvedValue({ userId: null })
    
    const { req } = createMocks({ method: 'GET' })
    const response = await GET(req)
    
    expect(response.status).toBe(401)
  })
})
```

### Component Testing
```typescript
// tests/components/hls-player.test.tsx
import { render, screen } from '@testing-library/react'
import { HLSPlayer } from '@/components/player/hls-player'

jest.mock('hls.js', () => {
  return jest.fn().mockImplementation(() => ({
    loadSource: jest.fn(),
    attachMedia: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn()
  }))
})

describe('HLSPlayer', () => {
  it('renders video element with correct attributes', () => {
    render(<HLSPlayer src="test.m3u8" />)
    
    const video = screen.getByRole('video')
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('controls')
  })
})
```

## TypeScript Utilities

### Type-Safe Environment Variables
```typescript
// lib/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  FIREBASE_SERVICE_ACCOUNT: z.string(),
  STRIPE_SECRET_KEY: z.string(),
})

export const env = envSchema.parse(process.env)
```

### Branded Types for IDs
```typescript
// types/branded.ts
export type UserId = string & { readonly __brand: unique symbol }
export type StreamId = string & { readonly __brand: unique symbol }
export type VideoId = string & { readonly __brand: unique symbol }

export function createUserId(id: string): UserId {
  return id as UserId
}
```

These patterns demonstrate the coding standards and conventions used throughout StreamVault. Follow these patterns when contributing new code or reviewing existing code.