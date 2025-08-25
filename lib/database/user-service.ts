import { BaseService } from './base-service'
import { COLLECTIONS } from '@/types/database'

import type { User } from '@/types/auth'
import type { DatabaseResult, QueryOptions } from '@/types/database'
import type {
  CreateUserInput,
  UpdateUserInput,
  UserQueryInput,
} from '@/lib/validations/user'


export class UserService extends BaseService<User> {
  constructor() {
    super(COLLECTIONS.USERS)
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserInput): Promise<DatabaseResult<User>> {
    // Check if username is already taken
    const existingUser = await this.getUserByUsername(userData.username)
    if (existingUser.success && existingUser.data) {
      return {
        success: false,
        error: 'Username already exists',
        code: 'USERNAME_EXISTS',
      }
    }

    // Check if email is already taken
    const existingEmail = await this.getUserByEmail(userData.email)
    if (existingEmail.success && existingEmail.data) {
      return {
        success: false,
        error: 'Email already exists',
        code: 'EMAIL_EXISTS',
      }
    }

    const defaultPreferences = {
      theme: 'dark' as const,
      language: 'en',
      notifications: {
        email: true,
        push: true,
        streamStart: true,
        newFollower: true,
        chatMention: false,
      },
      privacy: {
        showOnlineStatus: true,
        allowDirectMessages: true,
        showViewingHistory: false,
      },
      streaming: {
        defaultQuality: '720p' as const,
        autoPlay: false,
        chatEnabled: true,
      },
    }

    const defaultAnalytics = {
      totalWatchTime: 0,
      streamsWatched: 0,
      averageSessionDuration: 0,
      favoriteCategories: [],
      deviceUsage: {},
      geographicData: {
        country: '',
        region: '',
        city: '',
      },
      engagementScore: 0,
      lastActivityAt: new Date(),
    }

    const userToCreate = {
      ...userData,
      subscriptionTier: null,
      subscriptionStatus: null,
      isActive: true,
      lastLoginAt: new Date(),
      preferences: defaultPreferences,
      analytics: defaultAnalytics,
    }

    return this.create(userToCreate)
  }

  /**
   * Update user profile
   */
  async updateUser(
    id: string,
    userData: UpdateUserInput
  ): Promise<DatabaseResult<User>> {
    // If username is being updated, check if it's available
    if (userData.username) {
      const existingUser = await this.getUserByUsername(userData.username)
      if (
        existingUser.success &&
        existingUser.data &&
        existingUser.data.id !== id
      ) {
        return {
          success: false,
          error: 'Username already exists',
          code: 'USERNAME_EXISTS',
        }
      }
    }

    return this.update(id, userData as any)
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<DatabaseResult<User | null>> {
    const result = await this.getByField('email', email)
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
   * Get user by username
   */
  async getUserByUsername(
    username: string
  ): Promise<DatabaseResult<User | null>> {
    const result = await this.getByField('username', username)
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
   * Get users by role
   */
  async getUsersByRole(
    role: 'viewer' | 'streamer' | 'admin'
  ): Promise<DatabaseResult<User[]>> {
    return this.getByField('role', role)
  }

  /**
   * Get active users
   */
  async getActiveUsers(
    options: QueryOptions = {}
  ): Promise<DatabaseResult<User[]>> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [
        ...(options.where || []),
        { field: 'isActive', operator: '==', value: true },
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
   * Search users
   */
  async searchUsers(
    queryInput: UserQueryInput
  ): Promise<DatabaseResult<User[]>> {
    const queryOptions: QueryOptions = {
      limit: queryInput.limit,
      offset: queryInput.offset,
      orderBy: [
        {
          field: queryInput.orderBy,
          direction: queryInput.orderDirection,
        },
      ],
      where: [],
    }

    // Add filters
    if (queryInput.role) {
      queryOptions.where!.push({
        field: 'role',
        operator: '==',
        value: queryInput.role,
      })
    }

    if (queryInput.subscriptionTier) {
      queryOptions.where!.push({
        field: 'subscriptionTier',
        operator: '==',
        value: queryInput.subscriptionTier,
      })
    }

    if (queryInput.isActive !== undefined) {
      queryOptions.where!.push({
        field: 'isActive',
        operator: '==',
        value: queryInput.isActive,
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

    let users = result.data!.items

    // Apply text search filter (Firestore doesn't support full-text search)
    if (queryInput.search) {
      const searchTerm = queryInput.search.toLowerCase()
      users = users.filter(
        user =>
          user.username.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          (user.firstName &&
            user.firstName.toLowerCase().includes(searchTerm)) ||
          (user.lastName && user.lastName.toLowerCase().includes(searchTerm))
      )
    }

    return {
      success: true,
      data: users,
    }
  }

  /**
   * Update user subscription
   */
  async updateSubscription(
    userId: string,
    subscriptionData: {
      tier: 'basic' | 'premium' | 'pro' | null
      status: 'active' | 'canceled' | 'past_due' | null
      subscriptionId?: string
      stripeCustomerId?: string
    }
  ): Promise<DatabaseResult<User>> {
    return this.update(userId, subscriptionData)
  }

  /**
   * Update user activity
   */
  async updateLastActivity(userId: string): Promise<DatabaseResult<User>> {
    return this.update(userId, {
      lastLoginAt: new Date(),
      'analytics.lastActivityAt': new Date(),
    } as any)
  }

  /**
   * Increment user analytics
   */
  async incrementWatchTime(
    userId: string,
    watchTime: number
  ): Promise<DatabaseResult<User>> {
    const user = await this.getById(userId)
    if (!user.success || !user.data) {
      return user
    }

    const currentWatchTime = user.data.analytics.totalWatchTime || 0
    const currentStreamsWatched = user.data.analytics.streamsWatched || 0

    return this.update(userId, {
      'analytics.totalWatchTime': currentWatchTime + watchTime,
      'analytics.streamsWatched': currentStreamsWatched + 1,
      'analytics.averageSessionDuration':
        (currentWatchTime + watchTime) / (currentStreamsWatched + 1),
      'analytics.lastActivityAt': new Date(),
    } as any)
  }

  /**
   * Ban/unban user
   */
  async banUser(
    userId: string,
    banned: boolean,
    reason?: string
  ): Promise<DatabaseResult<User>> {
    return this.update(userId, {
      isActive: !banned,
      banReason: reason,
      bannedAt: banned ? new Date() : null,
    } as any)
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<DatabaseResult<any>> {
    const user = await this.getById(userId)
    if (!user.success || !user.data) {
      return user
    }

    // Calculate additional stats
    const stats = {
      ...user.data.analytics,
      accountAge: Math.floor(
        (Date.now() - user.data.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
      isActive: user.data.isActive,
      subscriptionTier: user.data.subscriptionTier,
      role: user.data.role,
    }

    return {
      success: true,
      data: stats,
    }
  }

  /**
   * Transform Firestore data to User model
   */
  protected transformFromFirestore(data: any, id: string): User {
    const transformed = super.transformFromFirestore(data, id)

    // Transform nested date fields
    if (transformed.analytics?.lastActivityAt) {
      const lastActivity = transformed.analytics.lastActivityAt
      if (
        lastActivity &&
        typeof lastActivity === 'object' &&
        'toDate' in lastActivity
      ) {
        transformed.analytics.lastActivityAt = (lastActivity as any).toDate()
      }
    }

    return transformed
  }
}
