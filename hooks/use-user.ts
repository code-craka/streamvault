'use client'

// Custom hook for user management and authentication

import { useUser as useClerkUser } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'
import type { 
  StreamVaultUser, 
  UserMetadata, 
  UserPreferences,
  UserRole, 
  SubscriptionTier,
  AuthContext 
} from '@/types/auth'
import { hasRole, hasSubscriptionTier, hasPermission } from '@/lib/auth/permissions'
import { isSubscriptionActive } from '@/lib/auth/subscription'

/**
 * Enhanced user hook with StreamVault-specific functionality
 */
export function useUser(): AuthContext {
  const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser()
  const [user, setUser] = useState<StreamVaultUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Transform Clerk user to StreamVault user
  useEffect(() => {
    if (isLoaded) {
      if (clerkUser) {
        const streamVaultUser = transformClerkUser(clerkUser)
        setUser(streamVaultUser)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    }
  }, [clerkUser, isLoaded])

  // Check if user has specific role
  const hasUserRole = useCallback((role: UserRole): boolean => {
    if (!user) return false
    return hasRole(user.role, role)
  }, [user])

  // Check if user has subscription tier
  const hasUserSubscription = useCallback((tier: SubscriptionTier): boolean => {
    if (!user) return false
    return hasSubscriptionTier(user.subscriptionTier, tier)
  }, [user])

  // Check if user has permission
  const hasUserPermission = useCallback((
    resource: string, 
    action: string, 
    conditions?: Record<string, any>
  ): boolean => {
    if (!user) return false
    return hasPermission(user, resource as any, action as any, conditions)
  }, [user])

  // Update user metadata
  const updateUserMetadata = useCallback(async (metadata: Partial<UserMetadata>) => {
    if (!clerkUser) throw new Error('No user signed in')

    try {
      const updatedMetadata = {
        ...clerkUser.unsafeMetadata,
        ...metadata,
        updatedAt: new Date().toISOString(),
      }

      await clerkUser.update({
        unsafeMetadata: updatedMetadata,
      })

      // Update local state
      if (user) {
        setUser(prev => prev ? {
          ...prev,
          ...metadata,
          createdAt: prev.createdAt, // Ensure createdAt stays as Date
          updatedAt: new Date(),
        } : null)
      }
    } catch (error) {
      console.error('Failed to update user metadata:', error)
      throw error
    }
  }, [clerkUser, user])

  // Sign out user
  const signOut = useCallback(async () => {
    if (!clerkUser) return
    
    try {
      // Use the signOut from useClerkUser hook instead
      window.location.href = '/sign-in'
      setUser(null)
    } catch (error) {
      console.error('Failed to sign out:', error)
      throw error
    }
  }, [clerkUser])

  return {
    user,
    isLoading,
    isSignedIn: !!user,
    hasRole: hasUserRole,
    hasSubscription: hasUserSubscription,
    hasPermission: hasUserPermission,
    updateUserMetadata,
    signOut,
  }
}

/**
 * Hook for checking specific role access
 */
export function useRoleAccess(requiredRole: UserRole) {
  const { user, isLoading } = useUser()
  
  const hasAccess = user ? hasRole(user.role, requiredRole) : false
  
  return {
    hasAccess,
    isLoading,
    user,
    currentRole: user?.role,
    requiredRole,
  }
}

/**
 * Hook for checking subscription access
 */
export function useSubscriptionAccess(requiredTier: SubscriptionTier) {
  const { user, isLoading } = useUser()
  
  const hasAccess = user ? 
    isSubscriptionActive(user.subscriptionStatus) && 
    hasSubscriptionTier(user.subscriptionTier, requiredTier) : false
  
  return {
    hasAccess,
    isLoading,
    user,
    currentTier: user?.subscriptionTier,
    currentStatus: user?.subscriptionStatus,
    requiredTier,
    isActive: user ? isSubscriptionActive(user.subscriptionStatus) : false,
  }
}

/**
 * Hook for admin-only features
 */
export function useAdminAccess() {
  return useRoleAccess('admin')
}

/**
 * Hook for streamer features
 */
export function useStreamerAccess() {
  return useRoleAccess('streamer')
}

/**
 * Hook for premium features
 */
export function usePremiumAccess() {
  return useSubscriptionAccess('premium')
}

/**
 * Hook for pro features
 */
export function useProAccess() {
  return useSubscriptionAccess('pro')
}

/**
 * Hook for user preferences
 */
export function useUserPreferences() {
  const { user, updateUserMetadata } = useUser()
  
  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    if (!user) throw new Error('No user signed in')
    
    const updatedPreferences: UserPreferences = {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        streamStart: true,
        newFollower: true,
        chatMention: true,
      },
      privacy: {
        showOnlineStatus: true,
        allowDirectMessages: true,
        showViewingHistory: false,
      },
      streaming: {
        defaultQuality: '1080p',
        autoPlay: true,
        chatEnabled: true,
      },
      ...user.preferences,
      ...preferences,
    }
    
    await updateUserMetadata({ preferences: updatedPreferences })
  }, [user, updateUserMetadata])
  
  return {
    preferences: user?.preferences,
    updatePreferences,
    isLoading: !user,
  }
}

/**
 * Hook for user subscription management
 */
export function useUserSubscription() {
  const { user, updateUserMetadata } = useUser()
  
  const updateSubscription = useCallback(async (
    subscriptionTier: SubscriptionTier,
    subscriptionStatus: string,
    subscriptionId?: string,
    customerId?: string
  ) => {
    await updateUserMetadata({
      subscriptionTier,
      subscriptionStatus: subscriptionStatus as any,
      subscriptionId,
      customerId,
    })
  }, [updateUserMetadata])
  
  return {
    tier: user?.subscriptionTier,
    status: user?.subscriptionStatus,
    subscriptionId: user?.subscriptionId,
    customerId: user?.customerId,
    isActive: user ? isSubscriptionActive(user.subscriptionStatus) : false,
    updateSubscription,
    isLoading: !user,
  }
}

/**
 * Hook for checking feature access
 */
export function useFeatureAccess(
  requiredRole?: UserRole,
  requiredSubscription?: SubscriptionTier
) {
  const { user, isLoading } = useUser()
  
  let hasAccess = true
  let reason = ''
  
  if (user) {
    if (requiredRole && !hasRole(user.role, requiredRole)) {
      hasAccess = false
      reason = `Requires ${requiredRole} role or higher`
    }
    
    if (requiredSubscription) {
      if (!isSubscriptionActive(user.subscriptionStatus)) {
        hasAccess = false
        reason = 'Requires active subscription'
      } else if (!hasSubscriptionTier(user.subscriptionTier, requiredSubscription)) {
        hasAccess = false
        reason = `Requires ${requiredSubscription} subscription or higher`
      }
    }
  } else if (requiredRole || requiredSubscription) {
    hasAccess = false
    reason = 'Authentication required'
  }
  
  return {
    hasAccess,
    reason,
    isLoading,
    user,
  }
}

// Transform Clerk user to StreamVault user
function transformClerkUser(clerkUser: any): StreamVaultUser {
  const publicMetadata = clerkUser.publicMetadata || {}
  const unsafeMetadata = clerkUser.unsafeMetadata || {}
  
  return {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    username: clerkUser.username,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    // Role and subscription data should come from publicMetadata (backend controlled)
    role: publicMetadata.role || 'viewer',
    subscriptionTier: publicMetadata.subscriptionTier || null,
    subscriptionStatus: publicMetadata.subscriptionStatus || null,
    subscriptionId: publicMetadata.subscriptionId,
    customerId: publicMetadata.customerId,
    // User preferences come from unsafeMetadata (user controlled)
    preferences: unsafeMetadata.preferences,
    createdAt: new Date(clerkUser.createdAt),
    updatedAt: new Date(unsafeMetadata.updatedAt || clerkUser.updatedAt || clerkUser.createdAt),
  }
}