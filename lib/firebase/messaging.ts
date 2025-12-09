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
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
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
 * Save FCM token to Supabase
 */
export async function saveFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/fcm/save-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, token }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return false;
  }
}

/**
 * Remove FCM token from Supabase
 */
export async function removeFCMToken(userId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/fcm/remove-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return false;
  }
}
