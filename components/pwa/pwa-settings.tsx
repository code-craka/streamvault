'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePWA } from '@/hooks/use-pwa'
import { OfflineManager } from '@/lib/pwa/offline-manager'
import { formatCacheSize, clearPWACache, getCacheSize } from '@/lib/pwa/pwa-utils'
import { 
  Smartphone, 
  Download, 
  Bell, 
  Trash2, 
  Settings, 
  HardDrive,
  Wifi,
  RefreshCw
} from 'lucide-react'

interface PWASettingsProps {
  className?: string
}

export function PWASettings({ className }: PWASettingsProps) {
  const { user } = useUser()
  const { 
    isInstalled, 
    hasNotificationPermission, 
    requestNotifications, 
    subscribeToPush 
  } = usePWA()
  const [offlineManager] = useState(() => new OfflineManager())
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      enabled: false,
      newVideos: true,
      liveStreams: true,
      comments: false
    },
    offline: {
      autoDownload: false,
      downloadQuality: '720p' as const,
      maxDownloads: 10
    },
    sync: {
      autoSync: true,
      syncOnWifi: true,
      backgroundSync: true
    }
  })
  
  const [cacheSize, setCacheSize] = useState(0)
  const [offlineVideos, setOfflineVideos] = useState(0)
  const [isClearing, setIsClearing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
    loadCacheInfo()
  }, [user])

  const loadSettings = () => {
    const stored = localStorage.getItem('streamvault-pwa-settings')
    if (stored) {
      setSettings(JSON.parse(stored))
    }
    
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        enabled: hasNotificationPermission
      }
    }))
    
    setIsLoading(false)
  }

  const loadCacheInfo = async () => {
    try {
      await offlineManager.initialize()
      const size = await getCacheSize()
      const videos = await offlineManager.getAllOfflineVideos()
      
      setCacheSize(size)
      setOfflineVideos(videos.length)
    } catch (error) {
      console.error('Failed to load cache info:', error)
    }
  }

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings)
    localStorage.setItem('streamvault-pwa-settings', JSON.stringify(newSettings))
  }

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && !hasNotificationPermission) {
      const permission = await requestNotifications()
      if (!permission.granted) {
        return
      }
      
      // Subscribe to push notifications
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (vapidKey) {
        await subscribeToPush(vapidKey)
      }
    }
    
    saveSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        enabled
      }
    })
  }

  const handleNotificationPreference = (key: string, value: boolean) => {
    saveSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    })
  }

  const handleOfflineSetting = (key: string, value: any) => {
    saveSettings({
      ...settings,
      offline: {
        ...settings.offline,
        [key]: value
      }
    })
  }

  const handleSyncSetting = (key: string, value: boolean) => {
    saveSettings({
      ...settings,
      sync: {
        ...settings.sync,
        [key]: value
      }
    })
  }

  const clearCache = async () => {
    setIsClearing(true)
    try {
      await clearPWACache()
      await loadCacheInfo()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const clearOfflineVideos = async () => {
    try {
      const videos = await offlineManager.getAllOfflineVideos()
      for (const video of videos) {
        await offlineManager.deleteOfflineVideo(video.videoId)
      }
      await loadCacheInfo()
    } catch (error) {
      console.error('Failed to clear offline videos:', error)
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">PWA Settings</h2>
      </div>

      {/* Installation Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-medium">App Installation</h3>
              <p className="text-sm text-gray-600">
                {isInstalled ? 'App is installed' : 'App not installed'}
              </p>
            </div>
          </div>
          {isInstalled && (
            <div className="text-green-600 text-sm font-medium">
              ✓ Installed
            </div>
          )}
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium">Push Notifications</h3>
                <p className="text-sm text-gray-600">
                  Get notified about new content and updates
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notifications.enabled}
              onCheckedChange={handleNotificationToggle}
            />
          </div>

          {settings.notifications.enabled && (
            <div className="ml-8 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">New videos from followed creators</span>
                <Switch
                  checked={settings.notifications.newVideos}
                  onCheckedChange={(checked) => handleNotificationPreference('newVideos', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Live stream notifications</span>
                <Switch
                  checked={settings.notifications.liveStreams}
                  onCheckedChange={(checked) => handleNotificationPreference('liveStreams', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Comments and replies</span>
                <Switch
                  checked={settings.notifications.comments}
                  onCheckedChange={(checked) => handleNotificationPreference('comments', checked)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Offline Downloads */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Download className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-medium">Offline Downloads</h3>
              <p className="text-sm text-gray-600">
                Manage offline video downloads
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Default download quality</span>
              <Select
                value={settings.offline.downloadQuality}
                onValueChange={(value) => handleOfflineSetting('downloadQuality', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  {user?.publicMetadata.subscriptionTier === 'pro' && (
                    <SelectItem value="4K">4K</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Download only on Wi-Fi</span>
              <Switch
                checked={settings.sync.syncOnWifi}
                onCheckedChange={(checked) => handleSyncSetting('syncOnWifi', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Sync Settings */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-medium">Data Sync</h3>
              <p className="text-sm text-gray-600">
                Sync your data across devices
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-sync when online</span>
              <Switch
                checked={settings.sync.autoSync}
                onCheckedChange={(checked) => handleSyncSetting('autoSync', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Background sync</span>
              <Switch
                checked={settings.sync.backgroundSync}
                onCheckedChange={(checked) => handleSyncSetting('backgroundSync', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Sync only on Wi-Fi</span>
              <Switch
                checked={settings.sync.syncOnWifi}
                onCheckedChange={(checked) => handleSyncSetting('syncOnWifi', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Storage Management */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <HardDrive className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-medium">Storage Management</h3>
              <p className="text-sm text-gray-600">
                Manage app cache and offline content
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cache Size</p>
                <p className="text-xs text-gray-600">{formatCacheSize(cacheSize)}</p>
              </div>
              <Button
                onClick={clearCache}
                disabled={isClearing}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isClearing ? 'Clearing...' : 'Clear Cache'}</span>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Offline Videos</p>
                <p className="text-xs text-gray-600">{offlineVideos} videos downloaded</p>
              </div>
              <Button
                onClick={clearOfflineVideos}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                disabled={offlineVideos === 0}
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* PWA Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="space-y-2">
          <h3 className="font-medium text-blue-900">Progressive Web App Features</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Works offline with downloaded content</p>
            <p>• Push notifications for real-time updates</p>
            <p>• Automatic data sync across devices</p>
            <p>• Native app-like experience</p>
            <p>• Fast loading and caching</p>
          </div>
        </div>
      </Card>
    </div>
  )
}