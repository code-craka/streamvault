'use client'

// Protected route component for role and subscription-based access control

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { 
  UserRole, 
  SubscriptionTier, 
  RouteProtectionConfig,
  StreamVaultUser 
} from '@/types/auth'
import { hasRole, hasSubscriptionTier, hasPermission } from '@/lib/auth/permissions'
import { isSubscriptionActive } from '@/lib/auth/subscription'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AccessDenied } from '@/components/auth/access-denied'

interface ProtectedRouteProps {
  children: React.ReactNode
  config: RouteProtectionConfig
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  config, 
  fallback 
}: ProtectedRouteProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    if (!isLoaded) return

    // Check if authentication is required
    if (config.requireAuth && !user) {
      const redirectUrl = config.redirectTo || '/sign-in'
      router.push(redirectUrl)
      return
    }

    // If no auth required and no user, allow access
    if (!config.requireAuth && !user) {
      setAccessGranted(true)
      return
    }

    // If we have a user, check permissions
    if (user) {
      const streamVaultUser = transformClerkUser(user)
      const hasAccess = checkAccess(streamVaultUser, config)
      
      if (hasAccess.granted) {
        setAccessGranted(true)
      } else {
        setAccessGranted(false)
        setErrorMessage(hasAccess.reason)
      }
    }
  }, [isLoaded, user, config, router])

  // Show loading while checking access
  if (!isLoaded || accessGranted === null) {
    return fallback || <LoadingSpinner />
  }

  // Show access denied if no access
  if (!accessGranted) {
    return (
      <AccessDenied 
        message={errorMessage}
        requiredRole={config.requiredRole}
        requiredSubscription={config.requiredSubscription}
      />
    )
  }

  // Render children if access granted
  return <>{children}</>
}

// Transform Clerk user to StreamVault user
function transformClerkUser(clerkUser: any): StreamVaultUser {
  const metadata = clerkUser.publicMetadata || {}
  
  return {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    username: clerkUser.username,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    role: metadata.role || 'viewer',
    subscriptionTier: metadata.subscriptionTier || null,
    subscriptionStatus: metadata.subscriptionStatus || null,
    subscriptionId: metadata.subscriptionId,
    customerId: metadata.customerId,
    preferences: metadata.preferences,
    createdAt: new Date(clerkUser.createdAt),
    updatedAt: new Date(clerkUser.updatedAt),
  }
}

// Check if user has access based on configuration
function checkAccess(
  user: StreamVaultUser, 
  config: RouteProtectionConfig
): { granted: boolean; reason: string } {
  // Check role requirement
  if (config.requiredRole && !hasRole(user.role, config.requiredRole)) {
    return {
      granted: false,
      reason: `This page requires ${config.requiredRole} role or higher. Your current role is ${user.role}.`
    }
  }

  // Check subscription requirement
  if (config.requiredSubscription) {
    if (!isSubscriptionActive(user.subscriptionStatus)) {
      return {
        granted: false,
        reason: 'This page requires an active subscription. Please upgrade your account.'
      }
    }
    
    if (!hasSubscriptionTier(user.subscriptionTier, config.requiredSubscription)) {
      return {
        granted: false,
        reason: `This page requires ${config.requiredSubscription} subscription or higher. Your current subscription is ${user.subscriptionTier || 'none'}.`
      }
    }
  }

  // Check specific permissions
  if (config.permissions) {
    for (const permission of config.permissions) {
      if (!hasPermission(user, permission.resource as any, permission.action as any, permission.conditions)) {
        return {
          granted: false,
          reason: `You don't have permission to ${permission.action} ${permission.resource}.`
        }
      }
    }
  }

  return { granted: true, reason: '' }
}

// Higher-order component for protecting pages
export function withProtection<P extends object>(
  Component: React.ComponentType<P>,
  config: RouteProtectionConfig
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute config={config}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Hook for checking access in components
export function useAccess(config: RouteProtectionConfig) {
  const { user, isLoaded } = useUser()
  const [hasAccess, setHasAccess] = useState<boolean>(false)
  const [isChecking, setIsChecking] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    if (!isLoaded) return

    setIsChecking(true)

    if (config.requireAuth && !user) {
      setHasAccess(false)
      setErrorMessage('Authentication required')
      setIsChecking(false)
      return
    }

    if (!config.requireAuth && !user) {
      setHasAccess(true)
      setIsChecking(false)
      return
    }

    if (user) {
      const streamVaultUser = transformClerkUser(user)
      const accessResult = checkAccess(streamVaultUser, config)
      
      setHasAccess(accessResult.granted)
      setErrorMessage(accessResult.reason)
    }

    setIsChecking(false)
  }, [isLoaded, user, config])

  return {
    hasAccess,
    isChecking,
    errorMessage,
    user: user ? transformClerkUser(user) : null
  }
}