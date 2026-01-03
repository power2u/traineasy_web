'use client';

import { useEffect } from 'react';
import { onForegroundMessage } from '@/lib/firebase/messaging';

/**
 * Component to handle FCM foreground notifications
 * Shows browser notifications even when app is open
 */
export function FCMForegroundHandler() {
  useEffect(() => {
    console.log('🔔 Setting up FCM foreground message handler...');

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('📨 Foreground message received:', payload);

      // Extract notification data
      const title = payload.notification?.title || payload.data?.title || 'Train Easy';
      const body = payload.notification?.body || payload.data?.body || 'You have a new notification';
      const icon = '/logo.png';
      const data = payload.data || {};

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        console.log('🔔 Showing browser notification:', { title, body });
        
        const notification = new Notification(title, {
          body,
          icon,
          badge: icon,
          tag: data.type || 'default',
          data,
          requireInteraction: false,
        });

        // Handle notification click
        notification.onclick = (event) => {
          event.preventDefault();
          console.log('🖱️ Notification clicked:', data);
          
          const url = data.url || '/dashboard';
          window.focus();
          window.location.href = url;
          notification.close();
        };
      } else {
        console.warn('⚠️ Cannot show notification - permission not granted');
      }
    });

    return () => {
      console.log('🔕 Cleaning up FCM foreground message handler');
      unsubscribe();
    };
  }, []);

  return null; // This component doesn't render anything
}
