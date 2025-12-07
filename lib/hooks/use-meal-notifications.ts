import { useEffect, useCallback } from 'react';
import { useMealsData } from './use-meals-data';
import { getMealTimesFromStorage, timeToMinutes } from '@/lib/utils/meal-timing-storage';
import { sendMealReminder } from '@/lib/notifications/meal-reminders';

interface MealCheck {
  mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
  label: string;
  scheduledTime: string; // HH:MM format
  completed: boolean;
  shouldNotify: boolean;
}

/**
 * Hook to check meal completion and trigger notifications
 * Combines meal times from local storage with completion status from database
 */
export function useMealNotifications(userId: string | undefined) {
  const { meals } = useMealsData(userId || '');

  /**
   * Check if a meal notification should be sent
   * Returns true if:
   * 1. Current time is past the scheduled meal time
   * 2. Meal is not completed
   * 3. Within notification window (e.g., 30 minutes after scheduled time)
   */
  const checkMealStatus = useCallback((): MealCheck[] => {
    if (!meals) return [];

    const mealTimes = getMealTimesFromStorage();
    if (!mealTimes) return [];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const NOTIFICATION_WINDOW = 30; // Minutes after scheduled time to send notification

    const checks: MealCheck[] = [
      {
        mealType: 'breakfast',
        label: 'Breakfast',
        scheduledTime: mealTimes.breakfast_time,
        completed: meals.breakfast_completed,
        shouldNotify: false,
      },
      {
        mealType: 'snack1',
        label: 'Morning Snack',
        scheduledTime: mealTimes.snack1_time,
        completed: meals.snack1_completed,
        shouldNotify: false,
      },
      {
        mealType: 'lunch',
        label: 'Lunch',
        scheduledTime: mealTimes.lunch_time,
        completed: meals.lunch_completed,
        shouldNotify: false,
      },
      {
        mealType: 'snack2',
        label: 'Afternoon Snack',
        scheduledTime: mealTimes.snack2_time,
        completed: meals.snack2_completed,
        shouldNotify: false,
      },
      {
        mealType: 'dinner',
        label: 'Dinner',
        scheduledTime: mealTimes.dinner_time,
        completed: meals.dinner_completed,
        shouldNotify: false,
      },
    ];

    // Check each meal
    checks.forEach((check) => {
      if (check.completed) {
        // Already completed, no notification needed
        return;
      }

      const scheduledMinutes = timeToMinutes(check.scheduledTime);
      const minutesPast = currentMinutes - scheduledMinutes;

      // Should notify if:
      // - Current time is past scheduled time
      // - Within notification window
      // - Not completed
      if (minutesPast > 0 && minutesPast <= NOTIFICATION_WINDOW) {
        check.shouldNotify = true;
      }
    });

    return checks;
  }, [meals]);

  /**
   * Send notifications for incomplete meals
   */
  const sendPendingNotifications = useCallback(async () => {
    if (!userId) return;

    const checks = checkMealStatus();
    const pendingMeals = checks.filter((check) => check.shouldNotify);

    for (const meal of pendingMeals) {
      try {
        await sendMealReminder(userId, meal.mealType, meal.label);
      } catch (error) {
        console.error(`Failed to send notification for ${meal.label}:`, error);
      }
    }
  }, [userId, checkMealStatus]);

  /**
   * Check for pending notifications every minute
   */
  useEffect(() => {
    if (!userId) return;

    // Initial check
    sendPendingNotifications();

    // Check every minute
    const interval = setInterval(() => {
      sendPendingNotifications();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [userId, sendPendingNotifications]);

  return {
    checkMealStatus,
    sendPendingNotifications,
  };
}

/**
 * Get incomplete meals for display
 */
export function useIncompleteMeals(userId: string | undefined) {
  const { meals } = useMealsData(userId || '');

  const incompleteMeals = useCallback(() => {
    if (!meals) return [];

    const mealTimes = getMealTimesFromStorage();
    if (!mealTimes) return [];

    const incomplete: Array<{
      type: string;
      label: string;
      time: string;
    }> = [];

    if (!meals.breakfast_completed) {
      incomplete.push({
        type: 'breakfast',
        label: 'Breakfast',
        time: mealTimes.breakfast_time,
      });
    }
    if (!meals.snack1_completed) {
      incomplete.push({
        type: 'snack1',
        label: 'Morning Snack',
        time: mealTimes.snack1_time,
      });
    }
    if (!meals.lunch_completed) {
      incomplete.push({
        type: 'lunch',
        label: 'Lunch',
        time: mealTimes.lunch_time,
      });
    }
    if (!meals.snack2_completed) {
      incomplete.push({
        type: 'snack2',
        label: 'Afternoon Snack',
        time: mealTimes.snack2_time,
      });
    }
    if (!meals.dinner_completed) {
      incomplete.push({
        type: 'dinner',
        label: 'Dinner',
        time: mealTimes.dinner_time,
      });
    }

    return incomplete;
  }, [meals]);

  return incompleteMeals();
}
