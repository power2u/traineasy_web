'use client';

import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseAvailable } from './config';

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    console.log('🔔 Starting FCM token request...');

    // Check if Firebase is available
    if (!isFirebaseAvailable()) {
      console.warn('⚠️ Firebase not available, skipping FCM token request');
      return null;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported in this browser');
      return null;
    }

    // Request permission first (before initializing messaging)
    console.log('📋 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('📋 Permission result:', permission);

    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied or dismissed by user');
      return null;
    }

    // Get VAPID key first
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    console.log('🔑 VAPID key present:', !!vapidKey);

    if (!vapidKey) {
      console.warn('⚠️ VAPID key not configured in environment variables');
      return null;
    }

    // Try to get FCM token with better error handling
    try {
      // Only initialize messaging after permission is granted
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        console.warn('⚠️ Firebase messaging not supported or not initialized');
        return null;
      }

      console.log('✅ Firebase messaging initialized');
      console.log('🎫 Requesting FCM token from Firebase...');
      
      // Try with custom service worker registration first
      let token = null;
      
      try {
        // Register custom service worker
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope',
        });
        
        console.log('✅ Custom service worker registered');
        
        token = await getToken(messaging, { 
          vapidKey,
          serviceWorkerRegistration: swRegistration
        });
      } catch (swError) {
        console.warn('⚠️ Custom service worker registration failed, trying default:', swError);
        
        // Fallback to default service worker
        try {
          token = await getToken(messaging, { vapidKey });
        } catch (defaultError) {
          console.warn('⚠️ Default service worker also failed:', defaultError);
          return null;
        }
      }

      if (token) {
        console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.warn('⚠️ No registration token available from Firebase');
        return null;
      }
      
    } catch (messagingError) {
      console.warn('⚠️ Firebase messaging error:', messagingError);
      return null;
    }

  } catch (error: any) {
    // Better error logging
    console.warn('⚠️ FCM token request failed:', error?.message || 'Unknown error');
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        message: error?.message || 'No message',
        code: error?.code || 'No code',
        name: error?.name || 'No name',
        stack: error?.stack || 'No stack',
        fullError: error
      });
    }

    return null;
  }
}

/**
 * Listen for foreground messages
 */
export async function onForegroundMessage(callback: (payload: any) => void): Promise<() => void> {
  try {
    if (!isFirebaseAvailable()) {
      console.warn('⚠️ Firebase not available, skipping foreground message setup');
      return () => {};
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.warn('⚠️ Firebase messaging not available');
      return () => {};
    }

    console.log('📡 Setting up foreground message listener...');

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📨 Foreground message received:', payload);
      callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.warn('⚠️ Failed to setup foreground message listener:', error);
    return () => {};
  }
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

/**
 * Get current notification permission status
 */
export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Check if the browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Save FCM token to database using server action
 */
export async function saveFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    console.log('🔄 saveFCMToken client function called for user:', userId, 'token:', token.substring(0, 20) + '...');
    
    // Import server action dynamically to avoid SSR issues
    const { saveFCMToken: saveFCMTokenAction } = await import('@/app/actions/fcm-actions');
    const result = await saveFCMTokenAction(token);
    
    console.log('📊 saveFCMToken result:', result);
    return result.success;
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    return false;
  }
}

/**
 * Remove FCM token from database using server action
 */
export async function removeFCMToken(userId: string, removeAll: boolean = false): Promise<boolean> {
  try {
    let currentToken = null;

    // If not removing all tokens, get current browser's token
    if (!removeAll && isFirebaseAvailable()) {
      try {
        const messaging = await getFirebaseMessaging();
        if (messaging) {
          const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
          if (vapidKey) {
            currentToken = await getToken(messaging, { vapidKey });
          }
        }
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
    console.warn('Error removing FCM token:', error);
    return false;
  }
}
