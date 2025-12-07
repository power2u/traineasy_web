'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { getMealServiceWorkerManager } from '@/lib/notifications/meal-sw-manager';
import { useMealsData } from '@/lib/hooks/use-meals-data';

// Import debug utilities (makes them available in browser console)
import '@/lib/utils/meal-notification-debug';

/**
 * Meal Notification Manager
 * 
 * Add this component to your app layout to enable automatic meal notifications.
 * It will:
 * 1. Register service worker for background notifications
 * 2. Request notification permission on mount
 * 3. Intelligently check meal completion 1 hour after each scheduled meal time
 * 4. Send personalized notifications with user's name
 * 
 * Battery Optimization:
 * - Only checks 1 hour after each meal time (not every minute)
 * - No checks after last meal + 1 hour (user is likely sleeping)
 * - Automatically schedules next check based on meal times
 * - Minimal battery drain with smart scheduling
 * 
 * Usage:
 * ```tsx
 * // In app/layout.tsx or app/dashboard/layout.tsx
 * <MealNotificationManager />
 * ```
 * 
 * Features:
 * - Works in background (even when app is closed)
 * - Personalized messages with user's name
 * - Action buttons on notifications
 * - Offline support via service worker
 * - Battery-efficient intelligent scheduling
 * 
 * Debug in Browser Console:
 * ```javascript
 * debugMealNotifications()      // Show debug info
 * testMealNotification()        // Send test notification
 * getTimeUntilNextMeal()        // Check next meal
 * ```
 */
export function MealNotificationManager() {
  const { user } = useAuth();
  const { toggleMeal } = useMealsData(user?.id || '');

  // Initialize service worker
  useEffect(() => {
    if (!user) return;

    const initServiceWorker = async () => {
      const manager = getMealServiceWorkerManager();
      
      // Initialize service worker
      const initialized = await manager.initialize();
      
      if (initialized) {
        console.log('✅ Meal notification service worker initialized');
        console.log('💡 Background notifications enabled (works even when app is closed)');
        console.log('💡 Debug: Run debugMealNotifications() in console');
        
        // Cache user data for personalized notifications
        if (user.raw_user_meta_data?.full_name || user.email) {
          await manager.updateUserData({
            full_name: user.raw_user_meta_data?.full_name || user.email?.split('@')[0],
          });
        }
      } else {
        console.log('❌ Service worker not supported or failed to initialize');
      }
    };

    // Initialize after a short delay
    const timer = setTimeout(initServiceWorker, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  // Listen for meal completion from notification actions
  useEffect(() => {
    if (!user) return;

    const handleMealCompleted = (event: CustomEvent) => {
      const { mealType } = event.detail;
      console.log('[Meal Manager] Marking meal as completed from notification:', mealType);
      
      // Toggle meal to completed
      toggleMeal({
        mealType: mealType as any,
        completed: true,
      });
    };

    window.addEventListener(
      'meal-completed-from-notification',
      handleMealCompleted as EventListener
    );

    return () => {
      window.removeEventListener(
        'meal-completed-from-notification',
        handleMealCompleted as EventListener
      );
    };
  }, [user, toggleMeal]);

  // Update cached data when meal times change
  useEffect(() => {
    if (!user) return;

    const updateCache = async () => {
      const manager = getMealServiceWorkerManager();
      
      // Get meal times from local storage
      const mealTimesStr = localStorage.getItem('meal_times');
      if (mealTimesStr) {
        const mealTimes = JSON.parse(mealTimesStr);
        await manager.updateMealTimes(mealTimes);
      }
    };

    // Update cache when component mounts
    updateCache();

    // Listen for meal times updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'meal_times') {
        updateCache();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  // This component doesn't render anything
  return null;
}
