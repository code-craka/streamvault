export type SubscriptionTier = 'basic' | 'premium' | 'pro'

export interface SubscriptionLimits {
  vodRetentionDays: number // -1 for unlimited
  maxQuality: '720p' | '1080p' | '4K'
  chatRateLimit: number // messages per second
  concurrentStreams: number
  offlineDownloads: number // -1 for unlimited
  apiAccess: boolean
  customEmotes: number // -1 for unlimited
}

export interface SubscriptionTierConfig {
  name: string
  price: number
  priceId: string
  features: string[]
  limits: SubscriptionLimits
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  basic: {
    name: 'Basic',
    price: 9.99,
    priceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic',
    features: [
      'Access to live streams',
      'Limited VOD history (30 days)',
      'Standard quality streaming (720p)',
      'Basic chat participation',
      'Mobile app access',
    ],
    limits: {
      vodRetentionDays: 30,
      maxQuality: '720p',
      chatRateLimit: 1, // messages per second
      concurrentStreams: 1,
      offlineDownloads: 0,
      apiAccess: false,
      customEmotes: 0,
    },
  },
  premium: {
    name: 'Premium',
    price: 19.99,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium',
    features: [
      'All Basic features',
      'Full VOD library access',
      'HD streaming quality (1080p)',
      'Chat privileges and 5 custom emotes',
      'Offline downloads (10 videos)',
      'Priority support',
      'AI-generated highlights',
    ],
    limits: {
      vodRetentionDays: -1, // unlimited
      maxQuality: '1080p',
      chatRateLimit: 3,
      concurrentStreams: 2,
      offlineDownloads: 10,
      apiAccess: false,
      customEmotes: 5,
    },
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    features: [
      'All Premium features',
      'Ultra HD streaming (4K)',
      'Unlimited offline downloads',
      'Early access to exclusive content',
      'Advanced analytics dashboard',
      'API access for integrations',
      'White-label customization',
      'Unlimited custom emotes',
      'Priority chat highlighting',
    ],
    limits: {
      vodRetentionDays: -1,
      maxQuality: '4K',
      chatRateLimit: 5,
      concurrentStreams: 5,
      offlineDownloads: -1, // unlimited
      apiAccess: true,
      customEmotes: -1, // unlimited
    },
  },
} as const

export interface SubscriptionAnalytics {
  tier: SubscriptionTier
  revenue: number
  activeSubscribers: number
  churnRate: number
  averageLifetimeValue: number
  conversionRate: number
  monthlyGrowth: number
}

export function getSubscriptionTier(priceId: string): SubscriptionTier | null {
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.priceId === priceId) {
      return tier as SubscriptionTier
    }
  }
  return null
}

export function hasFeatureAccess(
  userTier: SubscriptionTier | null,
  requiredTier: SubscriptionTier
): boolean {
  if (!userTier) return requiredTier === 'basic'

  const tierHierarchy = { basic: 0, premium: 1, pro: 2 }
  return tierHierarchy[userTier] >= tierHierarchy[requiredTier]
}

export function getSubscriptionLimits(tier: SubscriptionTier | null): SubscriptionLimits {
  if (!tier) return SUBSCRIPTION_TIERS.basic.limits
  return SUBSCRIPTION_TIERS[tier].limits
}