import { useEffect, useCallback, useRef } from 'react';
import { localNotificationManager } from '@/lib/notifications/local-notifications';
import { useAuthUser } from '@/lib/contexts/auth-context';
import { requestNotificationPermission as requestFCMToken, saveFCMToken } from '@/lib/firebase/messaging';

/**
 * Hook to manage local notifications without FCM dependency
 */
export function useLocalNotifications() {
  const user = useAuthUser();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // Initialize local notifications
  const initializeNotifications = useCallback(async () => {
    if (isInitialized.current || !user) return;

    try {
      const success = await localNotificationManager.initialize();

      // Only try FCM token sync if user already has permission (don't prompt)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          console.log('🔔 Permission already granted, syncing FCM token...');
          const token = await requestFCMToken();
          if (token) {
            console.log('✅ FCM Init: Token retrieved, attempting to save to DB...', token.substring(0, 10) + '...');
            const saveResult = await saveFCMToken(user.id, token);
            if (saveResult) {
              console.log('✅ FCM Init: Token saved successfully to database');
            } else {
              console.warn('⚠️ FCM Init: Token save failed');
            }
          } else {
            console.log('ℹ️ FCM Init: No token available (FCM may not be working)');
          }
        } catch (fcmError: any) {
          console.warn('⚠️ FCM token sync failed during initialization (this is normal if FCM is not configured):', fcmError?.message || 'Unknown FCM error');
          // Don't let FCM errors prevent local notifications from working
        }
      }

      if (success) {
        console.log('Local notifications initialized successfully');
        isInitialized.current = true;
      }
    } catch (error: any) {
      console.warn('Error initializing local notifications:', error?.message || 'Unknown error');
    }
  }, [user]);

  // Start polling for pending notifications (DISABLED - using FCM instead)
  const startPolling = useCallback(() => {
    // Disabled: We're using FCM for notifications, not browser polling
    console.log('Browser notification polling disabled - using FCM system');
    return;

    /* ORIGINAL CODE - DISABLED
    if (!user || pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/notifications/browser?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          
          // Show each pending notification
          for (const notification of data.notifications || []) {
            await localNotificationManager.showNotification({
              title: notification.title,
              body: notification.body,
              tag: notification.tag,
              url: notification.url,
              data: notification.data,
            });
          }
        }
      } catch (error) {
        console.error('Error polling for notifications:', error);
      }
    }, 5000); // Poll every 5 seconds
    */
  }, [user]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      console.log('🔔 Permission request initiated...');
      
      // First try to get FCM token (this triggers the permission prompt)
      const token = await requestFCMToken();
      console.log('🎫 FCM token result:', token ? `${token.substring(0, 10)}...` : 'null');

      const permission = Notification.permission;
      console.log('📋 Final permission status:', permission);

      if (permission === 'granted' && token && user) {
        // Save the token
        console.log('💾 Saving FCM token to database...');
        const saveResult = await saveFCMToken(user.id, token);
        if (saveResult) {
          console.log('✅ FCM token saved successfully');
        } else {
          console.warn('⚠️ FCM token save failed');
        }
        return 'granted';
      }

      // Fallback to local manager if FCM fails or just to return status
      return await localNotificationManager.requestPermission();
    } catch (error) {
      console.error('Error requesting permission:', error);
      return Notification.permission;
    }
  }, [user]);

  // Show a test notification
  const showTestNotification = useCallback(async () => {
    if (!user) {
      console.error('❌ Test notification failed: No user');
      return false;
    }

    console.log('🧪 Starting test notification...');
    console.log('📋 Permission status:', Notification.permission);
    console.log('👤 User:', user.displayName || user.email);

    // Try direct notification first (simpler approach)
    if (Notification.permission !== 'granted') {
      console.error('❌ Test notification failed: Permission not granted');
      return false;
    }

    try {
      console.log('🔔 Creating test notification...');
      const notification = new Notification('🧪 Test Notification', {
        body: `Hi ${user.displayName || 'there'}! Your notifications are working!`,
        icon: '/logo.png',
        tag: 'test-notification',
        requireInteraction: false,
      });

      notification.onclick = () => {
        console.log('🖱️ Test notification clicked');
        window.focus();
        notification.close();
      };

      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log('✅ Test notification created successfully');
      return true;
    } catch (error) {
      console.error('❌ Test notification error:', error);
      return false;
    }
  }, [user]);

  // Show meal reminder
  const showMealReminder = useCallback(async (mealType: string) => {
    if (!user) return false;
    return await localNotificationManager.showMealReminder(mealType, user.displayName || 'there');
  }, [user]);

  // Show water reminder
  const showWaterReminder = useCallback(async () => {
    if (!user) return false;
    return await localNotificationManager.showWaterReminder(user.displayName || 'there');
  }, [user]);

  // Check if notifications are supported
  const isSupported = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return localNotificationManager.isSupported();
  }, []);

  // Check if we're running as PWA
  const isPWA = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return localNotificationManager.isPWA();
  }, []);

  // Check if we're on iOS
  const isIOSDevice = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return localNotificationManager.isIOS();
  }, []);

  // Get permission status
  const getPermissionStatus = useCallback(() => {
    if (typeof window === 'undefined') return 'default' as NotificationPermission;
    return localNotificationManager.getPermissionStatus();
  }, []);

  // Initialize when user is available
  useEffect(() => {
    if (user && !isInitialized.current) {
      initializeNotifications();
    }
  }, [user, initializeNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Handle visibility change (pause/resume polling)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (user && isInitialized.current) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, startPolling, stopPolling]);

  return {
    // Status
    isSupported: isSupported(),
    isPWA: isPWA(),
    isIOS: isIOSDevice(),
    permissionStatus: getPermissionStatus(),
    isInitialized: isInitialized.current,

    // Actions
    requestPermission,
    showTestNotification,
    showMealReminder,
    showWaterReminder,

    // Control
    startPolling,
    stopPolling,
  };
}