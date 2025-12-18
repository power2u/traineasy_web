<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
import { isMealTimesConfigured, setMealTimes, type MealTimes } from '@/app/actions/meal-timing';
import { 
  saveMealTimesToStorage 
} from '@/lib/utils/meal-timing-storage';

export function useMealTimingOnboarding(userId: string | undefined) {
  const [showDialog, setShowDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!userId) {
        setIsChecking(false);
        return;
      }

      try {
        // Always check server for the meal_times_configured flag
        // This is the source of truth
        const result = await isMealTimesConfigured(userId);
        
        if (result.success && !result.configured) {
          // meal_times_configured is false, show dialog
          setShowDialog(true);
        }
      } catch (error) {
        console.error('Failed to check meal timing onboarding status:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkOnboardingStatus();
  }, [userId]);

  const handleComplete = useCallback(async (mealTimes: MealTimes) => {
    if (!userId) return;

    try {
      // Save to local storage immediately for offline access and notifications
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
      // If server save fails, still keep local storage for notifications
      console.error('Failed to save meal times to server:', error);
      throw error;
    }
  }, [userId]);

  return {
    showDialog,
    isChecking,
    handleComplete,
  };
}
=======
import { useState, useEffect, useCallback } from 'react';
import { isMealTimesConfigured, setMealTimes, type MealTimes } from '@/app/actions/meal-timing';
import { 
  saveMealTimesToStorage 
} from '@/lib/utils/meal-timing-storage';
import { useTheme } from '@/lib/contexts/theme-context';

export function useMealTimingOnboarding(userId: string | undefined) {
  const [showDialog, setShowDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { setTheme } = useTheme();

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!userId) {
        setIsChecking(false);
        return;
      }

      try {
        // Always check server for the meal_times_configured flag
        // This is the source of truth
        const result = await isMealTimesConfigured(userId);
        
        if (result.success && !result.configured) {
          // meal_times_configured is false, show dialog
          setShowDialog(true);
        }
      } catch (error) {
        console.error('Failed to check meal timing onboarding status:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkOnboardingStatus();
  }, [userId]);

  const handleComplete = useCallback(async (mealTimes: MealTimes) => {
    if (!userId) return;

    try {
      // Apply theme immediately if provided
      if (mealTimes.theme) {
        await setTheme(mealTimes.theme);
        console.log('[useMealTimingOnboarding] Theme applied:', mealTimes.theme);
      }

      // Save to local storage immediately for offline access and notifications
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
      // If server save fails, still keep local storage for notifications
      console.error('Failed to save meal times to server:', error);
      throw error;
    }
  }, [userId, setTheme]);

  return {
    showDialog,
    isChecking,
    handleComplete,
  };
}
>>>>>>> main
