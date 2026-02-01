'use client';

import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { getFirebaseMessaging, isFirebaseAvailable } from './config';

/**
 * Request notification permission and get FCM token
 * CSP-safe version that gracefully handles Content Security Policy violations
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    console.log('🔔 Starting FCM token request (CSP-safe mode)...');

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported in this browser');
      return null;
    }

    // Request permission first (this always works, even with CSP)
    console.log('📋 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('📋 Permission result:', permission);

    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied or dismissed by user');
      return null;
    }

    // Try Firebase operations with CSP error detection
    try {
      // Check if Firebase is available
      if (!isFirebaseAvailable()) {
        console.warn('⚠️ Firebase not available, using browser notifications only');
        return null;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('⚠️ VAPID key not configured, using browser notifications only');
        return null;
      }

      // Try to get messaging with timeout to detect CSP blocks
      const messaging = await Promise.race([
        getFirebaseMessaging(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase initialization timeout')), 5000)
        )
      ]) as any;

      if (!messaging) {
        console.warn('⚠️ Firebase messaging not available, using browser notifications only');
        return null;
      }

      console.log('✅ Firebase messaging initialized');
      
      // Try to get FCM token with CSP error detection
      const token = await Promise.race([
        getToken(messaging, { vapidKey }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('FCM token request timeout')), 10000)
        )
      ]) as string;

      if (token) {
        console.log('✅ FCM Token received:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.warn('⚠️ No FCM token available, using browser notifications only');
        return null;
      }
      
    } catch (firebaseError: any) {
      // Detect CSP violations
      if (firebaseError?.message?.includes('Content Security Policy') ||
          firebaseError?.message?.includes('Failed to fetch') ||
          firebaseError?.message?.includes('violates the document') ||
          firebaseError?.message?.includes('timeout')) {
        console.warn('⚠️ Firebase blocked by Content Security Policy - using browser notifications only');
        console.warn('ℹ️ This is normal in production environments with strict CSP');
        return null;
      }
      
      console.warn('⚠️ Firebase error (non-CSP):', firebaseError?.message);
      return null;
    }

  } catch (error: any) {
    console.warn('⚠️ Notification permission request failed:', error?.message || 'Unknown error');
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
