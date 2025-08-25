import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiAuthService, APIPermissions, type APIPermission } from '@/lib/api/auth-service'

// Create API client schema
const CreateAPIClientSchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(Object.keys(APIPermissions) as [APIPermission, ...APIPermission[]])),
  rateLimit: z.object({
    requestsPerMinute: z.number().min(1).max(10000),
    requestsPerHour: z.number().min(1).max(100000),
    requestsPerDay: z.number().min(1).max(1000000),
  }),
  instanceId: z.string().optional(),
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

    // Check permissions - only admin clients can manage API clients
    if (!apiAuthService.hasPermission(client, 'admin:all')) {
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

    // Get clients for the instance (if client is instance-specific)
    let clients
    if (client.instanceId) {
      clients = await apiAuthService.getInstanceClients(client.instanceId)
    } else {
      // For global admin clients, this would get all clients
      clients = []
    }

    // Remove sensitive information
    const sanitizedClients = clients.map(c => ({
      id: c.id,
      name: c.name,
      permissions: c.permissions,
      rateLimit: c.rateLimit,
      isActive: c.isActive,
      instanceId: c.instanceId,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
    }))

    return NextResponse.json({
      data: sanitizedClients,
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
    const clientData = CreateAPIClientSchema.parse(body)

    // If the requesting client is instance-specific, new client should be for the same instance
    const instanceId = client.instanceId || clientData.instanceId

    // Create new API client
    const result = await apiAuthService.createAPIClient(
      clientData.name,
      clientData.permissions,
      clientData.rateLimit,
      instanceId
    )

    return NextResponse.json({
      data: {
        id: result.client.id,
        name: result.client.name,
        apiKey: result.apiKey,
        secret: result.secret, // Only returned once during creation
        permissions: result.client.permissions,
        rateLimit: result.client.rateLimit,
        instanceId: result.client.instanceId,
        createdAt: result.client.createdAt,
      },
      message: 'API client created successfully',
      warning: 'Store the API key and secret securely. The secret will not be shown again.',
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