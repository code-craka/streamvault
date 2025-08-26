import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  contentModerator,
  moderationRequestSchema,
} from '@/lib/security/content-moderation'
import { validateRequest } from '@/lib/security/validation'
import { logUserAction } from '@/lib/security/audit-trail'
import { rateLimiters } from '@/lib/security/rate-limiting'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting for moderation requests
    const rateLimitResult = await rateLimiters.api.checkLimit(
      req,
      `moderate:${userId}`
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          },
        }
      )
    }

    const body = await req.json()
    const validatedRequest = validateRequest(moderationRequestSchema, body)

    // Add request context for moderation
    const context = {
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('user-agent') || '',
      requestId: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    // Perform content moderation
    const moderationResult = await contentModerator.moderateContent(
      validatedRequest.content,
      validatedRequest.contentType,
      validatedRequest.userId || userId,
      context
    )

    // Log the moderation request
    await logUserAction(
      'content_moderation_request',
      userId,
      'content',
      context.requestId,
      req,
      true,
      undefined,
      {
        contentType: validatedRequest.contentType,
        approved: moderationResult.approved,
        confidence: moderationResult.confidence,
        suggestedAction: moderationResult.suggestedAction,
        detectedCategories: moderationResult.detectedCategories,
      }
    )

    // Return moderation result (without filtered content for security)
    return NextResponse.json({
      success: true,
      result: {
        approved: moderationResult.approved,
        confidence: moderationResult.confidence,
        reasons: moderationResult.reasons,
        detectedCategories: moderationResult.detectedCategories,
        suggestedAction: moderationResult.suggestedAction,
        // Only return filtered content if it was modified
        filteredContent:
          moderationResult.filteredContent !== validatedRequest.content
            ? moderationResult.filteredContent
            : undefined,
      },
    })
  } catch (error) {
    console.error('Error in content moderation:', error)

    // Log the error
    try {
      const { userId } = await auth()
      if (userId) {
        await logUserAction(
          'content_moderation_error',
          userId,
          'content',
          'system',
          req,
          false,
          undefined,
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    } catch (logError) {
      console.error('Failed to log moderation error:', logError)
    }

    return NextResponse.json(
      {
        error: 'Moderation service error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const user = await fetch(`${process.env.CLERK_API_URL}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }).then(res => res.json())

    if (user.public_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Return moderation statistics and configuration
    const stats = {
      moderationEnabled: true,
      filters: {
        profanityFilter: true,
        spamDetection: true,
        toxicityDetection: true,
        personalInfoDetection: true,
        linkFiltering: true,
      },
      limits: {
        maxMessageLength: 500,
        maxRepeatedCharacters: 3,
      },
      allowedDomains: [
        'youtube.com',
        'twitch.tv',
        'twitter.com',
        'instagram.com',
      ],
      // In production, you might want to include actual statistics
      // from your moderation logs
      recentStats: {
        totalRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        flaggedRequests: 0,
      },
    }

    await logUserAction(
      'view_moderation_config',
      userId,
      'moderation',
      'system',
      req,
      true
    )

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching moderation config:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')

  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown' || 'unknown'
}
