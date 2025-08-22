import type { User } from '@clerk/nextjs/server'
import { UserRole, SubscriptionTier, ROLE_PERMISSIONS, RolePermissions } from '@/types/auth'

/**
 * Check if user has required role or higher
 */
export function checkUserRole(user: any, requiredRole: UserRole): boolean {
  const userRole = (user.publicMetadata?.role as UserRole) || 'viewer'
  const roleHierarchy: Record<UserRole, number> = { 
    viewer: 0, 
    streamer: 1, 
    admin: 2 
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Check if user has required subscription tier or higher
 */
export function checkSubscriptionAccess(
  user: any, 
  requiredTier: SubscriptionTier
): boolean {
  const userTier = user.publicMetadata?.subscriptionTier as SubscriptionTier
  if (!userTier) return requiredTier === 'basic'
  
  const tierHierarchy: Record<SubscriptionTier, number> = { 
    basic: 0, 
    premium: 1, 
    pro: 2 
  }
  
  return tierHierarchy[userTier] >= tierHierarchy[requiredTier]
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(user: any): RolePermissions {
  const userRole = (user.publicMetadata?.role as UserRole) || 'viewer'
  return ROLE_PERMISSIONS[userRole]
}

/**
 * Check if user can perform specific action
 */
export function canPerformAction(
  user: any, 
  action: keyof RolePermissions
): boolean {
  const permissions = getUserPermissions(user)
  const value = permissions[action]
  
  // Handle boolean permissions
  if (typeof value === 'boolean') {
    return value
  }
  
  // Handle numeric permissions (for limits)
  if (typeof value === 'number') {
    return value > 0 || value === -1 // -1 means unlimited
  }
  
  return false
}

/**
 * Check if user is active subscriber
 */
export function isActiveSubscriber(user: any): boolean {
  const subscriptionStatus = user.publicMetadata?.subscriptionStatus as string
  return subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
}

/**
 * Get user's subscription tier with fallback
 */
export function getUserSubscriptionTier(user: any): SubscriptionTier {
  return (user.publicMetadata?.subscriptionTier as SubscriptionTier) || 'basic'
}

/**
 * Check if user can access premium features
 */
export function canAccessPremiumFeatures(user: any): boolean {
  const tier = getUserSubscriptionTier(user)
  return tier === 'premium' || tier === 'pro'
}

/**
 * Check if user can access pro features
 */
export function canAccessProFeatures(user: any): boolean {
  const tier = getUserSubscriptionTier(user)
  return tier === 'pro'
}

/**
 * Validate user session and permissions
 */
export function validateUserSession(user: any | null): {
  isValid: boolean
  user: any | null
  error?: string
} {
  if (!user) {
    return {
      isValid: false,
      user: null,
      error: 'User not authenticated'
    }
  }

  // Check if user account is active
  if (user.banned) {
    return {
      isValid: false,
      user: null,
      error: 'User account is banned'
    }
  }

  return {
    isValid: true,
    user
  }
}

/**
 * Get user display name with fallback
 */
export function getUserDisplayName(user: any): string {
  return user.firstName || user.username || user.emailAddresses[0]?.emailAddress || 'Anonymous User'
}

/**
 * Check if user has completed onboarding
 */
export function hasCompletedOnboarding(user: any): boolean {
  return user.publicMetadata?.onboardingCompleted === true
}

/**
 * Format user role for display
 */
export function formatUserRole(role: UserRole): string {
  const roleLabels: Record<UserRole, string> = {
    viewer: 'Viewer',
    streamer: 'Content Creator',
    admin: 'Administrator'
  }
  
  return roleLabels[role] || 'Viewer'
}

/**
 * Format subscription tier for display
 */
export function formatSubscriptionTier(tier: SubscriptionTier | null): string {
  if (!tier) return 'Free'
  
  const tierLabels: Record<SubscriptionTier, string> = {
    basic: 'Basic',
    premium: 'Premium',
    pro: 'Pro'
  }
  
  return tierLabels[tier] || 'Free'
}