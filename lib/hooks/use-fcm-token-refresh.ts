'use client';

import { useEffect, useRef } from 'react';
import { useAuthUser } from '@/lib/contexts/auth-context';
import { checkAndRefreshToken, areNotificationsEnabled } from '@/lib/firebase/messaging';

/**
 * Hook to handle FCM token refresh
 * Checks and refreshes token periodically and on app focus
 */
export function useFCMTokenRefresh() {
  const user = useAuthUser();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);

  const performTokenCheck = async () => {
    if (!user?.id || !areNotificationsEnabled()) {
      return;
    }

    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckRef.current;
    
    // Only check if it's been more than 5 minutes since last check
    if (timeSinceLastCheck < 5 * 60 * 1000) {
      return;
    }

    lastCheckRef.current = now;
    
    try {
      await checkAndRefreshToken(user.id);
    } catch (error) {
      console.error('Token refresh check failed:', error);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Initial check after a short delay
    const initialTimeout = setTimeout(() => {
      performTokenCheck();
    }, 2000);

    // Set up periodic checks every 30 minutes
    intervalRef.current = setInterval(() => {
      performTokenCheck();
    }, 30 * 60 * 1000);

    // Check when app regains focus
    const handleFocus = () => {
      performTokenCheck();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id]);

  // Manual refresh function
  const manualRefresh = async () => {
    if (!user?.id) return false;
    
    try {
      await checkAndRefreshToken(user.id);
      return true;
    } catch (error) {
      console.error('Manual token refresh failed:', error);
      return false;
    }
  };

  return { manualRefresh };
}