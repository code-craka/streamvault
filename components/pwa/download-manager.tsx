'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OfflineManager, type VideoQuality } from '@/lib/pwa/offline-manager'
import { Download, Check, X, Pause, Play, AlertCircle } from 'lucide-react'

interface DownloadManagerProps {
  videoId: string
  videoTitle: string
  videoThumbnail?: string
  creatorName?: string
  className?: string
}

export function DownloadManager({
  videoId,
  videoTitle,
  videoThumbnail,
  creatorName,
  className
}: DownloadManagerProps) {
  const { user } = useUser()
  const [offlineManager] = useState(() => new OfflineManager())
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>('720p')
  const [canDownload, setCanDownload] = useState(false)
  const [downloadLimit, setDownloadLimit] = useState(0)
  const [currentDownloads, setCurrentDownloads] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeDownloadManager()
  }, [user])

  const initializeDownloadManager = async () => {
    if (!user) return

    try {
      await offlineManager.initialize()
      
      // Check if video is already downloaded
      const existingVideo = await offlineManager.getOfflineVideo(videoId)
      setIsDownloaded(!!existingVideo && !isVideoExpired(existingVideo))
      
      // Check download limits
      const subscriptionTier = user.publicMetadata.subscriptionTier as string
      const limit = offlineManager.getDownloadLimit(subscriptionTier)
      const videos = await offlineManager.getAllOfflineVideos()
      const current = videos.length
      
      setDownloadLimit(limit)
      setCurrentDownloads(current)
      setCanDownload(offlineManager.canDownload(subscriptionTier, current))
      
    } catch (error) {
      console.error('Failed to initialize download manager:', error)
      setError('Failed to initialize download manager')
    }
  }

  const isVideoExpired = (video: any): boolean => {
    return new Date() > new Date(video.expiresAt)
  }

  const handleDownload = async () => {
    if (!user || !canDownload) return

    setIsDownloading(true)
    setError(null)

    try {
      const success = await offlineManager.downloadVideo(
        videoId,
        selectedQuality,
        (progress) => {
          setDownloadProgress(progress.progress)
          if (progress.status === 'failed') {
            setError(progress.error || 'Download failed')
            setIsDownloading(false)
          }
        }
      )

      if (success) {
        setIsDownloaded(true)
        setCurrentDownloads(prev => prev + 1)
        setCanDownload(offlineManager.canDownload(
          user.publicMetadata.subscriptionTier as string,
          currentDownloads + 1
        ))
      } else {
        setError('Download failed')
      }
    } catch (error) {
      console.error('Download failed:', error)
      setError(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }

  const handleRemoveDownload = async () => {
    try {
      await offlineManager.deleteOfflineVideo(videoId)
      setIsDownloaded(false)
      setCurrentDownloads(prev => prev - 1)
      setCanDownload(true)
    } catch (error) {
      console.error('Failed to remove download:', error)
      setError('Failed to remove download')
    }
  }

  const getDownloadLimitText = (): string => {
    if (downloadLimit === -1) return 'Unlimited downloads'
    return `${currentDownloads}/${downloadLimit} downloads used`
  }

  const getSubscriptionRequiredText = (): string => {
    const tier = user?.publicMetadata.subscriptionTier as string
    if (!tier || tier === 'basic') {
      return 'Premium or Pro subscription required for offline downloads'
    }
    return ''
  }

  if (!user) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Sign in to download videos for offline viewing</p>
        </div>
      </Card>
    )
  }

  const subscriptionTier = user.publicMetadata.subscriptionTier as string
  const requiresSubscription = !subscriptionTier || subscriptionTier === 'basic'

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium">Offline Download</h3>
          </div>
          {isDownloaded && (
            <div className="flex items-center space-x-1 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm">Downloaded</span>
            </div>
          )}
        </div>

        {/* Subscription requirement */}
        {requiresSubscription && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                {getSubscriptionRequiredText()}
              </p>
            </div>
            <Button
              onClick={() => window.location.href = '/settings/billing'}
              size="sm"
              className="mt-2"
            >
              Upgrade Now
            </Button>
          </div>
        )}

        {/* Download limits */}
        {!requiresSubscription && (
          <div className="text-sm text-gray-600">
            {getDownloadLimitText()}
          </div>
        )}

        {/* Quality selector */}
        {!isDownloaded && !requiresSubscription && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Download Quality
            </label>
            <Select value={selectedQuality} onValueChange={(value) => setSelectedQuality(value as VideoQuality)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="480p">480p (Smaller file)</SelectItem>
                <SelectItem value="720p">720p (Recommended)</SelectItem>
                <SelectItem value="1080p">1080p (High quality)</SelectItem>
                {subscriptionTier === 'pro' && (
                  <SelectItem value="4K">4K (Premium quality)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Download progress */}
        {isDownloading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Downloading...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-2">
          {isDownloaded ? (
            <>
              <Button
                onClick={() => window.location.href = `/library/${videoId}?offline=true`}
                className="flex-1 flex items-center justify-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Play Offline</span>
              </Button>
              <Button
                onClick={handleRemoveDownload}
                variant="outline"
                className="flex items-center justify-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Remove</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={handleDownload}
              disabled={isDownloading || !canDownload || requiresSubscription}
              className="w-full flex items-center justify-center space-x-2"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download for Offline</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Download info */}
        {!requiresSubscription && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Downloads expire after 30 days</p>
            <p>• Videos sync across your devices</p>
            <p>• Watch without internet connection</p>
          </div>
        )}
      </div>
    </Card>
  )
}