// Subscription and billing type definitions

import type { SubscriptionTier, SubscriptionStatus } from './auth'
import { SUBSCRIPTION_HIERARCHY } from './auth'

// Subscription tier configuration
export interface SubscriptionTierConfig {
  name: string
  price: number
  priceId: string
  interval: 'month' | 'year'
  features: string[]
  limits: SubscriptionLimits
  popular?: boolean
  description?: string
}

// Feature limits for each subscription tier
export interface SubscriptionLimits {
  // Video and streaming limits
  vodRetentionDays: number // -1 for unlimited
  maxQuality: '480p' | '720p' | '1080p' | '4K'
  concurrentStreams: number
  maxStreamDuration: number // in minutes, -1 for unlimited

  // Chat and engagement limits
  chatRateLimit: number // messages per second
  customEmotes: number // -1 for unlimited
  chatHistory: number // days, -1 for unlimited

  // Download and offline features
  offlineDownloads: number // -1 for unlimited
  downloadRetention: number // days

  // API and integration limits
  apiAccess: boolean
  apiRateLimit: number // requests per minute
  webhookEndpoints: number

  // Analytics and insights
  analyticsRetention: number // days
  advancedAnalytics: boolean
  exportData: boolean

  // Support and features
  prioritySupport: boolean
  whiteLabel: boolean
  customDomain: boolean

  // Storage limits
  storageQuota: number // in GB, -1 for unlimited
  bandwidthQuota: number // in GB per month, -1 for unlimited
}

// Subscription analytics and metrics
export interface SubscriptionMetrics {
  tier: SubscriptionTier
  revenue: number
  activeSubscribers: number
  newSubscribers: number
  canceledSubscribers: number
  churnRate: number
  averageLifetimeValue: number
  conversionRate: number
  monthlyRecurringRevenue: number
  annualRecurringRevenue: number
  customerAcquisitionCost: number
  monthlyGrowthRate: number
  retentionRate: number
}

// Billing and payment types
export interface BillingInfo {
  customerId: string
  subscriptionId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
  paymentMethod?: PaymentMethod
  billingAddress?: BillingAddress
  taxInfo?: TaxInfo
  invoices: Invoice[]
  upcomingInvoice?: Invoice
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_account' | 'paypal'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

export interface BillingAddress {
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface TaxInfo {
  taxId?: string
  taxExempt: boolean
  taxRate: number
  taxRegion: string
}

export interface Invoice {
  id: string
  number: string
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
  amount: number
  currency: string
  dueDate: Date
  paidAt?: Date
  hostedInvoiceUrl?: string
  invoicePdf?: string
  lineItems: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  description: string
  amount: number
  quantity: number
  period: {
    start: Date
    end: Date
  }
}

// Usage tracking for billing
export interface UsageMetrics {
  userId: string
  subscriptionId: string
  period: {
    start: Date
    end: Date
  }
  metrics: {
    streamingMinutes: number
    storageUsed: number // in GB
    bandwidthUsed: number // in GB
    apiCalls: number
    chatMessages: number
    downloadsCount: number
  }
  overages: {
    storage: number
    bandwidth: number
    apiCalls: number
  }
  charges: {
    base: number
    overages: number
    total: number
  }
}

// Subscription change types
export interface SubscriptionChange {
  id: string
  userId: string
  subscriptionId: string
  fromTier: SubscriptionTier | null
  toTier: SubscriptionTier | null
  changeType: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate'
  effectiveDate: Date
  prorationAmount?: number
  reason?: string
  metadata?: Record<string, any>
  createdAt: Date
}

// Discount and coupon types
export interface Discount {
  id: string
  code: string
  type: 'percentage' | 'fixed_amount'
  value: number
  currency?: string
  duration: 'once' | 'repeating' | 'forever'
  durationInMonths?: number
  maxRedemptions?: number
  currentRedemptions: number
  validFrom: Date
  validUntil?: Date
  applicableTiers: SubscriptionTier[]
  firstTimeOnly: boolean
  active: boolean
}

// Subscription events for webhooks
export interface SubscriptionEvent {
  id: string
  type:
    | 'subscription.created'
    | 'subscription.updated'
    | 'subscription.deleted'
    | 'invoice.payment_succeeded'
    | 'invoice.payment_failed'
    | 'customer.subscription.trial_will_end'
  subscriptionId: string
  customerId: string
  userId: string
  data: Record<string, any>
  timestamp: Date
  processed: boolean
  retryCount: number
  lastRetryAt?: Date
  errorMessage?: string
}

// Feature access validation
export interface FeatureAccess {
  hasAccess: boolean
  reason?: string
  upgradeRequired?: SubscriptionTier
  trialAvailable?: boolean
  usageRemaining?: number
  resetDate?: Date
}

// Subscription tier definitions with all features
export const SUBSCRIPTION_TIERS: Record<
  SubscriptionTier,
  SubscriptionTierConfig
> = {
  basic: {
    name: 'Basic',
    price: 9.99,
    priceId: process.env.STRIPE_BASIC_PRICE_ID || '',
    interval: 'month',
    description: 'Perfect for casual viewers and new streamers',
    features: [
      'Access to live streams',
      'Limited VOD history (30 days)',
      'Standard quality streaming (720p)',
      'Basic chat participation',
      'Mobile app access',
      'Email support',
    ],
    limits: {
      vodRetentionDays: 30,
      maxQuality: '720p',
      concurrentStreams: 1,
      maxStreamDuration: 240, // 4 hours
      chatRateLimit: 1,
      customEmotes: 0,
      chatHistory: 7,
      offlineDownloads: 0,
      downloadRetention: 0,
      apiAccess: false,
      apiRateLimit: 0,
      webhookEndpoints: 0,
      analyticsRetention: 7,
      advancedAnalytics: false,
      exportData: false,
      prioritySupport: false,
      whiteLabel: false,
      customDomain: false,
      storageQuota: 5, // 5GB
      bandwidthQuota: 50, // 50GB per month
    },
  },
  premium: {
    name: 'Premium',
    price: 19.99,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || '',
    interval: 'month',
    popular: true,
    description: 'Great for active streamers and engaged viewers',
    features: [
      'All Basic features',
      'Full VOD library access',
      'HD streaming quality (1080p)',
      'Chat privileges and 5 custom emotes',
      'Offline downloads (10 videos)',
      'Priority support',
      'AI-generated highlights',
      'Advanced chat features',
      '30-day analytics retention',
    ],
    limits: {
      vodRetentionDays: -1, // unlimited
      maxQuality: '1080p',
      concurrentStreams: 2,
      maxStreamDuration: -1, // unlimited
      chatRateLimit: 3,
      customEmotes: 5,
      chatHistory: 30,
      offlineDownloads: 10,
      downloadRetention: 30,
      apiAccess: false,
      apiRateLimit: 0,
      webhookEndpoints: 0,
      analyticsRetention: 30,
      advancedAnalytics: true,
      exportData: true,
      prioritySupport: true,
      whiteLabel: false,
      customDomain: false,
      storageQuota: 50, // 50GB
      bandwidthQuota: 200, // 200GB per month
    },
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    interval: 'month',
    description: 'Ultimate package for professional creators and enterprises',
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
      'Custom domain support',
      'Dedicated account manager',
    ],
    limits: {
      vodRetentionDays: -1,
      maxQuality: '4K',
      concurrentStreams: 5,
      maxStreamDuration: -1,
      chatRateLimit: 5,
      customEmotes: -1, // unlimited
      chatHistory: -1, // unlimited
      offlineDownloads: -1, // unlimited
      downloadRetention: -1, // unlimited
      apiAccess: true,
      apiRateLimit: 1000, // 1000 requests per minute
      webhookEndpoints: 10,
      analyticsRetention: -1, // unlimited
      advancedAnalytics: true,
      exportData: true,
      prioritySupport: true,
      whiteLabel: true,
      customDomain: true,
      storageQuota: -1, // unlimited
      bandwidthQuota: -1, // unlimited
    },
  },
} as const

// Helper function to get tier configuration
export function getSubscriptionTierConfig(
  tier: SubscriptionTier
): SubscriptionTierConfig {
  return SUBSCRIPTION_TIERS[tier]
}

// Helper function to check if a feature is available for a tier
export function hasFeatureAccess(
  userTier: SubscriptionTier | null,
  requiredTier: SubscriptionTier
): boolean {
  if (!userTier) return requiredTier === 'basic'

  const userLevel = SUBSCRIPTION_HIERARCHY[userTier]
  const requiredLevel = SUBSCRIPTION_HIERARCHY[requiredTier]

  return userLevel >= requiredLevel
}

// Helper function to get usage limits for a tier
export function getUsageLimits(
  tier: SubscriptionTier | null
): SubscriptionLimits {
  if (!tier) return SUBSCRIPTION_TIERS.basic.limits
  return SUBSCRIPTION_TIERS[tier].limits
}

// Subscription plans for display in UI
export const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 9.99,
    description: 'Perfect for getting started with streaming',
    popular: false,
  },
  premium: {
    name: 'Premium',
    price: 19.99,
    description: 'Advanced features for serious streamers',
    popular: true,
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    description: 'Professional streaming with all features',
    popular: false,
  },
} as const
