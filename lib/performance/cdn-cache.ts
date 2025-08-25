/**
 * CDN caching configuration and optimization
 * Manages Cloudflare CDN caching strategies
 */

export interface CacheConfig {
  ttl: number
  staleWhileRevalidate?: number
  cacheKey?: string[]
  varyHeaders?: string[]
  bypassCache?: boolean
  purgeOnUpdate?: boolean
}

export interface CacheStrategy {
  static: CacheConfig
  api: CacheConfig
  video: CacheConfig
  images: CacheConfig
  dynamic: CacheConfig
}

// Default caching strategies optimized for StreamVault
export const DEFAULT_CACHE_STRATEGY: CacheStrategy = {
  static: {
    ttl: 31536000, // 1 year for static assets
    staleWhileRevalidate: 86400, // 1 day
    cacheKey: ['url'],
    varyHeaders: ['Accept-Encoding'],
  },
  api: {
    ttl: 300, // 5 minutes for API responses
    staleWhileRevalidate: 60, // 1 minute
    cacheKey: ['url', 'authorization'],
    varyHeaders: ['Authorization', 'Accept'],
  },
  video: {
    ttl: 86400, // 1 day for video content
    staleWhileRevalidate: 3600, // 1 hour
    cacheKey: ['url'],
    varyHeaders: ['Range', 'Accept-Encoding'],
  },
  images: {
    ttl: 604800, // 1 week for images
    staleWhileRevalidate: 86400, // 1 day
    cacheKey: ['url'],
    varyHeaders: ['Accept', 'Accept-Encoding'],
  },
  dynamic: {
    ttl: 60, // 1 minute for dynamic content
    staleWhileRevalidate: 30, // 30 seconds
    cacheKey: ['url', 'user-id'],
    varyHeaders: ['Cookie', 'Authorization'],
  },
}

export class CDNCacheManager {
  private cloudflareApiToken: string
  private zoneId: string
  private baseUrl: string

  constructor(options: {
    cloudflareApiToken: string
    zoneId: string
    baseUrl: string
  }) {
    this.cloudflareApiToken = options.cloudflareApiToken
    this.zoneId = options.zoneId
    this.baseUrl = options.baseUrl
  }

  /**
   * Set cache headers for Next.js responses
   */
  public setCacheHeaders(
    response: Response,
    strategy: keyof CacheStrategy,
    customConfig?: Partial<CacheConfig>
  ): Response {
    const config = {
      ...DEFAULT_CACHE_STRATEGY[strategy],
      ...customConfig,
    }

    if (config.bypassCache) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      return response
    }

    const cacheControl = this.buildCacheControlHeader(config)
    response.headers.set('Cache-Control', cacheControl)

    // Set Cloudflare-specific headers
    response.headers.set('CF-Cache-Tag', this.generateCacheTag(strategy))
    
    if (config.varyHeaders) {
      response.headers.set('Vary', config.varyHeaders.join(', '))
    }

    return response
  }

  private buildCacheControlHeader(config: CacheConfig): string {
    const directives = [`max-age=${config.ttl}`]

    if (config.staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`)
    }

    // Add public/private based on cache key
    if (config.cacheKey?.includes('authorization') || config.cacheKey?.includes('user-id')) {
      directives.push('private')
    } else {
      directives.push('public')
    }

    return directives.join(', ')
  }

  private generateCacheTag(strategy: string): string {
    return `streamvault-${strategy}-${Date.now()}`
  }

  /**
   * Purge cache for specific URLs or tags
   */
  public async purgeCache(options: {
    urls?: string[]
    tags?: string[]
    purgeEverything?: boolean
  }): Promise<void> {
    const purgeData: any = {}

    if (options.purgeEverything) {
      purgeData.purge_everything = true
    } else {
      if (options.urls) {
        purgeData.files = options.urls
      }
      if (options.tags) {
        purgeData.tags = options.tags
      }
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(purgeData),
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to purge cache: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(`Cache purge failed: ${result.errors?.join(', ')}`)
      }
    } catch (error) {
      console.error('CDN cache purge failed:', error)
      throw error
    }
  }

  /**
   * Get cache analytics from Cloudflare
   */
  public async getCacheAnalytics(options: {
    since: Date
    until?: Date
    dimensions?: string[]
  }): Promise<any> {
    const params = new URLSearchParams({
      since: options.since.toISOString(),
      until: (options.until || new Date()).toISOString(),
    })

    if (options.dimensions) {
      params.append('dimensions', options.dimensions.join(','))
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/analytics/dashboard?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.cloudflareApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get cache analytics: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get cache analytics:', error)
      throw error
    }
  }

  /**
   * Preload critical resources
   */
  public async preloadResources(urls: string[]): Promise<void> {
    const preloadPromises = urls.map(async (url) => {
      try {
        await fetch(url, { method: 'HEAD' })
      } catch (error) {
        console.warn(`Failed to preload resource: ${url}`, error)
      }
    })

    await Promise.allSettled(preloadPromises)
  }
}

// Utility functions for cache management
export function getCacheStrategy(path: string): keyof CacheStrategy {
  if (path.startsWith('/api/')) return 'api'
  if (path.match(/\.(js|css|woff|woff2)$/)) return 'static'
  if (path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'images'
  if (path.match(/\.(mp4|webm|ogg|m3u8|ts)$/)) return 'video'
  return 'dynamic'
}

export function shouldBypassCache(request: Request): boolean {
  const url = new URL(request.url)
  
  // Bypass cache for authenticated API requests
  if (url.pathname.startsWith('/api/') && request.headers.get('authorization')) {
    return true
  }

  // Bypass cache for admin routes
  if (url.pathname.startsWith('/admin/')) {
    return true
  }

  // Bypass cache for development
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  return false
}

// Next.js middleware helper for cache headers
export function withCacheHeaders(
  handler: (request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const response = await handler(request)
    const url = new URL(request.url)
    
    if (shouldBypassCache(request)) {
      return response
    }

    const strategy = getCacheStrategy(url.pathname)
    const cacheManager = new CDNCacheManager({
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN!,
      zoneId: process.env.CLOUDFLARE_ZONE_ID!,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
    })

    return cacheManager.setCacheHeaders(response, strategy)
  }
}

// React hook for cache management
export function useCacheManager() {
  const cacheManager = new CDNCacheManager({
    cloudflareApiToken: process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN!,
    zoneId: process.env.NEXT_PUBLIC_CLOUDFLARE_ZONE_ID!,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL!,
  })

  return {
    purgeCache: cacheManager.purgeCache.bind(cacheManager),
    getCacheAnalytics: cacheManager.getCacheAnalytics.bind(cacheManager),
    preloadResources: cacheManager.preloadResources.bind(cacheManager),
  }
}