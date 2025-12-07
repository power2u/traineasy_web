/**
 * Debugging utilities for meal notification system
 * Use these in browser console or React components for troubleshooting
 */

import { getMealTimesFromStorage, timeToMinutes } from './meal-timing-storage';

export interface DebugInfo {
  currentTime: string;
  currentMinutes: number;
  mealTimes: any;
  notificationPermission: string;
  notificationsSupported: boolean;
  sentNotifications: any[];
}

/**
 * Get comprehensive debug information
 */
export function getMealNotificationDebugInfo(): DebugInfo {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  let sentNotifications = [];
  try {
    const stored = localStorage.getItem('meal_notifications_sent');
    sentNotifications = stored ? JSON.parse(stored) : [];
  } catch (e) {
    // ignore
  }

  return {
    currentTime: now.toLocaleTimeString(),
    currentMinutes,
    mealTimes: getMealTimesFromStorage(),
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'not-supported',
    notificationsSupported: typeof Notification !== 'undefined',
    sentNotifications,
  };
}

/**
 * Calculate time until next meal
 */
export function getTimeUntilNextMeal(): {
  meal: string;
  time: string;
  minutesUntil: number;
} | null {
  const mealTimes = getMealTimesFromStorage();
  if (!mealTimes) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const meals = [
    { name: 'Breakfast', time: mealTimes.breakfast_time },
    { name: 'Morning Snack', time: mealTimes.snack1_time },
    { name: 'Lunch', time: mealTimes.lunch_time },
    { name: 'Afternoon Snack', time: mealTimes.snack2_time },
    { name: 'Dinner', time: mealTimes.dinner_time },
  ];

  // Find next meal
  for (const meal of meals) {
    const mealMinutes = timeToMinutes(meal.time);
    const minutesUntil = mealMinutes - currentMinutes;
    
    if (minutesUntil > 0) {
      return {
        meal: meal.name,
        time: meal.time,
        minutesUntil,
      };
    }
  }

  // If no meals left today, return tomorrow's breakfast
  const breakfastMinutes = timeToMinutes(mealTimes.breakfast_time);
  const minutesUntilTomorrow = (24 * 60 - currentMinutes) + breakfastMinutes;
  
  return {
    meal: 'Breakfast (tomorrow)',
    time: mealTimes.breakfast_time,
    minutesUntil: minutesUntilTomorrow,
  };
}

/**
 * Format minutes to human-readable time
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
}

/**
 * Print debug info to console
 */
export function debugMealNotifications(): void {
  const info = getMealNotificationDebugInfo();
  const nextMeal = getTimeUntilNextMeal();

  console.group('🍽️ Meal Notification Debug Info');
  
  console.log('⏰ Current Time:', info.currentTime);
  console.log('📊 Current Minutes:', info.currentMinutes);
  
  console.log('\n📅 Meal Times:');
  if (info.mealTimes) {
    Object.entries(info.mealTimes).forEach(([meal, time]) => {
      const minutes = timeToMinutes(time as string);
      const isPast = minutes < info.currentMinutes;
      console.log(`  ${meal}: ${time} (${minutes} min) ${isPast ? '✅ Past' : '⏳ Upcoming'}`);
    });
  } else {
    console.log('  ❌ No meal times configured');
  }

  console.log('\n🔔 Notification Status:');
  console.log('  Supported:', info.notificationsSupported ? '✅' : '❌');
  console.log('  Permission:', info.notificationPermission);
  console.log('  Enabled:', info.notificationPermission === 'granted' ? '✅' : '❌');

  console.log('\n📨 Sent Notifications Today:');
  if (info.sentNotifications.length > 0) {
    info.sentNotifications.forEach((n: any) => {
      const time = new Date(n.timestamp).toLocaleTimeString();
      console.log(`  ${n.mealType} at ${time}`);
    });
  } else {
    console.log('  None');
  }

  if (nextMeal) {
    console.log('\n⏭️ Next Meal:');
    console.log(`  ${nextMeal.meal} at ${nextMeal.time}`);
    console.log(`  In ${formatMinutesToTime(nextMeal.minutesUntil)}`);
  }

  console.groupEnd();
}

/**
 * Test notification (sends immediately)
 */
export async function testMealNotification(): Promise<void> {
  if (typeof Notification === 'undefined') {
    console.error('❌ Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.error('❌ Notification permission not granted');
    console.log('Request permission first:');
    console.log('await Notification.requestPermission()');
    return;
  }

  try {
    const notification = new Notification('Test Meal Reminder 🍽️', {
      body: 'This is a test notification from the meal reminder system!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'test-meal-notification',
    });

    notification.onclick = () => {
      console.log('Notification clicked!');
      notification.close();
    };

    console.log('✅ Test notification sent!');
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
  }
}

// Make functions available in browser console
if (typeof window !== 'undefined') {
  (window as any).debugMealNotifications = debugMealNotifications;
  (window as any).testMealNotification = testMealNotification;
  (window as any).getMealNotificationDebugInfo = getMealNotificationDebugInfo;
  (window as any).getTimeUntilNextMeal = getTimeUntilNextMeal;
}
