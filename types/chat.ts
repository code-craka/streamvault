// Chat and messaging related types
export interface ChatMessage {
  id: string
  streamId: string
  userId: string
  username: string
  userAvatar?: string
  message: string
  timestamp: Date
  isDeleted: boolean
  deletedBy?: string
  deletedAt?: Date
  messageType: 'text' | 'emote' | 'system' | 'super_chat'
  metadata: MessageMetadata
}

export interface MessageMetadata {
  isStreamer: boolean
  isModerator: boolean
  isPremium: boolean
  userRole: 'viewer' | 'streamer' | 'admin'
  subscriptionTier?: SubscriptionTier
  priority: 'normal' | 'premium' | 'streamer' | 'system'
  emotes: EmoteUsage[]
  mentions: string[]
  links: string[]
  moderationFlags: ModerationFlag[]
  superChatAmount?: number
  superChatCurrency?: string
}

export interface EmoteUsage {
  emoteId: string
  emoteName: string
  emoteUrl: string
  startIndex: number
  endIndex: number
  isCustom: boolean
  isAnimated: boolean
}

export interface ModerationFlag {
  type: 'spam' | 'inappropriate' | 'toxic' | 'copyright' | 'custom'
  confidence: number
  reason: string
  autoModerated: boolean
  reviewedBy?: string
  reviewedAt?: Date
  action?: 'none' | 'warn' | 'timeout' | 'delete' | 'ban'
}

export interface ChatRoom {
  id: string
  streamId: string
  isActive: boolean
  messageCount: number
  activeUsers: number
  settings: ChatSettings
  moderators: string[]
  bannedUsers: BannedUser[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatSettings {
  isEnabled: boolean
  slowMode: number // seconds between messages
  subscriberOnly: boolean
  moderatorOnly: boolean
  emoteOnly: boolean
  linksAllowed: boolean
  maxMessageLength: number
  profanityFilter: boolean
  spamProtection: boolean
  rateLimits: RateLimit[]
}

export interface RateLimit {
  tier: SubscriptionTier | 'default'
  messagesPerSecond: number
  messagesPerMinute: number
  burstLimit: number
}

export interface BannedUser {
  userId: string
  username: string
  bannedBy: string
  bannedAt: Date
  reason: string
  expiresAt?: Date
  isPermanent: boolean
}

export interface CustomEmote {
  id: string
  name: string
  url: string
  userId: string
  streamId?: string // null for global emotes
  isAnimated: boolean
  isApproved: boolean
  usageCount: number
  createdAt: Date
  updatedAt: Date
  metadata: EmoteMetadata
}

export interface EmoteMetadata {
  width: number
  height: number
  fileSize: number
  mimeType: string
  isNSFW: boolean
  tags: string[]
  category?: string
  tier: SubscriptionTier
}

export interface SuperChat {
  id: string
  messageId: string
  streamId: string
  userId: string
  username: string
  amount: number
  currency: string
  message: string
  displayDuration: number // seconds to highlight
  color: string
  timestamp: Date
  isProcessed: boolean
  stripePaymentId?: string
}

export interface ChatAnalytics {
  streamId: string
  totalMessages: number
  uniqueChatters: number
  averageMessagesPerUser: number
  peakConcurrentChatters: number
  emotesUsed: Record<string, number>
  moderationActions: Record<string, number>
  superChatRevenue: number
  engagementRate: number
  sentimentScore: number
  topChatters: TopChatter[]
  timeDistribution: Record<string, number>
}

export interface TopChatter {
  userId: string
  username: string
  messageCount: number
  superChatAmount: number
  engagementScore: number
}

// Real-time chat events
export interface ChatEvent {
  type:
    | 'message'
    | 'user_join'
    | 'user_leave'
    | 'moderation'
    | 'super_chat'
    | 'emote_added'
  streamId: string
  userId?: string
  data: any
  timestamp: Date
}

export type SubscriptionTier = 'basic' | 'premium' | 'pro'
