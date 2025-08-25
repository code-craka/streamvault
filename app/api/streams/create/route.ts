import { NextRequest, NextResponse } from 'next/server'
import { withFeatureAndUsageGate, getUserFromRequest } from '@/lib/middleware/feature-gate'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { z } from 'zod'
import type { StreamVaultUser } from '@/types/auth'

const createStreamSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  quality: z.enum(['480p', '720p', '1080p', '4K']).default('720p'),
  isPrivate: z.boolean().default(false),
})

// Get current active streams count for a user
async function getCurrentActiveStreams(user: StreamVaultUser): Promise<number> {
  const streamsQuery = query(
    collection(db, 'streams'),
    where('userId', '==', user.id),
    where('status', '==', 'active')
  )
  const snapshot = await getDocs(streamsQuery)
  return snapshot.size
}

// Apply feature gating: requires basic tier and checks concurrent streams limit
const handler = withFeatureAndUsageGate(
  'basic', // Minimum tier required
  'concurrentStreams', // Usage limit to check
  getCurrentActiveStreams, // Function to get current usage
  'Stream creation' // Feature name for error messages
)(async function (request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in request context' },
        { status: 500 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validatedData = createStreamSchema.parse(body)

    // Additional validation: check if user can stream at requested quality
    const { canStreamAtQuality } = await import('@/lib/auth/subscription-validation')
    const qualityAccess = canStreamAtQuality(user, validatedData.quality)
    
    if (!qualityAccess.hasAccess) {
      return NextResponse.json(
        {
          error: 'Quality not available',
          reason: qualityAccess.reason,
          upgradeRequired: qualityAccess.upgradeRequired,
        },
        { status: 403 }
      )
    }

    // Generate stream key and RTMP URL
    const streamKey = generateStreamKey()
    const rtmpUrl = `rtmp://ingest.${process.env.STREAMING_DOMAIN}/live`
    const hlsUrl = `https://cdn.${process.env.STREAMING_DOMAIN}/hls/${streamKey}/index.m3u8`

    // Create stream document
    const streamData = {
      userId: user.id,
      title: validatedData.title,
      description: validatedData.description || '',
      category: validatedData.category || 'General',
      quality: validatedData.quality,
      isPrivate: validatedData.isPrivate,
      streamKey,
      rtmpUrl,
      hlsUrl,
      status: 'inactive',
      viewerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await addDoc(collection(db, 'streams'), streamData)

    return NextResponse.json({
      id: docRef.id,
      ...streamData,
      streamKey: undefined, // Don't expose stream key in response
      message: 'Stream created successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Stream creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    )
  }
})

function generateStreamKey(): string {
  return `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export { handler as POST }