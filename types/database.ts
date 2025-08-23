// Database schema and collection types
import { Timestamp } from 'firebase/firestore'

// Firestore document interfaces (with Firestore-specific types)
export interface FirestoreUser {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatar?: string
  role: 'viewer' | 'streamer' | 'admin'
  subscriptionTier: 'basic' | 'premium' | 'pro' | null
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | null
  subscriptionId?: string
  stripeCustomerId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp
  isActive: boolean
  preferences: UserPreferences
  analytics: UserAnalytics
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  notifications: NotificationSettings
  privacy: PrivacySettings
  streaming: StreamingPreferences
  playback: PlaybackPreferences
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  followedStreamersLive: boolean
  newFollowers: boolean
  subscriptionUpdates: boolean
  systemAnnouncements: boolean
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'followers' | 'private'
  showViewingHistory: boolean
  showFollowingList: boolean
  allowDirectMessages: boolean
  dataCollection: boolean
}

export interface StreamingPreferences {
  defaultQuality: 'auto' | '480p' | '720p' | '1080p' | '4K'
  autoRecord: boolean
  chatModeration: 'low' | 'medium' | 'high'
  defaultCategory?: string
  streamNotifications: boolean
}

export interface PlaybackPreferences {
  autoplay: boolean
  defaultVolume: number
  playbackSpeed: number
  subtitlesEnabled: boolean
  subtitleLanguage: string
  theaterMode: boolean
}

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
  lastActivityAt: Timestamp
}

export interface FirestoreStream {
  id: string
  userId: string
  title: string
  description?: string
  category?: string
  tags: string[]
  streamKey: string
  rtmpUrl: string
  hlsUrl: string
  status: 'inactive' | 'active' | 'ended' | 'error'
  isLive: boolean
  viewerCount: number
  maxViewers: number
  startedAt?: Timestamp
  endedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  settings: any // StreamSettings from streaming.ts
  metadata: any // StreamMetadata from streaming.ts
}

export interface FirestoreVOD {
  id: string
  streamId?: string
  userId: string
  title: string
  description?: string
  category?: string
  tags: string[]
  duration: number
  fileSize: number
  status: 'processing' | 'ready' | 'error' | 'deleted'
  visibility: 'public' | 'unlisted' | 'private'
  requiredTier: 'basic' | 'premium' | 'pro'
  gcsPath: string
  thumbnailUrl?: string
  previewUrl?: string
  viewCount: number
  likeCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
  publishedAt?: Timestamp
  metadata: any // VODMetadata from streaming.ts
  analytics: any // VODAnalytics from streaming.ts
}

export interface FirestoreChatMessage {
  id: string
  streamId: string
  userId: string
  username: string
  userAvatar?: string
  message: string
  timestamp: Timestamp
  isDeleted: boolean
  deletedBy?: string
  deletedAt?: Timestamp
  messageType: 'text' | 'emote' | 'system' | 'super_chat'
  metadata: any // MessageMetadata from chat.ts
}

export interface FirestoreChatRoom {
  id: string
  streamId: string
  isActive: boolean
  messageCount: number
  activeUsers: number
  settings: any // ChatSettings from chat.ts
  moderators: string[]
  bannedUsers: any[] // BannedUser[] from chat.ts
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Collection names and paths
export const COLLECTIONS = {
  USERS: 'users',
  STREAMS: 'streams',
  VODS: 'vods',
  CHAT_ROOMS: 'chatRooms',
  CHAT_MESSAGES: 'chatMessages',
  CUSTOM_EMOTES: 'customEmotes',
  SUPER_CHATS: 'superChats',
  ANALYTICS: 'analytics',
  SUBSCRIPTIONS: 'subscriptions',
  NOTIFICATIONS: 'notifications',
} as const

// Subcollection paths
export const SUBCOLLECTIONS = {
  STREAM_MESSAGES: (streamId: string) =>
    `${COLLECTIONS.STREAMS}/${streamId}/messages`,
  STREAM_ANALYTICS: (streamId: string) =>
    `${COLLECTIONS.STREAMS}/${streamId}/analytics`,
  USER_NOTIFICATIONS: (userId: string) =>
    `${COLLECTIONS.USERS}/${userId}/notifications`,
  USER_SUBSCRIPTIONS: (userId: string) =>
    `${COLLECTIONS.USERS}/${userId}/subscriptions`,
  VOD_COMMENTS: (vodId: string) => `${COLLECTIONS.VODS}/${vodId}/comments`,
} as const

// Query constraints and indexes
export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: {
    field: string
    direction: 'asc' | 'desc'
  }[]
  where?: {
    field: string
    operator:
      | '=='
      | '!='
      | '<'
      | '<='
      | '>'
      | '>='
      | 'in'
      | 'not-in'
      | 'array-contains'
      | 'array-contains-any'
    value: any
  }[]
}

// Database operation results
export interface DatabaseResult<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

// Import types from other files to avoid duplication
export type {
  StreamSettings,
  StreamMetadata,
  VODMetadata,
  VODAnalytics,
} from './streaming'

export type {
  ChatMessage,
  ChatRoom,
  CustomEmote,
  SuperChat,
  MessageMetadata,
  ChatSettings,
  BannedUser,
  EmoteUsage,
  ModerationFlag,
  RateLimit,
} from './chat'
