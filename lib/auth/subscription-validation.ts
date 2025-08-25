// Subscription tier validation and feature gating utilities

import type { SubscriptionTier, StreamVaultUser } from '@/types/auth'
import type { FeatureAccess, SubscriptionLimits } from '@/types/subscription'
import { SUBSCRIPTION_TIERS, hasFeatureAccess, getUsageLimits } from '@/types/subscription'
import { hasSubscriptionTier } from './permissions'

/**
 * Validate if user has access to a specific feature
 */
export function validateFeatureAccess(
  user: StreamVaultUser,
  requiredTier: SubscriptionTier,
  feature?: string
): FeatureAccess {
  const userTier = user.subscriptionTier
  const hasAccess = hasSubscriptionTier(userTier, requiredTier)

  if (hasAccess) {
    return {
      hasAccess: true,
    }
  }

  return {
    hasAccess: false,
    reason: `${feature || 'This feature'} requires ${requiredTier} subscription or higher`,
    upgradeRequired: requiredTier,
    trialAvailable: !userTier, // Trial available for users without subscription
  }
}

/**
 * Validate usage against subscription limits
 */
export function validateUsageLimit(
  user: StreamVaultUser,
  feature: keyof SubscriptionLimits,
  currentUsage: number
): FeatureAccess {
  const limits = getUsageLimits(user.subscriptionTier)
  const limit = limits[feature] as number

  // -1 means unlimited
  if (limit === -1) {
    return {
      hasAccess: true,
      usageRemaining: -1,
    }
  }

  const hasAccess = currentUsage < limit
  const remaining = Math.max(0, limit - currentUsage)

  if (hasAccess) {
    return {
      hasAccess: true,
      usageRemaining: remaining,
    }
  }

  return {
    hasAccess: false,
    reason: `You have reached your ${feature} limit (${limit})`,
    upgradeRequired: getNextTierForFeature(user.subscriptionTier, feature),
    usageRemaining: 0,
  }
}

/**
 * Get the next tier that provides more of a specific feature
 */
function getNextTierForFeature(
  currentTier: SubscriptionTier | null,
  feature: keyof SubscriptionLimits
): SubscriptionTier {
  const tiers: SubscriptionTier[] = ['basic', 'premium', 'pro']
  const currentIndex = currentTier ? tiers.indexOf(currentTier) : -1

  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tierLimits = SUBSCRIPTION_TIERS[tiers[i]].limits
    const currentLimits = currentTier ? SUBSCRIPTION_TIERS[currentTier].limits : SUBSCRIPTION_TIERS.basic.limits
    
    const tierLimit = tierLimits[feature] as number
    const currentLimit = currentLimits[feature] as number

    if (tierLimit > currentLimit || tierLimit === -1) {
      return tiers[i]
    }
  }

  return 'pro' // Default to highest tier
}

/**
 * Check if user can create a new stream
 */
export function canCreateStream(
  user: StreamVaultUser,
  currentActiveStreams: number
): FeatureAccess {
  return validateUsageLimit(user, 'concurrentStreams', currentActiveStreams)
}

/**
 * Check if user can upload a video
 */
export function canUploadVideo(
  user: StreamVaultUser,
  currentStorageUsed: number, // in GB
  videoSize: number // in GB
): FeatureAccess {
  const storageAccess = validateUsageLimit(user, 'storageQuota', currentStorageUsed + videoSize)
  
  if (!storageAccess.hasAccess) {
    return storageAccess
  }

  // Additional check for streamer role
  if (user.role === 'viewer') {
    return {
      hasAccess: false,
      reason: 'Video upload requires streamer role or higher',
      upgradeRequired: 'basic', // Assuming basic allows streaming
    }
  }

  return storageAccess
}

/**
 * Check if user can send chat messages
 */
export function canSendChatMessage(
  user: StreamVaultUser,
  messagesInLastSecond: number
): FeatureAccess {
  const limits = getUsageLimits(user.subscriptionTier)
  const rateLimit = limits.chatRateLimit

  if (messagesInLastSecond >= rateLimit) {
    return {
      hasAccess: false,
      reason: `Rate limit exceeded. You can send ${rateLimit} message(s) per second`,
      upgradeRequired: getNextTierForFeature(user.subscriptionTier, 'chatRateLimit'),
    }
  }

  return {
    hasAccess: true,
    usageRemaining: rateLimit - messagesInLastSecond,
  }
}

/**
 * Check if user can create custom emotes
 */
export function canCreateCustomEmote(
  user: StreamVaultUser,
  currentEmotes: number
): FeatureAccess {
  return validateUsageLimit(user, 'customEmotes', currentEmotes)
}

/**
 * Check if user can download videos for offline viewing
 */
export function canDownloadVideo(
  user: StreamVaultUser,
  currentDownloads: number
): FeatureAccess {
  const access = validateUsageLimit(user, 'offlineDownloads', currentDownloads)
  
  if (!access.hasAccess && currentDownloads === 0) {
    // User has no downloads yet, might need upgrade
    return {
      ...access,
      reason: 'Offline downloads require premium subscription or higher',
      upgradeRequired: 'premium',
    }
  }

  return access
}

/**
 * Check if user can access API
 */
export function canAccessAPI(user: StreamVaultUser): FeatureAccess {
  return validateFeatureAccess(user, 'pro', 'API access')
}

/**
 * Check if user can access advanced analytics
 */
export function canAccessAdvancedAnalytics(user: StreamVaultUser): FeatureAccess {
  return validateFeatureAccess(user, 'premium', 'Advanced analytics')
}

/**
 * Check if user can use white-label features
 */
export function canUseWhiteLabel(user: StreamVaultUser): FeatureAccess {
  return validateFeatureAccess(user, 'pro', 'White-label features')
}

/**
 * Check if user can use custom domain
 */
export function canUseCustomDomain(user: StreamVaultUser): FeatureAccess {
  return validateFeatureAccess(user, 'pro', 'Custom domain')
}

/**
 * Check if user can export data
 */
export function canExportData(user: StreamVaultUser): FeatureAccess {
  return validateFeatureAccess(user, 'premium', 'Data export')
}

/**
 * Get video quality levels available to user
 */
export function getAvailableVideoQualities(user: StreamVaultUser): string[] {
  const limits = getUsageLimits(user.subscriptionTier)
  const maxQuality = limits.maxQuality

  const qualityLevels = ['480p', '720p', '1080p', '4K']
  const maxIndex = qualityLevels.indexOf(maxQuality)

  return qualityLevels.slice(0, maxIndex + 1)
}

/**
 * Check if user can stream at specific quality
 */
export function canStreamAtQuality(
  user: StreamVaultUser,
  quality: string
): FeatureAccess {
  const availableQualities = getAvailableVideoQualities(user)
  
  if (availableQualities.includes(quality)) {
    return { hasAccess: true }
  }

  const requiredTier = getRequiredTierForQuality(quality)
  
  return {
    hasAccess: false,
    reason: `${quality} streaming requires ${requiredTier} subscription or higher`,
    upgradeRequired: requiredTier,
  }
}

/**
 * Get required tier for video quality
 */
function getRequiredTierForQuality(quality: string): SubscriptionTier {
  switch (quality) {
    case '4K':
      return 'pro'
    case '1080p':
      return 'premium'
    case '720p':
    case '480p':
    default:
      return 'basic'
  }
}

/**
 * Check if user can access priority support
 */
export function canAccessPrioritySupport(user: StreamVaultUser): FeatureAccess {
  return validateFeatureAccess(user, 'premium', 'Priority support')
}

/**
 * Get subscription upgrade suggestions based on usage
 */
export function getUpgradeSuggestions(
  user: StreamVaultUser,
  usage: {
    activeStreams: number
    storageUsed: number
    monthlyBandwidth: number
    customEmotes: number
    apiCalls: number
  }
): {
  suggestedTier: SubscriptionTier | null
  reasons: string[]
  benefits: string[]
} {
  const currentTier = user.subscriptionTier || 'basic'
  const currentLimits = SUBSCRIPTION_TIERS[currentTier].limits
  
  const reasons: string[] = []
  const benefits: string[] = []
  let suggestedTier: SubscriptionTier | null = null

  // Check if user is hitting limits
  if (currentLimits.concurrentStreams !== -1 && usage.activeStreams >= currentLimits.concurrentStreams) {
    reasons.push(`You're at your concurrent streams limit (${currentLimits.concurrentStreams})`)
  }

  if (currentLimits.storageQuota !== -1 && usage.storageUsed >= currentLimits.storageQuota * 0.8) {
    reasons.push(`You're using ${Math.round((usage.storageUsed / currentLimits.storageQuota) * 100)}% of your storage`)
  }

  if (currentLimits.customEmotes !== -1 && usage.customEmotes >= currentLimits.customEmotes) {
    reasons.push(`You've reached your custom emotes limit (${currentLimits.customEmotes})`)
  }

  // Suggest appropriate tier
  if (currentTier === 'basic') {
    suggestedTier = 'premium'
    benefits.push('Unlimited VOD access', 'HD streaming (1080p)', '5 custom emotes', 'Offline downloads')
  } else if (currentTier === 'premium') {
    suggestedTier = 'pro'
    benefits.push('4K streaming', 'Unlimited downloads', 'API access', 'White-label features')
  }

  return {
    suggestedTier: reasons.length > 0 ? suggestedTier : null,
    reasons,
    benefits,
  }
}

/**
 * Validate subscription status
 */
export function validateSubscriptionStatus(user: StreamVaultUser): {
  isValid: boolean
  status: string
  message?: string
} {
  const status = user.subscriptionStatus

  if (!status || status === 'canceled') {
    return {
      isValid: false,
      status: 'inactive',
      message: 'Your subscription is inactive. Please renew to access premium features.',
    }
  }

  if (status === 'past_due') {
    return {
      isValid: false,
      status: 'past_due',
      message: 'Your subscription payment is past due. Please update your payment method.',
    }
  }

  if (status === 'active') {
    return {
      isValid: true,
      status: 'active',
    }
  }

  return {
    isValid: false,
    status: status || 'unknown',
    message: 'There is an issue with your subscription. Please contact support.',
  }
}