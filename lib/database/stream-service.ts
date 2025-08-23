import { BaseService } from './base-service'
import { COLLECTIONS } from '@/types/database'
import type { Stream } from '@/types/streaming'
import type { DatabaseResult, QueryOptions } from '@/types/database'
import type {
  CreateStreamInput,
  UpdateStreamInput,
  StreamQueryInput,
} from '@/lib/validations/streaming'
import {
  generateStreamKey,
  generateRTMPUrl,
  generateHLSUrl,
} from '@/lib/utils/stream-utils'

export class StreamService extends BaseService<Stream> {
  constructor() {
    super(COLLECTIONS.STREAMS)
  }

  /**
   * Create a new stream
   */
  async createStream(
    userId: string,
    streamData: CreateStreamInput
  ): Promise<DatabaseResult<Stream>> {
    const streamKey = generateStreamKey()
    const rtmpUrl = generateRTMPUrl(streamKey)
    const hlsUrl = generateHLSUrl(streamKey)

    const streamToCreate = {
      ...streamData,
      userId,
      streamKey,
      rtmpUrl,
      hlsUrl,
      status: 'inactive' as const,
      isLive: false,
      viewerCount: 0,
      maxViewers: 0,
    }

    return this.create(streamToCreate)
  }

  /**
   * Update stream
   */
  async updateStream(
    id: string,
    streamData: UpdateStreamInput
  ): Promise<DatabaseResult<Stream>> {
    const { id: _, ...updateData } = streamData
    return this.update(id, updateData)
  }

  /**
   * Get streams by user
   */
  async getStreamsByUser(
    userId: string,
    options: QueryOptions = {}
  ): Promise<DatabaseResult<Stream[]>> {
    return this.getByField('userId', userId, options)
  }

  /**
   * Get live streams
   */
  async getLiveStreams(
    options: QueryOptions = {}
  ): Promise<DatabaseResult<Stream[]>> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [
        ...(options.where || []),
        { field: 'isLive', operator: '==', value: true },
        { field: 'status', operator: '==', value: 'active' },
      ],
      orderBy: [
        { field: 'viewerCount', direction: 'desc' },
        { field: 'startedAt', direction: 'desc' },
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
   * Get stream by stream key
   */
  async getStreamByKey(
    streamKey: string
  ): Promise<DatabaseResult<Stream | null>> {
    const result = await this.getByField('streamKey', streamKey)
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
   * Start stream
   */
  async startStream(id: string): Promise<DatabaseResult<Stream>> {
    return this.update(id, {
      status: 'active',
      isLive: true,
      startedAt: new Date(),
      endedAt: undefined,
    })
  }

  /**
   * End stream
   */
  async endStream(id: string): Promise<DatabaseResult<Stream>> {
    const stream = await this.getById(id)
    if (!stream.success || !stream.data) {
      return stream
    }

    return this.update(id, {
      status: 'ended',
      isLive: false,
      endedAt: new Date(),
    })
  }

  /**
   * Update viewer count
   */
  async updateViewerCount(
    id: string,
    viewerCount: number
  ): Promise<DatabaseResult<Stream>> {
    const stream = await this.getById(id)
    if (!stream.success || !stream.data) {
      return stream
    }

    const maxViewers = Math.max(stream.data.maxViewers, viewerCount)

    return this.update(id, {
      viewerCount,
      maxViewers,
    })
  }

  /**
   * Search streams
   */
  async searchStreams(
    queryInput: StreamQueryInput
  ): Promise<DatabaseResult<Stream[]>> {
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

    if (queryInput.isLive !== undefined) {
      queryOptions.where!.push({
        field: 'isLive',
        operator: '==',
        value: queryInput.isLive,
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
   * Get streams by category
   */
  async getStreamsByCategory(
    category: string,
    options: QueryOptions = {}
  ): Promise<DatabaseResult<Stream[]>> {
    return this.getByField('category', category, options)
  }

  /**
   * Get popular streams
   */
  async getPopularStreams(limit = 20): Promise<DatabaseResult<Stream[]>> {
    const queryOptions: QueryOptions = {
      limit,
      where: [
        { field: 'isLive', operator: '==', value: true },
        { field: 'status', operator: '==', value: 'active' },
      ],
      orderBy: [
        { field: 'viewerCount', direction: 'desc' },
        { field: 'maxViewers', direction: 'desc' },
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
   * Get stream analytics
   */
  async getStreamAnalytics(streamId: string): Promise<DatabaseResult<any>> {
    const stream = await this.getById(streamId)
    if (!stream.success || !stream.data) {
      return stream
    }

    const analytics = {
      streamId,
      title: stream.data.title,
      category: stream.data.category,
      status: stream.data.status,
      isLive: stream.data.isLive,
      currentViewers: stream.data.viewerCount,
      maxViewers: stream.data.maxViewers,
      startedAt: stream.data.startedAt,
      endedAt: stream.data.endedAt,
      duration:
        stream.data.startedAt && stream.data.endedAt
          ? Math.floor(
              (stream.data.endedAt.getTime() -
                stream.data.startedAt.getTime()) /
                1000
            )
          : stream.data.startedAt
            ? Math.floor((Date.now() - stream.data.startedAt.getTime()) / 1000)
            : 0,
      createdAt: stream.data.createdAt,
    }

    return {
      success: true,
      data: analytics,
    }
  }
}
