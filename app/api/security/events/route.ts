import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { securityLogger } from '@/lib/security/logging'
import { validateRequest } from '@/lib/security/validation'
import { logUserAction } from '@/lib/security/audit-trail'
import { z } from 'zod'

const getSecurityEventsSchema = z.object({
  eventType: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  userId: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(1000)).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (this would be checked against user metadata)
    // For now, we'll implement a basic check
    const user = await fetch(`${process.env.CLERK_API_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }).then(res => res.json())

    if (user.public_metadata?.role !== 'admin') {
      await logUserAction(
        'unauthorized_security_access',
        userId,
        'security_events',
        'system',
        req,
        false,
        undefined,
        undefined,
        'Non-admin user attempted to access security events'
      )
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate query parameters
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    const validatedParams = validateRequest(getSecurityEventsSchema, queryParams)

    // Convert date strings to timestamps
    const filters: any = {}
    if (validatedParams.eventType) filters.eventType = validatedParams.eventType
    if (validatedParams.severity) filters.severity = validatedParams.severity
    if (validatedParams.userId) filters.userId = validatedParams.userId
    if (validatedParams.ipAddress) filters.ipAddress = validatedParams.ipAddress
    if (validatedParams.startTime) filters.startTime = new Date(validatedParams.startTime).getTime()
    if (validatedParams.endTime) filters.endTime = new Date(validatedParams.endTime).getTime()

    const limit = validatedParams.limit || 100

    // Get security events
    const events = await securityLogger.getSecurityEvents(filters, limit)

    // Log the access
    await logUserAction(
      'view_security_events',
      userId,
      'security_events',
      'system',
      req,
      true,
      undefined,
      { filters, limit, resultCount: events.length }
    )

    return NextResponse.json({
      success: true,
      data: events,
      total: events.length,
      filters,
      limit
    })

  } catch (error) {
    console.error('Error fetching security events:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow system or admin users to create security events manually
    const user = await fetch(`${process.env.CLERK_API_URL}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }).then(res => res.json())

    if (user.public_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    
    const eventSchema = z.object({
      eventType: z.enum([
        'login_attempt', 'failed_login', 'suspicious_activity', 'rate_limit_exceeded',
        'unauthorized_access', 'data_breach_attempt', 'malicious_content', 'content_violation',
        'payment_fraud', 'account_takeover', 'privilege_escalation'
      ]),
      targetUserId: z.string().optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      details: z.record(z.any()).optional(),
    })

    const validatedEvent = validateRequest(eventSchema, body)

    // Create security event
    await securityLogger.logSecurityEvent({
      eventType: validatedEvent.eventType,
      userId: validatedEvent.targetUserId,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('user-agent') || '',
      timestamp: Date.now(),
      severity: validatedEvent.severity,
      details: {
        ...validatedEvent.details,
        createdBy: userId,
        manual: true
      }
    })

    // Log the action
    await logUserAction(
      'create_security_event',
      userId,
      'security_events',
      'system',
      req,
      true,
      undefined,
      validatedEvent
    )

    return NextResponse.json({
      success: true,
      message: 'Security event created successfully'
    })

  } catch (error) {
    console.error('Error creating security event:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
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
  
  return req.ip || 'unknown'
}