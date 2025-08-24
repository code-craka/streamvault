import {
  validateFeatureAccess,
  validateUsageLimit,
  canCreateStream,
  canUploadVideo,
  canSendChatMessage,
  canCreateCustomEmote,
  canDownloadVideo,
  canAccessAPI,
  canAccessAdvancedAnalytics,
  canUseWhiteLabel,
  canStreamAtQuality,
  getUpgradeSuggestions,
  validateSubscriptionStatus,
} from '@/lib/auth/subscription-validation'
import type { StreamVaultUser } from '@/types/auth'

// Mock user data for testing
const createMockUser = (
  tier: 'basic' | 'premium' | 'pro' | null = null,
  status: 'active' | 'canceled' | 'past_due' | null = 'active'
): StreamVaultUser => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  role: 'streamer',
  subscriptionTier: tier,
  subscriptionStatus: status,
  subscriptionId: tier ? 'sub_test123' : undefined,
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date(),
})

describe('Subscription Validation', () => {
  describe('validateFeatureAccess', () => {
    it('should allow access for users with sufficient tier', () => {
      const user = createMockUser('premium')
      const access = validateFeatureAccess(user, 'premium', 'Advanced analytics')
      
      expect(access.hasAccess).toBe(true)
      expect(access.reason).toBeUndefined()
    })

    it('should deny access for users with insufficient tier', () => {
      const user = createMockUser('basic')
      const access = validateFeatureAccess(user, 'premium', 'Advanced analytics')
      
      expect(access.hasAccess).toBe(false)
      expect(access.reason).toContain('Advanced analytics requires premium')
      expect(access.upgradeRequired).toBe('premium')
    })

    it('should allow trial for users without subscription', () => {
      const user = createMockUser(null)
      const access = validateFeatureAccess(user, 'premium', 'Advanced analytics')
      
      expect(access.hasAccess).toBe(false)
      expect(access.trialAvailable).toBe(true)
    })
  })

  describe('validateUsageLimit', () => {
    it('should allow usage within limits', () => {
      const user = createMockUser('premium')
      const access = validateUsageLimit(user, 'concurrentStreams', 1)
      
      expect(access.hasAccess).toBe(true)
      expect(access.usageRemaining).toBe(1) // Premium allows 2 concurrent streams
    })

    it('should deny usage when limit exceeded', () => {
      const user = createMockUser('basic')
      const access = validateUsageLimit(user, 'concurrentStreams', 1)
      
      expect(access.hasAccess).toBe(false)
      expect(access.reason).toContain('concurrentStreams limit')
      expect(access.usageRemaining).toBe(0)
    })

    it('should handle unlimited usage (-1)', () => {
      const user = createMockUser('pro')
      const access = validateUsageLimit(user, 'customEmotes', 100)
      
      expect(access.hasAccess).toBe(true)
      expect(access.usageRemaining).toBe(-1) // Unlimited
    })
  })

  describe('canCreateStream', () => {
    it('should allow stream creation within limits', () => {
      const user = createMockUser('premium')
      const access = canCreateStream(user, 1)
      
      expect(access.hasAccess).toBe(true)
    })

    it('should deny stream creation when limit reached', () => {
      const user = createMockUser('basic')
      const access = canCreateStream(user, 1)
      
      expect(access.hasAccess).toBe(false)
    })
  })

  describe('canUploadVideo', () => {
    it('should allow video upload for streamers within storage limits', () => {
      const user = createMockUser('premium')
      const access = canUploadVideo(user, 10, 5) // 10GB used, 5GB video
      
      expect(access.hasAccess).toBe(true)
    })

    it('should deny video upload for viewers', () => {
      const user = { ...createMockUser('premium'), role: 'viewer' as const }
      const access = canUploadVideo(user, 10, 5)
      
      expect(access.hasAccess).toBe(false)
      expect(access.reason).toContain('streamer role')
    })

    it('should deny video upload when storage limit exceeded', () => {
      const user = createMockUser('basic')
      const access = canUploadVideo(user, 4, 2) // 4GB + 2GB > 5GB limit
      
      expect(access.hasAccess).toBe(false)
    })
  })

  describe('canSendChatMessage', () => {
    it('should allow chat messages within rate limit', () => {
      const user = createMockUser('premium')
      const access = canSendChatMessage(user, 2) // 2 messages in last second, limit is 3
      
      expect(access.hasAccess).toBe(true)
      expect(access.usageRemaining).toBe(1)
    })

    it('should deny chat messages when rate limit exceeded', () => {
      const user = createMockUser('basic')
      const access = canSendChatMessage(user, 1) // 1 message in last second, limit is 1
      
      expect(access.hasAccess).toBe(false)
      expect(access.reason).toContain('Rate limit exceeded')
    })
  })

  describe('canCreateCustomEmote', () => {
    it('should allow custom emote creation within limits', () => {
      const user = createMockUser('premium')
      const access = canCreateCustomEmote(user, 3) // 3 emotes, limit is 5
      
      expect(access.hasAccess).toBe(true)
      expect(access.usageRemaining).toBe(2)
    })

    it('should deny custom emote creation when limit reached', () => {
      const user = createMockUser('basic')
      const access = canCreateCustomEmote(user, 0) // Basic has 0 limit
      
      expect(access.hasAccess).toBe(false)
    })
  })

  describe('canDownloadVideo', () => {
    it('should allow video downloads within limits', () => {
      const user = createMockUser('premium')
      const access = canDownloadVideo(user, 5) // 5 downloads, limit is 10
      
      expect(access.hasAccess).toBe(true)
      expect(access.usageRemaining).toBe(5)
    })

    it('should deny video downloads for basic users', () => {
      const user = createMockUser('basic')
      const access = canDownloadVideo(user, 0)
      
      expect(access.hasAccess).toBe(false)
      expect(access.reason).toContain('premium subscription')
    })
  })

  describe('canAccessAPI', () => {
    it('should allow API access for pro users', () => {
      const user = createMockUser('pro')
      const access = canAccessAPI(user)
      
      expect(access.hasAccess).toBe(true)
    })

    it('should deny API access for non-pro users', () => {
      const user = createMockUser('premium')
      const access = canAccessAPI(user)
      
      expect(access.hasAccess).toBe(false)
      expect(access.upgradeRequired).toBe('pro')
    })
  })

  describe('canAccessAdvancedAnalytics', () => {
    it('should allow advanced analytics for premium+ users', () => {
      const user = createMockUser('premium')
      const access = canAccessAdvancedAnalytics(user)
      
      expect(access.hasAccess).toBe(true)
    })

    it('should deny advanced analytics for basic users', () => {
      const user = createMockUser('basic')
      const access = canAccessAdvancedAnalytics(user)
      
      expect(access.hasAccess).toBe(false)
      expect(access.upgradeRequired).toBe('premium')
    })
  })

  describe('canUseWhiteLabel', () => {
    it('should allow white-label features for pro users', () => {
      const user = createMockUser('pro')
      const access = canUseWhiteLabel(user)
      
      expect(access.hasAccess).toBe(true)
    })

    it('should deny white-label features for non-pro users', () => {
      const user = createMockUser('premium')
      const access = canUseWhiteLabel(user)
      
      expect(access.hasAccess).toBe(false)
      expect(access.upgradeRequired).toBe('pro')
    })
  })

  describe('canStreamAtQuality', () => {
    it('should allow 4K streaming for pro users', () => {
      const user = createMockUser('pro')
      const access = canStreamAtQuality(user, '4K')
      
      expect(access.hasAccess).toBe(true)
    })

    it('should deny 4K streaming for non-pro users', () => {
      const user = createMockUser('premium')
      const access = canStreamAtQuality(user, '4K')
      
      expect(access.hasAccess).toBe(false)
      expect(access.upgradeRequired).toBe('pro')
    })

    it('should allow 720p streaming for all users', () => {
      const user = createMockUser('basic')
      const access = canStreamAtQuality(user, '720p')
      
      expect(access.hasAccess).toBe(true)
    })
  })

  describe('getUpgradeSuggestions', () => {
    it('should suggest premium for basic users hitting limits', () => {
      const user = createMockUser('basic')
      const usage = {
        activeStreams: 1,
        storageUsed: 4.5, // Close to 5GB limit
        monthlyBandwidth: 45,
        customEmotes: 0,
        apiCalls: 0,
      }
      
      const suggestions = getUpgradeSuggestions(user, usage)
      
      expect(suggestions.suggestedTier).toBe('premium')
      expect(suggestions.reasons.length).toBeGreaterThan(0)
      expect(suggestions.benefits).toContain('HD streaming (1080p)')
    })

    it('should suggest pro for premium users needing advanced features', () => {
      const user = createMockUser('premium')
      const usage = {
        activeStreams: 1,
        storageUsed: 30,
        monthlyBandwidth: 150,
        customEmotes: 5, // At limit
        apiCalls: 0,
      }
      
      const suggestions = getUpgradeSuggestions(user, usage)
      
      expect(suggestions.suggestedTier).toBe('pro')
      expect(suggestions.benefits).toContain('API access')
    })

    it('should not suggest upgrade for users within limits', () => {
      const user = createMockUser('premium')
      const usage = {
        activeStreams: 1,
        storageUsed: 10,
        monthlyBandwidth: 50,
        customEmotes: 2,
        apiCalls: 0,
      }
      
      const suggestions = getUpgradeSuggestions(user, usage)
      
      expect(suggestions.suggestedTier).toBeNull()
      expect(suggestions.reasons).toHaveLength(0)
    })
  })

  describe('validateSubscriptionStatus', () => {
    it('should validate active subscriptions', () => {
      const user = createMockUser('premium', 'active')
      const validation = validateSubscriptionStatus(user)
      
      expect(validation.isValid).toBe(true)
      expect(validation.status).toBe('active')
      expect(validation.message).toBeUndefined()
    })

    it('should invalidate canceled subscriptions', () => {
      const user = createMockUser('premium', 'canceled')
      const validation = validateSubscriptionStatus(user)
      
      expect(validation.isValid).toBe(false)
      expect(validation.status).toBe('inactive')
      expect(validation.message).toContain('inactive')
    })

    it('should invalidate past due subscriptions', () => {
      const user = createMockUser('premium', 'past_due')
      const validation = validateSubscriptionStatus(user)
      
      expect(validation.isValid).toBe(false)
      expect(validation.status).toBe('past_due')
      expect(validation.message).toContain('past due')
    })

    it('should handle users without subscriptions', () => {
      const user = createMockUser(null, null)
      const validation = validateSubscriptionStatus(user)
      
      expect(validation.isValid).toBe(false)
      expect(validation.status).toBe('inactive')
    })
  })
})