import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiAuthService } from '@/lib/api/auth-service'
import { streamService } from '@/lib/database/stream-service'

// Update stream schema
const UpdateStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().optional(),
  isPrivate: z.boolean().optional(),
  thumbnailUrl: z.string().url().optional(),
})

interface RouteParams {
  params: {
    streamId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { streamId } = params

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

    // Get stream details
    const stream = await streamService.getStreamById(streamId)
    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found', code: 'STREAM_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check instance access if client is instance-specific
    if (client.instanceId && stream.instanceId !== client.instanceId) {
      return NextResponse.json(
        { error: 'Stream not found', code: 'STREAM_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: stream,
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { streamId } = params

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
    if (!apiAuthService.hasPermission(client, 'stream:update')) {
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

    // Check if stream exists
    const existingStream = await streamService.getStreamById(streamId)
    if (!existingStream) {
      return NextResponse.json(
        { error: 'Stream not found', code: 'STREAM_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check instance access
    if (client.instanceId && existingStream.instanceId !== client.instanceId) {
      return NextResponse.json(
        { error: 'Stream not found', code: 'STREAM_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const updateData = UpdateStreamSchema.parse(body)

    // Update stream
    const updatedStream = await streamService.updateStream(streamId, updateData)

    return NextResponse.json({
      data: updatedStream,
      message: 'Stream updated successfully',
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { streamId } = params

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
    if (!apiAuthService.hasPermission(client, 'stream:delete')) {
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

    // Check if stream exists
    const existingStream = await streamService.getStreamById(streamId)
    if (!existingStream) {
      return NextResponse.json(
        { error: 'Stream not found', code: 'STREAM_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check instance access
    if (client.instanceId && existingStream.instanceId !== client.instanceId) {
      return NextResponse.json(
        { error: 'Stream not found', code: 'STREAM_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Delete stream
    await streamService.deleteStream(streamId)

    return NextResponse.json({
      message: 'Stream deleted successfully',
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}