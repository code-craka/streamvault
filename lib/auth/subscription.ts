// Subscription tier checking and management utilities

import type { 
  SubscriptionTier, 
  SubscriptionStatus,
  StreamVaultUser 
} from '@/types/auth'
import type { 
  SubscriptionTierConfig, 
  SubscriptionLimits,
  FeatureAccess,
  UsageMetrics 
} from '@/types/subscription'
import { SUBSCRIPTION_TIERS, getSubscriptionTierConfig, hasFeatureAccess } from '@/types/subscription'

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(status: SubscriptionStatus | null): boolean {
  if (!status) return false
  return ['active', 'trialing'].includes(status)
}

/**
 * Check if subscription is in trial period
 */
export function isInTrialPeriod(status: SubscriptionStatus | null): boolean {
  return status === 'trialing'
}

/**
 * Check if subscription is past due
 */
export function isSubscriptionPastDue(status: SubscriptionStatus | null): boolean {
  return status === 'past_due'
}

/**
 * Check if subscription is canceled
 */
export function isSubscriptionCanceled(status: SubscriptionStatus | null): boolean {
  return status === 'canceled'
}

/**
 * Get subscription tier configuration
 */
export function getTierConfig(tier: SubscriptionTier): SubscriptionTierConfig {
  return getSubscriptionTierConfig(tier)
}

/**
 * Get subscription limits for a tier
 */
export function getTierLimits(tier: SubscriptionTier | null): SubscriptionLimits {
  if (!tier) {
    return SUBSCRIPTION_TIERS.basic.limits
  }
  return SUBSCRIPTION_TIERS[tier].limits
}

/**
 * Check if user can upgrade to a specific tier
 */
export function canUpgradeTo(
  currentTier: SubscriptionTier | null,
  targetTier: SubscriptionTier
): boolean {
  if (!currentTier) {
    return true // Can always upgrade from no subscription
  }
  
  const currentLevel = getSubscriptionLevel(currentTier)
  const targetLevel = getSubscriptionLevel(targetTier)
  
  return targetLevel > currentLevel
}

/**
 * Check if user can downgrade to a specific tier
 */
export function canDowngradeTo(
  currentTier: SubscriptionTier | null,
  targetTier: SubscriptionTier
): boolean {
  if (!currentTier) {
    return false // Can't downgrade from no subscription
  }
  
  const currentLevel = getSubscriptionLevel(currentTier)
  const targetLevel = getSubscriptionLevel(targetTier)
  
  return targetLevel < currentLevel
}

/**
 * Get numeric level for subscription tier
 */
function getSubscriptionLevel(tier: SubscriptionTier): number {
  const levels = { basic: 1, premium: 2, pro: 3 }
  return levels[tier]
}

/**
 * Get next upgrade tier
 */
export function getNextUpgradeTier(currentTier: SubscriptionTier | null): SubscriptionTier | null {
  if (!currentTier) return 'basic'
  
  switch (currentTier) {
    case 'basic':
      return 'premium'
    case 'premium':
      return 'pro'
    case 'pro':
      return null // Already at highest tier
  }
}

/**
 * Get previous downgrade tier
 */
export function getPreviousDowngradeTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  switch (currentTier) {
    case 'basic':
      return null // Can't downgrade from basic
    case 'premium':
      return 'basic'
    case 'pro':
      return 'premium'
  }
}

/**
 * Check feature access with detailed response
 */
export function checkFeatureAccess(
  userTier: SubscriptionTier | null,
  requiredTier: SubscriptionTier,
  currentUsage?: number,
  featureName?: keyof SubscriptionLimits
): FeatureAccess {
  const hasAccess = hasFeatureAccess(userTier, requiredTier)
  
  if (hasAccess) {
    // Check usage limits if provided
    if (featureName && currentUsage !== undefined) {
      const limits = getTierLimits(userTier)
      const limit = limits[featureName] as number
      
      if (limit !== -1 && currentUsage >= limit) {
        return {
          hasAccess: false,
          reason: `Usage limit reached (${currentUsage}/${limit})`,
          upgradeRequired: getNextUpgradeTier(userTier) || undefined,
          usageRemaining: 0
        }
      }
      
      return {
        hasAccess: true,
        usageRemaining: limit === -1 ? -1 : limit - currentUsage
      }
    }
    
    return { hasAccess: true }
  }
  
  return {
    hasAccess: false,
    reason: `Requires ${requiredTier} subscription or higher`,
    upgradeRequired: requiredTier,
    trialAvailable: !userTier // Trial available if no current subscription
  }
}

/**
 * Calculate subscription upgrade cost
 */
export function calculateUpgradeCost(
  fromTier: SubscriptionTier | null,
  toTier: SubscriptionTier,
  daysRemaining: number = 0
): number {
  const fromPrice = fromTier ? SUBSCRIPTION_TIERS[fromTier].price : 0
  const toPrice = SUBSCRIPTION_TIERS[toTier].price
  
  if (daysRemaining > 0) {
    // Proration calculation
    const dailyFromPrice = fromPrice / 30
    const dailyToPrice = toPrice / 30
    const proratedCredit = dailyFromPrice * daysRemaining
    const proratedCharge = dailyToPrice * daysRemaining
    
    return Math.max(0, proratedCharge - proratedCredit)
  }
  
  return toPrice - fromPrice
}

/**
 * Get subscription tier from Stripe price ID
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.priceId === priceId) {
      return tier as SubscriptionTier
    }
  }
  return null
}

/**
 * Get Stripe price ID from subscription tier
 */
export function getPriceIdFromTier(tier: SubscriptionTier): string {
  return SUBSCRIPTION_TIERS[tier].priceId
}

/**
 * Check if user has exceeded usage limits
 */
export function checkUsageLimits(
  userTier: SubscriptionTier | null,
  usage: Partial<UsageMetrics['metrics']>
): Record<string, boolean> {
  const limits = getTierLimits(userTier)
  const exceeded: Record<string, boolean> = {}
  
  if (usage.storageUsed !== undefined) {
    exceeded.storage = limits.storageQuota !== -1 && usage.storageUsed > limits.storageQuota
  }
  
  if (usage.bandwidthUsed !== undefined) {
    exceeded.bandwidth = limits.bandwidthQuota !== -1 && usage.bandwidthUsed > limits.bandwidthQuota
  }
  
  if (usage.apiCalls !== undefined) {
    exceeded.apiCalls = limits.apiRateLimit !== -1 && usage.apiCalls > limits.apiRateLimit * 60 * 24 * 30 // Monthly limit
  }
  
  return exceeded
}

/**
 * Get usage warnings (when approaching limits)
 */
export function getUsageWarnings(
  userTier: SubscriptionTier | null,
  usage: Partial<UsageMetrics['metrics']>,
  warningThreshold: number = 0.8
): Record<string, { current: number; limit: number; percentage: number }> {
  const limits = getTierLimits(userTier)
  const warnings: Record<string, { current: number; limit: number; percentage: number }> = {}
  
  if (usage.storageUsed !== undefined && limits.storageQuota !== -1) {
    const percentage = usage.storageUsed / limits.storageQuota
    if (percentage >= warningThreshold) {
      warnings.storage = {
        current: usage.storageUsed,
        limit: limits.storageQuota,
        percentage
      }
    }
  }
  
  if (usage.bandwidthUsed !== undefined && limits.bandwidthQuota !== -1) {
    const percentage = usage.bandwidthUsed / limits.bandwidthQuota
    if (percentage >= warningThreshold) {
      warnings.bandwidth = {
        current: usage.bandwidthUsed,
        limit: limits.bandwidthQuota,
        percentage
      }
    }
  }
  
  return warnings
}

/**
 * Get recommended tier based on usage
 */
export function getRecommendedTier(
  usage: Partial<UsageMetrics['metrics']>
): SubscriptionTier {
  // Check if current usage exceeds basic limits
  const basicLimits = SUBSCRIPTION_TIERS.basic.limits
  const premiumLimits = SUBSCRIPTION_TIERS.premium.limits
  
  let needsPremium = false
  let needsPro = false
  
  if (usage.storageUsed && basicLimits.storageQuota !== -1) {
    if (usage.storageUsed > basicLimits.storageQuota) {
      needsPremium = true
    }
    if (usage.storageUsed > premiumLimits.storageQuota && premiumLimits.storageQuota !== -1) {
      needsPro = true
    }
  }
  
  if (usage.bandwidthUsed && basicLimits.bandwidthQuota !== -1) {
    if (usage.bandwidthUsed > basicLimits.bandwidthQuota) {
      needsPremium = true
    }
    if (usage.bandwidthUsed > premiumLimits.bandwidthQuota && premiumLimits.bandwidthQuota !== -1) {
      needsPro = true
    }
  }
  
  if (usage.apiCalls && !basicLimits.apiAccess) {
    needsPremium = true
  }
  
  if (needsPro) return 'pro'
  if (needsPremium) return 'premium'
  return 'basic'
}

/**
 * Check if subscription allows feature
 */
export function subscriptionAllowsFeature(
  user: StreamVaultUser,
  feature: keyof SubscriptionLimits
): boolean {
  if (!isSubscriptionActive(user.subscriptionStatus)) {
    return false
  }
  
  const limits = getTierLimits(user.subscriptionTier)
  const featureValue = limits[feature]
  
  // Boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue
  }
  
  // Numeric features (check if > 0 or unlimited)
  if (typeof featureValue === 'number') {
    return featureValue > 0 || featureValue === -1
  }
  
  return false
}

/**
 * Get subscription status display text
 */
export function getSubscriptionStatusText(status: SubscriptionStatus | null): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'trialing':
      return 'Trial Period'
    case 'past_due':
      return 'Payment Past Due'
    case 'canceled':
      return 'Canceled'
    case 'incomplete':
      return 'Payment Incomplete'
    case 'incomplete_expired':
      return 'Payment Expired'
    case 'unpaid':
      return 'Unpaid'
    default:
      return 'No Subscription'
  }
}

/**
 * Get subscription tier display name
 */
export function getSubscriptionTierDisplayName(tier: SubscriptionTier | null): string {
  if (!tier) return 'Free'
  return SUBSCRIPTION_TIERS[tier].name
}

/**
 * Check if user needs to update payment method
 */
export function needsPaymentUpdate(status: SubscriptionStatus | null): boolean {
  return ['past_due', 'incomplete', 'unpaid'].includes(status || '')
}

/**
 * Check if subscription is in grace period
 */
export function isInGracePeriod(status: SubscriptionStatus | null): boolean {
  return status === 'past_due'
}

/**
 * Get days until subscription expires (for trials or past due)
 */
export function getDaysUntilExpiration(
  status: SubscriptionStatus | null,
  periodEnd: Date
): number {
  if (!['trialing', 'past_due'].includes(status || '')) {
    return -1
  }
  
  const now = new Date()
  const diffTime = periodEnd.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}