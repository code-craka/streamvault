// User authentication and authorization type definitions

export type UserRole = 'viewer' | 'streamer' | 'admin'

export type SubscriptionTier = 'basic' | 'premium' | 'pro'

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'

// User metadata stored in Clerk publicMetadata
export interface UserMetadata {
  role: UserRole
  subscriptionTier: SubscriptionTier | null
  subscriptionStatus: SubscriptionStatus | null
  subscriptionId?: string
  customerId?: string
  createdAt: string
  updatedAt: string
  preferences?: UserPreferences
}

// User preferences and settings
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
    showOnlineStatus: boolean
    allowDirectMessages: boolean
    showViewingHistory: boolean
  }
  streaming: {
    defaultQuality: '480p' | '720p' | '1080p' | '4K'
    autoPlay: boolean
    chatEnabled: boolean
  }
}

// User analytics interface
export interface UserAnalytics {
  totalWatchTime: number
  streamsWatched: number
  averageSessionDuration: number
  favoriteCategories: string[]
  deviceUsage: Record<string, number>
  geographicData: {
    country: string
    region: string
    city: string
  }
  engagementScore: number
  lastActivityAt: Date
}

// Complete User interface for database operations
export interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatar?: string
  role: UserRole
  subscriptionTier: SubscriptionTier | null
  subscriptionStatus: SubscriptionStatus | null
  subscriptionId?: string
  stripeCustomerId?: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date
  isActive: boolean
  preferences: UserPreferences
  analytics: UserAnalytics
}

// Extended user interface combining Clerk user with our metadata
export interface StreamVaultUser {
  id: string
  email: string
  username: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string
  role: UserRole
  subscriptionTier: SubscriptionTier | null
  subscriptionStatus: SubscriptionStatus | null
  subscriptionId?: string
  customerId?: string
  preferences?: UserPreferences
  createdAt: Date
  updatedAt: Date
}

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  streamer: 1,
  admin: 2,
} as const

// Subscription tier hierarchy for feature access
export const SUBSCRIPTION_HIERARCHY: Record<SubscriptionTier, number> = {
  basic: 0,
  premium: 1,
  pro: 2,
} as const

// Permission definitions
export interface Permission {
  resource: string
  action: string
  conditions?: Record<string, any>
}

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'stream'
  | 'moderate'
  | 'admin'

export type PermissionResource =
  | 'stream'
  | 'video'
  | 'chat'
  | 'user'
  | 'subscription'
  | 'analytics'
  | 'settings'

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: [
    { resource: 'stream', action: 'read' },
    { resource: 'video', action: 'read' },
    { resource: 'chat', action: 'create' },
    { resource: 'chat', action: 'read' },
    { resource: 'user', action: 'update', conditions: { self: true } },
  ],
  streamer: [
    { resource: 'stream', action: 'read' },
    { resource: 'stream', action: 'create' },
    { resource: 'stream', action: 'update', conditions: { owner: true } },
    { resource: 'stream', action: 'delete', conditions: { owner: true } },
    { resource: 'video', action: 'read' },
    { resource: 'video', action: 'create' },
    { resource: 'video', action: 'update', conditions: { owner: true } },
    { resource: 'video', action: 'delete', conditions: { owner: true } },
    { resource: 'chat', action: 'create' },
    { resource: 'chat', action: 'read' },
    { resource: 'chat', action: 'moderate', conditions: { ownStream: true } },
    { resource: 'analytics', action: 'read', conditions: { owner: true } },
    { resource: 'user', action: 'update', conditions: { self: true } },
  ],
  admin: [
    { resource: 'stream', action: 'create' },
    { resource: 'stream', action: 'read' },
    { resource: 'stream', action: 'update' },
    { resource: 'stream', action: 'delete' },
    { resource: 'video', action: 'create' },
    { resource: 'video', action: 'read' },
    { resource: 'video', action: 'update' },
    { resource: 'video', action: 'delete' },
    { resource: 'chat', action: 'create' },
    { resource: 'chat', action: 'read' },
    { resource: 'chat', action: 'moderate' },
    { resource: 'user', action: 'create' },
    { resource: 'user', action: 'read' },
    { resource: 'user', action: 'update' },
    { resource: 'user', action: 'delete' },
    { resource: 'subscription', action: 'read' },
    { resource: 'subscription', action: 'update' },
    { resource: 'analytics', action: 'read' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
  ],
} as const

// Authentication context type
export interface AuthContext {
  user: StreamVaultUser | null
  isLoading: boolean
  isSignedIn: boolean
  hasRole: (role: UserRole) => boolean
  hasSubscription: (tier: SubscriptionTier) => boolean
  hasPermission: (
    resource: PermissionResource,
    action: PermissionAction,
    conditions?: Record<string, any>
  ) => boolean
  updateUserMetadata: (metadata: Partial<UserMetadata>) => Promise<void>
  signOut: () => Promise<void>
}

// Route protection types
export interface RouteProtectionConfig {
  requireAuth: boolean
  requiredRole?: UserRole
  requiredSubscription?: SubscriptionTier
  permissions?: Permission[]
  redirectTo?: string
}

// Session management types
export interface UserSession {
  userId: string
  sessionId: string
  role: UserRole
  subscriptionTier: SubscriptionTier | null
  permissions: Permission[]
  expiresAt: Date
  lastActivity: Date
}

// Audit log types for security tracking
export interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  success: boolean
  errorMessage?: string
}

// Error types for authentication
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403,
    public requiredRole?: UserRole,
    public requiredSubscription?: SubscriptionTier
  ) {
    super(message)
    this.name = 'AuthorizationError'
  }
}
