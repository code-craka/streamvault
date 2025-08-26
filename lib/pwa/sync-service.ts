// Cross-device synchronization service for StreamVault

export interface SyncData {
  userId: string
  deviceId: string
  timestamp: Date
  data: {
    watchProgress: Record<string, WatchProgress>
    preferences: UserPreferences
    downloadedVideos: string[]
    analytics: AnalyticsData[]
    userActivity: UserActivity[]
  }
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  autoplay: boolean
  quality: VideoQuality
  notifications: {
    newVideos: boolean
    liveStreams: boolean
    comments: boolean
  }
  privacy: {
    shareWatchHistory: boolean
    showOnlineStatus: boolean
  }
}

export interface SyncConflict {
  field: string
  localValue: any
  remoteValue: any
  timestamp: Date
}

export interface SyncResult {
  success: boolean
  conflicts: SyncConflict[]
  synced: {
    watchProgress: number
    preferences: boolean
    analytics: number
    userActivity: number
  }
  errors: string[]
}

import {
  OfflineManager,
  type WatchProgress,
  type AnalyticsData,
  type UserActivity,
  type VideoQuality,
} from './offline-manager'

export class SyncService {
  private offlineManager: OfflineManager
  private deviceId: string
  private syncInProgress = false

  constructor(offlineManager: OfflineManager) {
    this.offlineManager = offlineManager
    this.deviceId = this.generateDeviceId()
  }

  private generateDeviceId(): string {
    // Generate a unique device ID
    let deviceId = localStorage.getItem('streamvault-device-id')
    if (!deviceId) {
      deviceId =
        'device-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now()
      localStorage.setItem('streamvault-device-id', deviceId)
    }
    return deviceId
  }

  // Sync all data with server
  async syncWithServer(userId: string, force = false): Promise<SyncResult> {
    if (this.syncInProgress && !force) {
      throw new Error('Sync already in progress')
    }

    this.syncInProgress = true

    try {
      const result: SyncResult = {
        success: false,
        conflicts: [],
        synced: {
          watchProgress: 0,
          preferences: false,
          analytics: 0,
          userActivity: 0,
        },
        errors: [],
      }

      // Get local data
      const localData = await this.getLocalSyncData(userId)

      // Get remote data
      const remoteData = await this.getRemoteSyncData(userId)

      // Resolve conflicts and merge data
      const mergedData = await this.resolveConflicts(
        localData,
        remoteData,
        result
      )

      // Upload merged data to server
      await this.uploadSyncData(userId, mergedData)

      // Update local data with merged results
      await this.updateLocalData(mergedData, result)

      result.success = true
      return result
    } catch (error) {
      console.error('Sync failed:', error)
      return {
        success: false,
        conflicts: [],
        synced: {
          watchProgress: 0,
          preferences: false,
          analytics: 0,
          userActivity: 0,
        },
        errors: [error instanceof Error ? error.message : 'Sync failed'],
      }
    } finally {
      this.syncInProgress = false
    }
  }

  // Get local sync data
  private async getLocalSyncData(userId: string): Promise<SyncData> {
    const watchProgress = await this.getAllWatchProgress()
    const preferences = await this.getLocalPreferences()
    const analytics = await this.getUnsyncedAnalytics()
    const userActivity = await this.getUnsyncedUserActivity()
    const downloadedVideos = await this.getDownloadedVideoIds()

    return {
      userId,
      deviceId: this.deviceId,
      timestamp: new Date(),
      data: {
        watchProgress,
        preferences,
        downloadedVideos,
        analytics,
        userActivity,
      },
    }
  }

  // Get remote sync data from server
  private async getRemoteSyncData(userId: string): Promise<SyncData | null> {
    try {
      const response = await fetch(`/api/sync/${userId}`, {
        headers: {
          Authorization: `Bearer ${await this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null // No remote data exists
        }
        throw new Error('Failed to fetch remote sync data')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get remote sync data:', error)
      return null
    }
  }

  // Upload sync data to server
  private async uploadSyncData(userId: string, data: SyncData): Promise<void> {
    const response = await fetch(`/api/sync/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to upload sync data')
    }
  }

  // Resolve conflicts between local and remote data
  private async resolveConflicts(
    localData: SyncData,
    remoteData: SyncData | null,
    result: SyncResult
  ): Promise<SyncData> {
    if (!remoteData) {
      return localData // No remote data, use local
    }

    const mergedData: SyncData = {
      userId: localData.userId,
      deviceId: localData.deviceId,
      timestamp: new Date(),
      data: {
        watchProgress: {},
        preferences: localData.data.preferences,
        downloadedVideos: localData.data.downloadedVideos,
        analytics: localData.data.analytics,
        userActivity: localData.data.userActivity,
      },
    }

    // Merge watch progress (use most recent for each video)
    const allVideoIds = new Set([
      ...Object.keys(localData.data.watchProgress),
      ...Object.keys(remoteData.data.watchProgress),
    ])

    for (const videoId of allVideoIds) {
      const localProgress = localData.data.watchProgress[videoId]
      const remoteProgress = remoteData.data.watchProgress[videoId]

      if (!localProgress) {
        mergedData.data.watchProgress[videoId] = remoteProgress
      } else if (!remoteProgress) {
        mergedData.data.watchProgress[videoId] = localProgress
      } else {
        // Use the most recent progress
        if (localProgress.watchedAt > remoteProgress.watchedAt) {
          mergedData.data.watchProgress[videoId] = localProgress
        } else if (remoteProgress.watchedAt > localProgress.watchedAt) {
          mergedData.data.watchProgress[videoId] = remoteProgress
          result.conflicts.push({
            field: `watchProgress.${videoId}`,
            localValue: localProgress,
            remoteValue: remoteProgress,
            timestamp: remoteProgress.watchedAt,
          })
        } else {
          // Same timestamp, use the one with more progress
          if (localProgress.currentTime > remoteProgress.currentTime) {
            mergedData.data.watchProgress[videoId] = localProgress
          } else {
            mergedData.data.watchProgress[videoId] = remoteProgress
          }
        }
      }
    }

    // Merge preferences (use most recent timestamp)
    if (remoteData.timestamp > localData.timestamp) {
      const conflicts = this.comparePreferences(
        localData.data.preferences,
        remoteData.data.preferences
      )

      if (conflicts.length > 0) {
        result.conflicts.push(...conflicts)
        // For now, use remote preferences if there are conflicts
        mergedData.data.preferences = remoteData.data.preferences
      }
    }

    // Merge analytics and user activity (combine all)
    mergedData.data.analytics = [
      ...localData.data.analytics,
      ...remoteData.data.analytics,
    ]

    mergedData.data.userActivity = [
      ...localData.data.userActivity,
      ...remoteData.data.userActivity,
    ]

    return mergedData
  }

  // Compare preferences and find conflicts
  private comparePreferences(
    local: UserPreferences,
    remote: UserPreferences
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = []
    const timestamp = new Date()

    if (local.theme !== remote.theme) {
      conflicts.push({
        field: 'preferences.theme',
        localValue: local.theme,
        remoteValue: remote.theme,
        timestamp,
      })
    }

    if (local.language !== remote.language) {
      conflicts.push({
        field: 'preferences.language',
        localValue: local.language,
        remoteValue: remote.language,
        timestamp,
      })
    }

    if (local.autoplay !== remote.autoplay) {
      conflicts.push({
        field: 'preferences.autoplay',
        localValue: local.autoplay,
        remoteValue: remote.autoplay,
        timestamp,
      })
    }

    if (local.quality !== remote.quality) {
      conflicts.push({
        field: 'preferences.quality',
        localValue: local.quality,
        remoteValue: remote.quality,
        timestamp,
      })
    }

    return conflicts
  }

  // Update local data with merged results
  private async updateLocalData(
    data: SyncData,
    result: SyncResult
  ): Promise<void> {
    // Update watch progress
    for (const [videoId, progress] of Object.entries(data.data.watchProgress)) {
      await this.offlineManager.saveWatchProgress(
        videoId,
        progress.currentTime,
        progress.duration
      )
      result.synced.watchProgress++
    }

    // Update preferences
    await this.saveLocalPreferences(data.data.preferences)
    result.synced.preferences = true

    // Mark analytics as synced
    for (const analytics of data.data.analytics) {
      if (!analytics.synced) {
        await this.markAnalyticsAsSynced(analytics)
        result.synced.analytics++
      }
    }

    // Mark user activity as synced
    for (const activity of data.data.userActivity) {
      if (!activity.synced) {
        await this.markUserActivityAsSynced(activity)
        result.synced.userActivity++
      }
    }
  }

  // Manual sync trigger
  async triggerManualSync(userId: string): Promise<SyncResult> {
    return this.syncWithServer(userId, true)
  }

  // Background sync (called by service worker)
  async backgroundSync(userId: string): Promise<void> {
    try {
      await this.syncWithServer(userId)
      console.log('Background sync completed successfully')
    } catch (error) {
      console.error('Background sync failed:', error)
      // Don't throw error in background sync to avoid breaking the service worker
    }
  }

  // Helper methods
  private async getAllWatchProgress(): Promise<Record<string, WatchProgress>> {
    // This would need to be implemented to get all watch progress from IndexedDB
    // For now, return empty object
    return {}
  }

  private async getLocalPreferences(): Promise<UserPreferences> {
    const stored = localStorage.getItem('streamvault-preferences')
    if (stored) {
      return JSON.parse(stored)
    }

    return {
      theme: 'system',
      language: 'en',
      autoplay: true,
      quality: '720p',
      notifications: {
        newVideos: true,
        liveStreams: true,
        comments: false,
      },
      privacy: {
        shareWatchHistory: true,
        showOnlineStatus: true,
      },
    }
  }

  private async saveLocalPreferences(
    preferences: UserPreferences
  ): Promise<void> {
    localStorage.setItem('streamvault-preferences', JSON.stringify(preferences))
  }

  private async getUnsyncedAnalytics(): Promise<AnalyticsData[]> {
    // This would query IndexedDB for unsynced analytics
    return []
  }

  private async getUnsyncedUserActivity(): Promise<UserActivity[]> {
    // This would query IndexedDB for unsynced user activity
    return []
  }

  private async getDownloadedVideoIds(): Promise<string[]> {
    const videos = await this.offlineManager.getAllOfflineVideos()
    return videos.map(video => video.videoId)
  }

  private async markAnalyticsAsSynced(analytics: AnalyticsData): Promise<void> {
    // Mark analytics as synced in IndexedDB
  }

  private async markUserActivityAsSynced(
    activity: UserActivity
  ): Promise<void> {
    // Mark user activity as synced in IndexedDB
  }

  private async getAuthToken(): Promise<string> {
    // Get auth token from Clerk or wherever it's stored
    return 'auth-token'
  }

  // Check if sync is needed
  shouldSync(): boolean {
    const lastSync = localStorage.getItem('streamvault-last-sync')
    if (!lastSync) return true

    const lastSyncTime = new Date(lastSync)
    const now = new Date()
    const hoursSinceLastSync =
      (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60)

    return hoursSinceLastSync >= 1 // Sync every hour
  }

  // Update last sync time
  updateLastSyncTime(): void {
    localStorage.setItem('streamvault-last-sync', new Date().toISOString())
  }
}
