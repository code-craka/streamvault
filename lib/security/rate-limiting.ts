import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { securityLogger } from './logging'

// Initialize Redis client for rate limiting
const redis = Redis.fromEnv()

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async checkLimit(req: NextRequest, identifier?: string): Promise<RateLimitResult> {
    const key = identifier || this.generateKey(req)
    const window = Math.floor(Date.now() / this.config.windowMs)
    const redisKey = `rate_limit:${key}:${window}`

    try {
      const current = await redis.incr(redisKey)
      
      if (current === 1) {
        // Set expiration for the first request in this window
        await redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000))
      }

      const remaining = Math.max(0, this.config.maxRequests - current)
      const resetTime = (window + 1) * this.config.windowMs

      if (current > this.config.maxRequests) {
        // Log rate limit exceeded
        await securityLogger.logSecurityEvent({
          eventType: 'rate_limit_exceeded',
          ipAddress: this.getClientIP(req),
          userAgent: req.headers.get('user-agent') || '',
          timestamp: Date.now(),
          severity: 'medium',
          details: {
            key,
            current,
            limit: this.config.maxRequests,
            window: this.config.windowMs
          }
        })

        return {
          success: false,
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        }
      }

      return {
        success: true,
        limit: this.config.maxRequests,
        remaining,
        resetTime
      }
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Fail open - allow request if Redis is down
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs
      }
    }
  }

  private generateKey(req: NextRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req)
    }
    
    // Default key generation based on IP and user agent
    const ip = this.getClientIP(req)
    const userAgent = req.headers.get('user-agent') || ''
    return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`
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
}

// Predefined rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiting
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
  }),

  // Authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 login attempts per 15 minutes
  }),

  // Chat messages
  chat: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 messages per minute (will be adjusted by subscription tier)
  }),

  // Video uploads
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 uploads per hour
  }),

  // Stream creation
  stream: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 stream creations per hour
  }),

  // Password reset
  passwordReset: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 password reset attempts per hour
  }),
}

// Subscription-based rate limiting
export function getSubscriptionRateLimit(tier: string, baseLimit: number): number {
  const multipliers = {
    basic: 1,
    premium: 3,
    pro: 5,
  }
  
  return baseLimit * (multipliers[tier as keyof typeof multipliers] || 1)
}

// DDoS protection middleware
export async function ddosProtection(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(req)
  const userAgent = req.headers.get('user-agent') || ''
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /bot|crawler|spider/i,
    /curl|wget|python|java/i,
    /scanner|exploit|hack/i,
  ]
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent))
  
  if (isSuspicious) {
    // Apply stricter rate limiting for suspicious requests
    const strictLimiter = new RateLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10, // 10 requests per 5 minutes
    })
    
    const result = await strictLimiter.checkLimit(req, `suspicious:${ip}`)
    
    if (!result.success) {
      await securityLogger.logSecurityEvent({
        eventType: 'suspicious_activity',
        ipAddress: ip,
        userAgent,
        timestamp: Date.now(),
        severity: 'high',
        details: {
          reason: 'Suspicious user agent pattern',
          pattern: userAgent,
        }
      })
      
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '300',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      })
    }
  }
  
  return null
}

// Helper function to get client IP (duplicate for standalone use)
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return req.ip || 'unknown'
}

// Rate limiting middleware factory
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const result = await limiter.checkLimit(req)
    
    if (!result.success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      })
    }
    
    return null
  }
}