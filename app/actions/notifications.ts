'use server';

import {
  getNotificationPreferences,
  updateNotificationPreferences,
  saveFCMToken,
  sendPushNotification,
  scheduleNotification,
  getNotificationHistory,
  type NotificationPreferences,
} from '@/lib/services/notification-service';

export type { NotificationPreferences };

/**
 * Get current user's notification preferences
 */
export async function getUserNotificationPreferences() {
  try {
    const preferences = await getNotificationPreferences();
    return { success: true, preferences };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return { success: false, error: 'Failed to get preferences' };
  }
}

/**
 * Update notification preferences
 */
export async function updateUserNotificationPreferences(
  preferences: Partial<NotificationPreferences>
) {
  return updateNotificationPreferences(preferences);
}

/**
 * Save FCM token
 */
export async function saveUserFCMToken(token: string) {
  return saveFCMToken(token);
}

/**
 * Send immediate push notification
 */
export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  return sendPushNotification(userId, title, body, data);
}

/**
 * Schedule a future notification
 */
export async function scheduleUserNotification(
  userId: string,
  type: 'meal_reminder' | 'water_reminder' | 'weight_reminder' | 'plan_end_reminder',
  title: string,
  body: string,
  scheduledFor: Date,
  data?: Record<string, any>
) {
  return scheduleNotification(userId, type, title, body, scheduledFor, data);
}

/**
 * Get notification history
 */
export async function getUserNotificationHistory(limit?: number) {
  try {
    const history = await getNotificationHistory(undefined, limit);
    return { success: true, history };
  } catch (error) {
    console.error('Error getting notification history:', error);
    return { success: false, error: 'Failed to get history' };
  }
}

/**
 * Schedule meal reminders for a user
 */
export async function scheduleMealReminders(userId: string) {
  try {
    const preferences = await getNotificationPreferences(userId);
    
    if (!preferences?.meal_reminders_enabled) {
      return { success: false, error: 'Meal reminders not enabled' };
    }

    const meals = [
      { name: 'Breakfast', time: preferences.breakfast_time },
      { name: 'Snack 1', time: preferences.snack1_time },
      { name: 'Lunch', time: preferences.lunch_time },
      { name: 'Snack 2', time: preferences.snack2_time },
      { name: 'Dinner', time: preferences.dinner_time },
    ];

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    for (const meal of meals) {
      // Parse meal time and add delay
      const [hours, minutes] = meal.time.split(':').map(Number);
      const mealTime = new Date(`${today}T${meal.time}:00`);
      mealTime.setMinutes(mealTime.getMinutes() + preferences.meal_reminder_delay_minutes);

      // Only schedule if time is in the future
      if (mealTime > now) {
        await scheduleNotification(
          userId,
          'meal_reminder',
          `${meal.name} Reminder`,
          `Don't forget to mark your ${meal.name.toLowerCase()}!`,
          mealTime,
          { meal: meal.name.toLowerCase().replace(' ', '') }
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error scheduling meal reminders:', error);
    return { success: false, error: 'Failed to schedule reminders' };
  }
}

/**
 * Schedule water reminders for a user
 */
export async function scheduleWaterReminders(userId: string) {
  try {
    const preferences = await getNotificationPreferences(userId);
    
    if (!preferences?.water_reminders_enabled) {
      return { success: false, error: 'Water reminders not enabled' };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    for (const time of preferences.water_reminder_times) {
      const reminderTime = new Date(`${today}T${time}:00`);

      // Only schedule if time is in the future
      if (reminderTime > now) {
        await scheduleNotification(
          userId,
          'water_reminder',
          'Hydration Reminder',
          'Time to drink some water! Stay hydrated 💧',
          reminderTime,
          { type: 'water' }
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error scheduling water reminders:', error);
    return { success: false, error: 'Failed to schedule reminders' };
  }
}

/**
 * Schedule weight reminder for a user
 */
export async function scheduleWeightReminder(userId: string) {
  try {
    const preferences = await getNotificationPreferences(userId);
    
    if (!preferences?.weight_reminders_enabled) {
      return { success: false, error: 'Weight reminders not enabled' };
    }

    const now = new Date();
    const currentDay = now.getDay();
    const targetDay = preferences.weight_reminder_day;
    
    // Calculate days until next reminder day
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;

    const reminderDate = new Date(now);
    reminderDate.setDate(reminderDate.getDate() + daysUntil);
    
    const [hours, minutes] = preferences.weight_reminder_time.split(':').map(Number);
    reminderDate.setHours(hours, minutes, 0, 0);

    await scheduleNotification(
      userId,
      'weight_reminder',
      'Weight Tracking Reminder',
      'Time to log your weekly weight! 📊',
      reminderDate,
      { type: 'weight' }
    );

    return { success: true };
  } catch (error) {
    console.error('Error scheduling weight reminder:', error);
    return { success: false, error: 'Failed to schedule reminder' };
  }
}
