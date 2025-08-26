'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  SyncService,
  type SyncResult,
  type SyncConflict,
} from '@/lib/pwa/sync-service'
import { OfflineManager } from '@/lib/pwa/offline-manager'
import {
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
} from 'lucide-react'

interface SyncStatusProps {
  className?: string
}

export function SyncStatus({ className }: SyncStatusProps) {
  const { user } = useUser()
  const [syncService] = useState(() => new SyncService(new OfflineManager()))
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingChanges, setPendingChanges] = useState(0)

  useEffect(() => {
    loadSyncStatus()

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      if (syncService.shouldSync()) {
        handleAutoSync()
      }
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Auto-sync interval
    const syncInterval = setInterval(() => {
      if (isOnline && syncService.shouldSync()) {
        handleAutoSync()
      }
    }, 60000) // Check every minute

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(syncInterval)
    }
  }, [user])

  const loadSyncStatus = () => {
    const lastSync = localStorage.getItem('streamvault-last-sync')
    if (lastSync) {
      setLastSyncTime(new Date(lastSync))
    }

    // Load pending changes count (this would be implemented based on your data structure)
    setPendingChanges(0) // Placeholder
  }

  const handleManualSync = async () => {
    if (!user || !isOnline) return

    setIsSyncing(true)
    try {
      const result = await syncService.triggerManualSync(user.id)
      setSyncResult(result)
      setConflicts(result.conflicts)

      if (result.success) {
        setLastSyncTime(new Date())
        syncService.updateLastSyncTime()
        setPendingChanges(0)
      }
    } catch (error) {
      console.error('Manual sync failed:', error)
      setSyncResult({
        success: false,
        conflicts: [],
        synced: {
          watchProgress: 0,
          preferences: false,
          analytics: 0,
          userActivity: 0,
        },
        errors: [error instanceof Error ? error.message : 'Sync failed'],
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAutoSync = async () => {
    if (!user || !isOnline) return

    try {
      await syncService.backgroundSync(user.id)
      setLastSyncTime(new Date())
      syncService.updateLastSyncTime()
    } catch (error) {
      console.error('Auto sync failed:', error)
    }
  }

  const resolveConflict = async (conflict: SyncConflict, useLocal: boolean) => {
    // This would implement conflict resolution logic
    console.log('Resolving conflict:', conflict, 'Use local:', useLocal)

    // Remove resolved conflict from list
    setConflicts(prev => prev.filter(c => c !== conflict))
  }

  const formatLastSyncTime = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getSyncStatusColor = (): string => {
    if (!isOnline) return 'text-gray-500'
    if (isSyncing) return 'text-blue-600'
    if (conflicts.length > 0) return 'text-yellow-600'
    if (syncResult?.success === false) return 'text-red-600'
    return 'text-green-600'
  }

  const getSyncStatusText = (): string => {
    if (!isOnline) return 'Offline'
    if (isSyncing) return 'Syncing...'
    if (conflicts.length > 0) return `${conflicts.length} conflicts`
    if (syncResult?.success === false) return 'Sync failed'
    if (lastSyncTime) return `Synced ${formatLastSyncTime(lastSyncTime)}`
    return 'Not synced'
  }

  if (!user) return null

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <h3 className="font-medium">Sync Status</h3>
            </div>
          </div>

          <Button
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
            />
            <span>Sync</span>
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isSyncing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
            ) : conflicts.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            ) : syncResult?.success === false ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <Check className="h-4 w-4 text-green-600" />
            )}
            <span className={`text-sm ${getSyncStatusColor()}`}>
              {getSyncStatusText()}
            </span>
          </div>

          {pendingChanges > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{pendingChanges} pending</span>
            </div>
          )}
        </div>

        {/* Last sync result */}
        {syncResult && (
          <div className="space-y-1 text-xs text-gray-600">
            {syncResult.success ? (
              <div className="space-y-1">
                <p>✓ {syncResult.synced.watchProgress} watch progress synced</p>
                <p>✓ {syncResult.synced.analytics} analytics events synced</p>
                <p>✓ {syncResult.synced.userActivity} activities synced</p>
                {syncResult.synced.preferences && <p>✓ Preferences synced</p>}
              </div>
            ) : (
              <div className="text-red-600">
                {syncResult.errors.map((error, index) => (
                  <p key={index}>✗ {error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-yellow-800">
              Sync Conflicts ({conflicts.length})
            </h4>
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
              >
                <div className="text-sm">
                  <p className="mb-1 font-medium text-yellow-800">
                    {conflict.field}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        This device: {JSON.stringify(conflict.localValue)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        Other device: {JSON.stringify(conflict.remoteValue)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <Button
                      onClick={() => resolveConflict(conflict, true)}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      Use This Device
                    </Button>
                    <Button
                      onClick={() => resolveConflict(conflict, false)}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      Use Other Device
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sync info */}
        <div className="space-y-1 text-xs text-gray-500">
          <p>• Data syncs automatically across devices</p>
          <p>• Manual sync available when online</p>
          <p>• Offline changes sync when reconnected</p>
        </div>
      </div>
    </Card>
  )
}
