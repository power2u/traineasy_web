import { useEffect, useCallback, useState } from 'react';
import { useAuthUser } from '@/lib/contexts/auth-context';
import { mealScheduler } from '@/lib/notifications/meal-scheduler';
import { requestNotificationPermissionGracefully } from '@/lib/utils/notification-utils';

/**
 * Hook to manage meal notification scheduling
 */
export function useMealScheduler() {
  const user = useAuthUser();
  const [status, setStatus] = useState<any>(null);

  // Initialize meal scheduler when user logs in
  useEffect(() => {
    if (user?.id) {
      console.log('🍽️ Initializing meal scheduler for user:', user.displayName);
      mealScheduler.initialize(user);
      
      // Update status
      const updateStatus = () => {
        setStatus(mealScheduler.getStatus());
      };
      
      updateStatus();
      
      // Update status every minute
      const interval = setInterval(updateStatus, 60000);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      // Stop scheduler when user logs out
      mealScheduler.stop();
      setStatus(null);
    }
  }, [user]);

  // Update meal times when preferences change
  const updateMealTimes = useCallback(async () => {
    if (user) {
      await mealScheduler.updateMealTimes();
      setStatus(mealScheduler.getStatus());
      console.log('🔄 Meal times updated');
    }
  }, [user]);

  // Check if meal notifications are enabled
  const isEnabled = useCallback(() => {
    return mealScheduler.isEnabled();
  }, []);

  // Get next scheduled meal
  const getNextMeal = useCallback(() => {
    return mealScheduler.getNextMeal();
  }, []);

  // Get detailed status
  const getStatus = useCallback(() => {
    return mealScheduler.getStatus();
  }, []);

  // Request notification permission with better UX
  const requestPermission = useCallback(async () => {
    // Use the browser's native permission request for meal scheduler
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, message: 'Notifications not supported' };
    }

    if (Notification.permission === 'granted') {
      return { success: true, message: 'Notifications already enabled' };
    }

    if (Notification.permission === 'denied') {
      return { success: false, message: 'Notifications are blocked. Please enable them in browser settings.' };
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted' && user) {
        // Reinitialize scheduler with permission granted
        await mealScheduler.initialize(user);
        setStatus(mealScheduler.getStatus());
        return { success: true, message: 'Notifications enabled successfully!' };
      }
      
      return { 
        success: false, 
        message: permission === 'denied' ? 
          'Notification permission was denied' : 
          'Notification permission not granted' 
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { success: false, message: 'Failed to request notification permission' };
    }
  }, [user]);

  // Show test notification
  const showTestNotification = useCallback(() => {
    return mealScheduler.showTestMealNotification();
  }, []);

  return {
    // Actions
    updateMealTimes,
    requestPermission,
    showTestNotification,
    
    // Status checks
    isEnabled,
    getNextMeal,
    getStatus,
    
    // Current status
    status,
    
    // Convenience properties
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
    hasPermission: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
    isActive: status?.isActive || false,
    scheduledCount: status?.scheduledCount || 0,
  };
}