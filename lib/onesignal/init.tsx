'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export function OneSignalInit() {
  useEffect(() => {
    // Initialize OneSignal only on client side
    if (typeof window !== 'undefined') {
      OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
        allowLocalhostAsSecureOrigin: true,
      }).then(async () => {
        console.log('OneSignal initialized successfully');
        
        // Initialize Service Worker for local notifications
        const { getServiceWorkerNotificationManager } = await import('@/lib/notifications/service-worker-manager');
        const swManager = getServiceWorkerNotificationManager();
        const success = await swManager.initialize();
        
        if (success) {
          console.log('Service Worker notification manager initialized');
          // Start periodic checks as fallback
          swManager.startPeriodicChecks(60); // Check every hour
        }
      }).catch((error) => {
        console.error('OneSignal initialization error:', error);
      });
    }
  }, []);

  return null;
}
