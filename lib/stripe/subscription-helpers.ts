/**
 * Pure utility functions for subscription management (no external dependencies)
 */

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

/**
 * Get days until subscription ends
 */
export function getDaysUntilSubscriptionEnds(
  currentPeriodEnd: number | null
): number | null {
  if (!currentPeriodEnd) {
    return null
  }

  const endDate = new Date(currentPeriodEnd * 1000)
  const now = new Date()
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export function isSubscriptionExpiringSoon(
  currentPeriodEnd: number | null
): boolean {
  const daysUntilEnd = getDaysUntilSubscriptionEnds(currentPeriodEnd)
  return daysUntilEnd !== null && daysUntilEnd <= 7 && daysUntilEnd > 0
}

/**
 * Get subscription renewal date
 */
export function getSubscriptionRenewalDate(
  currentPeriodEnd: number | null
): Date | null {
  if (!currentPeriodEnd) return null
  return new Date(currentPeriodEnd * 1000)
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string = 'usd'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100) // Stripe amounts are in cents
}
