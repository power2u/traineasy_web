'use client';

/**
 * Local storage utilities for meal timing preferences
 * 
 * Purpose:
 * - Provides offline access to meal times
 * - Used by service worker for local notifications when user hasn't marked meal as finished
 * - Syncs with Supabase (server is source of truth for meal_times_configured flag)
 * 
 * Flow:
 * 1. User sets meal times in onboarding dialog
 * 2. Saved to both local storage (for notifications) and Supabase (for sync)
 * 3. Service worker reads from local storage to schedule meal reminders
 * 4. Supabase meal_times_configured flag controls whether to show onboarding dialog
 */

export interface MealTimes {
  breakfast_time: string;
  snack1_time: string;
  lunch_time: string;
  snack2_time: string;
  dinner_time: string;
}

const STORAGE_KEY = 'meal_times';
const CONFIGURED_KEY = 'meal_times_configured';

/**
 * Get meal times from local storage
 */
export function getMealTimesFromStorage(): MealTimes | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    return JSON.parse(stored) as MealTimes;
  } catch (error) {
    console.error('Error reading meal times from storage:', error);
    return null;
  }
}

/**
 * Save meal times to local storage
 */
export function saveMealTimesToStorage(mealTimes: MealTimes): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mealTimes));
    localStorage.setItem(CONFIGURED_KEY, 'true');
  } catch (error) {
    console.error('Error saving meal times to storage:', error);
  }
}

/**
 * Check if meal times are configured in local storage
 */
export function isMealTimesConfiguredInStorage(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return localStorage.getItem(CONFIGURED_KEY) === 'true';
  } catch (error) {
    console.error('Error checking meal times configuration:', error);
    return false;
  }
}

/**
 * Clear meal times from local storage
 */
export function clearMealTimesFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONFIGURED_KEY);
  } catch (error) {
    console.error('Error clearing meal times from storage:', error);
  }
}

/**
 * Get default meal times
 */
export function getDefaultMealTimes(): MealTimes {
  return {
    breakfast_time: '08:00',
    snack1_time: '10:30',
    lunch_time: '13:00',
    snack2_time: '16:00',
    dinner_time: '19:00',
  };
}

/**
 * Sync meal times between local storage and server
 * Returns the most recent version
 */
export async function syncMealTimes(
  userId: string,
  serverMealTimes: MealTimes | null
): Promise<MealTimes> {
  const localMealTimes = getMealTimesFromStorage();
  
  // If server has data, use it and update local storage
  if (serverMealTimes) {
    saveMealTimesToStorage(serverMealTimes);
    return serverMealTimes;
  }
  
  // If local storage has data, return it
  if (localMealTimes) {
    return localMealTimes;
  }
  
  // Otherwise, return defaults
  const defaults = getDefaultMealTimes();
  saveMealTimesToStorage(defaults);
  return defaults;
}

/**
 * Get meal times for notification scheduling
 * Used by service worker to determine when to send meal reminders
 * Returns null if not configured
 */
export function getMealTimesForNotifications(): MealTimes | null {
  if (!isMealTimesConfiguredInStorage()) {
    return null;
  }
  
  return getMealTimesFromStorage();
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 * Used for notification scheduling
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get all meal times as an array with labels
 * Useful for iterating through meals for notifications
 */
export function getMealTimesArray(): Array<{ key: string; label: string; time: string }> | null {
  const mealTimes = getMealTimesForNotifications();
  if (!mealTimes) return null;
  
  return [
    { key: 'breakfast', label: 'Breakfast', time: mealTimes.breakfast_time },
    { key: 'snack1', label: 'Morning Snack', time: mealTimes.snack1_time },
    { key: 'lunch', label: 'Lunch', time: mealTimes.lunch_time },
    { key: 'snack2', label: 'Afternoon Snack', time: mealTimes.snack2_time },
    { key: 'dinner', label: 'Dinner', time: mealTimes.dinner_time },
  ];
}
