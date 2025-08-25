// Push notification service for StreamVault PWA

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  data?: Record<string, any>
  actions?: NotificationAction[]
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class NotificationService {
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null

  async initialize(registration: ServiceWorkerRegistration): Promise<void> {
    this.registration = registration
    
    // Check for existing subscription
    this.subscription = await registration.pushManager.getSubscription()
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications')
    }

    let permission = Notification.permission

    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    return permission
  }

  // Subscribe to push notifications
  async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered')
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    try {
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      })

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription)

      return this.subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true
    }

    try {
      const success = await this.subscription.unsubscribe()
      
      if (success) {
        // Remove subscription from server
        await this.removeSubscriptionFromServer(this.subscription)
        this.subscription = null
      }

      return success
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  // Show local notification
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered')
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      image: payload.image,
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      vibrate: payload.vibrate || [200, 100, 200]
    }

    await this.registration.showNotification(payload.title, options)
  }

  // Get current subscription
  getSubscription(): PushSubscription | null {
    return this.subscription
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  }

  // Check if user has granted permission
  hasPermission(): boolean {
    return Notification.permission === 'granted'
  }

  // Send subscription to server
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
      }
    }

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`
      },
      body: JSON.stringify(subscriptionData)
    })

    if (!response.ok) {
      throw new Error('Failed to send subscription to server')
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`
      },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    })

    if (!response.ok) {
      throw new Error('Failed to remove subscription from server')
    }
  }

  // Utility functions
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  private async getAuthToken(): Promise<string> {
    // Get auth token from Clerk or wherever it's stored
    // This should be implemented based on your auth system
    return 'auth-token'
  }
}

// Predefined notification templates
export const NotificationTemplates = {
  newFollower: (username: string): NotificationPayload => ({
    title: 'New Follower',
    body: `${username} started following you`,
    icon: '/icons/icon-192x192.png',
    tag: 'new-follower',
    data: { type: 'follower', username },
    actions: [
      { action: 'view-profile', title: 'View Profile' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }),

  liveStreamStarted: (streamerName: string, title: string): NotificationPayload => ({
    title: `${streamerName} is now live!`,
    body: title,
    icon: '/icons/icon-192x192.png',
    tag: 'live-stream',
    data: { type: 'live-stream', streamerName, title },
    requireInteraction: true,
    actions: [
      { action: 'watch-stream', title: 'Watch Now' },
      { action: 'dismiss', title: 'Later' }
    ]
  }),

  newVideo: (creatorName: string, videoTitle: string): NotificationPayload => ({
    title: 'New Video Available',
    body: `${creatorName} uploaded: ${videoTitle}`,
    icon: '/icons/icon-192x192.png',
    tag: 'new-video',
    data: { type: 'new-video', creatorName, videoTitle },
    actions: [
      { action: 'watch-video', title: 'Watch' },
      { action: 'save-later', title: 'Save for Later' }
    ]
  }),

  subscriptionExpiring: (daysLeft: number): NotificationPayload => ({
    title: 'Subscription Expiring Soon',
    body: `Your subscription expires in ${daysLeft} days`,
    icon: '/icons/icon-192x192.png',
    tag: 'subscription-expiring',
    data: { type: 'subscription', daysLeft },
    requireInteraction: true,
    actions: [
      { action: 'renew-subscription', title: 'Renew Now' },
      { action: 'remind-later', title: 'Remind Later' }
    ]
  }),

  downloadComplete: (videoTitle: string): NotificationPayload => ({
    title: 'Download Complete',
    body: `${videoTitle} is now available offline`,
    icon: '/icons/icon-192x192.png',
    tag: 'download-complete',
    data: { type: 'download', videoTitle },
    actions: [
      { action: 'watch-offline', title: 'Watch Now' },
      { action: 'dismiss', title: 'OK' }
    ]
  }),

  syncComplete: (): NotificationPayload => ({
    title: 'Sync Complete',
    body: 'Your data has been synchronized across devices',
    icon: '/icons/icon-192x192.png',
    tag: 'sync-complete',
    data: { type: 'sync' },
    silent: true
  })
}