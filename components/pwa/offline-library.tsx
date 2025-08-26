'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  OfflineManager,
  type OfflineVideo,
  type DownloadProgress,
} from '@/lib/pwa/offline-manager'
import { formatCacheSize } from '@/lib/pwa/pwa-utils'
import {
  Download,
  Play,
  Trash2,
  Clock,
  HardDrive,
  Wifi,
  WifiOff,
} from 'lucide-react'

interface OfflineLibraryProps {
  className?: string
}

export function OfflineLibrary({ className }: OfflineLibraryProps) {
  const { user } = useUser()
  const [offlineManager] = useState(() => new OfflineManager())
  const [offlineVideos, setOfflineVideos] = useState<OfflineVideo[]>([])
  const [downloadQueue, setDownloadQueue] = useState<
    Map<string, DownloadProgress>
  >(new Map())
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    initializeOfflineManager()

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const initializeOfflineManager = async () => {
    try {
      await offlineManager.initialize()
      await loadOfflineVideos()
      await loadStorageUsage()
    } catch (error) {
      console.error('Failed to initialize offline manager:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadOfflineVideos = async () => {
    try {
      const videos = await offlineManager.getAllOfflineVideos()
      setOfflineVideos(videos)
    } catch (error) {
      console.error('Failed to load offline videos:', error)
    }
  }

  const loadStorageUsage = async () => {
    try {
      const usage = await offlineManager.getStorageUsage()
      setStorageUsage(usage)
    } catch (error) {
      console.error('Failed to load storage usage:', error)
    }
  }

  const downloadVideo = async (
    videoId: string,
    quality: '480p' | '720p' | '1080p' | '4K' = '720p'
  ) => {
    if (!user) return

    const subscriptionTier = user.publicMetadata.subscriptionTier as string
    const currentDownloads = offlineVideos.length

    if (!offlineManager.canDownload(subscriptionTier, currentDownloads)) {
      const limit = offlineManager.getDownloadLimit(subscriptionTier)
      alert(
        `Download limit reached. Your ${subscriptionTier} plan allows ${limit === -1 ? 'unlimited' : limit} downloads.`
      )
      return
    }

    try {
      const success = await offlineManager.downloadVideo(
        videoId,
        quality,
        progress => {
          setDownloadQueue(prev => new Map(prev.set(videoId, progress)))
        }
      )

      if (success) {
        await loadOfflineVideos()
        await loadStorageUsage()
        setDownloadQueue(prev => {
          const newQueue = new Map(prev)
          newQueue.delete(videoId)
          return newQueue
        })
      }
    } catch (error) {
      console.error('Download failed:', error)
      setDownloadQueue(prev => {
        const newQueue = new Map(prev)
        newQueue.delete(videoId)
        return newQueue
      })
    }
  }

  const deleteOfflineVideo = async (videoId: string) => {
    try {
      await offlineManager.deleteOfflineVideo(videoId)
      await loadOfflineVideos()
      await loadStorageUsage()
    } catch (error) {
      console.error('Failed to delete offline video:', error)
    }
  }

  const playOfflineVideo = async (video: OfflineVideo) => {
    // Navigate to video player with offline flag
    window.location.href = `/library/${video.videoId}?offline=true`
  }

  const cleanupExpiredVideos = async () => {
    try {
      const cleanedCount = await offlineManager.cleanupExpiredVideos()
      if (cleanedCount > 0) {
        await loadOfflineVideos()
        await loadStorageUsage()
        alert(`Cleaned up ${cleanedCount} expired videos`)
      } else {
        alert('No expired videos found')
      }
    } catch (error) {
      console.error('Failed to cleanup expired videos:', error)
    }
  }

  const formatTimeRemaining = (expiresAt: Date): string => {
    const now = new Date()
    const timeLeft = expiresAt.getTime() - now.getTime()
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24))

    if (daysLeft <= 0) return 'Expired'
    if (daysLeft === 1) return '1 day left'
    return `${daysLeft} days left`
  }

  const getDownloadLimitInfo = (): string => {
    if (!user) return ''

    const subscriptionTier = user.publicMetadata.subscriptionTier as string
    const limit = offlineManager.getDownloadLimit(subscriptionTier)
    const current = offlineVideos.length

    if (limit === -1) return `${current} downloads (unlimited)`
    return `${current}/${limit} downloads`
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <h2 className="text-2xl font-bold">Offline Library</h2>
          </div>
        </div>
        <Button
          onClick={cleanupExpiredVideos}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Cleanup</span>
        </Button>
      </div>

      {/* Storage Usage */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5 text-gray-600" />
            <span className="font-medium">Storage Usage</span>
          </div>
          <span className="text-sm text-gray-600">
            {getDownloadLimitInfo()}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600"
            style={{
              width: `${storageUsage.quota > 0 ? (storageUsage.used / storageUsage.quota) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-sm text-gray-600">
          <span>{formatCacheSize(storageUsage.used)} used</span>
          <span>{formatCacheSize(storageUsage.quota)} total</span>
        </div>
      </Card>

      {/* Download Queue */}
      {downloadQueue.size > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Downloads in Progress</h3>
          <div className="space-y-3">
            {Array.from(downloadQueue.entries()).map(([videoId, progress]) => (
              <div key={videoId} className="flex items-center space-x-3">
                <Download className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-sm">
                    <span>Video {videoId}</span>
                    <span>{progress.progress}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-gray-200">
                    <div
                      className="h-1 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Offline Videos */}
      {offlineVideos.length === 0 ? (
        <Card className="p-8 text-center">
          <Download className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No Offline Videos
          </h3>
          <p className="mb-4 text-gray-600">
            Download videos to watch them offline. Premium and Pro users can
            download videos for offline viewing.
          </p>
          <Button
            onClick={() => (window.location.href = '/library')}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Browse Library</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offlineVideos.map(video => (
            <Card key={video.videoId} className="overflow-hidden">
              {video.thumbnailUrl && (
                <div className="aspect-video bg-gray-200">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="p-4">
                <h3 className="mb-1 line-clamp-2 font-medium text-gray-900">
                  {video.title}
                </h3>

                {video.creatorName && (
                  <p className="mb-2 text-sm text-gray-600">
                    {video.creatorName}
                  </p>
                )}

                <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{video.quality}</span>
                  <span>{formatCacheSize(video.size)}</span>
                </div>

                <div className="mb-3 flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeRemaining(video.expiresAt)}</span>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => playOfflineVideo(video)}
                    size="sm"
                    className="flex flex-1 items-center justify-center space-x-1"
                  >
                    <Play className="h-3 w-3" />
                    <span>Play</span>
                  </Button>

                  <Button
                    onClick={() => deleteOfflineVideo(video.videoId)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
