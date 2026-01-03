/**
 * Service Worker for Local Notifications
 * Handles offline notification display without FCM
 */

const CACHE_NAME = 'fitness-tracker-v1';
const NOTIFICATION_ENDPOINT = '/api/notifications/local';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/dashboard',
        '/meals',
        '/water',
        '/weight',
        '/offline.html'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Listen for messages from main thread (notification requests)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data } = event.data.payload;
    
    showLocalNotification(title, body, {
      icon: icon || '/icon-192x192.png',
      badge: badge || '/icon-192x192.png',
      tag: tag || 'fitness-reminder',
      data: data || {},
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icon-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    });
  }
});

// Show local notification
function showLocalNotification(title, body, options = {}) {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    // Check if we have permission
    if (Notification.permission === 'granted') {
      self.registration.showNotification(title, {
        body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag || 'fitness-reminder',
        data: options.data || {},
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || [],
        vibrate: [200, 100, 200],
        timestamp: Date.now()
      });
      
      console.log('Local notification shown:', title);
    } else {
      console.warn('Notification permission not granted');
    }
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to relevant page
    const urlToOpen = event.notification.data.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('Notification dismissed');
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request).catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(syncNotifications());
  }
});

// Sync notifications when back online
async function syncNotifications() {
  try {
    // Get user data from storage
    const userData = await getStoredUserData();
    if (!userData) return;
    
    // Fetch any missed notifications
    const response = await fetch(`${NOTIFICATION_ENDPOINT}?userId=${userData.id}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Synced notifications:', data.notifications?.length || 0);
    }
  } catch (error) {
    console.error('Failed to sync notifications:', error);
  }
}

// Get user data from IndexedDB or localStorage
async function getStoredUserData() {
  try {
    // Try localStorage first (simpler)
    const userData = localStorage.getItem('user_data');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Failed to get stored user data:', error);
    return null;
  }
}