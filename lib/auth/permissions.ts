// User role validation and permission utilities

import type {
  UserRole,
  SubscriptionTier,
  Permission,
  PermissionResource,
  PermissionAction,
  StreamVaultUser,
} from '@/types/auth'
import { SUBSCRIPTION_TIERS } from '@/types/subscription'

// Import the constants from the types file
const roleHierarchy: Record<UserRole, number> = {
  viewer: 0,
  streamer: 1,
  admin: 2,
}

const subscriptionHierarchy: Record<SubscriptionTier, number> = {
  basic: 0,
  premium: 1,
  pro: 2,
}

const rolePermissions: Record<UserRole, Permission[]> = {
  viewer: [
    { resource: 'stream', action: 'read' },
    { resource: 'video', action: 'read' },
    { resource: 'chat', action: 'create' },
    { resource: 'chat', action: 'read' },
    { resource: 'user', action: 'update', conditions: { self: true } },
  ],
  streamer: [
    { resource: 'stream', action: 'read' },
    { resource: 'stream', action: 'create' },
    { resource: 'stream', action: 'update', conditions: { owner: true } },
    { resource: 'stream', action: 'delete', conditions: { owner: true } },
    { resource: 'video', action: 'read' },
    { resource: 'video', action: 'create' },
    { resource: 'video', action: 'update', conditions: { owner: true } },
    { resource: 'video', action: 'delete', conditions: { owner: true } },
    { resource: 'chat', action: 'create' },
    { resource: 'chat', action: 'read' },
    { resource: 'chat', action: 'moderate', conditions: { ownStream: true } },
    { resource: 'analytics', action: 'read', conditions: { owner: true } },
    { resource: 'user', action: 'update', conditions: { self: true } },
  ],
  admin: [
    { resource: 'stream', action: 'create' },
    { resource: 'stream', action: 'read' },
    { resource: 'stream', action: 'update' },
    { resource: 'stream', action: 'delete' },
    { resource: 'video', action: 'create' },
    { resource: 'video', action: 'read' },
    { resource: 'video', action: 'update' },
    { resource: 'video', action: 'delete' },
    { resource: 'chat', action: 'create' },
    { resource: 'chat', action: 'read' },
    { resource: 'chat', action: 'moderate' },
    { resource: 'user', action: 'create' },
    { resource: 'user', action: 'read' },
    { resource: 'user', action: 'update' },
    { resource: 'user', action: 'delete' },
    { resource: 'subscription', action: 'read' },
    { resource: 'subscription', action: 'update' },
    { resource: 'analytics', action: 'read' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
  ],
}

/**
 * Check if a user has a specific role or higher
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = roleHierarchy[userRole]
  const requiredLevel = roleHierarchy[requiredRole]
  return userLevel >= requiredLevel
}

/**
 * Check if a user has a specific subscription tier or higher
 */
export function hasSubscriptionTier(
  userTier: SubscriptionTier | null,
  requiredTier: SubscriptionTier
): boolean {
  if (!userTier) return requiredTier === 'basic'

  const userLevel = subscriptionHierarchy[userTier]
  const requiredLevel = subscriptionHierarchy[requiredTier]
  return userLevel >= requiredLevel
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  user: StreamVaultUser,
  resource: PermissionResource,
  action: PermissionAction,
  conditions?: Record<string, any>
): boolean {
  // Admin users have all permissions
  if (user.role === 'admin') {
    return true
  }

  // Get permissions for user's role
  const userPermissions = rolePermissions[user.role]

  // Find matching permission
  const permission = userPermissions.find(
    p => p.resource === resource && p.action === action
  )

  if (!permission) {
    return false
  }

  // Check conditions if they exist
  if (permission.conditions && conditions) {
    return checkPermissionConditions(permission.conditions, conditions, user)
  }

  return true
}

/**
 * Check permission conditions
 */
function checkPermissionConditions(
  permissionConditions: Record<string, any>,
  providedConditions: Record<string, any>,
  user: StreamVaultUser
): boolean {
  for (const [key, value] of Object.entries(permissionConditions)) {
    switch (key) {
      case 'self':
        if (value && providedConditions.userId !== user.id) {
          return false
        }
        break
      case 'owner':
        if (value && providedConditions.ownerId !== user.id) {
          return false
        }
        break
      case 'ownStream':
        if (value && providedConditions.streamOwnerId !== user.id) {
          return false
        }
        break
      default:
        // Custom condition check
        if (providedConditions[key] !== value) {
          return false
        }
    }
  }
  return true
}

/**
 * Get all permissions for a user role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role]
}

/**
 * Check if user can access a feature based on subscription
 */
export function canAccessFeature(
  userTier: SubscriptionTier | null,
  feature: keyof typeof SUBSCRIPTION_TIERS.basic.limits
): boolean {
  if (!userTier) {
    userTier = 'basic'
  }

  const limits = SUBSCRIPTION_TIERS[userTier].limits

  // Check specific feature access
  switch (feature) {
    case 'apiAccess':
      return limits.apiAccess
    case 'advancedAnalytics':
      return limits.advancedAnalytics
    case 'whiteLabel':
      return limits.whiteLabel
    case 'customDomain':
      return limits.customDomain
    case 'prioritySupport':
      return limits.prioritySupport
    case 'exportData':
      return limits.exportData
    default:
      return true
  }
}

/**
 * Get usage limit for a specific feature
 */
export function getUsageLimit(
  userTier: SubscriptionTier | null,
  feature: keyof typeof SUBSCRIPTION_TIERS.basic.limits
): number {
  if (!userTier) {
    userTier = 'basic'
  }

  const limits = SUBSCRIPTION_TIERS[userTier].limits
  return limits[feature] as number
}

/**
 * Check if user has reached usage limit
 */
export function hasReachedLimit(
  userTier: SubscriptionTier | null,
  feature: keyof typeof SUBSCRIPTION_TIERS.basic.limits,
  currentUsage: number
): boolean {
  const limit = getUsageLimit(userTier, feature)

  // -1 means unlimited
  if (limit === -1) {
    return false
  }

  return currentUsage >= limit
}

/**
 * Validate user role
 */
export function isValidRole(role: string): role is UserRole {
  return ['viewer', 'streamer', 'admin'].includes(role)
}

/**
 * Validate subscription tier
 */
export function isValidSubscriptionTier(
  tier: string
): tier is SubscriptionTier {
  return ['basic', 'premium', 'pro'].includes(tier)
}

/**
 * Get the next higher role
 */
export function getNextRole(currentRole: UserRole): UserRole | null {
  switch (currentRole) {
    case 'viewer':
      return 'streamer'
    case 'streamer':
      return 'admin'
    case 'admin':
      return null
  }
}

/**
 * Get the next higher subscription tier
 */
export function getNextSubscriptionTier(
  currentTier: SubscriptionTier
): SubscriptionTier | null {
  switch (currentTier) {
    case 'basic':
      return 'premium'
    case 'premium':
      return 'pro'
    case 'pro':
      return null
  }
}

/**
 * Check if user can perform bulk operations
 */
export function canPerformBulkOperations(user: StreamVaultUser): boolean {
  return (
    hasRole(user.role, 'admin') ||
    (user.role === 'streamer' &&
      hasSubscriptionTier(user.subscriptionTier, 'premium'))
  )
}

/**
 * Get maximum concurrent streams allowed
 */
export function getMaxConcurrentStreams(
  userTier: SubscriptionTier | null
): number {
  return getUsageLimit(userTier, 'concurrentStreams')
}

/**
 * Get maximum stream duration allowed (in minutes)
 */
export function getMaxStreamDuration(
  userTier: SubscriptionTier | null
): number {
  return getUsageLimit(userTier, 'maxStreamDuration')
}

/**
 * Check if user can create custom emotes
 */
export function canCreateCustomEmotes(
  userTier: SubscriptionTier | null
): boolean {
  const limit = getUsageLimit(userTier, 'customEmotes')
  return limit > 0 || limit === -1
}

/**
 * Get remaining custom emote slots
 */
export function getRemainingEmoteSlots(
  userTier: SubscriptionTier | null,
  currentEmotes: number
): number {
  const limit = getUsageLimit(userTier, 'customEmotes')

  if (limit === -1) {
    return -1 // unlimited
  }

  return Math.max(0, limit - currentEmotes)
}

/**
 * Check if user can access offline downloads
 */
export function canAccessOfflineDownloads(
  userTier: SubscriptionTier | null
): boolean {
  const limit = getUsageLimit(userTier, 'offlineDownloads')
  return limit > 0 || limit === -1
}

/**
 * Get quality levels available to user
 */
export function getAvailableQualityLevels(
  userTier: SubscriptionTier | null
): string[] {
  if (!userTier) {
    userTier = 'basic'
  }

  const maxQuality = SUBSCRIPTION_TIERS[userTier].limits.maxQuality

  const allQualities = ['480p', '720p', '1080p', '4K']
  const qualityIndex = allQualities.indexOf(maxQuality)

  return allQualities.slice(0, qualityIndex + 1)
}

/**
 * Check if user can moderate chat
 */
export function canModerateChat(
  user: StreamVaultUser,
  streamOwnerId: string
): boolean {
  return hasPermission(user, 'chat', 'moderate', { streamOwnerId })
}

/**
 * Check if user owns a resource
 */
export function ownsResource(userId: string, resourceOwnerId: string): boolean {
  return userId === resourceOwnerId
}

/**
 * Format user role for display
 */
export function formatUserRole(role: UserRole): string {
  switch (role) {
    case 'viewer':
      return 'Viewer'
    case 'streamer':
      return 'Streamer'
    case 'admin':
      return 'Administrator'
    default:
      return 'Unknown'
  }
}

/**
 * Format subscription tier for display
 */
export function formatSubscriptionTier(tier: SubscriptionTier | null): string {
  if (!tier) return 'Free'

  switch (tier) {
    case 'basic':
      return 'Basic'
    case 'premium':
      return 'Premium'
    case 'pro':
      return 'Pro'
    default:
      return 'Unknown'
  }
}

/**
 * Get user's subscription tier from user object
 */
export function getUserSubscriptionTier(
  user: StreamVaultUser
): SubscriptionTier | null {
  return user.subscriptionTier
}

/**
 * Check if user is an active subscriber
 */
export function isActiveSubscriber(user: StreamVaultUser): boolean {
  return user.subscriptionTier !== null && user.subscriptionTier !== 'basic'
}

/**
 * Check if user can access premium features
 */
export function canAccessPremiumFeatures(user: StreamVaultUser): boolean {
  return hasSubscriptionTier(user.subscriptionTier, 'premium')
}

/**
 * Check if user can access pro features
 */
export function canAccessProFeatures(user: StreamVaultUser): boolean {
  return hasSubscriptionTier(user.subscriptionTier, 'pro')
}

/**
 * Get user's effective permissions (combining role and subscription)
 */
export function getEffectivePermissions(user: StreamVaultUser): Permission[] {
  const basePermissions = getRolePermissions(user.role)

  // Add subscription-based permissions
  const subscriptionPermissions: Permission[] = []

  if (canAccessFeature(user.subscriptionTier, 'apiAccess')) {
    subscriptionPermissions.push({ resource: 'api', action: 'read' })
  }

  if (canAccessFeature(user.subscriptionTier, 'advancedAnalytics')) {
    subscriptionPermissions.push({
      resource: 'analytics',
      action: 'read',
      conditions: { advanced: true },
    })
  }

  return [...basePermissions, ...subscriptionPermissions]
}

/**
 * Check user role (alias for hasRole for backward compatibility)
 */
export function checkUserRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return hasRole(userRole, requiredRole)
}
