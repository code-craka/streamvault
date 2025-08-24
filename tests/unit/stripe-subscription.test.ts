import { describe, it, expect } from '@jest/globals'
import { SUBSCRIPTION_TIERS, getSubscriptionTier, hasFeatureAccess } from '@/lib/stripe/subscription-tiers'

describe('Subscription Tiers', () => {
  describe('getSubscriptionTier', () => {
    it('should return correct tier for valid price ID', () => {
      // Mock environment variables
      process.env.STRIPE_PREMIUM_PRICE_ID = 'price_premium'
      
      const tier = getSubscriptionTier('price_premium')
      expect(tier).toBe('premium')
    })

    it('should return null for invalid price ID', () => {
      const tier = getSubscriptionTier('invalid_price_id')
      expect(tier).toBeNull()
    })
  })

  describe('hasFeatureAccess', () => {
    it('should allow access for same tier', () => {
      expect(hasFeatureAccess('premium', 'premium')).toBe(true)
    })

    it('should allow access for higher tier', () => {
      expect(hasFeatureAccess('pro', 'premium')).toBe(true)
    })

    it('should deny access for lower tier', () => {
      expect(hasFeatureAccess('basic', 'premium')).toBe(false)
    })

    it('should handle null user tier', () => {
      expect(hasFeatureAccess(null, 'basic')).toBe(true)
      expect(hasFeatureAccess(null, 'premium')).toBe(false)
    })
  })

  describe('SUBSCRIPTION_TIERS', () => {
    it('should have all required tiers', () => {
      expect(SUBSCRIPTION_TIERS.basic).toBeDefined()
      expect(SUBSCRIPTION_TIERS.premium).toBeDefined()
      expect(SUBSCRIPTION_TIERS.pro).toBeDefined()
    })

    it('should have correct pricing structure', () => {
      expect(SUBSCRIPTION_TIERS.basic.price).toBe(9.99)
      expect(SUBSCRIPTION_TIERS.premium.price).toBe(19.99)
      expect(SUBSCRIPTION_TIERS.pro.price).toBe(29.99)
    })

    it('should have progressive limits', () => {
      expect(SUBSCRIPTION_TIERS.basic.limits.chatRateLimit).toBe(1)
      expect(SUBSCRIPTION_TIERS.premium.limits.chatRateLimit).toBe(3)
      expect(SUBSCRIPTION_TIERS.pro.limits.chatRateLimit).toBe(5)
    })
  })
})