import { z } from 'zod'

// Base validation schemas
export const userRoleSchema = z.enum(['viewer', 'streamer', 'admin'])
export const subscriptionTierSchema = z.enum(['basic', 'premium', 'pro'])
export const subscriptionStatusSchema = z.enum([
  'active',
  'canceled',
  'past_due',
])
export const themeSchema = z.enum(['light', 'dark', 'auto'])

// User preferences validation schemas
export const notificationSettingsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  sms: z.boolean(),
  followedStreamersLive: z.boolean(),
  newFollowers: z.boolean(),
  subscriptionUpdates: z.boolean(),
  systemAnnouncements: z.boolean(),
})

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'followers', 'private']),
  showViewingHistory: z.boolean(),
  showFollowingList: z.boolean(),
  allowDirectMessages: z.boolean(),
  dataCollection: z.boolean(),
})

export const streamingPreferencesSchema = z.object({
  defaultQuality: z.enum(['auto', '480p', '720p', '1080p', '4K']),
  autoRecord: z.boolean(),
  chatModeration: z.enum(['low', 'medium', 'high']),
  defaultCategory: z.string().optional(),
  streamNotifications: z.boolean(),
})

export const playbackPreferencesSchema = z.object({
  autoplay: z.boolean(),
  defaultVolume: z.number().min(0).max(1),
  playbackSpeed: z.number().min(0.25).max(2),
  subtitlesEnabled: z.boolean(),
  subtitleLanguage: z.string(),
  theaterMode: z.boolean(),
})

export const userPreferencesSchema = z.object({
  theme: themeSchema,
  language: z.string(),
  notifications: notificationSettingsSchema,
  privacy: privacySettingsSchema,
  streaming: streamingPreferencesSchema,
  playback: playbackPreferencesSchema,
})

export const geographicDataSchema = z.object({
  country: z.string(),
  region: z.string(),
  city: z.string(),
})

export const userAnalyticsSchema = z.object({
  totalWatchTime: z.number().min(0),
  streamsWatched: z.number().min(0),
  averageSessionDuration: z.number().min(0),
  favoriteCategories: z.array(z.string()),
  deviceUsage: z.record(z.number()),
  geographicData: geographicDataSchema,
  engagementScore: z.number().min(0).max(1),
  lastActivityAt: z.date(),
})

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatar: z.string().url().optional(),
  role: userRoleSchema.default('viewer'),
})

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatar: z.string().url().optional(),
  preferences: userPreferencesSchema.partial().optional(),
})

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  role: userRoleSchema,
  subscriptionTier: subscriptionTierSchema.nullable(),
  subscriptionStatus: subscriptionStatusSchema.nullable(),
  subscriptionId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date(),
  isActive: z.boolean(),
  preferences: userPreferencesSchema,
  analytics: userAnalyticsSchema,
})

// User profile validation schemas
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
})

export const updatePreferencesSchema = userPreferencesSchema.partial()

// User subscription validation schemas
export const subscriptionDataSchema = z.object({
  tier: subscriptionTierSchema,
  status: subscriptionStatusSchema,
  subscriptionId: z.string(),
  customerId: z.string(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean(),
  trialEnd: z.date().optional(),
})

export const updateSubscriptionSchema = z.object({
  tier: subscriptionTierSchema.optional(),
  status: subscriptionStatusSchema.optional(),
  subscriptionId: z.string().optional(),
  customerId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
})

// User activity validation schemas
export const userActivitySchema = z.object({
  userId: z.string(),
  activityType: z.enum([
    'stream_view',
    'vod_view',
    'chat_message',
    'follow',
    'subscription',
    'donation',
  ]),
  resourceId: z.string(), // streamId, vodId, etc.
  metadata: z.record(z.any()).optional(),
  timestamp: z.date(),
  sessionId: z.string().optional(),
  deviceInfo: z
    .object({
      userAgent: z.string(),
      platform: z.string(),
      browser: z.string(),
      isMobile: z.boolean(),
    })
    .optional(),
})

// User follow/following validation schemas
export const followUserSchema = z.object({
  followerId: z.string(),
  followingId: z.string(),
  followedAt: z.date(),
  notificationsEnabled: z.boolean().default(true),
})

export const unfollowUserSchema = z.object({
  followerId: z.string(),
  followingId: z.string(),
})

// User search and query validation schemas
export const userQuerySchema = z.object({
  search: z.string().optional(),
  role: userRoleSchema.optional(),
  subscriptionTier: subscriptionTierSchema.optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  orderBy: z
    .enum(['createdAt', 'updatedAt', 'username', 'lastLoginAt'])
    .default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
})

export const userStatsQuerySchema = z.object({
  userId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
})

// Admin user management validation schemas
export const adminUpdateUserSchema = z.object({
  id: z.string(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  subscriptionTier: subscriptionTierSchema.nullable().optional(),
  subscriptionStatus: subscriptionStatusSchema.nullable().optional(),
  notes: z.string().optional(),
})

export const banUserSchema = z.object({
  userId: z.string(),
  reason: z.string(),
  duration: z.number().positive().optional(), // in hours, undefined for permanent
  bannedBy: z.string(),
})

export const unbanUserSchema = z.object({
  userId: z.string(),
  unbannedBy: z.string(),
  reason: z.string().optional(),
})

// User notification validation schemas
export const createNotificationSchema = z.object({
  userId: z.string(),
  type: z.enum([
    'stream_live',
    'new_follower',
    'subscription_update',
    'system_announcement',
    'content_update',
  ]),
  title: z.string(),
  message: z.string(),
  actionUrl: z.string().url().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  expiresAt: z.date().optional(),
})

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    'stream_live',
    'new_follower',
    'subscription_update',
    'system_announcement',
    'content_update',
  ]),
  title: z.string(),
  message: z.string(),
  actionUrl: z.string().url().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  isRead: z.boolean(),
  createdAt: z.date(),
  readAt: z.date().optional(),
  expiresAt: z.date().optional(),
})

// Export types inferred from schemas
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type UserQueryInput = z.infer<typeof userQuerySchema>
export type UserStatsQueryInput = z.infer<typeof userStatsQuerySchema>
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>
export type BanUserInput = z.infer<typeof banUserSchema>
export type UnbanUserInput = z.infer<typeof unbanUserSchema>
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
export type UserActivityInput = z.infer<typeof userActivitySchema>
export type FollowUserInput = z.infer<typeof followUserSchema>
export type UnfollowUserInput = z.infer<typeof unfollowUserSchema>
