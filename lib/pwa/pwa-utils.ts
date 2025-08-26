// PWA utility functions for StreamVault

export interface PWAInstallPrompt {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface NotificationPermission {
  granted: boolean
  denied: boolean
  default: boolean
}

export interface PWACapabilities {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  hasNotificationPermission: boolean
  supportsBackgroundSync: boolean
  supportsServiceWorker: boolean
}

// Check if PWA is installable
export function isPWAInstallable(): boolean {
  return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window
}

// Check if PWA is already installed
export function isPWAInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true
  )
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    console.log('Service Worker registered successfully:', registration)

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New service worker is available
            showUpdateAvailableNotification()
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

// Show update available notification
function showUpdateAvailableNotification(): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('StreamVault Update Available', {
      body: 'A new version of StreamVault is available. Refresh to update.',
      icon: '/icons/icon-192x192.png',
      tag: 'app-update',
    })
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return { granted: false, denied: true, default: false }
  }

  let permission = Notification.permission

  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }

  return {
    granted: permission === 'granted',
    denied: permission === 'denied',
    default: permission === 'default',
  }
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    console.log('Push subscription successful:', subscription)
    return subscription
  } catch (error) {
    console.error('Push subscription failed:', error)
    return null
  }
}

// Convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Get PWA capabilities
export function getPWACapabilities(): PWACapabilities {
  return {
    isInstallable: isPWAInstallable(),
    isInstalled: isPWAInstalled(),
    isOnline: navigator.onLine,
    hasNotificationPermission:
      'Notification' in window && Notification.permission === 'granted',
    supportsBackgroundSync:
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype,
    supportsServiceWorker: 'serviceWorker' in navigator,
  }
}

// Install PWA
export async function installPWA(
  deferredPrompt: PWAInstallPrompt
): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('No install prompt available')
    return false
  }

  try {
    await deferredPrompt.prompt()
    const choiceResult = await deferredPrompt.userChoice

    console.log('PWA install prompt result:', choiceResult.outcome)
    return choiceResult.outcome === 'accepted'
  } catch (error) {
    console.error('PWA installation failed:', error)
    return false
  }
}

// Check if device is mobile
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Check if device supports touch
export function supportsTouchGestures(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Add to home screen guidance
export function getAddToHomeScreenInstructions(): string {
  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'Tap the Share button and select "Add to Home Screen"'
  } else if (userAgent.includes('android')) {
    return 'Tap the menu button and select "Add to Home Screen" or "Install App"'
  } else {
    return "Look for the install button in your browser's address bar"
  }
}

// Network status utilities
export function isOnline(): boolean {
  return navigator.onLine
}

export function addNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

// Background sync utilities
export async function registerBackgroundSync(
  registration: ServiceWorkerRegistration,
  tag: string
): Promise<void> {
  if ('sync' in registration) {
    try {
      await (registration as any).sync.register(tag)
      console.log('Background sync registered:', tag)
    } catch (error) {
      console.error('Background sync registration failed:', error)
    }
  }
}

// Cache management
export async function clearPWACache(): Promise<void> {
  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
    console.log('PWA cache cleared')
  }
}

export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) return 0

  let totalSize = 0
  const cacheNames = await caches.keys()

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()

    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }
  }

  return totalSize
}

// Format cache size for display
export function formatCacheSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'

  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}
