/**
 * Database query optimization for sub-100ms response times
 * Includes caching, indexing, and query analysis
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  QueryConstraint,
  DocumentSnapshot,
  Query,
  CollectionReference,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface QueryMetrics {
  queryId: string
  collection: string
  constraints: string[]
  executionTime: number
  resultCount: number
  cacheHit: boolean
  timestamp: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  queryHash: string
}

export interface QueryOptimizationConfig {
  enableCaching: boolean
  defaultCacheTTL: number
  maxCacheSize: number
  enableMetrics: boolean
  slowQueryThreshold: number
}

const DEFAULT_CONFIG: QueryOptimizationConfig = {
  enableCaching: true,
  defaultCacheTTL: 300000, // 5 minutes
  maxCacheSize: 1000,
  enableMetrics: true,
  slowQueryThreshold: 100, // 100ms
}

export class QueryOptimizer {
  private cache = new Map<string, CacheEntry<any>>()
  private metrics: QueryMetrics[] = []
  private config: QueryOptimizationConfig

  constructor(config: Partial<QueryOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Clean up cache periodically
    setInterval(() => this.cleanupCache(), 60000) // Every minute
  }

  /**
   * Optimized query execution with caching and metrics
   */
  async executeQuery<T>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
    options: {
      cacheTTL?: number
      bypassCache?: boolean
      enablePagination?: boolean
      pageSize?: number
    } = {}
  ): Promise<T[]> {
    const startTime = Date.now()
    const queryHash = this.generateQueryHash(collectionName, constraints)
    const queryId = `${collectionName}-${Date.now()}-${Math.random()}`

    // Check cache first
    if (this.config.enableCaching && !options.bypassCache) {
      const cachedResult = this.getCachedResult<T[]>(queryHash)
      if (cachedResult) {
        this.recordMetrics({
          queryId,
          collection: collectionName,
          constraints: constraints.map(c => c.toString()),
          executionTime: Date.now() - startTime,
          resultCount: cachedResult.length,
          cacheHit: true,
          timestamp: Date.now(),
        })
        return cachedResult
      }
    }

    try {
      // Build and execute query
      const collectionRef = collection(db, collectionName)
      let q: Query = collectionRef

      // Apply constraints
      for (const constraint of constraints) {
        q = query(q, constraint)
      }

      // Execute query
      const snapshot = await getDocs(q)
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[]

      const executionTime = Date.now() - startTime

      // Cache results
      if (this.config.enableCaching) {
        this.setCacheEntry(
          queryHash,
          results,
          options.cacheTTL || this.config.defaultCacheTTL
        )
      }

      // Record metrics
      this.recordMetrics({
        queryId,
        collection: collectionName,
        constraints: constraints.map(c => c.toString()),
        executionTime,
        resultCount: results.length,
        cacheHit: false,
        timestamp: Date.now(),
      })

      // Log slow queries
      if (executionTime > this.config.slowQueryThreshold) {
        console.warn(
          `Slow query detected: ${collectionName} took ${executionTime}ms`,
          {
            constraints: constraints.map(c => c.toString()),
            resultCount: results.length,
          }
        )
      }

      return results
    } catch (error) {
      console.error(`Query execution failed for ${collectionName}:`, error)
      throw error
    }
  }

  /**
   * Optimized single document fetch
   */
  async getDocument<T>(
    collectionName: string,
    documentId: string,
    options: {
      cacheTTL?: number
      bypassCache?: boolean
    } = {}
  ): Promise<T | null> {
    const startTime = Date.now()
    const queryHash = this.generateDocumentHash(collectionName, documentId)
    const queryId = `${collectionName}-${documentId}-${Date.now()}`

    // Check cache first
    if (this.config.enableCaching && !options.bypassCache) {
      const cachedResult = this.getCachedResult<T>(queryHash)
      if (cachedResult) {
        this.recordMetrics({
          queryId,
          collection: collectionName,
          constraints: [`doc(${documentId})`],
          executionTime: Date.now() - startTime,
          resultCount: 1,
          cacheHit: true,
          timestamp: Date.now(),
        })
        return cachedResult
      }
    }

    try {
      const docRef = doc(db, collectionName, documentId)
      const docSnap = await getDoc(docRef)

      const result = docSnap.exists()
        ? ({
            id: docSnap.id,
            ...docSnap.data(),
          } as T)
        : null

      const executionTime = Date.now() - startTime

      // Cache result
      if (this.config.enableCaching && result) {
        this.setCacheEntry(
          queryHash,
          result,
          options.cacheTTL || this.config.defaultCacheTTL
        )
      }

      // Record metrics
      this.recordMetrics({
        queryId,
        collection: collectionName,
        constraints: [`doc(${documentId})`],
        executionTime,
        resultCount: result ? 1 : 0,
        cacheHit: false,
        timestamp: Date.now(),
      })

      return result
    } catch (error) {
      console.error(
        `Document fetch failed for ${collectionName}/${documentId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Paginated query execution
   */
  async executePaginatedQuery<T>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
    options: {
      pageSize?: number
      lastDoc?: DocumentSnapshot
      cacheTTL?: number
    } = {}
  ): Promise<{
    data: T[]
    lastDoc?: DocumentSnapshot
    hasMore: boolean
  }> {
    const pageSize = options.pageSize || 20
    const paginatedConstraints = [
      ...constraints,
      limit(pageSize + 1), // Get one extra to check if there are more
    ]

    if (options.lastDoc) {
      paginatedConstraints.push(startAfter(options.lastDoc))
    }

    const results = await this.executeQuery<T>(
      collectionName,
      paginatedConstraints,
      { cacheTTL: options.cacheTTL, bypassCache: true } // Don't cache paginated results
    )

    const hasMore = results.length > pageSize
    const data = hasMore ? results.slice(0, pageSize) : results

    return {
      data,
      lastDoc: hasMore ? (results[pageSize - 1] as any) : undefined,
      hasMore,
    }
  }

  /**
   * Batch query execution for multiple collections
   */
  async executeBatchQueries<T>(
    queries: Array<{
      collection: string
      constraints?: QueryConstraint[]
      cacheTTL?: number
    }>
  ): Promise<Record<string, T[]>> {
    const promises = queries.map(async queryConfig => {
      const results = await this.executeQuery<T>(
        queryConfig.collection,
        queryConfig.constraints || [],
        { cacheTTL: queryConfig.cacheTTL }
      )
      return { collection: queryConfig.collection, results }
    })

    const batchResults = await Promise.all(promises)

    return batchResults.reduce(
      (acc, { collection, results }) => {
        acc[collection] = results
        return acc
      },
      {} as Record<string, T[]>
    )
  }

  private generateQueryHash(
    collection: string,
    constraints: QueryConstraint[]
  ): string {
    const constraintStrings = constraints.map(c => c.toString()).sort()
    return `${collection}:${constraintStrings.join('|')}`
  }

  private generateDocumentHash(collection: string, documentId: string): string {
    return `${collection}:doc:${documentId}`
  }

  private getCachedResult<T>(queryHash: string): T | null {
    const entry = this.cache.get(queryHash)
    if (!entry) return null

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(queryHash)
      return null
    }

    return entry.data
  }

  private setCacheEntry<T>(queryHash: string, data: T, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(queryHash, {
      data,
      timestamp: Date.now(),
      ttl,
      queryHash,
    })
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private recordMetrics(metrics: QueryMetrics): void {
    if (!this.config.enableMetrics) return

    this.metrics.push(metrics)

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  /**
   * Get query performance metrics
   */
  public getMetrics(): {
    totalQueries: number
    averageExecutionTime: number
    cacheHitRate: number
    slowQueries: QueryMetrics[]
    topCollections: Array<{ collection: string; count: number }>
  } {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        slowQueries: [],
        topCollections: [],
      }
    }

    const totalQueries = this.metrics.length
    const cacheHits = this.metrics.filter(m => m.cacheHit).length
    const averageExecutionTime =
      this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
    const slowQueries = this.metrics.filter(
      m => m.executionTime > this.config.slowQueryThreshold
    )

    // Count queries by collection
    const collectionCounts = this.metrics.reduce(
      (acc, m) => {
        acc[m.collection] = (acc[m.collection] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const topCollections = Object.entries(collectionCounts)
      .map(([collection, count]) => ({ collection, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalQueries,
      averageExecutionTime,
      cacheHitRate: cacheHits / totalQueries,
      slowQueries,
      topCollections,
    }
  }

  /**
   * Clear cache and metrics
   */
  public reset(): void {
    this.cache.clear()
    this.metrics = []
  }

  /**
   * Invalidate cache for specific collection
   */
  public invalidateCollection(collectionName: string): void {
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${collectionName}:`)) {
        this.cache.delete(key)
      }
    }
  }
}

// Global query optimizer instance
export const queryOptimizer = new QueryOptimizer()

// Utility functions for common query patterns
export const optimizedQueries = {
  // Get user streams with caching
  getUserStreams: (userId: string) =>
    queryOptimizer.executeQuery('streams', [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20),
    ]),

  // Get live streams with short cache
  getLiveStreams: () =>
    queryOptimizer.executeQuery(
      'streams',
      [
        where('status', '==', 'active'),
        orderBy('viewerCount', 'desc'),
        limit(50),
      ],
      { cacheTTL: 30000 }
    ), // 30 seconds cache

  // Get popular videos with longer cache
  getPopularVideos: () =>
    queryOptimizer.executeQuery(
      'videos',
      [where('isPublic', '==', true), orderBy('viewCount', 'desc'), limit(20)],
      { cacheTTL: 600000 }
    ), // 10 minutes cache

  // Get user profile with long cache
  getUserProfile: (userId: string) =>
    queryOptimizer.getDocument('users', userId, { cacheTTL: 900000 }), // 15 minutes cache
}

// React hook for query optimization metrics
export function useQueryMetrics() {
  return queryOptimizer.getMetrics()
}
