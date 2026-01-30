'use client';

import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { messaging } from './config';

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    console.log('🔔 Starting FCM token request...');

    if (!messaging) {
      console.warn('⚠️ Firebase messaging not supported or not initialized');
      return null;
    }

    console.log('✅ Firebase messaging initialized');

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported in this browser');
      return null;
    }

    // Request permission
    console.log('📋 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('📋 Permission result:', permission);

    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied or dismissed by user');
      return null; // Return null instead of throwing error
    }

    // Get FCM token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    console.log('🔑 VAPID key present:', !!vapidKey);

    if (!vapidKey) {
      console.warn('⚠️ VAPID key not configured in environment variables');
      return null;
    }

    console.log('🎫 Requesting FCM token from Firebase...');
    const token = await getToken(messaging, { vapidKey });

    if (token) {
      console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('⚠️ No registration token available from Firebase');
      return null;
    }
  } catch (error: any) {
    // Log the error but don't throw it - this allows the app to continue functioning
    console.warn('⚠️ FCM token request failed (this is normal if notifications are disabled):', error.message);

    // Only log detailed error info in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
    }

    return null; // Return null instead of throwing
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.warn('Firebase messaging not supported');
    return () => { };
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
 * Remove FCM token from database using server action
 */
export async function removeFCMToken(userId: string, removeAll: boolean = false): Promise<boolean> {
  try {
    let currentToken = null;

    // If not removing all tokens, get current browser's token
    if (!removeAll && messaging) {
      try {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (vapidKey) {
          currentToken = await getToken(messaging, { vapidKey });
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
    return false; // Return false but don't throw
  }
}
