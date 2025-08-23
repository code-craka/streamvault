import { z } from 'zod'

// Base validation schemas
export const messageTypeSchema = z.enum([
  'text',
  'emote',
  'system',
  'super_chat',
])
export const prioritySchema = z.enum([
  'normal',
  'premium',
  'streamer',
  'system',
])
export const moderationActionSchema = z.enum([
  'none',
  'warn',
  'timeout',
  'delete',
  'ban',
])
export const moderationFlagTypeSchema = z.enum([
  'spam',
  'inappropriate',
  'toxic',
  'copyright',
  'custom',
])

// Chat message validation schemas
export const emoteUsageSchema = z.object({
  emoteId: z.string(),
  emoteName: z.string(),
  emoteUrl: z.string().url(),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  isCustom: z.boolean(),
  isAnimated: z.boolean(),
})

export const moderationFlagSchema = z.object({
  type: moderationFlagTypeSchema,
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  autoModerated: z.boolean(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.date().optional(),
  action: moderationActionSchema.optional(),
})

export const messageMetadataSchema = z.object({
  isStreamer: z.boolean(),
  isModerator: z.boolean(),
  isPremium: z.boolean(),
  userRole: z.enum(['viewer', 'streamer', 'admin']),
  subscriptionTier: z.enum(['basic', 'premium', 'pro']).optional(),
  priority: prioritySchema,
  emotes: z.array(emoteUsageSchema),
  mentions: z.array(z.string()),
  links: z.array(z.string().url()),
  moderationFlags: z.array(moderationFlagSchema),
  superChatAmount: z.number().positive().optional(),
  superChatCurrency: z.string().length(3).optional(),
})

export const createChatMessageSchema = z.object({
  streamId: z.string(),
  message: z.string().min(1).max(500),
  messageType: messageTypeSchema.default('text'),
  superChatAmount: z.number().positive().optional(),
  superChatCurrency: z.string().length(3).optional(),
})

export const chatMessageSchema = z.object({
  id: z.string(),
  streamId: z.string(),
  userId: z.string(),
  username: z.string(),
  userAvatar: z.string().url().optional(),
  message: z.string(),
  timestamp: z.date(),
  isDeleted: z.boolean(),
  deletedBy: z.string().optional(),
  deletedAt: z.date().optional(),
  messageType: messageTypeSchema,
  metadata: messageMetadataSchema,
})

// Chat room validation schemas
export const rateLimitSchema = z.object({
  tier: z.enum(['basic', 'premium', 'pro', 'default']),
  messagesPerSecond: z.number().min(0),
  messagesPerMinute: z.number().min(0),
  burstLimit: z.number().min(0),
})

export const chatSettingsSchema = z.object({
  isEnabled: z.boolean(),
  slowMode: z.number().min(0).max(300), // max 5 minutes
  subscriberOnly: z.boolean(),
  moderatorOnly: z.boolean(),
  emoteOnly: z.boolean(),
  linksAllowed: z.boolean(),
  maxMessageLength: z.number().min(1).max(500),
  profanityFilter: z.boolean(),
  spamProtection: z.boolean(),
  rateLimits: z.array(rateLimitSchema),
})

export const bannedUserSchema = z.object({
  userId: z.string(),
  username: z.string(),
  bannedBy: z.string(),
  bannedAt: z.date(),
  reason: z.string(),
  expiresAt: z.date().optional(),
  isPermanent: z.boolean(),
})

export const createChatRoomSchema = z.object({
  streamId: z.string(),
  settings: chatSettingsSchema,
  moderators: z.array(z.string()).default([]),
})

export const updateChatRoomSchema = z.object({
  id: z.string(),
  settings: chatSettingsSchema.partial(),
  moderators: z.array(z.string()).optional(),
})

export const chatRoomSchema = z.object({
  id: z.string(),
  streamId: z.string(),
  isActive: z.boolean(),
  messageCount: z.number().min(0),
  activeUsers: z.number().min(0),
  settings: chatSettingsSchema,
  moderators: z.array(z.string()),
  bannedUsers: z.array(bannedUserSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Custom emote validation schemas
export const emoteMetadataSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  isNSFW: z.boolean(),
  tags: z.array(z.string()),
  category: z.string().optional(),
  tier: z.enum(['basic', 'premium', 'pro']),
})

export const createCustomEmoteSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(25)
    .regex(/^[a-zA-Z0-9_]+$/),
  streamId: z.string().optional(), // null for global emotes
  isAnimated: z.boolean(),
  metadata: emoteMetadataSchema,
})

export const customEmoteSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  userId: z.string(),
  streamId: z.string().optional(),
  isAnimated: z.boolean(),
  isApproved: z.boolean(),
  usageCount: z.number().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: emoteMetadataSchema,
})

// Super chat validation schemas
export const createSuperChatSchema = z.object({
  messageId: z.string(),
  streamId: z.string(),
  amount: z.number().positive().min(1).max(500), // $1 to $500
  currency: z.string().length(3).default('USD'),
  message: z.string().min(1).max(200),
  displayDuration: z.number().min(5).max(300), // 5 seconds to 5 minutes
})

export const superChatSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  streamId: z.string(),
  userId: z.string(),
  username: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  message: z.string(),
  displayDuration: z.number(),
  color: z.string(),
  timestamp: z.date(),
  isProcessed: z.boolean(),
  stripePaymentId: z.string().optional(),
})

// Chat analytics validation schemas
export const topChatterSchema = z.object({
  userId: z.string(),
  username: z.string(),
  messageCount: z.number().min(0),
  superChatAmount: z.number().min(0),
  engagementScore: z.number().min(0).max(1),
})

export const chatAnalyticsSchema = z.object({
  streamId: z.string(),
  totalMessages: z.number().min(0),
  uniqueChatters: z.number().min(0),
  averageMessagesPerUser: z.number().min(0),
  peakConcurrentChatters: z.number().min(0),
  emotesUsed: z.record(z.number()),
  moderationActions: z.record(z.number()),
  superChatRevenue: z.number().min(0),
  engagementRate: z.number().min(0).max(1),
  sentimentScore: z.number().min(-1).max(1),
  topChatters: z.array(topChatterSchema),
  timeDistribution: z.record(z.number()),
})

// Chat event validation schemas
export const chatEventSchema = z.object({
  type: z.enum([
    'message',
    'user_join',
    'user_leave',
    'moderation',
    'super_chat',
    'emote_added',
  ]),
  streamId: z.string(),
  userId: z.string().optional(),
  data: z.any(),
  timestamp: z.date(),
})

// Moderation action validation schemas
export const moderationActionRequestSchema = z.object({
  messageId: z.string(),
  action: moderationActionSchema,
  reason: z.string(),
  duration: z.number().positive().optional(), // for timeouts in minutes
})

export const banUserSchema = z.object({
  userId: z.string(),
  streamId: z.string(),
  reason: z.string(),
  duration: z.number().positive().optional(), // in minutes, undefined for permanent
})

// Query validation schemas
export const chatMessageQuerySchema = z.object({
  streamId: z.string(),
  userId: z.string().optional(),
  messageType: messageTypeSchema.optional(),
  limit: z.number().min(1).max(100).default(50),
  before: z.date().optional(),
  after: z.date().optional(),
  includeDeleted: z.boolean().default(false),
})

export const chatAnalyticsQuerySchema = z.object({
  streamId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  granularity: z.enum(['hour', 'day', 'week']).default('hour'),
})

// Export types inferred from schemas
export type CreateChatMessageInput = z.infer<typeof createChatMessageSchema>
export type CreateChatRoomInput = z.infer<typeof createChatRoomSchema>
export type UpdateChatRoomInput = z.infer<typeof updateChatRoomSchema>
export type CreateCustomEmoteInput = z.infer<typeof createCustomEmoteSchema>
export type CreateSuperChatInput = z.infer<typeof createSuperChatSchema>
export type ModerationActionRequest = z.infer<
  typeof moderationActionRequestSchema
>
export type BanUserRequest = z.infer<typeof banUserSchema>
export type ChatMessageQueryInput = z.infer<typeof chatMessageQuerySchema>
export type ChatAnalyticsQueryInput = z.infer<typeof chatAnalyticsQuerySchema>
