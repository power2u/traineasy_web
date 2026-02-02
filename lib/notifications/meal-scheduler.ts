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
    
    // Check browser notification permission
    const browserPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
    console.log('🔔 Browser notification permission:', browserPermission);
    
    // Only schedule if notifications are enabled and permission granted
    if (areNotificationsEnabled() && this.canScheduleNotifications()) {
      this.scheduleAllMealNotifications();
      this.saveScheduleToStorage(); // Persist schedule info
      console.log('✅ Meal notifications initialized successfully');
    } else {
      console.log('📵 Meal notifications not scheduled - checking requirements:');
      console.log('  - Browser permission granted:', areNotificationsEnabled());
      console.log('  - User notifications enabled:', this.preferences?.notificationsEnabled);
      console.log('  - User meal reminders enabled:', this.preferences?.mealRemindersEnabled);
      console.log('  - Can schedule:', this.canScheduleNotifications());
    }
  }

  /**
   * Load user preferences from API
   */
  private async loadUserPreferences() {
    if (!this.user) return;

    try {
      console.log('🔄 Loading user preferences for meal scheduler...');
      const response = await fetch(`/api/user/preferences`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // Required to bypass middleware security check
        },
        credentials: 'include', // Include cookies for authentication
      });
      
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
        
        if (!this.preferences?.notificationsEnabled) {
          console.warn('⚠️ User has notifications disabled in preferences');
        }
        if (!this.preferences?.mealRemindersEnabled) {
          console.warn('⚠️ User has meal reminders disabled in preferences');
        }
      } else {
        console.error('❌ Failed to load user preferences:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Response body:', errorText);
        
        // If it's a 401, the user might not be authenticated
        if (response.status === 401) {
          console.error('🔐 User not authenticated - meal scheduler cannot load preferences');
          this.isActive = false;
        }
      }
    } catch (error) {
      console.error('❌ Error loading user preferences:', error);
      // Don't disable scheduler on network errors, just log them
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
   * Schedule all meal notifications for today and the next 7 days
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
    const now = new Date();
    let scheduledCount = 0;

    // Schedule for the next 7 days (including today)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);
      
      mealTimes.forEach(meal => {
        if (meal.time) {
          const scheduled = this.scheduleMealNotificationForDate(meal, userName, targetDate, dayOffset);
          if (scheduled) scheduledCount++;
        }
      });
    }

    console.log(`✅ Scheduled ${scheduledCount} meal notifications for ${userName} (next 7 days)`);
    
    // Set up daily re-scheduling to maintain 7-day window
    this.setupDailyRescheduling();
  }

  /**
   * Get user display name
   */
  private getUserDisplayName(): string {
    return this.user?.displayName || this.preferences?.fullName || 'there';
  }

  /**
   * Schedule a single meal notification for a specific date
   */
  private scheduleMealNotificationForDate(meal: MealTime, userName: string, targetDate: Date, dayOffset: number): boolean {
    const now = new Date();
    const [hours, minutes] = meal.time.split(':').map(Number);
    
    // Set the exact time for the notification
    const notificationTime = new Date(targetDate);
    notificationTime.setHours(hours, minutes, 0, 0);
    
    // Skip if the time has already passed
    if (notificationTime <= now) {
      return false;
    }
    
    const timeUntilNotification = notificationTime.getTime() - now.getTime();
    const dayLabel = dayOffset === 0 ? 'today' : dayOffset === 1 ? 'tomorrow' : `in ${dayOffset} days`;
    
    console.log(`⏰ Scheduling ${meal.name} for ${dayLabel} at ${notificationTime.toLocaleString()}`);
    
    const timeoutId = setTimeout(() => {
      this.showMealNotification(meal, userName);
    }, timeUntilNotification);
    
    // Use a unique key for each notification
    const notificationKey = `${meal.type}-day${dayOffset}`;
    this.scheduledNotifications.set(notificationKey, timeoutId);
    
    return true;
  }

  /**
   * Set up daily re-scheduling to maintain 7-day notification window
   */
  private setupDailyRescheduling() {
    // Schedule re-scheduling for midnight each day
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0); // 12:01 AM tomorrow
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    console.log(`🔄 Setting up daily re-scheduling in ${Math.round(timeUntilMidnight / 1000 / 60 / 60)} hours`);
    
    const midnightTimeout = setTimeout(() => {
      if (this.isActive) {
        console.log('🌅 Daily re-scheduling triggered at midnight');
        this.scheduleAllMealNotifications(); // Re-schedule for next 7 days
        this.saveScheduleToStorage(); // Update storage
      }
    }, timeUntilMidnight);
    
    this.scheduledNotifications.set('daily-reschedule', midnightTimeout);
  }

  /**
   * Save schedule information to localStorage for persistence
   */
  private saveScheduleToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const scheduleInfo = {
        userId: this.user?.id,
        scheduledAt: new Date().toISOString(),
        preferences: this.preferences,
        scheduledCount: this.scheduledNotifications.size,
        nextScheduleCheck: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      };
      
      localStorage.setItem('mealSchedulerInfo', JSON.stringify(scheduleInfo));
      console.log('� Saved meal schedule info to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save schedule to localStorage:', error);
    }
  }

  /**
   * Load and validate schedule from localStorage
   */
  private loadScheduleFromStorage(): any | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('mealSchedulerInfo');
      if (!stored) return null;
      
      const scheduleInfo = JSON.parse(stored);
      const scheduledAt = new Date(scheduleInfo.scheduledAt);
      const now = new Date();
      
      // Check if schedule is still valid (within 7 days)
      const daysSinceScheduled = (now.getTime() - scheduledAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceScheduled > 7) {
        console.log('📅 Stored schedule is too old, will create new one');
        localStorage.removeItem('mealSchedulerInfo');
        return null;
      }
      
      return scheduleInfo;
    } catch (error) {
      console.warn('⚠️ Failed to load schedule from localStorage:', error);
      return null;
    }
  }

  /**
   * Show meal notification (CSP-safe version)
   */
  private async showMealNotification(meal: MealTime, userName: string) {
    if (!areNotificationsEnabled() || !this.isActive) {
      console.log('📵 Skipping meal notification - not enabled or inactive');
      return;
    }

    try {
      console.log(`🔔 Showing ${meal.name} notification for ${userName}`);
      
      // Try simple notification system first (more reliable)
      const { SimpleNotifications } = await import('@/lib/utils/simple-notifications');
      
      if (SimpleNotifications.isAvailable()) {
        console.log('🎯 Using simple notification system for meal reminder...');
        const success = SimpleNotifications.showMealReminder(meal.type, userName);
        if (success) {
          console.log(`✅ Showed ${meal.name} notification using simple system`);
          return;
        }
      }

      // Fallback to direct notification API
      console.log('🎯 Using direct notification API as fallback...');
      const notification = new Notification(`${meal.emoji} ${meal.name} Time!`, {
        body: `Hey ${userName}! Time for your ${meal.name.toLowerCase()}. Stay on track with your nutrition goals!`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `meal-${meal.type}`,
        requireInteraction: true,
      });

      // Handle click
      notification.onclick = () => {
        console.log('🖱️ Meal notification clicked');
        window.focus();
        window.location.href = '/meals';
        notification.close();
      };

      // Auto close after 30 seconds
      setTimeout(() => {
        notification.close();
      }, 30000);

      console.log(`✅ Showed ${meal.name} notification for ${userName}`);

    } catch (error) {
      console.error('❌ Failed to show meal notification:', error);
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
    const storedInfo = this.loadScheduleFromStorage();
    const now = new Date();
    
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
      
      // Enhanced status info
      schedulingWindow: '7 days',
      lastScheduledAt: storedInfo?.scheduledAt || null,
      nextRescheduleAt: storedInfo?.nextScheduleCheck || null,
      persistenceInfo: {
        hasStoredSchedule: !!storedInfo,
        storedCount: storedInfo?.scheduledCount || 0,
        daysSinceLastSchedule: storedInfo ? 
          Math.round((now.getTime() - new Date(storedInfo.scheduledAt).getTime()) / (1000 * 60 * 60 * 24)) : 
          null
      }
    };
  }

  /**
   * Show a test meal notification
   */
  async showTestMealNotification(): Promise<boolean> {
    console.log('🧪 Meal scheduler test notification starting...');
    console.log('📋 Permission check:', typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
    
    if (!areNotificationsEnabled()) {
      console.warn('❌ Cannot show test notification: permission not granted');
      return false;
    }

    try {
      const userName = this.getUserDisplayName();
      console.log('👤 User name for notification:', userName);

      // Try simple notification system first
      const { SimpleNotifications } = await import('@/lib/utils/simple-notifications');
      
      if (SimpleNotifications.isAvailable()) {
        console.log('🎯 Using simple notification system for test...');
        const success = SimpleNotifications.show(
          '🧪 Test Meal Reminder',
          `Hey ${userName}! This is a test meal notification from the scheduler.`,
          {
            tag: 'test-meal-notification',
            url: '/meals',
            autoClose: 5000
          }
        );
        
        if (success) {
          console.log('✅ Test meal notification created successfully (simple system)');
          return true;
        }
      }

      // Fallback to direct API
      console.log('🎯 Using direct notification API for test...');
      const notification = new Notification('🧪 Test Meal Reminder', {
        body: `Hey ${userName}! This is a test meal notification from the scheduler.`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'test-meal-notification',
        requireInteraction: false,
      });

      notification.onclick = () => {
        console.log('🖱️ Test meal notification clicked');
        window.focus();
        window.location.href = '/meals';
        notification.close();
      };

      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log('✅ Test meal notification created successfully (direct API)');
      return true;
    } catch (error) {
      console.error('❌ Test meal notification error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const mealScheduler = MealNotificationScheduler.getInstance();

// Expose for debugging in production
if (typeof window !== 'undefined') {
  (window as any).mealScheduler = mealScheduler;
}