import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiAuthService } from '@/lib/api/auth-service'
import { streamService } from '@/lib/database/stream-service'

// Request validation schemas
const CreateStreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().optional(),
  isPrivate: z.boolean().default(false),
  scheduledStartTime: z.string().datetime().optional(),
})

const StreamQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'ended']).optional(),
  category: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    // Extract and validate API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required', code: 'MISSING_API_KEY' },
        { status: 401 }
      )
    }

    // Validate API client
    const client = await apiAuthService.validateAPIKey(apiKey)
    if (!client) {
      return NextResponse.json(
        { error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!apiAuthService.hasPermission(client, 'stream:read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Apply rate limiting
    const rateLimitResult = await apiAuthService.checkRateLimit(client.id, client.rateLimit)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimitResult.resetTime 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          }
        }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = StreamQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      category: searchParams.get('category'),
    })

    // Get streams with pagination
    const streams = await streamService.getStreams({
      page: queryParams.page,
      limit: queryParams.limit,
      status: queryParams.status,
      category: queryParams.category,
      instanceId: client.instanceId,
    })

    return NextResponse.json({
      data: streams.data,
      pagination: {
        page: queryParams.page,
        limit: queryParams.limit,
        total: streams.total,
        totalPages: Math.ceil(streams.total / queryParams.limit),
      },
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
          code: 'VALIDATION_ERROR',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract and validate API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required', code: 'MISSING_API_KEY' },
        { status: 401 }
      )
    }

    // Validate API client
    const client = await apiAuthService.validateAPIKey(apiKey)
    if (!client) {
      return NextResponse.json(
        { error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 401 }
      )
    }

    // Check permissions
    if (!apiAuthService.hasPermission(client, 'stream:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Apply rate limiting
    const rateLimitResult = await apiAuthService.checkRateLimit(client.id, client.rateLimit)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimitResult.resetTime 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          }
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const streamData = CreateStreamSchema.parse(body)

    // Create stream
    const stream = await streamService.createStream({
      ...streamData,
      creatorId: client.id, // Use API client as creator for API-created streams
      instanceId: client.instanceId,
    })

    return NextResponse.json({
      data: stream,
      message: 'Stream created successfully',
    }, {
      status: 201,
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request body', 
          code: 'VALIDATION_ERROR',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}