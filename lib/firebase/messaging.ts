'use client';

<<<<<<< HEAD
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './config';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

=======
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { messaging } from './config';

>>>>>>> main
/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
<<<<<<< HEAD
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    // Check if messaging is available
    if (!messaging) {
      console.log('Firebase messaging not available');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });
      
      if (token) {
        console.log('FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
=======
    console.log('🔔 Starting FCM token request...');
    
    if (!messaging) {
      console.error('❌ Firebase messaging not supported or not initialized');
      throw new Error('Firebase messaging not available');
    }

    console.log('✅ Firebase messaging initialized');

    // Request permission
    console.log('📋 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('📋 Permission result:', permission);
    
    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      throw new Error('Notification permission denied');
    }

    // Get FCM token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    console.log('🔑 VAPID key present:', !!vapidKey);
    
    if (!vapidKey) {
      console.error('❌ VAPID key not configured in environment variables');
      throw new Error('VAPID key not configured');
    }

    console.log('🎫 Requesting FCM token from Firebase...');
    const token = await getToken(messaging, { vapidKey });
    
    if (token) {
      console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.error('❌ No registration token available');
      throw new Error('Failed to get FCM token');
    }
  } catch (error: any) {
    console.error('❌ Error getting FCM token:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
>>>>>>> main
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
<<<<<<< HEAD
  if (!messaging) return;
  
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Show a local notification (for foreground messages)
 */
export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (getNotificationPermission() === 'granted') {
    new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      ...options,
    });
  }
}

/**
 * Register service worker for background notifications
 */
export async function registerServiceWorker(): Promise<boolean> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
=======
  if (!messaging) {
    console.warn('Firebase messaging not supported');
    return () => {};
  }

  console.log('📡 Setting up foreground message listener...');
  
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('📨 Foreground message received:', payload);
    callback(payload);
  });

  return unsubscribe;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return Notification.permission === 'granted';
}

/**
 * Save FCM token to Supabase using server action
 */
export async function saveFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    // Import server action dynamically to avoid SSR issues
    const { saveFCMToken: saveFCMTokenAction } = await import('@/app/actions/fcm-actions');
    const result = await saveFCMTokenAction(token);
    return result.success;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return false;
  }
}

/**
 * Remove FCM token from Supabase using server action
 */
export async function removeFCMToken(userId: string, removeAll: boolean = false): Promise<boolean> {
  try {
    let currentToken = null;
    
    // If not removing all tokens, get current browser's token
    if (!removeAll) {
      try {
        currentToken = await getToken(messaging!, { 
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
        });
      } catch (error) {
        console.warn('Could not get current token for removal:', error);
      }
    }

    if (currentToken) {
      // Import server action dynamically to avoid SSR issues
      const { removeFCMToken: removeFCMTokenAction } = await import('@/app/actions/fcm-actions');
      const result = await removeFCMTokenAction(currentToken);
      return result.success;
    }

    return true; // If no token to remove, consider it successful
  } catch (error) {
    console.error('Error removing FCM token:', error);
>>>>>>> main
    return false;
  }
}
