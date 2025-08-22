// User and Authentication Types
export interface User {
  id: string
  email: string
  username?: string
  firstName?: string
  lastName?: string
  avatar?: string
  role: UserRole
  subscriptionTier: SubscriptionTier | null
  subscriptionStatus: SubscriptionStatus | null
  subscriptionId?: string
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'viewer' | 'streamer' | 'admin'

export type SubscriptionTier = 'basic' | 'premium' | 'pro'

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing'

export interface UserMetadata {
  role: UserRole
  subscriptionTier: SubscriptionTier | null
  subscriptionStatus: SubscriptionStatus | null
  subscriptionId?: string
  stripeCustomerId?: string
  onboardingCompleted?: boolean
  preferences?: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: {
    email: boolean
    push: boolean
    streamStart: boolean
    newFollower: boolean
    chatMention: boolean
  }
  privacy: {
    profileVisible: boolean
    showOnlineStatus: boolean
    allowDirectMessages: boolean
  }
}

export interface AuthSession {
  userId: string
  sessionId: string
  expiresAt: Date
  isActive: boolean
  lastActivity: Date
  ipAddress?: string
  userAgent?: string
}

export interface AuthError {
  code: string
  message: string
  details?: Record<string, any>
}

// Role-based permissions
export interface RolePermissions {
  canStream: boolean
  canModerate: boolean
  canAccessAdmin: boolean
  canManageUsers: boolean
  canViewAnalytics: boolean
  canManageSubscriptions: boolean
  maxConcurrentStreams: number
  maxStorageGB: number
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  viewer: {
    canStream: false,
    canModerate: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageSubscriptions: false,
    maxConcurrentStreams: 0,
    maxStorageGB: 0
  },
  streamer: {
    canStream: true,
    canModerate: true,
    canAccessAdmin: false,
    canManageUsers: false,
    canViewAnalytics: true,
    canManageSubscriptions: false,
    maxConcurrentStreams: 3,
    maxStorageGB: 100
  },
  admin: {
    canStream: true,
    canModerate: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canManageSubscriptions: true,
    maxConcurrentStreams: -1, // unlimited
    maxStorageGB: -1 // unlimited
  }
}

// OAuth provider types
export type OAuthProvider = 'google' | 'github' | 'discord'

export interface OAuthAccount {
  provider: OAuthProvider
  providerAccountId: string
  email: string
  name?: string
  avatar?: string
  connectedAt: Date
}