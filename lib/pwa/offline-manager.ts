// Offline content management for StreamVault PWA

export interface OfflineVideo {
  videoId: string
  title: string
  duration: number
  quality: VideoQuality
  size: number
  downloadedAt: Date
  expiresAt: Date
  thumbnailUrl?: string
  creatorName?: string
  blob?: Blob
  url?: string
}

export interface DownloadProgress {
  videoId: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused'
  error?: string
}

export interface WatchProgress {
  videoId: string
  currentTime: number
  duration: number
  watchedAt: Date
  synced: boolean
}

export interface AnalyticsData {
  id?: number
  eventType: string
  videoId?: string
  userId: string
  timestamp: Date
  data: Record<string, any>
  synced: boolean
}

export interface UserActivity {
  id?: number
  userId: string
  action: string
  timestamp: Date
  data: Record<string, any>
  synced: boolean
}

export type VideoQuality = '480p' | '720p' | '1080p' | '4K'

export class OfflineManager {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'StreamVaultDB'
  private readonly DB_VERSION = 1

  async initialize(): Promise<void> {
    this.db = await this.openDB()
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains('offlineVideos')) {
          const videoStore = db.createObjectStore('offlineVideos', {
            keyPath: 'videoId',
          })
          videoStore.createIndex('expiresAt', 'expiresAt', { unique: false })
          videoStore.createIndex('downloadedAt', 'downloadedAt', {
            unique: false,
          })
        }

        if (!db.objectStoreNames.contains('watchProgress')) {
          db.createObjectStore('watchProgress', { keyPath: 'videoId' })
        }

        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', {
            keyPath: 'id',
            autoIncrement: true,
          })
          analyticsStore.createIndex('synced', 'synced', { unique: false })
          analyticsStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          })
        }

        if (!db.objectStoreNames.contains('userActivity')) {
          const activityStore = db.createObjectStore('userActivity', {
            keyPath: 'id',
            autoIncrement: true,
          })
          activityStore.createIndex('synced', 'synced', { unique: false })
          activityStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('downloadQueue')) {
          db.createObjectStore('downloadQueue', { keyPath: 'videoId' })
        }
      }
    })
  }

  // Download video for offline viewing
  async downloadVideo(
    videoId: string,
    quality: VideoQuality = '720p',
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')

    try {
      // Check if video already exists
      const existingVideo = await this.getOfflineVideo(videoId)
      if (existingVideo && !this.isVideoExpired(existingVideo)) {
        return true
      }

      // Add to download queue
      await this.addToDownloadQueue(videoId, quality, 'downloading')

      // Get signed URL for download
      const response = await fetch(
        `/api/videos/${videoId}/signed-url?download=true&quality=${quality}`
      )
      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const { signedUrl, metadata } = await response.json()

      // Download video with progress tracking
      const videoResponse = await fetch(signedUrl)
      if (!videoResponse.ok) {
        throw new Error('Failed to download video')
      }

      const contentLength = parseInt(
        videoResponse.headers.get('content-length') || '0'
      )
      const reader = videoResponse.body?.getReader()

      if (!reader) {
        throw new Error('Failed to read video stream')
      }

      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // Update progress
        const progress = Math.round((receivedLength / contentLength) * 100)
        const progressData: DownloadProgress = {
          videoId,
          progress,
          status: 'downloading',
        }

        onProgress?.(progressData)
        await this.updateDownloadProgress(videoId, progressData)
      }

      // Create blob from chunks
      const videoBlob = new Blob(chunks, { type: 'video/mp4' })
      const videoUrl = URL.createObjectURL(videoBlob)

      // Store offline video
      const offlineVideo: OfflineVideo = {
        videoId,
        title: metadata.title,
        duration: metadata.duration,
        quality,
        size: videoBlob.size,
        downloadedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        thumbnailUrl: metadata.thumbnailUrl,
        creatorName: metadata.creatorName,
        blob: videoBlob,
        url: videoUrl,
      }

      await this.storeOfflineVideo(offlineVideo)

      // Update download queue
      await this.updateDownloadProgress(videoId, {
        videoId,
        progress: 100,
        status: 'completed',
      })

      // Track analytics
      await this.trackAnalytics('video_downloaded', videoId, {
        quality,
        size: videoBlob.size,
        downloadDuration: Date.now() - offlineVideo.downloadedAt.getTime(),
      })

      return true
    } catch (error) {
      console.error('Video download failed:', error)

      await this.updateDownloadProgress(videoId, {
        videoId,
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Download failed',
      })

      return false
    }
  }

  // Get offline video
  async getOfflineVideo(videoId: string): Promise<OfflineVideo | null> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineVideos'], 'readonly')
      const store = transaction.objectStore('offlineVideos')
      const request = store.get(videoId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  // Get all offline videos
  async getAllOfflineVideos(): Promise<OfflineVideo[]> {
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineVideos'], 'readonly')
      const store = transaction.objectStore('offlineVideos')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  // Store offline video
  private async storeOfflineVideo(video: OfflineVideo): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineVideos'], 'readwrite')
      const store = transaction.objectStore('offlineVideos')
      const request = store.put(video)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Delete offline video
  async deleteOfflineVideo(videoId: string): Promise<void> {
    if (!this.db) return

    const video = await this.getOfflineVideo(videoId)
    if (video?.url) {
      URL.revokeObjectURL(video.url)
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineVideos'], 'readwrite')
      const store = transaction.objectStore('offlineVideos')
      const request = store.delete(videoId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Check if video is expired
  private isVideoExpired(video: OfflineVideo): boolean {
    return new Date() > video.expiresAt
  }

  // Clean up expired videos
  async cleanupExpiredVideos(): Promise<number> {
    if (!this.db) return 0

    const videos = await this.getAllOfflineVideos()
    let cleanedCount = 0

    for (const video of videos) {
      if (this.isVideoExpired(video)) {
        await this.deleteOfflineVideo(video.videoId)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  // Download queue management
  private async addToDownloadQueue(
    videoId: string,
    quality: VideoQuality,
    status: DownloadProgress['status']
  ): Promise<void> {
    if (!this.db) return

    const progress: DownloadProgress = {
      videoId,
      progress: 0,
      status,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['downloadQueue'], 'readwrite')
      const store = transaction.objectStore('downloadQueue')
      const request = store.put(progress)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private async updateDownloadProgress(
    videoId: string,
    progress: DownloadProgress
  ): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['downloadQueue'], 'readwrite')
      const store = transaction.objectStore('downloadQueue')
      const request = store.put(progress)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Watch progress management
  async saveWatchProgress(
    videoId: string,
    currentTime: number,
    duration: number
  ): Promise<void> {
    if (!this.db) return

    const progress: WatchProgress = {
      videoId,
      currentTime,
      duration,
      watchedAt: new Date(),
      synced: false,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['watchProgress'], 'readwrite')
      const store = transaction.objectStore('watchProgress')
      const request = store.put(progress)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getWatchProgress(videoId: string): Promise<WatchProgress | null> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['watchProgress'], 'readonly')
      const store = transaction.objectStore('watchProgress')
      const request = store.get(videoId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  // Analytics tracking
  async trackAnalytics(
    eventType: string,
    videoId: string | undefined,
    data: Record<string, any>
  ): Promise<void> {
    if (!this.db) return

    const analyticsData: AnalyticsData = {
      eventType,
      videoId,
      userId: 'current-user', // This should be replaced with actual user ID
      timestamp: new Date(),
      data,
      synced: false,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readwrite')
      const store = transaction.objectStore('analytics')
      const request = store.add(analyticsData)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // User activity tracking
  async trackUserActivity(
    action: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!this.db) return

    const activity: UserActivity = {
      userId: 'current-user', // This should be replaced with actual user ID
      action,
      timestamp: new Date(),
      data,
      synced: false,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userActivity'], 'readwrite')
      const store = transaction.objectStore('userActivity')
      const request = store.add(activity)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      }
    }

    return { used: 0, quota: 0 }
  }

  // Check download limits based on subscription tier
  canDownload(subscriptionTier: string, currentDownloads: number): boolean {
    const limits = {
      basic: 0,
      premium: 10,
      pro: -1, // unlimited
    }

    const limit = limits[subscriptionTier as keyof typeof limits] ?? 0
    return limit === -1 || currentDownloads < limit
  }

  // Get download limit for subscription tier
  getDownloadLimit(subscriptionTier: string): number {
    const limits = {
      basic: 0,
      premium: 10,
      pro: -1, // unlimited
    }

    return limits[subscriptionTier as keyof typeof limits] ?? 0
  }
}
