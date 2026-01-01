import { useEffect, useCallback, useRef } from 'react';
import { localNotificationManager } from '@/lib/notifications/local-notifications';
import { useAuthUser } from '@/lib/contexts/auth-context';

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
      if (success) {
        console.log('Local notifications initialized successfully (FCM-based system)');
        isInitialized.current = true;
        // Note: Not starting polling - we use FCM for notifications
      } else {
        console.warn('Failed to initialize local notifications');
      }
    } catch (error) {
      console.error('Error initializing local notifications:', error);
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
    return await localNotificationManager.requestPermission();
  }, []);

  // Show a test notification
  const showTestNotification = useCallback(async () => {
    if (!user) return false;

    return await localNotificationManager.showNotification({
      title: '🎉 Test Notification',
      body: `Hi ${user.displayName}! Your local notifications are working perfectly!`,
      tag: 'test-notification',
      url: '/dashboard',
      data: { type: 'test' }
    });
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