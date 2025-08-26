import { describe, it, expect } from '@jest/globals'
import {
  formatSubscriptionStatus,
  getSubscriptionStatusColor,
  subscriptionNeedsAttention,
  getSubscriptionAttentionMessage,
  getDaysUntilSubscriptionEnds,
  isSubscriptionExpiringSoon,
  formatCurrency,
} from '@/lib/stripe/subscription-helpers'

describe('Subscription Utils', () => {
  describe('formatSubscriptionStatus', () => {
    it('should format status correctly', () => {
      expect(formatSubscriptionStatus('active')).toBe('Active')
      expect(formatSubscriptionStatus('past_due')).toBe('Past Due')
      expect(formatSubscriptionStatus('canceled')).toBe('Canceled')
      expect(formatSubscriptionStatus(null)).toBe('No Subscription')
    })
  })

  describe('getSubscriptionStatusColor', () => {
    it('should return correct colors for different statuses', () => {
      expect(getSubscriptionStatusColor('active')).toBe('green')
      expect(getSubscriptionStatusColor('past_due')).toBe('red')
      expect(getSubscriptionStatusColor('trialing')).toBe('blue')
      expect(getSubscriptionStatusColor(null)).toBe('gray')
    })
  })

  describe('subscriptionNeedsAttention', () => {
    it('should return true for statuses that need attention', () => {
      expect(subscriptionNeedsAttention('past_due', false)).toBe(true)
      expect(subscriptionNeedsAttention('unpaid', false)).toBe(true)
      expect(subscriptionNeedsAttention('active', true)).toBe(true)
    })

    it('should return false for normal active subscription', () => {
      expect(subscriptionNeedsAttention('active', false)).toBe(false)
      expect(subscriptionNeedsAttention('trialing', false)).toBe(false)
    })
  })

  describe('getSubscriptionAttentionMessage', () => {
    it('should return appropriate messages for different statuses', () => {
      expect(
        getSubscriptionAttentionMessage('past_due', false, null)
      ).toContain('payment is past due')

      expect(getSubscriptionAttentionMessage('unpaid', false, null)).toContain(
        'subscription is unpaid'
      )

      expect(getSubscriptionAttentionMessage('active', false, null)).toBeNull()
    })

    it('should return cancellation message for canceled active subscription', () => {
      const message = getSubscriptionAttentionMessage(
        'active',
        true,
        1234567890
      )
      expect(message).toContain('set to cancel')
    })
  })

  describe('getDaysUntilSubscriptionEnds', () => {
    it('should calculate days correctly', () => {
      const futureDate = Math.floor(
        (Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000
      ) // 7 days from now
      const days = getDaysUntilSubscriptionEnds(futureDate)
      expect(days).toBe(7)
    })

    it('should return null for null input', () => {
      expect(getDaysUntilSubscriptionEnds(null)).toBeNull()
    })
  })

  describe('isSubscriptionExpiringSoon', () => {
    it('should return true for subscription expiring in 5 days', () => {
      const futureDate = Math.floor(
        (Date.now() + 5 * 24 * 60 * 60 * 1000) / 1000
      )
      expect(isSubscriptionExpiringSoon(futureDate)).toBe(true)
    })

    it('should return false for subscription expiring in 10 days', () => {
      const futureDate = Math.floor(
        (Date.now() + 10 * 24 * 60 * 60 * 1000) / 1000
      )
      expect(isSubscriptionExpiringSoon(futureDate)).toBe(false)
    })
  })

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1999, 'usd')).toBe('$19.99')
      expect(formatCurrency(2999, 'usd')).toBe('$29.99')
    })
  })
})
