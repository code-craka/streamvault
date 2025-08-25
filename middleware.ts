import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { securityMiddleware } from '@/lib/security/middleware'
import { logSecurityIncident } from '@/lib/security/logging'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health',
  '/api/firebase/test',
  '/api/firebase/config',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  try {
    // Apply comprehensive security middleware first
    const securityResult = await securityMiddleware.processRequest(req)
    if (securityResult) {
      return securityResult
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        },
      })
    }

    // Get user info for security context
    const { userId } = await auth()
    const ipAddress = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || ''

    // If the route is not public, protect it with authentication
    if (!isPublicRoute(req)) {
      try {
        if (!userId) {
          // Log failed authentication attempt
          await logSecurityIncident(
            'unauthorized_access',
            'medium',
            req,
            undefined,
            {
              route: req.nextUrl.pathname,
              reason: 'No authentication token'
            }
          )
          
          const signInUrl = new URL('/sign-in', req.url)
          signInUrl.searchParams.set('redirect_url', req.url)
          return NextResponse.redirect(signInUrl)
        }

        // Log successful authentication for sensitive routes
        const sensitiveRoutes = ['/dashboard', '/settings', '/api/streams', '/api/videos']
        if (sensitiveRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
          await logSecurityIncident(
            'login_attempt',
            'low',
            req,
            userId || undefined,
            {
              route: req.nextUrl.pathname,
              success: true
            }
          )
        }

      } catch (error) {
        // Log authentication failures for security monitoring
        console.error('Authentication failed for protected route:', req.url, error)
        
        await logSecurityIncident(
          'failed_login',
          'high',
          req,
          userId,
          {
            route: req.nextUrl.pathname,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        )
        
        return NextResponse.redirect(new URL('/sign-in', req.url))
      }
    }

    // Create response and apply security processing
    const response = NextResponse.next()
    
    const securityContext = {
      userId: userId || undefined,
      ipAddress,
      userAgent,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    }

    return await securityMiddleware.processResponse(req, response, securityContext)

  } catch (error) {
    console.error('Middleware error:', error)
    
    // Log critical security error
    try {
      await logSecurityIncident(
        'unauthorized_access',
        'critical',
        req,
        undefined,
        {
          error: error instanceof Error ? error.message : 'Unknown middleware error',
          stack: error instanceof Error ? error.stack : undefined
        }
      )
    } catch (logError) {
      console.error('Failed to log security incident:', logError)
    }

    // Fail securely - return error response
    return new NextResponse('Internal Security Error', { status: 500 })
  }
})

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return 'unknown'
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
