// StreamVault Service Worker
const CACHE_NAME = 'streamvault-v1'
const STATIC_CACHE = 'streamvault-static-v1'
const DYNAMIC_CACHE = 'streamvault-dynamic-v1'
const OFFLINE_CACHE = 'streamvault-offline-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/library',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API routes that should be cached
const CACHEABLE_ROUTES = [
  '/api/streams',
  '/api/videos',
  '/api/user/profile'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('Service Worker: Static assets cached')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== OFFLINE_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request))
  } else if (url.pathname.includes('/videos/') && url.searchParams.has('offline')) {
    event.respondWith(handleOfflineVideo(request))
  } else if (request.destination === 'document') {
    event.respondWith(handlePageRequest(request))
  } else {
    event.respondWith(handleAssetRequest(request))
  }
})

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful responses for cacheable routes
    if (networkResponse.ok && CACHEABLE_ROUTES.some(route => url.pathname.startsWith(route))) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Fallback to cache if network fails
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for specific endpoints
    if (url.pathname === '/api/user/profile') {
      return new Response(JSON.stringify({ offline: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    throw error
  }
}

// Handle page requests with cache-first for static, network-first for dynamic
async function handlePageRequest(request) {
  const url = new URL(request.url)
  
  // Check if it's a static page
  if (STATIC_ASSETS.includes(url.pathname)) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
  }
  
  try {
    // Try network first for dynamic pages
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page
    const offlineResponse = await caches.match('/offline')
    if (offlineResponse) {
      return offlineResponse
    }
    
    // Last resort - basic offline response
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>StreamVault - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

// Handle asset requests with cache-first strategy
async function handleAssetRequest(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // For images, return a placeholder
    if (request.destination === 'image') {
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280">Image Unavailable</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      )
    }
    
    throw error
  }
}

// Handle offline video requests
async function handleOfflineVideo(request) {
  const cache = await caches.open(OFFLINE_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Return error if offline video not found
  return new Response('Video not available offline', { status: 404 })
}

// Background sync for analytics and user activity
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics())
  } else if (event.tag === 'watch-progress-sync') {
    event.waitUntil(syncWatchProgress())
  } else if (event.tag === 'user-activity-sync') {
    event.waitUntil(syncUserActivity())
  }
})

// Sync analytics data
async function syncAnalytics() {
  try {
    const db = await openIndexedDB()
    const transaction = db.transaction(['analytics'], 'readonly')
    const store = transaction.objectStore('analytics')
    const pendingData = await getAllFromStore(store)
    
    for (const data of pendingData) {
      if (!data.synced) {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        
        // Mark as synced
        const updateTransaction = db.transaction(['analytics'], 'readwrite')
        const updateStore = updateTransaction.objectStore('analytics')
        data.synced = true
        await updateStore.put(data)
      }
    }
    
    console.log('Analytics sync completed')
  } catch (error) {
    console.error('Analytics sync failed:', error)
  }
}

// Sync watch progress
async function syncWatchProgress() {
  try {
    const db = await openIndexedDB()
    const transaction = db.transaction(['watchProgress'], 'readonly')
    const store = transaction.objectStore('watchProgress')
    const pendingProgress = await getAllFromStore(store)
    
    for (const progress of pendingProgress) {
      if (!progress.synced) {
        await fetch('/api/watch-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(progress)
        })
        
        // Mark as synced
        const updateTransaction = db.transaction(['watchProgress'], 'readwrite')
        const updateStore = updateTransaction.objectStore('watchProgress')
        progress.synced = true
        await updateStore.put(progress)
      }
    }
    
    console.log('Watch progress sync completed')
  } catch (error) {
    console.error('Watch progress sync failed:', error)
  }
}

// Sync user activity
async function syncUserActivity() {
  try {
    const db = await openIndexedDB()
    const transaction = db.transaction(['userActivity'], 'readonly')
    const store = transaction.objectStore('userActivity')
    const pendingActivity = await getAllFromStore(store)
    
    for (const activity of pendingActivity) {
      if (!activity.synced) {
        await fetch('/api/user/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activity)
        })
        
        // Mark as synced
        const updateTransaction = db.transaction(['userActivity'], 'readwrite')
        const updateStore = updateTransaction.objectStore('userActivity')
        activity.synced = true
        await updateStore.put(activity)
      }
    }
    
    console.log('User activity sync completed')
  } catch (error) {
    console.error('User activity sync failed:', error)
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  
  const options = {
    body: 'You have new activity on StreamVault',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.body || options.body
    options.data = { ...options.data, ...data }
  }
  
  event.waitUntil(
    self.registration.showNotification('StreamVault', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked')
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    )
  } else if (event.action === 'close') {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
    )
  }
})

// Utility functions for IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StreamVaultDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create object stores
      if (!db.objectStoreNames.contains('analytics')) {
        db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true })
      }
      
      if (!db.objectStoreNames.contains('watchProgress')) {
        db.createObjectStore('watchProgress', { keyPath: 'videoId' })
      }
      
      if (!db.objectStoreNames.contains('userActivity')) {
        db.createObjectStore('userActivity', { keyPath: 'id', autoIncrement: true })
      }
      
      if (!db.objectStoreNames.contains('offlineVideos')) {
        db.createObjectStore('offlineVideos', { keyPath: 'videoId' })
      }
    }
  })
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}