import { BaseService } from './base-service'
import { COLLECTIONS } from '@/types/database'
import type { VOD } from '@/types/streaming'
import type { DatabaseResult, QueryOptions } from '@/types/database'
import type { CreateVODInput, UpdateVODInput, VODQueryInput } from '@/lib/validations/streaming'

export class VODService extends BaseService<VOD> {
  constructor() {
    super(COLLECTIONS.VODS)
  }

  /**
   * Create a new VOD
   */
  async createVOD(userId: string, vodData: CreateVODInput & {
    duration: number
    fileSize: number
    gcsPath: string
    metadata: any
  }): Promise<DatabaseResult<VOD>> {
    const vodToCreate = {
      ...vodData,
      userId,
      status: 'processing' as const,
      viewCount: 0,
      likeCount: 0,
      analytics: {
        totalViews: 0,
        uniqueViews: 0,
        averageWatchTime: 0,
        completionRate: 0,
        engagementScore: 0,
        geographicDistribution: {},
        deviceDistribution: {},
        trafficSources: {},
        retentionCurve: [],
      },
    }

    return this.create(vodToCreate)
  }

  /**
   * Update VOD
   */
  async updateVOD(id: string, vodData: UpdateVODInput): Promise<DatabaseResult<VOD>> {
    const { id: _, ...updateData } = vodData
    return this.update(id, updateData)
  }

  /**
   * Get VODs by user
   */
  async getVODsByUser(userId: string, options: QueryOptions = {}): Promise<DatabaseResult<VOD[]>> {
    return this.getByField('userId', userId, options)
  }

  /**
   * Get public VODs
   */
  async getPublicVODs(options: QueryOptions = {}): Promise<DatabaseResult<VOD[]>> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [
        ...(options.where || []),
        { field: 'visibility', operator: '==', value: 'public' },
        { field: 'status', operator: '==', value: 'ready' },
      ],
      orderBy: [
        { field: 'publishedAt', direction: 'desc' },
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
   * Search VODs
   */
  async searchVODs(queryInput: VODQueryInput): Promise<DatabaseResult<VOD[]>> {
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
    if (queryInput.userId) {
      queryOptions.where!.push({
        field: 'userId',
        operator: '==',
        value: queryInput.userId,
      })
    }

    if (queryInput.status) {
      queryOptions.where!.push({
        field: 'status',
        operator: '==',
        value: queryInput.status,
      })
    }

    if (queryInput.category) {
      queryOptions.where!.push({
        field: 'category',
        operator: '==',
        value: queryInput.category,
      })
    }

    if (queryInput.visibility) {
      queryOptions.where!.push({
        field: 'visibility',
        operator: '==',
        value: queryInput.visibility,
      })
    }

    if (queryInput.requiredTier) {
      queryOptions.where!.push({
        field: 'requiredTier',
        operator: '==',
        value: queryInput.requiredTier,
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

    let vods = result.data!.items

    // Apply text search filter (Firestore doesn't support full-text search)
    if (queryInput.search) {
      const searchTerm = queryInput.search.toLowerCase()
      vods = vods.filter(vod =>
        vod.title.toLowerCase().includes(searchTerm) ||
        (vod.description && vod.description.toLowerCase().includes(searchTerm)) ||
        vod.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }

    return {
      success: true,
      data: vods,
    }
  }

  /**
   * Get VODs by category
   */
  async getVODsByCategory(category: string, options: QueryOptions = {}): Promise<DatabaseResult<VOD[]>> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [
        ...(options.where || []),
        { field: 'category', operator: '==', value: category },
        { field: 'visibility', operator: '==', value: 'public' },
        { field: 'status', operator: '==', value: 'ready' },
      ],
    }

    return this.query(queryOptions).then(result => ({
      success: result.success,
      data: result.success ? result.data!.items : undefined,
      error: result.error,
      code: result.code,
    }))
  }

  /**
   * Get popular VODs
   */
  async getPopularVODs(limit = 20): Promise<DatabaseResult<VOD[]>> {
    const queryOptions: QueryOptions = {
      limit,
      where: [
        { field: 'visibility', operator: '==', value: 'public' },
        { field: 'status', operator: '==', value: 'ready' },
      ],
      orderBy: [
        { field: 'viewCount', direction: 'desc' },
        { field: 'likeCount', direction: 'desc' },
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
   * Increment view count
   */
  async incrementViewCount(id: string, userId?: string): Promise<DatabaseResult<VOD>> {
    const vod = await this.getById(id)
    if (!vod.success || !vod.data) {
      return vod
    }

    const newViewCount = vod.data.viewCount + 1
    const newTotalViews = vod.data.analytics.totalViews + 1
    
    // For unique views, we'd need to track viewed users separately
    // This is a simplified implementation
    const newUniqueViews = userId ? vod.data.analytics.uniqueViews + 1 : vod.data.analytics.uniqueViews

    return this.update(id, {
      viewCount: newViewCount,
      'analytics.totalViews': newTotalViews,
      'analytics.uniqueViews': newUniqueViews,
    } as any)
  }

  /**
   * Update VOD analytics
   */
  async updateAnalytics(id: string, analyticsData: Partial<VOD['analytics']>): Promise<DatabaseResult<VOD>> {
    const updateData: any = {}
    
    Object.entries(analyticsData).forEach(([key, value]) => {
      updateData[`analytics.${key}`] = value
    })

    return this.update(id, updateData)
  }

  /**
   * Publish VOD
   */
  async publishVOD(id: string): Promise<DatabaseResult<VOD>> {
    return this.update(id, {
      status: 'ready',
      publishedAt: new Date(),
    })
  }

  /**
   * Get VOD from stream
   */
  async getVODByStreamId(streamId: string): Promise<DatabaseResult<VOD | null>> {
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
   * Get VOD analytics
   */
  async getVODAnalytics(vodId: string): Promise<DatabaseResult<any>> {
    const vod = await this.getById(vodId)
    if (!vod.success || !vod.data) {
      return vod
    }

    const analytics = {
      vodId,
      title: vod.data.title,
      category: vod.data.category,
      status: vod.data.status,
      visibility: vod.data.visibility,
      duration: vod.data.duration,
      fileSize: vod.data.fileSize,
      viewCount: vod.data.viewCount,
      likeCount: vod.data.likeCount,
      createdAt: vod.data.createdAt,
      publishedAt: vod.data.publishedAt,
      ...vod.data.analytics,
    }

    return {
      success: true,
      data: analytics,
    }
  }
}