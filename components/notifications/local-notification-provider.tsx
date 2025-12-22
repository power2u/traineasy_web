'use client';

import { useEffect } from 'react';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';
import { useAuthUser } from '@/lib/contexts/auth-context';

/**
 * Provider component to initialize and manage local notifications
 */
export function LocalNotificationProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthUser();
  const {
    isSupported,
    permissionStatus,
    isInitialized,
    requestPermission,
  } = useLocalNotifications();

  // Request permission when user logs in
  useEffect(() => {
    if (user && isSupported && permissionStatus === 'default') {
      // Show a friendly prompt before requesting permission
      const requestNotificationPermission = async () => {
        try {
          const permission = await requestPermission();
          if (permission === 'granted') {
            console.log('✅ Local notifications enabled');
          } else {
            console.log('❌ Local notifications denied');
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
        }
      };

      // Delay the request slightly to avoid overwhelming the user
      setTimeout(requestNotificationPermission, 2000);
    }
  }, [user, isSupported, permissionStatus, requestPermission]);

  // Log notification status for debugging
  useEffect(() => {
    if (user) {
      console.log('🔔 Local Notification Status:', {
        supported: isSupported,
        permission: permissionStatus,
        initialized: isInitialized,
        user: user.displayName
      });
    }
  }, [user, isSupported, permissionStatus, isInitialized]);

  return <>{children}</>;
}