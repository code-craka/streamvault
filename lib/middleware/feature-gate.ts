// Feature gating middleware for API routes and components

import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import type { SubscriptionTier, StreamVaultUser } from '@/types/auth'
import type { FeatureAccess } from '@/types/subscription'
import {
  validateFeatureAccess,
  validateUsageLimit,
  canAccessAPI,
  canAccessAdvancedAnalytics,
  canUseWhiteLabel,
  canStreamAtQuality,
  canCreateCustomEmote,
  canDownloadVideo,
} from '@/lib/auth/subscription-validation'

/**
 * Feature gate decorator for API routes
 */
export function withFeatureGate(
  requiredTier: SubscriptionTier,
  feature?: string
) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      try {
        const { userId } = await auth()

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await (await clerkClient()).users.getUser(userId)
        const streamVaultUser: StreamVaultUser = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          username: user.username || '',
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          avatar: user.imageUrl || undefined,
          role: (user.publicMetadata.role as any) || 'viewer',
          subscriptionTier:
            (user.publicMetadata.subscriptionTier as SubscriptionTier) || null,
          subscriptionStatus:
            (user.publicMetadata.subscriptionStatus as any) || null,
          subscriptionId:
            (user.publicMetadata.subscriptionId as string) || undefined,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastSignInAt || user.createdAt,
        }

        const access = validateFeatureAccess(
          streamVaultUser,
          requiredTier,
          feature
        )

        if (!access.hasAccess) {
          return NextResponse.json(
            {
              error: 'Feature access denied',
              reason: access.reason,
              upgradeRequired: access.upgradeRequired,
              trialAvailable: access.trialAvailable,
            },
            { status: 403 }
          )
        }

        // Add user to request context
        ;(request as any).user = streamVaultUser

        return handler(request, ...args)
      } catch (error) {
        console.error('Feature gate error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Usage limit gate for API routes
 */
export function withUsageGate(
  feature: keyof import('@/types/subscription').SubscriptionLimits,
  getCurrentUsage: (user: StreamVaultUser) => Promise<number>
) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      try {
        const { userId } = await auth()

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await (await clerkClient()).users.getUser(userId)
        const streamVaultUser: StreamVaultUser = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          username: user.username || '',
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          avatar: user.imageUrl || undefined,
          role: (user.publicMetadata.role as any) || 'viewer',
          subscriptionTier:
            (user.publicMetadata.subscriptionTier as SubscriptionTier) || null,
          subscriptionStatus:
            (user.publicMetadata.subscriptionStatus as any) || null,
          subscriptionId:
            (user.publicMetadata.subscriptionId as string) || undefined,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastSignInAt || user.createdAt,
        }

        const currentUsage = await getCurrentUsage(streamVaultUser)
        const access = validateUsageLimit(
          streamVaultUser,
          feature,
          currentUsage
        )

        if (!access.hasAccess) {
          return NextResponse.json(
            {
              error: 'Usage limit exceeded',
              reason: access.reason,
              upgradeRequired: access.upgradeRequired,
              usageRemaining: access.usageRemaining,
              resetDate: access.resetDate,
            },
            { status: 429 }
          )
        }

        // Add user and usage info to request context
        ;(request as any).user = streamVaultUser
        ;(request as any).currentUsage = currentUsage
        ;(request as any).usageRemaining = access.usageRemaining

        return handler(request, ...args)
      } catch (error) {
        console.error('Usage gate error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Combined feature and usage gate
 */
export function withFeatureAndUsageGate(
  requiredTier: SubscriptionTier,
  feature: keyof import('@/types/subscription').SubscriptionLimits,
  getCurrentUsage: (user: StreamVaultUser) => Promise<number>,
  featureName?: string
) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      // First check feature access
      const featureGate = withFeatureGate(requiredTier, featureName)
      const featureGatedHandler = featureGate(
        async (req: NextRequest, ...handlerArgs: any[]) => {
          // Then check usage limits
          const usageGate = withUsageGate(feature, getCurrentUsage)
          const usageGatedHandler = usageGate(handler)
          return usageGatedHandler(req, ...handlerArgs)
        }
      )

      return featureGatedHandler(request, ...args)
    }
  }
}

/**
 * Specific feature gates for common use cases
 */

// API access gate
export const withAPIAccess = () => withFeatureGate('pro', 'API access')

// Advanced analytics gate
export const withAdvancedAnalytics = () =>
  withFeatureGate('premium', 'Advanced analytics')

// White-label features gate
export const withWhiteLabelAccess = () =>
  withFeatureGate('pro', 'White-label features')

// Video quality gate
export function withVideoQualityGate(quality: string) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      try {
        const { userId } = await auth()

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await (await clerkClient()).users.getUser(userId)
        const streamVaultUser: StreamVaultUser = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          username: user.username || '',
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          avatar: user.imageUrl || undefined,
          role: (user.publicMetadata.role as any) || 'viewer',
          subscriptionTier:
            (user.publicMetadata.subscriptionTier as SubscriptionTier) || null,
          subscriptionStatus:
            (user.publicMetadata.subscriptionStatus as any) || null,
          subscriptionId:
            (user.publicMetadata.subscriptionId as string) || undefined,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastSignInAt || user.createdAt,
        }

        const access = canStreamAtQuality(streamVaultUser, quality)

        if (!access.hasAccess) {
          return NextResponse.json(
            {
              error: 'Video quality not available',
              reason: access.reason,
              upgradeRequired: access.upgradeRequired,
            },
            { status: 403 }
          )
        }

        ;(request as any).user = streamVaultUser

        return handler(request, ...args)
      } catch (error) {
        console.error('Video quality gate error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

// Custom emote creation gate
export function withCustomEmoteGate(
  getCurrentEmoteCount: (user: StreamVaultUser) => Promise<number>
) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      try {
        const { userId } = await auth()

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await (await clerkClient()).users.getUser(userId)
        const streamVaultUser: StreamVaultUser = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          username: user.username || '',
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          avatar: user.imageUrl || undefined,
          role: (user.publicMetadata.role as any) || 'viewer',
          subscriptionTier:
            (user.publicMetadata.subscriptionTier as SubscriptionTier) || null,
          subscriptionStatus:
            (user.publicMetadata.subscriptionStatus as any) || null,
          subscriptionId:
            (user.publicMetadata.subscriptionId as string) || undefined,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastSignInAt || user.createdAt,
        }

        const currentEmotes = await getCurrentEmoteCount(streamVaultUser)
        const access = canCreateCustomEmote(streamVaultUser, currentEmotes)

        if (!access.hasAccess) {
          return NextResponse.json(
            {
              error: 'Custom emote limit reached',
              reason: access.reason,
              upgradeRequired: access.upgradeRequired,
              usageRemaining: access.usageRemaining,
            },
            { status: 429 }
          )
        }

        ;(request as any).user = streamVaultUser
        ;(request as any).currentEmotes = currentEmotes
        ;(request as any).emotesRemaining = access.usageRemaining

        return handler(request, ...args)
      } catch (error) {
        console.error('Custom emote gate error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

// Download gate
export function withDownloadGate(
  getCurrentDownloads: (user: StreamVaultUser) => Promise<number>
) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      try {
        const { userId } = await auth()

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await (await clerkClient()).users.getUser(userId)
        const streamVaultUser: StreamVaultUser = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          username: user.username || '',
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          avatar: user.imageUrl || undefined,
          role: (user.publicMetadata.role as any) || 'viewer',
          subscriptionTier:
            (user.publicMetadata.subscriptionTier as SubscriptionTier) || null,
          subscriptionStatus:
            (user.publicMetadata.subscriptionStatus as any) || null,
          subscriptionId:
            (user.publicMetadata.subscriptionId as string) || undefined,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastSignInAt || user.createdAt,
        }

        const currentDownloads = await getCurrentDownloads(streamVaultUser)
        const access = canDownloadVideo(streamVaultUser, currentDownloads)

        if (!access.hasAccess) {
          return NextResponse.json(
            {
              error: 'Download limit reached',
              reason: access.reason,
              upgradeRequired: access.upgradeRequired,
              usageRemaining: access.usageRemaining,
            },
            { status: 429 }
          )
        }

        ;(request as any).user = streamVaultUser
        ;(request as any).currentDownloads = currentDownloads
        ;(request as any).downloadsRemaining = access.usageRemaining

        return handler(request, ...args)
      } catch (error) {
        console.error('Download gate error:', error)
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Helper function to get user from request (after middleware)
 */
export function getUserFromRequest(
  request: NextRequest
): StreamVaultUser | null {
  return (request as any).user || null
}

/**
 * Helper function to check feature access in components
 */
export async function checkFeatureAccess(
  userId: string,
  requiredTier: SubscriptionTier,
  feature?: string
): Promise<FeatureAccess> {
  try {
    const user = await (await clerkClient()).users.getUser(userId)
    const streamVaultUser: StreamVaultUser = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      username: user.username || '',
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.imageUrl || undefined,
      role: (user.publicMetadata.role as any) || 'viewer',
      subscriptionTier:
        (user.publicMetadata.subscriptionTier as SubscriptionTier) || null,
      subscriptionStatus:
        (user.publicMetadata.subscriptionStatus as any) || null,
      subscriptionId:
        (user.publicMetadata.subscriptionId as string) || undefined,
      createdAt: new Date(user.createdAt),
      lastLoginAt: user.lastSignInAt || user.createdAt,
    }

    return validateFeatureAccess(streamVaultUser, requiredTier, feature)
  } catch (error) {
    console.error('Feature access check error:', error)
    return {
      hasAccess: false,
      reason: 'Unable to verify feature access',
    }
  }
}
