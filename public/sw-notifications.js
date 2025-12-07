// Service Worker for Background Notifications
// This runs independently of the main app

const NOTIFICATION_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour
const DB_NAME = 'fitness-tracker-db';
const DB_VERSION = 1;

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Check if user needs reminders
async function checkAndSendReminders() {
  try {
    const db = await openDB();
    const today = new Date().toISOString().split('T')[0];
    
    // Check water intake
    const waterTx = db.transaction(['water_logs'], 'readonly');
    const waterStore = waterTx.objectStore('water_logs');
    const waterRequest = waterStore.getAll();
    
    waterRequest.onsuccess = () => {
      const todayWater = waterRequest.result.filter(log => 
        log.date === today
      );
      
      const totalGlasses = todayWater.reduce((sum, log) => sum + log.glasses, 0);
      
      // Send reminder if less than 4 glasses by noon
      const hour = new Date().getHours();
      if (hour >= 12 && totalGlasses < 4) {
        self.registration.showNotification('💧 Hydration Reminder', {
          body: `You've only had ${totalGlasses} glasses today. Stay hydrated!`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'water-reminder',
          requireInteraction: false,
          actions: [
            { action: 'log-water', title: 'Log Water' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        });
      }
    };
    
    // Check meals
    const mealsTx = db.transaction(['meals'], 'readonly');
    const mealsStore = mealsTx.objectStore('meals');
    const mealsRequest = mealsStore.getAll();
    
    mealsRequest.onsuccess = () => {
      const todayMeals = mealsRequest.result.filter(meal => 
        meal.date === today && meal.completed
      );
      
      // Send reminder if no meals logged by 2 PM
      if (hour >= 14 && todayMeals.length === 0) {
        self.registration.showNotification('🍽️ Meal Reminder', {
          body: 'Don\'t forget to log your meals today!',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'meal-reminder',
          requireInteraction: false,
          actions: [
            { action: 'log-meal', title: 'Log Meal' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        });
      }
    };
    
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkAndSendReminders());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const urlToOpen = action === 'log-water' 
    ? '/water' 
    : action === 'log-meal' 
    ? '/meals' 
    : '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Install service worker
self.addEventListener('install', (event) => {
  console.log('Notification service worker installed');
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('Notification service worker activated');
  event.waitUntil(clients.claim());
});
