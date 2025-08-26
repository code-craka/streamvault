import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiAuthService } from '@/lib/api/auth-service'
import {
  brandingService,
  CustomBrandingSchema,
} from '@/lib/white-label/branding-service'

// Update instance schema
const UpdateInstanceSchema = z.object({
  branding: CustomBrandingSchema.partial().optional(),
  customDomain: z.string().optional(),
  isActive: z.boolean().optional(),
})

interface RouteParams {
  params: {
    instanceId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { instanceId } = params

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

    // Check permissions - allow access if client belongs to this instance or has admin access
    const hasAccess =
      client.instanceId === instanceId ||
      apiAuthService.hasPermission(client, 'admin:all')

    if (!hasAccess) {
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

    // Get instance configuration
    const instanceConfig = await brandingService.getBrandingConfig(instanceId)
    if (!instanceConfig) {
      return NextResponse.json(
        { error: 'Instance not found', code: 'INSTANCE_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        data: instanceConfig,
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { instanceId } = params

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
    const hasAccess =
      client.instanceId === instanceId ||
      apiAuthService.hasPermission(client, 'admin:all')

    if (!hasAccess) {
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

    // Check if instance exists
    const existingConfig = await brandingService.getBrandingConfig(instanceId)
    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Instance not found', code: 'INSTANCE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const updateData = UpdateInstanceSchema.parse(body)

    // Update branding if provided
    if (updateData.branding) {
      const mergedBranding = {
        ...existingConfig.branding,
        ...updateData.branding,
      }
      await brandingService.applyCustomBranding(instanceId, mergedBranding)
    }

    // Setup custom domain if provided
    if (
      updateData.customDomain &&
      updateData.customDomain !== existingConfig.branding.customDomain
    ) {
      await brandingService.setupCustomDomain(
        instanceId,
        updateData.customDomain
      )
    }

    // Handle instance activation/deactivation
    if (
      typeof updateData.isActive === 'boolean' &&
      updateData.isActive !== existingConfig.isActive
    ) {
      if (!updateData.isActive) {
        await brandingService.deactivateInstance(instanceId)
      }
      // Reactivation would require additional logic
    }

    // Get updated configuration
    const updatedConfig = await brandingService.getBrandingConfig(instanceId)

    return NextResponse.json(
      {
        data: updatedConfig,
        message: 'Instance updated successfully',
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { instanceId } = params

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

    // Check permissions - only admin can delete instances
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

    // Check if instance exists
    const existingConfig = await brandingService.getBrandingConfig(instanceId)
    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Instance not found', code: 'INSTANCE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Deactivate instance (soft delete)
    await brandingService.deactivateInstance(instanceId)

    return NextResponse.json(
      {
        message: 'Instance deactivated successfully',
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
