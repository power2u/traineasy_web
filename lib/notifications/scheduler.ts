'use client';

/**
 * Client-side notification scheduler
 * Schedules notifications based on user preferences and activity
 */

interface NotificationSchedule {
  id: string;
  type: 'water' | 'meal' | 'weight' | 'motivation';
  time: string; // HH:MM format
  enabled: boolean;
  message: string;
}

class NotificationScheduler {
  private schedules: NotificationSchedule[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadSchedules();
  }

  /**
   * Load schedules from localStorage
   */
  private loadSchedules() {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('notification-schedules');
    if (saved) {
      this.schedules = JSON.parse(saved);
      this.schedules.forEach(schedule => {
        if (schedule.enabled) {
          this.scheduleNotification(schedule);
        }
      });
    }
  }

  /**
   * Save schedules to localStorage
   */
  private saveSchedules() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('notification-schedules', JSON.stringify(this.schedules));
  }

  /**
   * Add a new notification schedule
   */
  addSchedule(schedule: NotificationSchedule) {
    this.schedules.push(schedule);
    this.saveSchedules();
    
    if (schedule.enabled) {
      this.scheduleNotification(schedule);
    }
  }

  /**
   * Remove a notification schedule
   */
  removeSchedule(id: string) {
    this.schedules = this.schedules.filter(s => s.id !== id);
    this.saveSchedules();
    
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * Update a notification schedule
   */
  updateSchedule(id: string, updates: Partial<NotificationSchedule>) {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      this.schedules[index] = { ...this.schedules[index], ...updates };
      this.saveSchedules();
      
      // Reschedule
      const timer = this.timers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(id);
      }
      
      if (this.schedules[index].enabled) {
        this.scheduleNotification(this.schedules[index]);
      }
    }
  }

  /**
   * Schedule a notification
   */
  private scheduleNotification(schedule: NotificationSchedule) {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const delay = scheduledTime.getTime() - now.getTime();
    
    const timer = setTimeout(() => {
      this.sendNotification(schedule);
      // Reschedule for next day
      this.scheduleNotification(schedule);
    }, delay);
    
    this.timers.set(schedule.id, timer);
  }

  /**
   * Send a notification
   */
  private async sendNotification(schedule: NotificationSchedule) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const icons = {
        water: '💧',
        meal: '🍽️',
        weight: '⚖️',
        motivation: '💪'
      };
      
      new Notification(`${icons[schedule.type]} ${this.getTitle(schedule.type)}`, {
        body: schedule.message,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `${schedule.type}-reminder`,
        requireInteraction: false,
      });
    }
  }

  /**
   * Get notification title based on type
   */
  private getTitle(type: string): string {
    const titles = {
      water: 'Hydration Reminder',
      meal: 'Meal Reminder',
      weight: 'Weight Log Reminder',
      motivation: 'Stay Motivated!'
    };
    return titles[type as keyof typeof titles] || 'Reminder';
  }

  /**
   * Get all schedules
   */
  getSchedules(): NotificationSchedule[] {
    return this.schedules;
  }

  /**
   * Clear all schedules
   */
  clearAll() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.schedules = [];
    this.saveSchedules();
  }
}

// Singleton instance
let schedulerInstance: NotificationScheduler | null = null;

export function getNotificationScheduler(): NotificationScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new NotificationScheduler();
  }
  return schedulerInstance;
}

export type { NotificationSchedule };
