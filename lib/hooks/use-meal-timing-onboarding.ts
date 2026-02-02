import { useState, useEffect, useCallback } from 'react';
import { isMealTimesConfigured, setMealTimes, type MealTimes } from '@/app/actions/meal-timing';
import {
  saveMealTimesToStorage,
  getDefaultMealTimes
} from '@/lib/utils/meal-timing-storage';
import { useTheme } from '@/lib/contexts/theme-context';

export function useMealTimingOnboarding(userId: string | undefined) {
  const [showDialog, setShowDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { setTheme } = useTheme();

  const handleComplete = useCallback(async (mealTimes: MealTimes) => {
    if (!userId) return;

    try {
      // Apply theme immediately if provided
      if (mealTimes.theme) {
        await setTheme(mealTimes.theme);
        console.log('[useMealTimingOnboarding] Theme applied:', mealTimes.theme);
      }

      // Save to local storage immediately for offline access
      saveMealTimesToStorage(mealTimes);

      // Then sync to server and set meal_times_configured = true
      const result = await setMealTimes(userId, mealTimes);

      console.log('[useMealTimingOnboarding] Save result:', result);

      if (result.success) {
        console.log('[useMealTimingOnboarding] Closing dialog...');
        setShowDialog(false);
        console.log('[useMealTimingOnboarding] Dialog closed');
      } else {
        throw new Error(result.error || 'Failed to save meal times');
      }
    } catch (error) {
      // If server save fails, still keep local storage
      console.error('Failed to save meal times to server:', error);
      throw error;
    }
  }, [userId, setTheme]);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!userId) {
        setIsChecking(false);
        return;
      }

      try {
        // Always check server for the meal_times_configured flag
        const result = await isMealTimesConfigured(userId);

        if (result.success && !result.configured) {
          console.log('[useMealTimingOnboarding] Meal times not configured. Auto-configuring...');

          // Auto-detect timezone
          let timezone = 'Asia/Kolkata';
          try {
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
          } catch (e) {
            console.warn('Failed to detect timezone, using default');
          }

          // Get default times and prepare data
          const defaults = getDefaultMealTimes();
          const mealTimesToSave: MealTimes = {
            ...defaults,
            timezone,
            theme: 'dark', // Default preference
          };

          // Silently save
          await handleComplete(mealTimesToSave);
        }
      } catch (error) {
        console.error('Failed to check/auto-configure meal timing:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkOnboardingStatus();
  }, [userId, handleComplete]);

  return {
    showDialog,
    isChecking,
    handleComplete,
  };
}
