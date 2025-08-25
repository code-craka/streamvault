import { NextRequest, NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import {
  rateLimiters,
  ddosProtection,
  createRateLimitMiddleware,
} from './rate-limiting'
import { securityLogger, logSecurityIncident } from './logging'
import { validateRequest, sanitizeInput } from './validation'
import { auditTrail, logUserAction } from './audit-trail'
import { z } from 'zod'

export interface SecurityConfig {
  enableRateLimiting: boolean
  enableDdosProtection: boolean
  enableInputValidation: boolean
  enableAuditLogging: boolean
  enableSecurityHeaders: boolean
  trustedProxies: string[]
  blockedIPs: string[]
  allowedOrigins: string[]
}

export interface SecurityContext {
  userId?: string
  userRole?: string
  subscriptionTier?: string
  ipAddress: string
  userAgent: string
  sessionId?: string
  requestId: string
}

class SecurityMiddleware {
  private config: SecurityConfig

  constructor(config: SecurityConfig) {
    this.config = config
  }

  async processRequest(req: NextRequest): Promise<NextResponse | null> {
    const requestId = this.generateRequestId()
    const context = this.buildSecurityContext(req, requestId)

    try {
      // 1. IP Blocking
      const ipBlockResult = await this.checkIPBlocking(req, context)
      if (ipBlockResult) return ipBlockResult

      // 2. DDoS Protection
      if (this.config.enableDdosProtection) {
        const ddosResult = await ddosProtection(req)
        if (ddosResult) {
          await this.logSecurityEvent('suspicious_activity', context, {
            reason: 'DDoS protection triggered',
          })
          return ddosResult
        }
      }

      // 3. Rate Limiting
      if (this.config.enableRateLimiting) {
        const rateLimitResult = await this.applyRateLimiting(req, context)
        if (rateLimitResult) return rateLimitResult
      }

      // 4. Input Validation (for POST/PUT requests)
      if (
        this.config.enableInputValidation &&
        ['POST', 'PUT', 'PATCH'].includes(req.method)
      ) {
        const validationResult = await this.validateInput(req, context)
        if (validationResult) return validationResult
      }

      // 5. Security Headers
      if (this.config.enableSecurityHeaders) {
        // Headers will be added in the response
      }

      return null // Continue to next middleware
    } catch (error) {
      console.error('Security middleware error:', error)

      await this.logSecurityEvent('system_error', context, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Fail securely - block request on security middleware errors
      return new NextResponse('Security Error', { status: 500 })
    }
  }

  async processResponse(
    req: NextRequest,
    res: NextResponse,
    context: SecurityContext
  ): Promise<NextResponse> {
    try {
      // Add security headers
      if (this.config.enableSecurityHeaders) {
        this.addSecurityHeaders(res, req)
      }

      // Log successful request if audit logging is enabled
      if (this.config.enableAuditLogging && context.userId) {
        await this.logRequestAudit(req, res, context, true)
      }

      return res
    } catch (error) {
      console.error('Security response processing error:', error)
      return res
    }
  }

  private async checkIPBlocking(
    req: NextRequest,
    context: SecurityContext
  ): Promise<NextResponse | null> {
    if (this.config.blockedIPs.includes(context.ipAddress)) {
      await this.logSecurityEvent('unauthorized_access', context, {
        reason: 'IP address blocked',
        blockedIP: context.ipAddress,
      })

      return new NextResponse('Access Denied', { status: 403 })
    }

    return null
  }

  private async applyRateLimiting(
    req: NextRequest,
    context: SecurityContext
  ): Promise<NextResponse | null> {
    const pathname = req.nextUrl.pathname

    // Choose appropriate rate limiter based on endpoint
    let limiter = rateLimiters.api // Default

    if (pathname.startsWith('/api/auth')) {
      limiter = rateLimiters.auth
    } else if (pathname.startsWith('/api/chat')) {
      limiter = rateLimiters.chat
    } else if (pathname.startsWith('/api/upload')) {
      limiter = rateLimiters.upload
    } else if (pathname.startsWith('/api/streams') && req.method === 'POST') {
      limiter = rateLimiters.stream
    } else if (pathname.includes('password-reset')) {
      limiter = rateLimiters.passwordReset
    }

    const rateLimitMiddleware = createRateLimitMiddleware(limiter)
    const result = await rateLimitMiddleware(req)

    if (result) {
      await this.logSecurityEvent('rate_limit_exceeded', context, {
        endpoint: pathname,
        method: req.method,
      })
    }

    return result
  }

  private async validateInput(
    req: NextRequest,
    context: SecurityContext
  ): Promise<NextResponse | null> {
    try {
      const contentType = req.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        const body = await req.json()

        // Basic validation for common attack patterns
        const bodyString = JSON.stringify(body)

        // Check for script injection
        if (/<script|javascript:|on\w+\s*=/i.test(bodyString)) {
          await this.logSecurityEvent('malicious_content', context, {
            reason: 'Script injection attempt detected',
            content: bodyString.substring(0, 200),
          })

          return new NextResponse('Invalid Input', { status: 400 })
        }

        // Check for SQL injection patterns
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
          /(--|\/\*|\*\/|;|'|")/,
          /(\bOR\b|\bAND\b).*[=<>]/i,
        ]

        if (sqlPatterns.some(pattern => pattern.test(bodyString))) {
          await this.logSecurityEvent('malicious_content', context, {
            reason: 'SQL injection attempt detected',
            content: bodyString.substring(0, 200),
          })

          return new NextResponse('Invalid Input', { status: 400 })
        }

        // Sanitize input
        const sanitizedBody = this.sanitizeObject(body)

        // Replace request body with sanitized version
        // Note: This is a simplified approach. In production, you'd need to
        // properly handle request body replacement
      }

      return null
    } catch (error) {
      console.error('Input validation error:', error)
      return new NextResponse('Validation Error', { status: 400 })
    }
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return sanitizeInput(obj)
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value)
      }
      return sanitized
    }
    return obj
  }

  private addSecurityHeaders(res: NextResponse, req: NextRequest): void {
    const headers = res.headers

    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://clerk.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' https: blob:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://js.stripe.com https://clerk.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ')

    headers.set('Content-Security-Policy', csp)

    // Other security headers
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    )

    // HSTS (only for HTTPS)
    if (req.nextUrl.protocol === 'https:') {
      headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
    }

    // CORS headers
    const origin = req.headers.get('origin')
    if (origin && this.config.allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin)
      headers.set('Access-Control-Allow-Credentials', 'true')
    }

    headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
  }

  private buildSecurityContext(
    req: NextRequest,
    requestId: string
  ): SecurityContext {
    return {
      ipAddress: this.getClientIP(req),
      userAgent: req.headers.get('user-agent') || '',
      requestId,
      // userId, userRole, subscriptionTier will be populated after authentication
    }
  }

  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const cfConnectingIP = req.headers.get('cf-connecting-ip')

    if (cfConnectingIP) return cfConnectingIP
    if (realIP) return realIP
    if (forwarded) return forwarded.split(',')[0].trim()

    return req.ip || 'unknown'
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async logSecurityEvent(
    eventType: string,
    context: SecurityContext,
    details?: Record<string, any>
  ): Promise<void> {
    await securityLogger.logSecurityEvent({
      eventType: eventType as any,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: Date.now(),
      severity: this.getSeverityForEvent(eventType),
      details: {
        ...details,
        requestId: context.requestId,
      },
    })
  }

  private async logRequestAudit(
    req: NextRequest,
    res: NextResponse,
    context: SecurityContext,
    success: boolean
  ): Promise<void> {
    if (!context.userId) return

    const action = `${req.method.toLowerCase()}_${req.nextUrl.pathname.replace(/^\/api\//, '').replace(/\//g, '_')}`

    await auditTrail.logAction({
      userId: context.userId,
      action,
      resourceType: 'api',
      resourceId: req.nextUrl.pathname,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success,
      severity: success ? 'low' : 'medium',
      category: 'data_access',
      complianceRelevant: false,
      retentionPeriod: 90, // 90 days for API access logs
      metadata: {
        method: req.method,
        statusCode: res.status,
        requestId: context.requestId,
      },
    })
  }

  private getSeverityForEvent(
    eventType: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> =
      {
        rate_limit_exceeded: 'medium',
        suspicious_activity: 'high',
        unauthorized_access: 'high',
        malicious_content: 'high',
        data_breach_attempt: 'critical',
        system_error: 'medium',
      }

    return severityMap[eventType] || 'low'
  }
}

// Default security configuration
const defaultSecurityConfig: SecurityConfig = {
  enableRateLimiting: true,
  enableDdosProtection: true,
  enableInputValidation: true,
  enableAuditLogging: true,
  enableSecurityHeaders: true,
  trustedProxies: ['127.0.0.1', '::1'],
  blockedIPs: [],
  allowedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://streamvault.app',
    'https://*.streamvault.app',
  ],
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware(defaultSecurityConfig)

// Enhanced middleware function that combines Clerk with security
export function createSecureMiddleware() {
  return clerkMiddleware(async (auth, req) => {
    // Apply security middleware first
    const securityResult = await securityMiddleware.processRequest(req)
    if (securityResult) {
      return securityResult
    }

    // Continue with Clerk authentication
    // Protected routes will be handled by Clerk
    const { userId } = auth()

    // Add user context to security logging if authenticated
    if (userId) {
      // This would be used for enhanced audit logging
      // The actual implementation would need to be integrated with the response
    }

    return NextResponse.next()
  })
}

// Validation schemas for security configuration
export const securityConfigSchema = z.object({
  enableRateLimiting: z.boolean(),
  enableDdosProtection: z.boolean(),
  enableInputValidation: z.boolean(),
  enableAuditLogging: z.boolean(),
  enableSecurityHeaders: z.boolean(),
  trustedProxies: z.array(z.string().ip()),
  blockedIPs: z.array(z.string().ip()),
  allowedOrigins: z.array(z.string().url()),
})

export const securityContextSchema = z.object({
  userId: z.string().optional(),
  userRole: z.string().optional(),
  subscriptionTier: z.string().optional(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  sessionId: z.string().optional(),
  requestId: z.string(),
})
