import { clerkClient } from '@clerk/nextjs/server'
import { UserRole, SubscriptionTier, UserMetadata } from '@/types/auth'

/**
 * Update user metadata in Clerk
 */
export async function updateUserMetadata(
  userId: string, 
  metadata: Partial<UserMetadata>
): Promise<void> {
  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: metadata
    })
  } catch (error) {
    console.error('Failed to update user metadata:', error)
    throw new Error('Failed to update user metadata')
  }
}

/**
 * Set user role
 */
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await updateUserMetadata(userId, { role })
}

/**
 * Set user subscription
 */
export async function setUserSubscription(
  userId: string, 
  tier: SubscriptionTier,
  status: string,
  subscriptionId?: string
): Promise<void> {
  await updateUserMetadata(userId, {
    subscriptionTier: tier,
    subscriptionStatus: status as any,
    subscriptionId
  })
}

/**
 * Initialize new user with default metadata
 */
export async function initializeNewUser(userId: string): Promise<void> {
  const defaultMetadata: UserMetadata = {
    role: 'viewer',
    subscriptionTier: null,
    subscriptionStatus: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        streamStart: true,
        newFollower: true,
        chatMention: true
      },
      privacy: {
        showOnlineStatus: true,
        allowDirectMessages: true,
        showViewingHistory: true
      },
      streaming: {
        defaultQuality: '720p',
        autoPlay: true,
        chatEnabled: true
      }
    }
  }

  await updateUserMetadata(userId, defaultMetadata)
}

/**
 * Complete user onboarding
 */
export async function completeOnboarding(
  userId: string, 
  role: UserRole = 'viewer'
): Promise<void> {
  await updateUserMetadata(userId, {
    role
  })
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  try {
    const client = await clerkClient()
    const users = await client.users.getUserList({
      emailAddress: [email]
    })
    return users.data[0] || null
  } catch (error) {
    console.error('Failed to get user by email:', error)
    return null
  }
}

/**
 * Ban user
 */
export async function banUser(userId: string): Promise<void> {
  try {
    const client = await clerkClient()
    await client.users.banUser(userId)
  } catch (error) {
    console.error('Failed to ban user:', error)
    throw new Error('Failed to ban user')
  }
}

/**
 * Unban user
 */
export async function unbanUser(userId: string): Promise<void> {
  try {
    const client = await clerkClient()
    await client.users.unbanUser(userId)
  } catch (error) {
    console.error('Failed to unban user:', error)
    throw new Error('Failed to unban user')
  }
}

/**
 * Delete user account
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    const client = await clerkClient()
    await client.users.deleteUser(userId)
  } catch (error) {
    console.error('Failed to delete user:', error)
    throw new Error('Failed to delete user account')
  }
}

/**
 * Clerk webhook configuration
 */
export const CLERK_WEBHOOK_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  SESSION_CREATED: 'session.created',
  SESSION_ENDED: 'session.ended'
} as const

/**
 * OAuth provider configuration
 */
export const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    icon: '🔍',
    scopes: ['email', 'profile']
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    scopes: ['user:email']
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    scopes: ['identify', 'email']
  }
} as const