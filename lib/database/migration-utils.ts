import { collection, doc, writeBatch, getDocs, query, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { COLLECTIONS } from '@/types/database'
import type { DatabaseResult } from '@/types/database'

/**
 * Migration utility for database schema changes and data transformations
 */
export class MigrationUtils {
  /**
   * Create sample data for development
   */
  static async createSampleData(): Promise<DatabaseResult<boolean>> {
    try {
      const batch = writeBatch(db)

      // Sample users
      const sampleUsers = [
        {
          email: 'streamer@example.com',
          username: 'sample_streamer',
          firstName: 'Sample',
          lastName: 'Streamer',
          role: 'streamer',
          subscriptionTier: 'premium',
          subscriptionStatus: 'active',
          isActive: true,
          lastLoginAt: new Date(),
          preferences: this.getDefaultUserPreferences(),
          analytics: this.getDefaultUserAnalytics(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          email: 'viewer@example.com',
          username: 'sample_viewer',
          firstName: 'Sample',
          lastName: 'Viewer',
          role: 'viewer',
          subscriptionTier: 'basic',
          subscriptionStatus: 'active',
          isActive: true,
          lastLoginAt: new Date(),
          preferences: this.getDefaultUserPreferences(),
          analytics: this.getDefaultUserAnalytics(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Add sample users
      sampleUsers.forEach((user, index) => {
        const userRef = doc(collection(db, COLLECTIONS.USERS))
        batch.set(userRef, user)
      })

      // Sample streams
      const sampleStreams = [
        {
          userId: 'sample-user-1',
          title: 'Sample Gaming Stream',
          description: 'Playing the latest games live!',
          category: 'Gaming',
          tags: ['gaming', 'live', 'entertainment'],
          streamKey: 'sample-stream-key-1',
          rtmpUrl: 'rtmp://ingest.streamvault.app/live/sample-stream-key-1',
          hlsUrl: 'https://cdn.streamvault.app/hls/sample-stream-key-1/playlist.m3u8',
          status: 'active',
          isLive: true,
          viewerCount: 150,
          maxViewers: 200,
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          settings: this.getDefaultStreamSettings(),
          metadata: this.getDefaultStreamMetadata(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: 'sample-user-1',
          title: 'Music Production Session',
          description: 'Creating beats and mixing tracks',
          category: 'Music',
          tags: ['music', 'production', 'beats'],
          streamKey: 'sample-stream-key-2',
          rtmpUrl: 'rtmp://ingest.streamvault.app/live/sample-stream-key-2',
          hlsUrl: 'https://cdn.streamvault.app/hls/sample-stream-key-2/playlist.m3u8',
          status: 'inactive',
          isLive: false,
          viewerCount: 0,
          maxViewers: 75,
          settings: this.getDefaultStreamSettings(),
          metadata: this.getDefaultStreamMetadata(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Add sample streams
      sampleStreams.forEach((stream, index) => {
        const streamRef = doc(collection(db, COLLECTIONS.STREAMS))
        batch.set(streamRef, stream)
      })

      // Sample VODs
      const sampleVODs = [
        {
          userId: 'sample-user-1',
          title: 'Epic Gaming Highlights',
          description: 'Best moments from last week\'s streams',
          category: 'Gaming',
          tags: ['highlights', 'gaming', 'compilation'],
          duration: 3600, // 1 hour
          fileSize: 1024 * 1024 * 500, // 500MB
          status: 'ready',
          visibility: 'public',
          requiredTier: 'basic',
          gcsPath: 'vods/sample-vod-1.mp4',
          thumbnailUrl: 'https://cdn.streamvault.app/thumbnails/sample-vod-1.jpg',
          viewCount: 1250,
          likeCount: 89,
          publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          metadata: this.getDefaultVODMetadata(),
          analytics: this.getDefaultVODAnalytics(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Add sample VODs
      sampleVODs.forEach((vod, index) => {
        const vodRef = doc(collection(db, COLLECTIONS.VODS))
        batch.set(vodRef, vod)
      })

      await batch.commit()

      return {
        success: true,
        data: true,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: 'MIGRATION_ERROR',
      }
    }
  }

  /**
   * Clean up all collections (use with caution!)
   */
  static async cleanupAllData(): Promise<DatabaseResult<boolean>> {
    try {
      const collections = Object.values(COLLECTIONS)
      
      for (const collectionName of collections) {
        await this.deleteCollection(collectionName)
      }

      return {
        success: true,
        data: true,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: 'CLEANUP_ERROR',
      }
    }
  }

  /**
   * Delete all documents in a collection
   */
  static async deleteCollection(collectionName: string): Promise<void> {
    const collectionRef = collection(db, collectionName)
    const q = query(collectionRef, limit(500))

    let snapshot = await getDocs(q)
    
    while (!snapshot.empty) {
      const batch = writeBatch(db)
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      
      await batch.commit()
      snapshot = await getDocs(q)
    }
  }

  /**
   * Migrate user data structure (example migration)
   */
  static async migrateUserPreferences(): Promise<DatabaseResult<boolean>> {
    try {
      const usersRef = collection(db, COLLECTIONS.USERS)
      const snapshot = await getDocs(usersRef)
      
      const batch = writeBatch(db)
      let updateCount = 0

      snapshot.docs.forEach((doc) => {
        const userData = doc.data()
        
        // Check if user needs migration (missing preferences)
        if (!userData.preferences) {
          batch.update(doc.ref, {
            preferences: this.getDefaultUserPreferences(),
            updatedAt: new Date(),
          })
          updateCount++
        }
      })

      if (updateCount > 0) {
        await batch.commit()
      }

      return {
        success: true,
        data: true,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: 'MIGRATION_ERROR',
      }
    }
  }

  /**
   * Validate data integrity
   */
  static async validateDataIntegrity(): Promise<DatabaseResult<any>> {
    try {
      const issues: string[] = []

      // Check for orphaned streams (streams without valid users)
      const streamsSnapshot = await getDocs(collection(db, COLLECTIONS.STREAMS))
      const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS))
      
      const userIds = new Set(usersSnapshot.docs.map(doc => doc.id))
      
      streamsSnapshot.docs.forEach(doc => {
        const streamData = doc.data()
        if (!userIds.has(streamData.userId)) {
          issues.push(`Stream ${doc.id} has invalid userId: ${streamData.userId}`)
        }
      })

      // Check for orphaned VODs
      const vodsSnapshot = await getDocs(collection(db, COLLECTIONS.VODS))
      
      vodsSnapshot.docs.forEach(doc => {
        const vodData = doc.data()
        if (!userIds.has(vodData.userId)) {
          issues.push(`VOD ${doc.id} has invalid userId: ${vodData.userId}`)
        }
      })

      return {
        success: true,
        data: {
          isValid: issues.length === 0,
          issues,
          totalUsers: usersSnapshot.size,
          totalStreams: streamsSnapshot.size,
          totalVODs: vodsSnapshot.size,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR',
      }
    }
  }

  /**
   * Get default user preferences
   */
  private static getDefaultUserPreferences() {
    return {
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false,
        followedStreamersLive: true,
        newFollowers: true,
        subscriptionUpdates: true,
        systemAnnouncements: false,
      },
      privacy: {
        profileVisibility: 'public',
        showViewingHistory: true,
        showFollowingList: true,
        allowDirectMessages: true,
        dataCollection: true,
      },
      streaming: {
        defaultQuality: 'auto',
        autoRecord: false,
        chatModeration: 'medium',
        streamNotifications: true,
      },
      playback: {
        autoplay: false,
        defaultVolume: 0.8,
        playbackSpeed: 1,
        subtitlesEnabled: false,
        subtitleLanguage: 'en',
        theaterMode: false,
      },
    }
  }

  /**
   * Get default user analytics
   */
  private static getDefaultUserAnalytics() {
    return {
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
  }

  /**
   * Get default stream settings
   */
  private static getDefaultStreamSettings() {
    return {
      quality: ['720p', '1080p'],
      enableChat: true,
      enableRecording: true,
      isPrivate: false,
      requireSubscription: false,
      moderationLevel: 'medium',
      maxDuration: 480, // 8 hours
    }
  }

  /**
   * Get default stream metadata
   */
  private static getDefaultStreamMetadata() {
    return {
      language: 'en',
      ageRating: 'all',
      contentWarnings: [],
    }
  }

  /**
   * Get default VOD metadata
   */
  private static getDefaultVODMetadata() {
    return {
      uploadedFileName: 'sample-video.mp4',
      mimeType: 'video/mp4',
      resolution: '1920x1080',
      bitrate: 6000,
      frameRate: 60,
      audioCodec: 'aac',
      videoCodec: 'h264',
      language: 'en',
      subtitles: [],
      chapters: [],
    }
  }

  /**
   * Get default VOD analytics
   */
  private static getDefaultVODAnalytics() {
    return {
      totalViews: 0,
      uniqueViews: 0,
      averageWatchTime: 0,
      completionRate: 0,
      engagementScore: 0,
      geographicDistribution: {},
      deviceDistribution: {},
      trafficSources: {},
      retentionCurve: [],
    }
  }
}

/**
 * Development utilities for seeding and testing
 */
export class DevUtils {
  /**
   * Seed database with test data
   */
  static async seedDatabase(): Promise<void> {
    console.log('🌱 Seeding database with sample data...')
    
    const result = await MigrationUtils.createSampleData()
    
    if (result.success) {
      console.log('✅ Database seeded successfully')
    } else {
      console.error('❌ Failed to seed database:', result.error)
      throw new Error(result.error)
    }
  }

  /**
   * Reset database (cleanup and reseed)
   */
  static async resetDatabase(): Promise<void> {
    console.log('🔄 Resetting database...')
    
    // Cleanup existing data
    const cleanupResult = await MigrationUtils.cleanupAllData()
    if (!cleanupResult.success) {
      console.error('❌ Failed to cleanup database:', cleanupResult.error)
      throw new Error(cleanupResult.error)
    }
    
    // Seed with fresh data
    await this.seedDatabase()
    
    console.log('✅ Database reset complete')
  }

  /**
   * Validate database integrity
   */
  static async validateDatabase(): Promise<void> {
    console.log('🔍 Validating database integrity...')
    
    const result = await MigrationUtils.validateDataIntegrity()
    
    if (result.success) {
      const { isValid, issues, totalUsers, totalStreams, totalVODs } = result.data
      
      console.log(`📊 Database stats:`)
      console.log(`  - Users: ${totalUsers}`)
      console.log(`  - Streams: ${totalStreams}`)
      console.log(`  - VODs: ${totalVODs}`)
      
      if (isValid) {
        console.log('✅ Database integrity check passed')
      } else {
        console.log('⚠️  Database integrity issues found:')
        issues.forEach((issue: string) => console.log(`  - ${issue}`))
      }
    } else {
      console.error('❌ Failed to validate database:', result.error)
      throw new Error(result.error)
    }
  }
}

// Export migration functions for CLI usage
export const migrations = {
  createSampleData: MigrationUtils.createSampleData,
  cleanupAllData: MigrationUtils.cleanupAllData,
  migrateUserPreferences: MigrationUtils.migrateUserPreferences,
  validateDataIntegrity: MigrationUtils.validateDataIntegrity,
}