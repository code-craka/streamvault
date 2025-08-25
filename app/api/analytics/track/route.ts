// API endpoint for tracking analytics events
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { analyticsService } from '@/lib/analytics/analytics-service'
import { z } from 'zod'

// Validation schemas
const trackViewerSchema = z.object({
  action: z.literal('viewer_join'),
  streamId: z.string(),
  sessionId: z.string(),
  deviceInfo: z.object({
    deviceType: z.enum(['desktop', 'mobile', 'tablet']),
    browser: z.string(),
    location: z.object({
      country: z.string(),
      region: z.string().optional(),
      city: z.string().optional(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number()
      }).optional()
    }).optional()
  })
})

const trackViewerLeaveSchema = z.object({
  action: z.literal('viewer_leave'),
  streamId: z.string(),
  sessionId: z.string(),
  duration: z.number()
})

const trackChatSchema = z.object({
  action: z.literal('chat_message'),
  streamId: z.string(),
  messageId: z.string(),
  messageData: z.object({
    messageLength: z.number(),
    containsEmotes: z.boolean(),
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    engagementScore: z.number()
  })
})

const trackQualitySchema = z.object({
  action: z.literal('quality_change'),
  streamId: z.string(),
  sessionId: z.string(),
  newQuality: z.string(),
  bufferingEvent: z.boolean().optional(),
  bufferingDuration: z.number().optional()
})

const trackEngagementSchema = z.object({
  action: z.literal('engagement'),
  streamId: z.string().optional(),
  sessionId: z.string(),
  eventType: z.string(),
  eventData: z.record(z.any()).optional(),
  value: z.number().optional()
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    const body = await request.json()

    // Validate request body based on action type
    let validatedData
    
    switch (body.action) {
      case 'viewer_join':
        validatedData = trackViewerSchema.parse(body)
        await analyticsService.trackViewerJoin(
          validatedData.streamId,
          userId,
          validatedData.sessionId,
          validatedData.deviceInfo
        )
        break

      case 'viewer_leave':
        validatedData = trackViewerLeaveSchema.parse(body)
        await analyticsService.trackViewerLeave(
          validatedData.streamId,
          validatedData.sessionId,
          validatedData.duration
        )
        break

      case 'chat_message':
        if (!userId) {
          return NextResponse.json(
            { error: 'Authentication required for chat tracking' },
            { status: 401 }
          )
        }
        validatedData = trackChatSchema.parse(body)
        await analyticsService.trackChatMessage(
          validatedData.streamId,
          validatedData.messageId,
          userId,
          validatedData.messageData
        )
        break

      case 'quality_change':
        validatedData = trackQualitySchema.parse(body)
        await analyticsService.trackQualityChange(
          validatedData.streamId,
          validatedData.sessionId,
          validatedData.newQuality,
          validatedData.bufferingEvent,
          validatedData.bufferingDuration
        )
        break

      case 'engagement':
        validatedData = trackEngagementSchema.parse(body)
        await analyticsService.trackEngagementEvent({
          streamId: validatedData.streamId,
          userId,
          timestamp: new Date(),
          eventType: validatedData.eventType,
          sessionId: validatedData.sessionId,
          eventData: validatedData.eventData || {},
          value: validatedData.value
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Analytics tracking error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving real-time analytics
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const streamId = searchParams.get('streamId')

    if (!streamId) {
      return NextResponse.json(
        { error: 'Stream ID required' },
        { status: 400 }
      )
    }

    // TODO: Verify user has access to this stream's analytics
    
    const analytics = await analyticsService.getRealtimeAnalytics(streamId)
    
    if (!analytics) {
      return NextResponse.json(
        { error: 'Analytics not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error retrieving analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}