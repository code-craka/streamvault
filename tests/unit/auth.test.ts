import { checkUserRole, checkSubscriptionAccess, getUserPermissions } from '@/lib/auth/permissions'
import { UserRole, SubscriptionTier } from '@/types/auth'

// Mock Clerk user object
const createMockUser = (role: UserRole = 'viewer', subscriptionTier: SubscriptionTier | null = null) => ({
  id: 'test-user-id',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
  publicMetadata: {
    role,
    subscriptionTier,
    subscriptionStatus: subscriptionTier ? 'active' : null
  },
  banned: false
} as any)

describe('Authentication Utilities', () => {
  describe('checkUserRole', () => {
    it('should allow viewer to access viewer routes', () => {
      const user = createMockUser('viewer')
      expect(checkUserRole(user, 'viewer')).toBe(true)
    })

    it('should not allow viewer to access streamer routes', () => {
      const user = createMockUser('viewer')
      expect(checkUserRole(user, 'streamer')).toBe(false)
    })

    it('should allow streamer to access viewer and streamer routes', () => {
      const user = createMockUser('streamer')
      expect(checkUserRole(user, 'viewer')).toBe(true)
      expect(checkUserRole(user, 'streamer')).toBe(true)
    })

    it('should not allow streamer to access admin routes', () => {
      const user = createMockUser('streamer')
      expect(checkUserRole(user, 'admin')).toBe(false)
    })

    it('should allow admin to access all routes', () => {
      const user = createMockUser('admin')
      expect(checkUserRole(user, 'viewer')).toBe(true)
      expect(checkUserRole(user, 'streamer')).toBe(true)
      expect(checkUserRole(user, 'admin')).toBe(true)
    })
  })

  describe('checkSubscriptionAccess', () => {
    it('should allow basic access for users without subscription', () => {
      const user = createMockUser('viewer', null)
      expect(checkSubscriptionAccess(user, 'basic')).toBe(true)
    })

    it('should not allow premium access for users without subscription', () => {
      const user = createMockUser('viewer', null)
      expect(checkSubscriptionAccess(user, 'premium')).toBe(false)
    })

    it('should allow premium users to access basic and premium features', () => {
      const user = createMockUser('viewer', 'premium')
      expect(checkSubscriptionAccess(user, 'basic')).toBe(true)
      expect(checkSubscriptionAccess(user, 'premium')).toBe(true)
    })

    it('should not allow premium users to access pro features', () => {
      const user = createMockUser('viewer', 'premium')
      expect(checkSubscriptionAccess(user, 'pro')).toBe(false)
    })

    it('should allow pro users to access all subscription tiers', () => {
      const user = createMockUser('viewer', 'pro')
      expect(checkSubscriptionAccess(user, 'basic')).toBe(true)
      expect(checkSubscriptionAccess(user, 'premium')).toBe(true)
      expect(checkSubscriptionAccess(user, 'pro')).toBe(true)
    })
  })

  describe('getUserPermissions', () => {
    it('should return correct permissions for viewer', () => {
      const user = createMockUser('viewer')
      const permissions = getUserPermissions(user)
      
      expect(permissions.canStream).toBe(false)
      expect(permissions.canModerate).toBe(false)
      expect(permissions.canAccessAdmin).toBe(false)
      expect(permissions.maxConcurrentStreams).toBe(0)
    })

    it('should return correct permissions for streamer', () => {
      const user = createMockUser('streamer')
      const permissions = getUserPermissions(user)
      
      expect(permissions.canStream).toBe(true)
      expect(permissions.canModerate).toBe(true)
      expect(permissions.canAccessAdmin).toBe(false)
      expect(permissions.maxConcurrentStreams).toBe(3)
    })

    it('should return correct permissions for admin', () => {
      const user = createMockUser('admin')
      const permissions = getUserPermissions(user)
      
      expect(permissions.canStream).toBe(true)
      expect(permissions.canModerate).toBe(true)
      expect(permissions.canAccessAdmin).toBe(true)
      expect(permissions.maxConcurrentStreams).toBe(-1) // unlimited
    })
  })
})