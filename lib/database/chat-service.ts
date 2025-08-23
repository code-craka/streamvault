import { BaseService } from './base-service'
import { COLLECTIONS, SUBCOLLECTIONS } from '@/types/database'
import type { ChatMessage, ChatRoom, CustomEmote, SuperChat } from '@/types/chat'
import type { DatabaseResult, QueryOptions } from '@/types/database'
import type { 
  CreateChatMessageInput, 
  CreateChatRoomInput, 
  UpdateChatRoomInput,
  CreateCustomEmoteInput,
  CreateSuperChatInput,
  ChatMessageQueryInput 
} from '@/lib/validations/chat'
import { collection, doc, addDoc, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export class ChatService extends BaseService<ChatMessage> {
  constructor() {
    super(COLLECTIONS.CHAT_MESSAGES)
  }

  /**
   * Create a chat message
   */
  async createMessage(userId: string, username: string, messageData: CreateChatMessageInput): Promise<DatabaseResult<ChatMessage>> {
    const messageToCreate = {
      ...messageData,
      userId,
      username,
      timestamp: new Date(),
      isDeleted: false,
      metadata: {
        isStreamer: false, // This should be determined by checking user role
        isModerator: false, // This should be determined by checking user role
        isPremium: false, // This should be determined by checking user subscription
        userRole: 'viewer' as const,
        priority: 'normal' as const,
        emotes: [],
        mentions: [],
        links: [],
        moderationFlags: [],
      },
    }

    return this.create(messageToCreate)
  }

  /**
   * Get messages for a stream
   */
  async getStreamMessages(queryInput: ChatMessageQueryInput): Promise<DatabaseResult<ChatMessage[]>> {
    const queryOptions: QueryOptions = {
      limit: queryInput.limit,
      where: [
        { field: 'streamId', operator: '==', value: queryInput.streamId },
      ],
      orderBy: [
        { field: 'timestamp', direction: 'desc' },
      ],
    }

    // Add additional filters
    if (queryInput.userId) {
      queryOptions.where!.push({
        field: 'userId',
        operator: '==',
        value: queryInput.userId,
      })
    }

    if (queryInput.messageType) {
      queryOptions.where!.push({
        field: 'messageType',
        operator: '==',
        value: queryInput.messageType,
      })
    }

    if (queryInput.before) {
      queryOptions.where!.push({
        field: 'timestamp',
        operator: '<',
        value: queryInput.before,
      })
    }

    if (queryInput.after) {
      queryOptions.where!.push({
        field: 'timestamp',
        operator: '>',
        value: queryInput.after,
      })
    }

    if (!queryInput.includeDeleted) {
      queryOptions.where!.push({
        field: 'isDeleted',
        operator: '==',
        value: false,
      })
    }

    const result = await this.query(queryOptions)
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        code: result.code,
      }
    }

    return {
      success: true,
      data: result.data!.items,
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, deletedBy: string): Promise<DatabaseResult<ChatMessage>> {
    return this.update(messageId, {
      isDeleted: true,
      deletedBy,
      deletedAt: new Date(),
    })
  }

  /**
   * Subscribe to real-time messages
   */
  subscribeToMessages(streamId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const messagesRef = collection(db, COLLECTIONS.CHAT_MESSAGES)
    const q = query(
      messagesRef,
      where('streamId', '==', streamId),
      where('isDeleted', '==', false),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = []
      snapshot.forEach((doc) => {
        const data = this.transformFromFirestore(doc.data(), doc.id)
        messages.push(data)
      })
      callback(messages.reverse()) // Reverse to show oldest first
    })
  }
}

export class ChatRoomService extends BaseService<ChatRoom> {
  constructor() {
    super(COLLECTIONS.CHAT_ROOMS)
  }

  /**
   * Create a chat room
   */
  async createChatRoom(roomData: CreateChatRoomInput): Promise<DatabaseResult<ChatRoom>> {
    const roomToCreate = {
      ...roomData,
      isActive: true,
      messageCount: 0,
      activeUsers: 0,
      bannedUsers: [],
    }

    return this.create(roomToCreate)
  }

  /**
   * Update chat room settings
   */
  async updateChatRoom(roomData: UpdateChatRoomInput): Promise<DatabaseResult<ChatRoom>> {
    const { id, ...updateData } = roomData
    return this.update(id, updateData as any)
  }

  /**
   * Get chat room by stream ID
   */
  async getChatRoomByStreamId(streamId: string): Promise<DatabaseResult<ChatRoom | null>> {
    const result = await this.getByField('streamId', streamId)
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        code: result.code,
      }
    }

    return {
      success: true,
      data: result.data!.length > 0 ? result.data![0] : null,
    }
  }

  /**
   * Ban user from chat
   */
  async banUser(roomId: string, userId: string, username: string, bannedBy: string, reason: string, duration?: number): Promise<DatabaseResult<ChatRoom>> {
    const room = await this.getById(roomId)
    if (!room.success || !room.data) {
      return room
    }

    const bannedUser = {
      userId,
      username,
      bannedBy,
      bannedAt: new Date(),
      reason,
      expiresAt: duration ? new Date(Date.now() + duration * 60 * 1000) : undefined,
      isPermanent: !duration,
    }

    const updatedBannedUsers = [...room.data.bannedUsers, bannedUser]

    return this.update(roomId, {
      bannedUsers: updatedBannedUsers,
    })
  }

  /**
   * Unban user from chat
   */
  async unbanUser(roomId: string, userId: string): Promise<DatabaseResult<ChatRoom>> {
    const room = await this.getById(roomId)
    if (!room.success || !room.data) {
      return room
    }

    const updatedBannedUsers = room.data.bannedUsers.filter(
      bannedUser => bannedUser.userId !== userId
    )

    return this.update(roomId, {
      bannedUsers: updatedBannedUsers,
    })
  }

  /**
   * Update active user count
   */
  async updateActiveUsers(roomId: string, count: number): Promise<DatabaseResult<ChatRoom>> {
    return this.update(roomId, {
      activeUsers: count,
    })
  }

  /**
   * Increment message count
   */
  async incrementMessageCount(roomId: string): Promise<DatabaseResult<ChatRoom>> {
    const room = await this.getById(roomId)
    if (!room.success || !room.data) {
      return room
    }

    return this.update(roomId, {
      messageCount: room.data.messageCount + 1,
    })
  }
}

export class CustomEmoteService extends BaseService<CustomEmote> {
  constructor() {
    super(COLLECTIONS.CUSTOM_EMOTES)
  }

  /**
   * Create a custom emote
   */
  async createEmote(userId: string, emoteData: CreateCustomEmoteInput & { url: string }): Promise<DatabaseResult<CustomEmote>> {
    const emoteToCreate = {
      ...emoteData,
      userId,
      isApproved: false,
      usageCount: 0,
    }

    return this.create(emoteToCreate)
  }

  /**
   * Get emotes by stream
   */
  async getEmotesByStream(streamId: string): Promise<DatabaseResult<CustomEmote[]>> {
    const queryOptions: QueryOptions = {
      where: [
        { field: 'streamId', operator: '==', value: streamId },
        { field: 'isApproved', operator: '==', value: true },
      ],
      orderBy: [
        { field: 'usageCount', direction: 'desc' },
      ],
    }

    const result = await this.query(queryOptions)
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        code: result.code,
      }
    }

    return {
      success: true,
      data: result.data!.items,
    }
  }

  /**
   * Get global emotes
   */
  async getGlobalEmotes(): Promise<DatabaseResult<CustomEmote[]>> {
    const queryOptions: QueryOptions = {
      where: [
        { field: 'streamId', operator: '==', value: null },
        { field: 'isApproved', operator: '==', value: true },
      ],
      orderBy: [
        { field: 'usageCount', direction: 'desc' },
      ],
    }

    const result = await this.query(queryOptions)
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        code: result.code,
      }
    }

    return {
      success: true,
      data: result.data!.items,
    }
  }

  /**
   * Approve emote
   */
  async approveEmote(emoteId: string): Promise<DatabaseResult<CustomEmote>> {
    return this.update(emoteId, {
      isApproved: true,
    })
  }

  /**
   * Increment usage count
   */
  async incrementUsage(emoteId: string): Promise<DatabaseResult<CustomEmote>> {
    const emote = await this.getById(emoteId)
    if (!emote.success || !emote.data) {
      return emote
    }

    return this.update(emoteId, {
      usageCount: emote.data.usageCount + 1,
    })
  }
}

export class SuperChatService extends BaseService<SuperChat> {
  constructor() {
    super(COLLECTIONS.SUPER_CHATS)
  }

  /**
   * Create a super chat
   */
  async createSuperChat(userId: string, username: string, superChatData: CreateSuperChatInput): Promise<DatabaseResult<SuperChat>> {
    // Calculate display duration and color based on amount
    const { displayDuration, color } = this.calculateSuperChatProperties(superChatData.amount)

    const superChatToCreate = {
      ...superChatData,
      userId,
      username,
      displayDuration,
      color,
      timestamp: new Date(),
      isProcessed: false,
    }

    return this.create(superChatToCreate)
  }

  /**
   * Get super chats for stream
   */
  async getSuperChatsByStream(streamId: string, options: QueryOptions = {}): Promise<DatabaseResult<SuperChat[]>> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [
        ...(options.where || []),
        { field: 'streamId', operator: '==', value: streamId },
      ],
      orderBy: [
        { field: 'timestamp', direction: 'desc' },
      ],
    }

    const result = await this.query(queryOptions)
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        code: result.code,
      }
    }

    return {
      success: true,
      data: result.data!.items,
    }
  }

  /**
   * Mark super chat as processed
   */
  async markAsProcessed(superChatId: string, stripePaymentId: string): Promise<DatabaseResult<SuperChat>> {
    return this.update(superChatId, {
      isProcessed: true,
      stripePaymentId,
    })
  }

  /**
   * Calculate super chat properties based on amount
   */
  private calculateSuperChatProperties(amount: number): { displayDuration: number; color: string } {
    if (amount >= 100) {
      return { displayDuration: 300, color: '#FF0000' } // 5 minutes, red
    } else if (amount >= 50) {
      return { displayDuration: 180, color: '#FF6600' } // 3 minutes, orange
    } else if (amount >= 20) {
      return { displayDuration: 120, color: '#FFFF00' } // 2 minutes, yellow
    } else if (amount >= 10) {
      return { displayDuration: 60, color: '#00FF00' } // 1 minute, green
    } else if (amount >= 5) {
      return { displayDuration: 30, color: '#0099FF' } // 30 seconds, blue
    } else {
      return { displayDuration: 15, color: '#9999FF' } // 15 seconds, light blue
    }
  }
}