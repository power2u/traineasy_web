// Firebase Cloud Messaging Service Worker
// Enhanced for PWA meal notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBhMVDLD_jtcdVvk7xjqlzFQnnchBD7DR8",
  authDomain: "new-trainer-project.firebaseapp.com",
  databaseURL: "https://new-trainer-project-default-rtdb.firebaseio.com",
  projectId: "new-trainer-project",
  storageBucket: "new-trainer-project.appspot.com",
  messagingSenderId: "371334856577",
  appId: "1:371334856577:web:e36db919fc455f500b3280",
  measurementId: "G-6B0X83G6CC"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // If the payload has a notification property, the browser will automatically show the notification.
  // We should NOT show another one manually, otherwise the user will see duplicates.
  if (payload.notification) {
    console.log('[firebase-messaging-sw.js] Letting browser handle notification display');
    return;
  }

  // Only show custom notification if no notification property exists
  const notificationTitle = payload.data?.title || 'Train Easy';
  const notificationOptions = {
    body: payload.data?.body || 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data,
    tag: payload.data?.type || 'admin-notification',
    requireInteraction: false,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle PWA notification actions
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Handle different notification actions
  if (event.action === 'open') {
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open a new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else {
    // Default click behavior
    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open a new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event.notification.tag);
});

// Enhanced PWA notification support
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, options } = event.data;
    
    const notificationOptions = {
      body,
      icon: options.icon || '/logo.png',
      badge: '/logo.png',
      tag: options.tag || 'pwa-notification',
      requireInteraction: options.requireInteraction || false,
      data: options.data || {},
      actions: options.actions || []
    };

    self.registration.showNotification(title, notificationOptions);
  }
});
