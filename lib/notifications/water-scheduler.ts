/**
 * Simple water notification scheduler using browser notifications
 */

import { areNotificationsEnabled } from '@/lib/utils/notification-utils';

interface UserPreferences {
  id: string;
  full_name?: string;
  notifications_enabled: boolean;
  water_reminders_enabled: boolean;
  daily_water_target: number;
  glass_size_ml: number;
}

export class WaterNotificationScheduler {
  private static instance: WaterNotificationScheduler;
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();
  private user: { id: string; displayName?: string } | null = null;
  private preferences: UserPreferences | null = null;
  private isActive: boolean = false;

  private constructor() {}

  static getInstance(): WaterNotificationScheduler {
    if (!WaterNotificationScheduler.instance) {
      WaterNotificationScheduler.instance = new WaterNotificationScheduler();
    }
    return WaterNotificationScheduler.instance;
  }

  /**
   * Initialize scheduler for a user
   */
  async initialize(user: { id: string; displayName?: string }) {
    this.user = user;
    this.isActive = true;
    
    console.log('💧 Initializing water scheduler for:', user.displayName || user.id);
    
    await this.loadUserPreferences();
    
    // Only schedule if notifications are enabled and permission granted
    if (areNotificationsEnabled() && this.canScheduleNotifications()) {
      this.scheduleWaterReminders();
    } else {
      console.log('💧 Water notifications not scheduled - permission or settings disabled');
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
        console.log('💧 Loaded water preferences:', {
          notificationsEnabled: this.preferences?.notifications_enabled,
          waterRemindersEnabled: this.preferences?.water_reminders_enabled,
          dailyTarget: this.preferences?.daily_water_target,
          glassSize: this.preferences?.glass_size_ml,
        });
      }
    } catch (error) {
      console.warn('Failed to load water preferences:', error);
    }
  }

  /**
   * Check if we can schedule notifications
   */
  private canScheduleNotifications(): boolean {
    return !!(
      this.preferences?.notifications_enabled && 
      this.preferences?.water_reminders_enabled &&
      areNotificationsEnabled()
    );
  }

  /**
   * Schedule water reminders (every 2 hours from 8 AM to 8 PM)
   */
  private scheduleWaterReminders() {
    if (!this.canScheduleNotifications()) {
      console.log('💧 Cannot schedule water notifications - requirements not met');
      return;
    }

    // Clear existing notifications
    this.clearAllNotifications();

    const userName = this.getUserDisplayName();
    const reminderTimes = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

    let scheduledCount = 0;
    reminderTimes.forEach(time => {
      this.scheduleWaterReminder(time, userName);
      scheduledCount++;
    });

    console.log(`✅ Scheduled ${scheduledCount} water reminders for ${userName}`);
  }

  /**
   * Get user display name
   */
  private getUserDisplayName(): string {
    return this.user?.displayName || this.preferences?.full_name || 'there';
  }

  /**
   * Schedule a single water reminder
   */
  private scheduleWaterReminder(time: string, userName: string) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    // Schedule for today if time hasn't passed
    const todayTime = new Date();
    todayTime.setHours(hours, minutes, 0, 0);
    
    if (todayTime > now) {
      const timeUntilNotification = todayTime.getTime() - now.getTime();
      console.log(`💧 Scheduling water reminder for today at ${todayTime.toLocaleTimeString()}`);
      
      const timeoutId = setTimeout(() => {
        this.showWaterNotification(userName);
      }, timeUntilNotification);
      
      this.scheduledNotifications.set(`water-${time}-today`, timeoutId);
    }

    // Always schedule for tomorrow
    const tomorrowTime = new Date();
    tomorrowTime.setDate(tomorrowTime.getDate() + 1);
    tomorrowTime.setHours(hours, minutes, 0, 0);
    
    const timeUntilTomorrow = tomorrowTime.getTime() - now.getTime();
    
    const tomorrowTimeoutId = setTimeout(() => {
      this.showWaterNotification(userName);
      // Reschedule for the day after tomorrow
      setTimeout(() => {
        if (this.isActive) {
          this.scheduleWaterReminder(time, userName);
        }
      }, 1000);
    }, timeUntilTomorrow);
    
    this.scheduledNotifications.set(`water-${time}-tomorrow`, tomorrowTimeoutId);
  }

  /**
   * Show water notification
   */
  private async showWaterNotification(userName: string) {
    if (!areNotificationsEnabled() || !this.isActive) {
      console.log('💧 Skipping water notification - not enabled or inactive');
      return;
    }

    try {
      const glassSize = this.preferences?.glass_size_ml || 250;
      const notification = new Notification('💧 Hydration Time!', {
        body: `Hey ${userName}! Time to drink water. Stay hydrated with a ${glassSize}ml glass!`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'water-reminder',
        requireInteraction: false,
        data: { 
          type: 'water_reminder',
          url: '/water'
        }
      });

      // Handle click
      notification.onclick = () => {
        window.focus();
        window.location.href = '/water';
        notification.close();
      };

      // Auto close after 15 seconds
      setTimeout(() => {
        notification.close();
      }, 15000);

      console.log(`💧 Showed water notification for ${userName}`);

    } catch (error) {
      console.error('Failed to show water notification:', error);
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
    console.log('🧹 Cleared all scheduled water notifications');
  }

  /**
   * Update preferences and reschedule
   */
  async updatePreferences() {
    console.log('🔄 Updating water preferences...');
    await this.loadUserPreferences();
    
    if (this.isActive && areNotificationsEnabled()) {
      this.scheduleWaterReminders();
    }
  }

  /**
   * Stop all notifications
   */
  stop() {
    console.log('🛑 Stopping water scheduler');
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
      this.preferences?.notifications_enabled && 
      this.preferences?.water_reminders_enabled &&
      areNotificationsEnabled()
    );
  }

  /**
   * Get next scheduled water reminder
   */
  getNextReminder(): { time: Date } | null {
    const now = new Date();
    const reminderTimes = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

    for (const time of reminderTimes) {
      const [hours, minutes] = time.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      if (reminderTime > now) {
        return { time: reminderTime };
      }
    }

    // If no reminder today, return tomorrow's first reminder
    const [hours, minutes] = reminderTimes[0].split(':').map(Number);
    const tomorrowFirst = new Date();
    tomorrowFirst.setDate(tomorrowFirst.getDate() + 1);
    tomorrowFirst.setHours(hours, minutes, 0, 0);

    return { time: tomorrowFirst };
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      isActive: this.isActive,
      hasUser: !!this.user,
      hasPreferences: !!this.preferences,
      notificationsEnabled: areNotificationsEnabled(),
      canSchedule: this.canScheduleNotifications(),
      scheduledCount: this.scheduledNotifications.size,
      nextReminder: this.getNextReminder(),
      dailyTarget: this.preferences?.daily_water_target || 0,
      glassSize: this.preferences?.glass_size_ml || 250,
    };
  }

  /**
   * Show a test water notification
   */
  showTestWaterNotification(): boolean {
    if (!areNotificationsEnabled()) {
      console.warn('Cannot show test water notification: permission not granted');
      return false;
    }

    const userName = this.getUserDisplayName();
    this.showWaterNotification(userName);
    return true;
  }
}

// Export singleton instance
export const waterScheduler = WaterNotificationScheduler.getInstance();