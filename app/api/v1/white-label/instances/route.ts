import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiAuthService } from '@/lib/api/auth-service'
import {
  brandingService,
  CustomBrandingSchema,
} from '@/lib/white-label/branding-service'

// Create instance schema
const CreateInstanceSchema = z.object({
  name: z.string().min(1).max(100),
  branding: CustomBrandingSchema,
  customDomain: z.string().optional(),
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

    // Check permissions - only admin clients can manage white-label instances
    if (!apiAuthService.hasPermission(client, 'admin:all')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Apply rate limiting
    const rateLimitResult = await apiAuthService.checkRateLimit(
      client.id,
      client.rateLimit
    )
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          },
        }
      )
    }

    // Get all instances
    const instances = await brandingService.getAllInstances()

    return NextResponse.json(
      {
        data: instances,
      },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
        },
      }
    )
  } catch (error) {
    console.error('API Error:', error)
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
    if (!apiAuthService.hasPermission(client, 'admin:all')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 }
      )
    }

    // Apply rate limiting
    const rateLimitResult = await apiAuthService.checkRateLimit(
      client.id,
      client.rateLimit
    )
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          },
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const instanceData = CreateInstanceSchema.parse(body)

    // Generate unique instance ID
    const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Apply branding configuration
    await brandingService.applyCustomBranding(instanceId, instanceData.branding)

    // Setup custom domain if provided
    if (instanceData.customDomain) {
      await brandingService.setupCustomDomain(
        instanceId,
        instanceData.customDomain
      )
    }

    // Get the created instance configuration
    const instanceConfig = await brandingService.getBrandingConfig(instanceId)

    return NextResponse.json(
      {
        data: {
          instanceId,
          name: instanceData.name,
          config: instanceConfig,
          defaultDomain: `${instanceId}.streamvault.app`,
          customDomain: instanceData.customDomain,
        },
        message: 'White-label instance created successfully',
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
        },
      }
    )
  } catch (error) {
    console.error('API Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: error.errors,
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
