// Authentication and authorization middleware utilities

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import type {
  UserRole,
  SubscriptionTier,
  RouteProtectionConfig,
  StreamVaultUser,
} from '@/types/auth'
import { hasRole, hasSubscriptionTier, hasPermission } from './permissions'
import { isSubscriptionActive } from './subscription'

/**
 * Middleware for protecting API routes
 */
export async function withAuth(
  request: NextRequest,
  config: RouteProtectionConfig = { requireAuth: true }
) {
  try {
    const { userId, sessionClaims } = await auth()

    // Check if authentication is required
    if (config.requireAuth && !userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // If no auth required and no user, allow access
    if (!config.requireAuth && !userId) {
      return NextResponse.next()
    }

    // If we have a user, check permissions
    if (userId && sessionClaims) {
      const user = await getUserFromClaims(userId, sessionClaims)
      const accessResult = checkRouteAccess(user, config)

      if (!accessResult.granted) {
        return NextResponse.json(
          {
            error: accessResult.reason,
            requiredRole: config.requiredRole,
            requiredSubscription: config.requiredSubscription,
          },
          { status: 403 }
        )
      }

      // Add user to request headers for downstream use
      const response = NextResponse.next()
      response.headers.set('x-user-id', userId)
      response.headers.set('x-user-role', user.role)
      if (user.subscriptionTier) {
        response.headers.set('x-user-subscription', user.subscriptionTier)
      }

      return response
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Role-based route protection
 */
export function requireRole(role: UserRole) {
  return (config: Partial<RouteProtectionConfig> = {}) => ({
    requireAuth: true,
    requiredRole: role,
    ...config,
  })
}

/**
 * Subscription-based route protection
 */
export function requireSubscription(tier: SubscriptionTier) {
  return (config: Partial<RouteProtectionConfig> = {}) => ({
    requireAuth: true,
    requiredSubscription: tier,
    ...config,
  })
}

/**
 * Admin-only route protection
 */
export function requireAdmin(config: Partial<RouteProtectionConfig> = {}) {
  return requireRole('admin')(config)
}

/**
 * Streamer-only route protection
 */
export function requireStreamer(config: Partial<RouteProtectionConfig> = {}) {
  return requireRole('streamer')(config)
}

/**
 * Premium subscription route protection
 */
export function requirePremium(config: Partial<RouteProtectionConfig> = {}) {
  return requireSubscription('premium')(config)
}

/**
 * Pro subscription route protection
 */
export function requirePro(config: Partial<RouteProtectionConfig> = {}) {
  return requireSubscription('pro')(config)
}

/**
 * Check if user has access to a route
 */
function checkRouteAccess(
  user: StreamVaultUser,
  config: RouteProtectionConfig
): { granted: boolean; reason: string } {
  // Check role requirement
  if (config.requiredRole && !hasRole(user.role, config.requiredRole)) {
    return {
      granted: false,
      reason: `Requires ${config.requiredRole} role or higher`,
    }
  }

  // Check subscription requirement
  if (config.requiredSubscription) {
    if (!isSubscriptionActive(user.subscriptionStatus)) {
      return {
        granted: false,
        reason: 'Requires active subscription',
      }
    }

    if (
      !hasSubscriptionTier(user.subscriptionTier, config.requiredSubscription)
    ) {
      return {
        granted: false,
        reason: `Requires ${config.requiredSubscription} subscription or higher`,
      }
    }
  }

  // Check specific permissions
  if (config.permissions) {
    for (const permission of config.permissions) {
      if (
        !hasPermission(
          user,
          permission.resource as any,
          permission.action as any,
          permission.conditions
        )
      ) {
        return {
          granted: false,
          reason: `Missing permission: ${permission.action} ${permission.resource}`,
        }
      }
    }
  }

  return { granted: true, reason: '' }
}

/**
 * Get user from Clerk session claims
 */
async function getUserFromClaims(
  userId: string,
  sessionClaims: any
): Promise<StreamVaultUser> {
  // In a real implementation, you might fetch additional user data from your database
  // For now, we'll use the metadata from Clerk
  const metadata = sessionClaims.metadata || {}

  return {
    id: userId,
    email: sessionClaims.email || '',
    username: sessionClaims.username,
    firstName: sessionClaims.firstName,
    lastName: sessionClaims.lastName,
    imageUrl: sessionClaims.imageUrl || '',
    role: metadata.role || 'viewer',
    subscriptionTier: metadata.subscriptionTier || null,
    subscriptionStatus: metadata.subscriptionStatus || null,
    subscriptionId: metadata.subscriptionId,
    customerId: metadata.customerId,
    preferences: metadata.preferences,
    createdAt: new Date(sessionClaims.iat * 1000),
    updatedAt: new Date(metadata.updatedAt || sessionClaims.iat * 1000),
  }
}

/**
 * API route wrapper for authentication
 */
export function withApiAuth(
  handler: (req: NextRequest, user: StreamVaultUser) => Promise<NextResponse>,
  config: RouteProtectionConfig = { requireAuth: true }
) {
  return async (req: NextRequest) => {
    const authResult = await withAuth(req, config)

    // If auth failed, return the error response
    if (authResult.status !== 200) {
      return authResult
    }

    // Get user from headers set by middleware
    const userId = authResult.headers.get('x-user-id')
    const userRole = authResult.headers.get('x-user-role') as UserRole
    const userSubscription = authResult.headers.get(
      'x-user-subscription'
    ) as SubscriptionTier | null

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Create user object (in real app, fetch from database)
    const user: StreamVaultUser = {
      id: userId,
      email: '', // Would be fetched from database
      username: null,
      firstName: null,
      lastName: null,
      imageUrl: '',
      role: userRole,
      subscriptionTier: userSubscription,
      subscriptionStatus: 'active', // Would be fetched from database
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return handler(req, user)
  }
}

/**
 * Rate limiting by user role
 */
export function getRateLimitByRole(role: UserRole): {
  requests: number
  window: number
} {
  switch (role) {
    case 'admin':
      return { requests: 1000, window: 60 } // 1000 requests per minute
    case 'streamer':
      return { requests: 500, window: 60 } // 500 requests per minute
    case 'viewer':
    default:
      return { requests: 100, window: 60 } // 100 requests per minute
  }
}

/**
 * Rate limiting by subscription tier
 */
export function getRateLimitBySubscription(tier: SubscriptionTier | null): {
  requests: number
  window: number
} {
  switch (tier) {
    case 'pro':
      return { requests: 1000, window: 60 }
    case 'premium':
      return { requests: 500, window: 60 }
    case 'basic':
    default:
      return { requests: 100, window: 60 }
  }
}

/**
 * Check if user can access resource based on ownership
 */
export function canAccessResource(
  user: StreamVaultUser,
  resourceOwnerId: string,
  requireOwnership: boolean = true
): boolean {
  // Admin can access everything
  if (user.role === 'admin') {
    return true
  }

  // If ownership is required, check if user owns the resource
  if (requireOwnership) {
    return user.id === resourceOwnerId
  }

  return true
}

/**
 * Audit log middleware for tracking access
 */
export function withAuditLog(action: string, resource: string) {
  return async (req: NextRequest, user: StreamVaultUser) => {
    // Log the access attempt
    console.log(
      `Audit: User ${user.id} (${user.role}) attempted ${action} on ${resource}`,
      {
        userId: user.id,
        userRole: user.role,
        action,
        resource,
        timestamp: new Date().toISOString(),
        ip:
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          'unknown',
        userAgent: req.headers.get('user-agent'),
      }
    )

    // In a real implementation, you would save this to a database
    // await saveAuditLog({ ... })
  }
}
