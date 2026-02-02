'use client';

import { useEffect } from 'react';
import { setupForegroundMessageListener } from '@/lib/firebase/messaging';

/**
 * Component to handle FCM foreground messages
 * This should be included in the app layout
 */
export function FCMForegroundHandler() {
  useEffect(() => {
    // Set up foreground message listener
    setupForegroundMessageListener();
  }, []);

  // This component doesn't render anything
  return null;
}