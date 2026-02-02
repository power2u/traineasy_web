'use client';

import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './config';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Check if messaging is supported
    if (!messaging) {
      console.warn('Firebase messaging not supported');
      return null;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
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
        console.log('FCM token received:', token);
        return token;
      } else {
        console.warn('No FCM token available');
        return null;
      }
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Save FCM token to database
 */
export async function saveFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/fcm/save-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        token,
      }),
    });

    if (response.ok) {
      console.log('FCM token saved successfully');
      return true;
    } else {
      console.error('Failed to save FCM token:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return false;
  }
}

/**
 * Set up foreground message listener
 */
export function setupForegroundMessageListener() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    // Show notification manually for foreground messages
    if (payload.notification) {
      const { title, body, icon } = payload.notification;
      
      new Notification(title || 'New Message', {
        body: body || '',
        icon: icon || '/logo.png',
        badge: '/logo.png',
        tag: 'fcm-notification',
      });
    }
  });
}

/**
 * Refresh FCM token and update in database
 */
export async function refreshFCMToken(userId: string): Promise<string | null> {
  try {
    if (!messaging) {
      console.warn('Firebase messaging not supported');
      return null;
    }

    // Get a fresh token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });
    
    if (token) {
      console.log('FCM token refreshed:', token);
      
      // Update token in database
      const success = await saveFCMToken(userId, token);
      if (success) {
        return token;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error refreshing FCM token:', error);
    return null;
  }
}

/**
 * Check if we should refresh the token (called periodically)
 */
export async function checkAndRefreshToken(userId: string): Promise<void> {
  try {
    if (!messaging || !areNotificationsEnabled()) {
      return;
    }

    // Try to get current token
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (currentToken) {
      // Check if this token exists in our database
      const response = await fetch('/api/fcm/check-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token: currentToken,
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.exists) {
        // Token doesn't exist in DB or is invalid, save it
        console.log('Token not found in DB, saving...');
        await saveFCMToken(userId, currentToken);
      } else {
        console.log('Token is valid and exists in DB');
      }
    }
  } catch (error) {
    console.error('Error checking token:', error);
  }
}