<<<<<<< HEAD
// Meal Notification Service Worker
// Handles background meal reminders even when app is closed
// Optimized for battery life with intelligent scheduling

const CACHE_NAME = 'meal-notifications-v1';
const NOTIFICATION_WINDOW = 60; // Check for 60 minutes after scheduled meal time
let nextCheckTimeout = null;

// Install event
self.addEventListener('install', (event) => {
  console.log('[Meal SW] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Meal SW] Activating...');
  event.waitUntil(clients.claim());
});

// Helper: Get data from IndexedDB
function getFromIndexedDB(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fitness-tracker-db', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const getRequest = key ? store.get(key) : store.getAll();
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => resolve(null);
    };
  });
}

// Helper: Get from localStorage (via message to client)
async function getFromLocalStorage(key) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  if (clients.length === 0) {
    // No active clients, read from cache
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(`/cache/${key}`);
    if (response) {
      return await response.json();
    }
    return null;
  }
  
  // Ask client for data
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    clients[0].postMessage(
      { type: 'GET_LOCAL_STORAGE', key },
      [messageChannel.port2]
    );
    
    // Timeout after 1 second
    setTimeout(() => resolve(null), 1000);
  });
}

// Helper: Get user name
async function getUserName() {
  try {
    const userData = await getFromLocalStorage('user_data');
    if (userData && userData.full_name) {
      return userData.full_name.split(' ')[0]; // First name only
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Helper: Check if notification was sent today
async function wasNotificationSentToday(mealType) {
  try {
    const sentNotifications = await getFromLocalStorage('meal_notifications_sent');
    if (!sentNotifications) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const notifications = JSON.parse(sentNotifications);
    
    return notifications.some(n => 
      n.mealType === mealType && n.date === today
    );
  } catch (error) {
    return false;
  }
}

// Helper: Mark notification as sent
async function markNotificationSent(mealType) {
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length > 0) {
    clients[0].postMessage({
      type: 'MARK_NOTIFICATION_SENT',
      mealType,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    });
  }
}

// Helper: Convert time string to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Calculate next check time based on meal schedule
function calculateNextCheckTime(mealTimes) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parse all meal times
  const meals = [
    { name: 'breakfast', time: mealTimes.breakfast_time },
    { name: 'snack1', time: mealTimes.snack1_time },
    { name: 'lunch', time: mealTimes.lunch_time },
    { name: 'snack2', time: mealTimes.snack2_time },
    { name: 'dinner', time: mealTimes.dinner_time },
  ].map(m => ({
    ...m,
    minutes: timeToMinutes(m.time),
    checkTime: timeToMinutes(m.time) + 60, // Check 1 hour after meal time
  })).sort((a, b) => a.checkTime - b.checkTime);
  
  // Find next check time
  let nextCheck = null;
  
  for (const meal of meals) {
    // Check if we should check this meal (1 hour after scheduled time)
    if (meal.checkTime > currentMinutes) {
      nextCheck = meal.checkTime;
      break;
    }
  }
  
  // If no more checks today, schedule for first meal tomorrow
  if (!nextCheck) {
    // First meal tomorrow at 1 hour after scheduled time
    const firstMealTomorrow = meals[0].checkTime;
    const minutesUntilTomorrow = (24 * 60) - currentMinutes + firstMealTomorrow;
    console.log(`[Meal SW] No more checks today. Next check in ${Math.round(minutesUntilTomorrow / 60)} hours`);
    return minutesUntilTomorrow * 60 * 1000; // Convert to milliseconds
  }
  
  const minutesUntilCheck = nextCheck - currentMinutes;
  console.log(`[Meal SW] Next check in ${minutesUntilCheck} minutes`);
  return minutesUntilCheck * 60 * 1000; // Convert to milliseconds
}

// Helper: Schedule next check intelligently
async function scheduleNextCheck() {
  // Clear existing timeout
  if (nextCheckTimeout) {
    clearTimeout(nextCheckTimeout);
  }
  
  try {
    const mealTimesStr = await getFromLocalStorage('meal_times');
    if (!mealTimesStr) {
      // No meal times, check again in 1 hour
      console.log('[Meal SW] No meal times, checking again in 1 hour');
      nextCheckTimeout = setTimeout(() => {
        checkMealsAndNotify();
      }, 60 * 60 * 1000);
      return;
    }
    
    const mealTimes = JSON.parse(mealTimesStr);
    const delay = calculateNextCheckTime(mealTimes);
    
    console.log(`[Meal SW] Scheduling next check in ${Math.round(delay / 1000 / 60)} minutes`);
    
    nextCheckTimeout = setTimeout(() => {
      checkMealsAndNotify();
    }, delay);
  } catch (error) {
    console.error('[Meal SW] Error scheduling next check:', error);
    // Fallback: check again in 1 hour
    nextCheckTimeout = setTimeout(() => {
      checkMealsAndNotify();
    }, 60 * 60 * 1000);
  }
}

// Main: Check meals and send notifications
async function checkMealsAndNotify() {
  try {
    console.log('[Meal SW] Checking meals...');
    
    // Check if meal times are configured
    const mealTimesConfigured = await getFromLocalStorage('meal_times_configured');
    if (!mealTimesConfigured || mealTimesConfigured === 'false') {
      console.log('[Meal SW] Meal times not configured by user, skipping checks');
      // Check again in 6 hours
      nextCheckTimeout = setTimeout(() => {
        checkMealsAndNotify();
      }, 6 * 60 * 60 * 1000);
      return;
    }
    
    // Get meal times from local storage
    const mealTimesStr = await getFromLocalStorage('meal_times');
    if (!mealTimesStr) {
      console.log('[Meal SW] No meal times found');
      // Check again in 1 hour
      nextCheckTimeout = setTimeout(() => {
        checkMealsAndNotify();
      }, 60 * 60 * 1000);
      return;
    }
    
    const mealTimes = JSON.parse(mealTimesStr);
    
    // Check if we're in sleep hours (10 PM to 6 AM)
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 22 || currentHour < 6) {
      console.log('[Meal SW] Sleep hours (10 PM - 6 AM), skipping check');
      // Schedule next check at 6 AM
      const minutesUntil6AM = currentHour >= 22 
        ? (24 - currentHour + 6) * 60 - now.getMinutes()
        : (6 - currentHour) * 60 - now.getMinutes();
      console.log(`[Meal SW] Next check at 6 AM (in ${Math.round(minutesUntil6AM / 60)} hours)`);
      nextCheckTimeout = setTimeout(() => {
        checkMealsAndNotify();
      }, minutesUntil6AM * 60 * 1000);
      return;
    }
    
    const userName = await getUserName();
    const greeting = userName ? `Hi ${userName}` : 'Hi there';
    
    // Get today's meals from IndexedDB
    const today = new Date().toISOString().split('T')[0];
    const mealsData = await getFromIndexedDB('meals');
    
    const todayMeal = mealsData?.find(m => m.date === today) || {
      breakfast_completed: false,
      snack1_completed: false,
      lunch_completed: false,
      snack2_completed: false,
      dinner_completed: false,
    };
    
    // Current time in minutes
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Define meals to check
    const meals = [
      {
        type: 'breakfast',
        label: 'Breakfast',
        emoji: '🌅',
        time: mealTimes.breakfast_time,
        completed: todayMeal.breakfast_completed,
      },
      {
        type: 'snack1',
        label: 'Morning Snack',
        emoji: '🍎',
        time: mealTimes.snack1_time,
        completed: todayMeal.snack1_completed,
      },
      {
        type: 'lunch',
        label: 'Lunch',
        emoji: '🍱',
        time: mealTimes.lunch_time,
        completed: todayMeal.lunch_completed,
      },
      {
        type: 'snack2',
        label: 'Afternoon Snack',
        emoji: '🍪',
        time: mealTimes.snack2_time,
        completed: todayMeal.snack2_completed,
      },
      {
        type: 'dinner',
        label: 'Dinner',
        emoji: '🌙',
        time: mealTimes.dinner_time,
        completed: todayMeal.dinner_completed,
      },
    ];
    
    // Check each meal
    for (const meal of meals) {
      // Skip if already completed
      if (meal.completed) {
        continue;
      }
      
      // Skip if notification already sent today
      if (await wasNotificationSentToday(meal.type)) {
        continue;
      }
      
      // Check if we're in the notification window (1 hour after scheduled time)
      const scheduledMinutes = timeToMinutes(meal.time);
      const minutesPast = currentMinutes - scheduledMinutes;
      
      // Only notify if it's been 60 minutes since scheduled time
      // This gives user time to eat and log the meal
      if (minutesPast >= 60 && minutesPast <= NOTIFICATION_WINDOW) {
        // Send notification
        console.log(`[Meal SW] Sending notification for ${meal.label}`);
        
        await self.registration.showNotification(
          `${meal.emoji} ${meal.label} Reminder`,
          {
            body: `${greeting}! You missed your ${meal.label.toLowerCase()}. Please mark it as completed if you already took it.`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: `meal-${meal.type}-${today}`,
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200],
            data: {
              url: '/meals',
              mealType: meal.type,
              mealLabel: meal.label,
            },
            actions: [
              {
                action: 'mark-completed',
                title: 'Mark as Completed',
                icon: '/icons/check.png',
              },
              {
                action: 'view-meals',
                title: 'View Meals',
                icon: '/icons/meals.png',
              },
            ],
          }
        );
        
        // Mark as sent
        await markNotificationSent(meal.type);
      }
    }
    
    // Schedule next check intelligently
    await scheduleNextCheck();
  } catch (error) {
    console.error('[Meal SW] Error checking meals:', error);
    // Schedule retry in 1 hour
    await scheduleNextCheck();
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Meal SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  let urlToOpen = data.url || '/meals';
  
  if (action === 'mark-completed') {
    // Send message to client to mark meal as completed
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          if (clientList.length > 0) {
            clientList[0].postMessage({
              type: 'MARK_MEAL_COMPLETED',
              mealType: data.mealType,
            });
            return clientList[0].focus();
          }
          return clients.openWindow(urlToOpen);
        })
    );
  } else {
    // Open meals page
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes('/meals') && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[Meal SW] Message received:', event.data);
  
  if (event.data.type === 'CHECK_MEALS_NOW') {
    event.waitUntil(checkMealsAndNotify());
  }
  
  if (event.data.type === 'CACHE_LOCAL_STORAGE') {
    // Cache data for offline access
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        const response = new Response(JSON.stringify(event.data.value));
        return cache.put(`/cache/${event.data.key}`, response);
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[Meal SW] Periodic sync:', event.tag);
  
  if (event.tag === 'check-meals') {
    event.waitUntil(checkMealsAndNotify());
  }
});

// Background fetch (alternative to periodic sync)
self.addEventListener('sync', (event) => {
  console.log('[Meal SW] Background sync:', event.tag);
  
  if (event.tag === 'check-meals') {
    event.waitUntil(checkMealsAndNotify());
  }
});

// Start intelligent checking on activation
self.addEventListener('activate', (event) => {
  console.log('[Meal SW] Activated with intelligent scheduling...');
  
  // Initial check after 5 seconds
  setTimeout(() => {
    checkMealsAndNotify();
  }, 5000);
});

console.log('[Meal SW] Service worker loaded with battery-optimized scheduling');
=======
// Meal Notification Service Worker - DISABLED
// This service worker is DISABLED to prevent duplicate notifications
// All meal notifications are now handled by the server-side FCM system

const CACHE_NAME = 'meal-notifications-v1';
const NOTIFICATION_WINDOW = 60; // Check for 60 minutes after scheduled meal time
let nextCheckTimeout = null;

// Install event
self.addEventListener('install', (event) => {
  console.log('[Meal SW] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Meal SW] Activating...');
  event.waitUntil(clients.claim());
});

// Helper: Get data from IndexedDB
function getFromIndexedDB(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fitness-tracker-db', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const getRequest = key ? store.get(key) : store.getAll();
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => resolve(null);
    };
  });
}

// Helper: Get from localStorage (via message to client)
async function getFromLocalStorage(key) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  if (clients.length === 0) {
    // No active clients, read from cache
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(`/cache/${key}`);
    if (response) {
      return await response.json();
    }
    return null;
  }
  
  // Ask client for data
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    clients[0].postMessage(
      { type: 'GET_LOCAL_STORAGE', key },
      [messageChannel.port2]
    );
    
    // Timeout after 1 second
    setTimeout(() => resolve(null), 1000);
  });
}

// Helper: Get user name
async function getUserName() {
  try {
    const userData = await getFromLocalStorage('user_data');
    if (userData && userData.full_name) {
      return userData.full_name.split(' ')[0]; // First name only
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Helper: Check if notification was sent today
async function wasNotificationSentToday(mealType) {
  try {
    const sentNotifications = await getFromLocalStorage('meal_notifications_sent');
    if (!sentNotifications) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const notifications = JSON.parse(sentNotifications);
    
    return notifications.some(n => 
      n.mealType === mealType && n.date === today
    );
  } catch (error) {
    return false;
  }
}

// Helper: Mark notification as sent
async function markNotificationSent(mealType) {
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length > 0) {
    clients[0].postMessage({
      type: 'MARK_NOTIFICATION_SENT',
      mealType,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    });
  }
}

// Helper: Convert time string to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Calculate next check time based on meal schedule
function calculateNextCheckTime(mealTimes) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parse all meal times
  const meals = [
    { name: 'breakfast', time: mealTimes.breakfast_time },
    { name: 'snack1', time: mealTimes.snack1_time },
    { name: 'lunch', time: mealTimes.lunch_time },
    { name: 'snack2', time: mealTimes.snack2_time },
    { name: 'dinner', time: mealTimes.dinner_time },
  ].map(m => ({
    ...m,
    minutes: timeToMinutes(m.time),
    checkTime: timeToMinutes(m.time) + 60, // Check 1 hour after meal time
  })).sort((a, b) => a.checkTime - b.checkTime);
  
  // Find next check time
  let nextCheck = null;
  
  for (const meal of meals) {
    // Check if we should check this meal (1 hour after scheduled time)
    if (meal.checkTime > currentMinutes) {
      nextCheck = meal.checkTime;
      break;
    }
  }
  
  // If no more checks today, schedule for first meal tomorrow
  if (!nextCheck) {
    // First meal tomorrow at 1 hour after scheduled time
    const firstMealTomorrow = meals[0].checkTime;
    const minutesUntilTomorrow = (24 * 60) - currentMinutes + firstMealTomorrow;
    console.log(`[Meal SW] No more checks today. Next check in ${Math.round(minutesUntilTomorrow / 60)} hours`);
    return minutesUntilTomorrow * 60 * 1000; // Convert to milliseconds
  }
  
  const minutesUntilCheck = nextCheck - currentMinutes;
  console.log(`[Meal SW] Next check in ${minutesUntilCheck} minutes`);
  return minutesUntilCheck * 60 * 1000; // Convert to milliseconds
}

// Helper: Schedule next check intelligently
async function scheduleNextCheck() {
  // Clear existing timeout
  if (nextCheckTimeout) {
    clearTimeout(nextCheckTimeout);
  }
  
  try {
    const mealTimesStr = await getFromLocalStorage('meal_times');
    if (!mealTimesStr) {
      // No meal times, check again in 1 hour
      console.log('[Meal SW] No meal times, checking again in 1 hour');
      nextCheckTimeout = setTimeout(() => {
        checkMealsAndNotify();
      }, 60 * 60 * 1000);
      return;
    }
    
    const mealTimes = JSON.parse(mealTimesStr);
    const delay = calculateNextCheckTime(mealTimes);
    
    console.log(`[Meal SW] Scheduling next check in ${Math.round(delay / 1000 / 60)} minutes`);
    
    nextCheckTimeout = setTimeout(() => {
      checkMealsAndNotify();
    }, delay);
  } catch (error) {
    console.error('[Meal SW] Error scheduling next check:', error);
    // Fallback: check again in 1 hour
    nextCheckTimeout = setTimeout(() => {
      checkMealsAndNotify();
    }, 60 * 60 * 1000);
  }
}

// Main: Check meals and send notifications (DISABLED)
async function checkMealsAndNotify() {
  try {
    console.log('[Meal SW] DISABLED - All meal notifications handled by server-side FCM system');
    return; // Exit early - no local meal notifications
    
    // Check if meal times are configured
    const mealTimesConfigured = await getFromLocalStorage('meal_times_configured');
    if (!mealTimesConfigured || mealTimesConfigured === 'false') {
      console.log('[Meal SW] Meal times not configured by user, skipping checks');
      // Check again in 6 hours
      nextCheckTimeout = setTimeout(() => {
        checkMealsAndNotify();
      }, 6 * 60 * 60 * 1000);
      return;
    }
    
    // Get meal times from local storage
    const mealTimesStr = await getFromLocalStorage('meal_times');
    if (!mealTimesStr) {
      console.log('[Meal SW] No meal times found');
      // Check again in 1 hour
      nextCheckTimeout = setTimeout(() => {
        checkMealsAndNotify();
      }, 60 * 60 * 1000);
      return;
    }
    
    const mealTimes = JSON.parse(mealTimesStr);
    
    // Check if we're in sleep hours (10 PM to 6 AM)
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 22 || currentHour < 6) {
      console.log('[Meal SW] Sleep hours (10 PM - 6 AM), skipping check');
      // Schedule next check at 6 AM
      const minutesUntil6AM = currentHour >= 22 
        ? (24 - currentHour + 6) * 60 - now.getMinutes()
        : (6 - currentHour) * 60 - now.getMinutes();
      console.log(`[Meal SW] Next check at 6 AM (in ${Math.round(minutesUntil6AM / 60)} hours)`);
      nextCheckTimeout = setTimeout(() => {
        checkMealsAndNotify();
      }, minutesUntil6AM * 60 * 1000);
      return;
    }
    
    const userName = await getUserName();
    const greeting = userName ? `Hi ${userName}` : 'Hi there';
    
    // Get today's meals from IndexedDB
    const today = new Date().toISOString().split('T')[0];
    const mealsData = await getFromIndexedDB('meals');
    
    const todayMeal = mealsData?.find(m => m.date === today) || {
      breakfast_completed: false,
      snack1_completed: false,
      lunch_completed: false,
      snack2_completed: false,
      dinner_completed: false,
    };
    
    // Current time in minutes
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Define meals to check
    const meals = [
      {
        type: 'breakfast',
        label: 'Breakfast',
        emoji: '🌅',
        time: mealTimes.breakfast_time,
        completed: todayMeal.breakfast_completed,
      },
      {
        type: 'snack1',
        label: 'Morning Snack',
        emoji: '🍎',
        time: mealTimes.snack1_time,
        completed: todayMeal.snack1_completed,
      },
      {
        type: 'lunch',
        label: 'Lunch',
        emoji: '🍱',
        time: mealTimes.lunch_time,
        completed: todayMeal.lunch_completed,
      },
      {
        type: 'snack2',
        label: 'Afternoon Snack',
        emoji: '🍪',
        time: mealTimes.snack2_time,
        completed: todayMeal.snack2_completed,
      },
      {
        type: 'dinner',
        label: 'Dinner',
        emoji: '🌙',
        time: mealTimes.dinner_time,
        completed: todayMeal.dinner_completed,
      },
    ];
    
    // Check each meal
    for (const meal of meals) {
      // Skip if already completed
      if (meal.completed) {
        continue;
      }
      
      // Skip if notification already sent today
      if (await wasNotificationSentToday(meal.type)) {
        continue;
      }
      
      // Check if we're in the notification window (1 hour after scheduled time)
      const scheduledMinutes = timeToMinutes(meal.time);
      const minutesPast = currentMinutes - scheduledMinutes;
      
      // Only notify if it's been 60 minutes since scheduled time
      // This gives user time to eat and log the meal
      if (minutesPast >= 60 && minutesPast <= NOTIFICATION_WINDOW) {
        // Send notification
        console.log(`[Meal SW] Sending notification for ${meal.label}`);
        
        await self.registration.showNotification(
          `${meal.emoji} ${meal.label} Reminder`,
          {
            body: `${greeting}! You missed your ${meal.label.toLowerCase()}. Please mark it as completed if you already took it.`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: `meal-${meal.type}-${today}`,
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200],
            data: {
              url: '/meals',
              mealType: meal.type,
              mealLabel: meal.label,
            },
            actions: [
              {
                action: 'mark-completed',
                title: 'Mark as Completed',
                icon: '/icons/check.png',
              },
              {
                action: 'view-meals',
                title: 'View Meals',
                icon: '/icons/meals.png',
              },
            ],
          }
        );
        
        // Mark as sent
        await markNotificationSent(meal.type);
      }
    }
    
    // Schedule next check intelligently
    await scheduleNextCheck();
  } catch (error) {
    console.error('[Meal SW] Error checking meals:', error);
    // Schedule retry in 1 hour
    await scheduleNextCheck();
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Meal SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  let urlToOpen = data.url || '/meals';
  
  if (action === 'mark-completed') {
    // Send message to client to mark meal as completed
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          if (clientList.length > 0) {
            clientList[0].postMessage({
              type: 'MARK_MEAL_COMPLETED',
              mealType: data.mealType,
            });
            return clientList[0].focus();
          }
          return clients.openWindow(urlToOpen);
        })
    );
  } else {
    // Open meals page
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes('/meals') && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[Meal SW] Message received:', event.data);
  
  if (event.data.type === 'CHECK_MEALS_NOW') {
    event.waitUntil(checkMealsAndNotify());
  }
  
  if (event.data.type === 'CACHE_LOCAL_STORAGE') {
    // Cache data for offline access
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        const response = new Response(JSON.stringify(event.data.value));
        return cache.put(`/cache/${event.data.key}`, response);
      })
    );
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[Meal SW] Periodic sync:', event.tag);
  
  if (event.tag === 'check-meals') {
    event.waitUntil(checkMealsAndNotify());
  }
});

// Background fetch (alternative to periodic sync)
self.addEventListener('sync', (event) => {
  console.log('[Meal SW] Background sync:', event.tag);
  
  if (event.tag === 'check-meals') {
    event.waitUntil(checkMealsAndNotify());
  }
});

// Start intelligent checking on activation
self.addEventListener('activate', (event) => {
  console.log('[Meal SW] Activated with intelligent scheduling...');
  
  // Initial check after 5 seconds
  setTimeout(() => {
    checkMealsAndNotify();
  }, 5000);
});

console.log('[Meal SW] Service worker loaded with battery-optimized scheduling');
>>>>>>> main
