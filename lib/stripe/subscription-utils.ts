import { clerkClient } from '@clerk/nextjs/server'
import { type SubscriptionTier } from './subscription-tiers'

export interface UserSubscriptionData {
  subscriptionTier: SubscriptionTier | null
  subscriptionStatus: string | null
  subscriptionId: string | null
  customerId: string | null
  currentPeriodEnd: number | null
  cancelAtPeriodEnd: boolean | null
}

/**
 * Get user subscription data from Clerk metadata
 */
export async function getUserSubscriptionData(userId: string): Promise<UserSubscriptionData> {
  try {
    const user = await (await clerkClient()).users.getUser(userId)
    
    return {
      subscriptionTier: (user.publicMetadata.subscriptionTier as SubscriptionTier) || null,
      subscriptionStatus: (user.publicMetadata.subscriptionStatus as string) || null,
      subscriptionId: (user.publicMetadata.subscriptionId as string) || null,
      customerId: (user.publicMetadata.customerId as string) || null,
      currentPeriodEnd: (user.publicMetadata.currentPeriodEnd as number) || null,
      cancelAtPeriodEnd: (user.publicMetadata.cancelAtPeriodEnd as boolean) || null,
    }
  } catch (error) {
    console.error('Error getting user subscription data:', error)
    return {
      subscriptionTier: null,
      subscriptionStatus: null,
      subscriptionId: null,
      customerId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: null,
    }
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscriptionData = await getUserSubscriptionData(userId)
  return subscriptionData.subscriptionStatus === 'active'
}

/**
 * Check if user subscription is past due
 */
export async function isSubscriptionPastDue(userId: string): Promise<boolean> {
  const subscriptionData = await getUserSubscriptionData(userId)
  return subscriptionData.subscriptionStatus === 'past_due'
}

/**
 * Check if user subscription is canceled but still active
 */
export async function isSubscriptionCanceledButActive(userId: string): Promise<boolean> {
  const subscriptionData = await getUserSubscriptionData(userId)
  return (
    subscriptionData.subscriptionStatus === 'active' &&
    subscriptionData.cancelAtPeriodEnd === true
  )
}

/**
 * Get days until subscription ends
 */
export async function getDaysUntilSubscriptionEnds(userId: string): Promise<number | null> {
  const subscriptionData = await getUserSubscriptionData(userId)
  
  if (!subscriptionData.currentPeriodEnd) {
    return null
  }

  const endDate = new Date(subscriptionData.currentPeriodEnd * 1000)
  const now = new Date()
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: string | null): string {
  if (!status) return 'No Subscription'
  
  switch (status) {
    case 'active':
      return 'Active'
    case 'canceled':
      return 'Canceled'
    case 'past_due':
      return 'Past Due'
    case 'incomplete':
      return 'Incomplete'
    case 'incomplete_expired':
      return 'Expired'
    case 'trialing':
      return 'Trial'
    case 'unpaid':
      return 'Unpaid'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

/**
 * Get subscription status color for UI
 */
export function getSubscriptionStatusColor(status: string | null): string {
  if (!status) return 'gray'
  
  switch (status) {
    case 'active':
      return 'green'
    case 'trialing':
      return 'blue'
    case 'canceled':
    case 'past_due':
    case 'unpaid':
      return 'red'
    case 'incomplete':
    case 'incomplete_expired':
      return 'yellow'
    default:
      return 'gray'
  }
}

/**
 * Check if subscription needs attention (past due, canceled, etc.)
 */
export function subscriptionNeedsAttention(
  status: string | null,
  cancelAtPeriodEnd: boolean | null
): boolean {
  if (!status) return false
  
  return (
    status === 'past_due' ||
    status === 'unpaid' ||
    status === 'incomplete' ||
    (status === 'active' && cancelAtPeriodEnd === true)
  )
}

/**
 * Get subscription attention message
 */
export function getSubscriptionAttentionMessage(
  status: string | null,
  cancelAtPeriodEnd: boolean | null,
  currentPeriodEnd: number | null
): string | null {
  if (!status) return null
  
  if (status === 'past_due') {
    return 'Your payment is past due. Please update your payment method to continue your subscription.'
  }
  
  if (status === 'unpaid') {
    return 'Your subscription is unpaid. Please update your payment method.'
  }
  
  if (status === 'incomplete') {
    return 'Your subscription setup is incomplete. Please complete the payment process.'
  }
  
  if (status === 'active' && cancelAtPeriodEnd === true && currentPeriodEnd) {
    const endDate = new Date(currentPeriodEnd * 1000).toLocaleDateString()
    return `Your subscription is set to cancel on ${endDate}. You can reactivate it anytime before then.`
  }
  
  return null
}