'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  getPWACapabilities,
  installPWA,
  addNetworkListeners,
  registerBackgroundSync,
  type PWAInstallPrompt,
  type PWACapabilities,
  type NotificationPermission,
} from '@/lib/pwa/pwa-utils'

interface PWAState {
  isInstalled: boolean
  isInstallable: boolean
  isOnline: boolean
  capabilities: PWACapabilities
  installPrompt: PWAInstallPrompt | null
  serviceWorkerRegistration: ServiceWorkerRegistration | null
  notificationPermission: NotificationPermission
  isLoading: boolean
  error: string | null
}

interface PWAActions {
  install: () => Promise<boolean>
  requestNotifications: () => Promise<NotificationPermission>
  subscribeToPush: (vapidKey: string) => Promise<PushSubscription | null>
  registerSync: (tag: string) => Promise<void>
  refresh: () => void
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isOnline: navigator?.onLine ?? true,
    capabilities: {
      isInstallable: false,
      isInstalled: false,
      isOnline: true,
      hasNotificationPermission: false,
      supportsBackgroundSync: false,
      supportsServiceWorker: false,
    },
    installPrompt: null,
    serviceWorkerRegistration: null,
    notificationPermission: {
      granted: false,
      denied: false,
      default: true,
    },
    isLoading: true,
    error: null,
  })

  // Initialize PWA
  useEffect(() => {
    let mounted = true

    const initializePWA = async () => {
      try {
        // Get initial capabilities
        const capabilities = getPWACapabilities()

        // Register service worker
        const registration = await registerServiceWorker()

        // Get notification permission status
        const notificationPermission = await requestNotificationPermission()

        if (mounted) {
          setState(prev => ({
            ...prev,
            capabilities,
            serviceWorkerRegistration: registration,
            notificationPermission,
            isInstalled: capabilities.isInstalled,
            isInstallable: capabilities.isInstallable,
            isOnline: capabilities.isOnline,
            isLoading: false,
          }))
        }
      } catch (error) {
        console.error('PWA initialization failed:', error)
        if (mounted) {
          setState(prev => ({
            ...prev,
            error:
              error instanceof Error
                ? error.message
                : 'PWA initialization failed',
            isLoading: false,
          }))
        }
      }
    }

    initializePWA()

    return () => {
      mounted = false
    }
  }, [])

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setState(prev => ({
        ...prev,
        installPrompt: e as any,
        isInstallable: true,
      }))
    }

    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        installPrompt: null,
      }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Listen for network changes
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({
        ...prev,
        isOnline: true,
        capabilities: { ...prev.capabilities, isOnline: true },
      }))
    }

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
        capabilities: { ...prev.capabilities, isOnline: false },
      }))
    }

    const removeListeners = addNetworkListeners(handleOnline, handleOffline)
    return removeListeners
  }, [])

  // Install PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) {
      console.warn('No install prompt available')
      return false
    }

    try {
      const success = await installPWA(state.installPrompt)

      if (success) {
        setState(prev => ({
          ...prev,
          isInstalled: true,
          installPrompt: null,
        }))
      }

      return success
    } catch (error) {
      console.error('PWA installation failed:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Installation failed',
      }))
      return false
    }
  }, [state.installPrompt])

  // Request notification permission
  const requestNotifications =
    useCallback(async (): Promise<NotificationPermission> => {
      try {
        const permission = await requestNotificationPermission()

        setState(prev => ({
          ...prev,
          notificationPermission: permission,
          capabilities: {
            ...prev.capabilities,
            hasNotificationPermission: permission.granted,
          },
        }))

        return permission
      } catch (error) {
        console.error('Notification permission request failed:', error)
        setState(prev => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Notification permission failed',
        }))

        return { granted: false, denied: true, default: false }
      }
    }, [])

  // Subscribe to push notifications
  const subscribeToPush = useCallback(
    async (vapidKey: string): Promise<PushSubscription | null> => {
      if (!state.serviceWorkerRegistration) {
        console.warn('Service worker not registered')
        return null
      }

      try {
        const subscription = await subscribeToPushNotifications(
          state.serviceWorkerRegistration,
          vapidKey
        )

        return subscription
      } catch (error) {
        console.error('Push subscription failed:', error)
        setState(prev => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Push subscription failed',
        }))
        return null
      }
    },
    [state.serviceWorkerRegistration]
  )

  // Register background sync
  const registerSync = useCallback(
    async (tag: string): Promise<void> => {
      if (!state.serviceWorkerRegistration) {
        console.warn('Service worker not registered')
        return
      }

      try {
        await registerBackgroundSync(state.serviceWorkerRegistration, tag)
      } catch (error) {
        console.error('Background sync registration failed:', error)
        setState(prev => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Background sync failed',
        }))
      }
    },
    [state.serviceWorkerRegistration]
  )

  // Refresh PWA state
  const refresh = useCallback(() => {
    setState(prev => ({
      ...prev,
      capabilities: getPWACapabilities(),
      isOnline: navigator.onLine,
      error: null,
    }))
  }, [])

  return {
    ...state,
    install,
    requestNotifications,
    subscribeToPush,
    registerSync,
    refresh,
  }
}
