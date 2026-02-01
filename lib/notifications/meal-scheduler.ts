/**
 * Simple meal notification scheduler using browser notifications
 * No FCM dependency - just local browser notifications
 */

import { areNotificationsEnabled } from '@/lib/utils/notification-utils';

interface MealTime {
  type: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
  time: string; // HH:MM format
  name: string;
  emoji: string;
}

interface UserPreferences {
  id: string;
  fullName?: string;
  notificationsEnabled: boolean;
  mealRemindersEnabled: boolean;
  breakfastTime?: string;
  snack1Time?: string;
  lunchTime?: string;
  snack2Time?: string;
  dinnerTime?: string;
}

export class MealNotificationScheduler {
  private static instance: MealNotificationScheduler;
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();
  private user: { id: string; displayName?: string } | null = null;
  private preferences: UserPreferences | null = null;
  private isActive: boolean = false;

  private constructor() {}

  static getInstance(): MealNotificationScheduler {
    if (!MealNotificationScheduler.instance) {
      MealNotificationScheduler.instance = new MealNotificationScheduler();
    }
    return MealNotificationScheduler.instance;
  }

  /**
   * Initialize scheduler for a user
   */
  async initialize(user: { id: string; displayName?: string }) {
    this.user = user;
    this.isActive = true;
    
    console.log('🍽️ Initializing meal scheduler for:', user.displayName || user.id);
    
    await this.loadUserPreferences();
    
    // Only schedule if notifications are enabled and permission granted
    if (areNotificationsEnabled() && this.canScheduleNotifications()) {
      this.scheduleAllMealNotifications();
    } else {
      console.log('📵 Meal notifications not scheduled - permission or settings disabled');
    }
  }

  /**
   * Load user preferences from API
   */
  private async loadUserPreferences() {
    if (!this.user) return;

    try {
      const response = await fetch(`/api/user/preferences`);
      if (response.ok) {
        const data = await response.json();
        this.preferences = data.preferences;
        console.log('📋 Loaded user meal preferences:', {
          notificationsEnabled: this.preferences?.notificationsEnabled,
          mealRemindersEnabled: this.preferences?.mealRemindersEnabled,
          breakfastTime: this.preferences?.breakfastTime,
          lunchTime: this.preferences?.lunchTime,
          dinnerTime: this.preferences?.dinnerTime,
        });
      } else {
        console.warn('Failed to load user preferences:', response.statusText);
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  /**
   * Check if we can schedule notifications
   */
  private canScheduleNotifications(): boolean {
    return !!(
      this.preferences?.notificationsEnabled && 
      this.preferences?.mealRemindersEnabled &&
      areNotificationsEnabled()
    );
  }

  /**
   * Schedule all meal notifications for today and tomorrow
   */
  private scheduleAllMealNotifications() {
    if (!this.canScheduleNotifications()) {
      console.log('📵 Cannot schedule meal notifications - requirements not met');
      return;
    }

    // Clear existing notifications
    this.clearAllNotifications();

    const mealTimes: MealTime[] = [
      { type: 'breakfast', time: this.preferences!.breakfastTime || '08:00', name: 'Breakfast', emoji: '🍳' },
      { type: 'snack1', time: this.preferences!.snack1Time || '10:30', name: 'Morning Snack', emoji: '🍎' },
      { type: 'lunch', time: this.preferences!.lunchTime || '13:00', name: 'Lunch', emoji: '🍱' },
      { type: 'snack2', time: this.preferences!.snack2Time || '16:00', name: 'Afternoon Snack', emoji: '🥤' },
      { type: 'dinner', time: this.preferences!.dinnerTime || '19:00', name: 'Dinner', emoji: '🍽️' },
    ];

    const userName = this.getUserDisplayName();

    let scheduledCount = 0;
    mealTimes.forEach(meal => {
      if (meal.time) {
        this.scheduleMealNotification(meal, userName);
        scheduledCount++;
      }
    });

    console.log(`✅ Scheduled ${scheduledCount} meal notifications for ${userName}`);
  }

  /**
   * Get user display name
   */
  private getUserDisplayName(): string {
    return this.user?.displayName || this.preferences?.fullName || 'there';
  }

  /**
   * Schedule a single meal notification for today and tomorrow
   */
  private scheduleMealNotification(meal: MealTime, userName: string) {
    const now = new Date();
    const [hours, minutes] = meal.time.split(':').map(Number);
    
    // Schedule for today if time hasn't passed
    const todayTime = new Date();
    todayTime.setHours(hours, minutes, 0, 0);
    
    if (todayTime > now) {
      const timeUntilNotification = todayTime.getTime() - now.getTime();
      console.log(`⏰ Scheduling ${meal.name} for today at ${todayTime.toLocaleTimeString()}`);
      
      const timeoutId = setTimeout(() => {
        this.showMealNotification(meal, userName);
      }, timeUntilNotification);
      
      this.scheduledNotifications.set(`${meal.type}-today`, timeoutId);
    }

    // Always schedule for tomorrow
    const tomorrowTime = new Date();
    tomorrowTime.setDate(tomorrowTime.getDate() + 1);
    tomorrowTime.setHours(hours, minutes, 0, 0);
    
    const timeUntilTomorrow = tomorrowTime.getTime() - now.getTime();
    console.log(`⏰ Scheduling ${meal.name} for tomorrow at ${tomorrowTime.toLocaleTimeString()}`);
    
    const tomorrowTimeoutId = setTimeout(() => {
      this.showMealNotification(meal, userName);
      // Reschedule for the day after tomorrow
      setTimeout(() => {
        if (this.isActive) {
          this.scheduleMealNotification(meal, userName);
        }
      }, 1000);
    }, timeUntilTomorrow);
    
    this.scheduledNotifications.set(`${meal.type}-tomorrow`, tomorrowTimeoutId);
  }

  /**
   * Show meal notification
   */
  private async showMealNotification(meal: MealTime, userName: string) {
    if (!areNotificationsEnabled() || !this.isActive) {
      console.log('📵 Skipping meal notification - not enabled or inactive');
      return;
    }

    try {
      const notification = new Notification(`${meal.emoji} ${meal.name} Time!`, {
        body: `Hey ${userName}! Time for your ${meal.name.toLowerCase()}. Stay on track with your nutrition goals!`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `meal-${meal.type}`,
        requireInteraction: true,
        data: { 
          type: 'meal_reminder', 
          mealType: meal.type,
          url: '/meals'
        }
      });

      // Handle click
      notification.onclick = () => {
        window.focus();
        window.location.href = '/meals';
        notification.close();
      };

      // Auto close after 30 seconds
      setTimeout(() => {
        notification.close();
      }, 30000);

      console.log(`🔔 Showed ${meal.name} notification for ${userName}`);

    } catch (error) {
      console.error('Failed to show meal notification:', error);
    }
  }

  /**
   * Clear all scheduled notifications
   */
  private clearAllNotifications() {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
    console.log('🧹 Cleared all scheduled meal notifications');
  }

  /**
   * Update meal times and reschedule
   */
  async updateMealTimes() {
    console.log('🔄 Updating meal times...');
    await this.loadUserPreferences();
    
    if (this.isActive && areNotificationsEnabled()) {
      this.scheduleAllMealNotifications();
    }
  }

  /**
   * Stop all notifications
   */
  stop() {
    console.log('🛑 Stopping meal scheduler');
    this.isActive = false;
    this.clearAllNotifications();
    this.user = null;
    this.preferences = null;
  }

  /**
   * Check if notifications are enabled for this user
   */
  isEnabled(): boolean {
    return !!(
      this.isActive &&
      this.preferences?.notificationsEnabled && 
      this.preferences?.mealRemindersEnabled &&
      areNotificationsEnabled()
    );
  }

  /**
   * Get next scheduled meal
   */
  getNextMeal(): { meal: string; time: Date } | null {
    if (!this.preferences) return null;

    const now = new Date();
    const mealTimes = [
      { name: 'Breakfast', time: this.preferences.breakfastTime || '08:00' },
      { name: 'Morning Snack', time: this.preferences.snack1Time || '10:30' },
      { name: 'Lunch', time: this.preferences.lunchTime || '13:00' },
      { name: 'Afternoon Snack', time: this.preferences.snack2Time || '16:00' },
      { name: 'Dinner', time: this.preferences.dinnerTime || '19:00' },
    ];

    for (const meal of mealTimes) {
      const [hours, minutes] = meal.time.split(':').map(Number);
      const mealTime = new Date();
      mealTime.setHours(hours, minutes, 0, 0);

      if (mealTime > now) {
        return { meal: meal.name, time: mealTime };
      }
    }

    // If no meal today, return tomorrow's breakfast
    const [hours, minutes] = mealTimes[0].time.split(':').map(Number);
    const tomorrowBreakfast = new Date();
    tomorrowBreakfast.setDate(tomorrowBreakfast.getDate() + 1);
    tomorrowBreakfast.setHours(hours, minutes, 0, 0);

    return { meal: mealTimes[0].name, time: tomorrowBreakfast };
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      isActive: this.isActive,
      hasUser: !!this.user,
      hasPreferences: !!this.preferences,
      preferences: this.preferences, // Include full preferences for debugging
      browserPermission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
      notificationsEnabled: areNotificationsEnabled(),
      canSchedule: this.canScheduleNotifications(),
      scheduledCount: this.scheduledNotifications.size,
      nextMeal: this.getNextMeal(),
    };
  }

  /**
   * Show a test meal notification
   */
  showTestMealNotification(): boolean {
    if (!areNotificationsEnabled()) {
      console.warn('Cannot show test notification: permission not granted');
      return false;
    }

    const userName = this.getUserDisplayName();
    const testMeal: MealTime = {
      type: 'breakfast',
      time: '08:00',
      name: 'Test Meal',
      emoji: '🧪'
    };

    this.showMealNotification(testMeal, userName);
    return true;
  }
}

// Export singleton instance
export const mealScheduler = MealNotificationScheduler.getInstance();