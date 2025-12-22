/**
 * Local Notification Manager
 * Handles browser notifications without FCM dependency
 */

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  url?: string;
}

export class LocalNotificationManager {
  private static instance: LocalNotificationManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): LocalNotificationManager {
    if (!LocalNotificationManager.instance) {
      LocalNotificationManager.instance = new LocalNotificationManager();
    }
    return LocalNotificationManager.instance;
  }

  /**
   * Initialize the notification system
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers not supported');
        return false;
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return false;
      }

      // Register service worker
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully');

      // Request notification permission
      const permission = await this.requestPermission();
      return permission === 'granted';

    } catch (error) {
      console.error('Failed to initialize local notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  /**
   * Show a local notification
   */
  async showNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Check permission
      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // If service worker is available, use it
      if (this.serviceWorkerRegistration) {
        // Send message to service worker
        const serviceWorker = this.serviceWorkerRegistration.active;
        if (serviceWorker) {
          serviceWorker.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title: payload.title,
              body: payload.body,
              icon: payload.icon || '/icon-192x192.png',
              badge: payload.badge || '/icon-192x192.png',
              tag: payload.tag || 'fitness-reminder',
              data: {
                url: payload.url || '/dashboard',
                ...payload.data
              }
            }
          });
          return true;
        }
      }

      // Fallback to direct notification API
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        tag: payload.tag || 'fitness-reminder',
        data: payload.data || {},
        requireInteraction: true
      });

      // Handle click
      notification.onclick = () => {
        window.focus();
        if (payload.url) {
          window.location.href = payload.url;
        }
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      return true;

    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  /**
   * Show meal reminder notification
   */
  async showMealReminder(mealType: string, userName: string): Promise<boolean> {
    const mealEmojis: Record<string, string> = {
      breakfast: '🍳',
      snack1: '🍎',
      lunch: '🍱',
      snack2: '🥤',
      dinner: '🍽️'
    };

    const mealNames: Record<string, string> = {
      breakfast: 'Breakfast',
      snack1: 'Morning Snack',
      lunch: 'Lunch',
      snack2: 'Afternoon Snack',
      dinner: 'Dinner'
    };

    const emoji = mealEmojis[mealType] || '🍽️';
    const mealName = mealNames[mealType] || 'Meal';

    return this.showNotification({
      title: `${emoji} ${mealName} Time!`,
      body: `Hey ${userName}! Time for your ${mealName.toLowerCase()}. Stay on track with your nutrition goals!`,
      tag: `meal-${mealType}`,
      url: '/meals',
      data: { type: 'meal_reminder', mealType }
    });
  }

  /**
   * Show water reminder notification
   */
  async showWaterReminder(userName: string): Promise<boolean> {
    return this.showNotification({
      title: '💧 Hydration Time!',
      body: `${userName}, don't forget to drink water! Stay hydrated throughout the day.`,
      tag: 'water-reminder',
      url: '/water',
      data: { type: 'water_reminder' }
    });
  }

  /**
   * Show good morning notification
   */
  async showGoodMorning(userName: string): Promise<boolean> {
    return this.showNotification({
      title: '🌅 Good Morning!',
      body: `Good morning ${userName}! Ready to start your wellness journey today?`,
      tag: 'good-morning',
      url: '/dashboard',
      data: { type: 'good_morning' }
    });
  }

  /**
   * Show good night notification
   */
  async showGoodNight(userName: string, mealsCompleted: number = 0): Promise<boolean> {
    return this.showNotification({
      title: '🌙 Good Night!',
      body: `Good night ${userName}! You completed ${mealsCompleted} meals today. Sweet dreams!`,
      tag: 'good-night',
      url: '/dashboard',
      data: { type: 'good_night', mealsCompleted }
    });
  }

  /**
   * Show weight reminder notification
   */
  async showWeightReminder(userName: string): Promise<boolean> {
    return this.showNotification({
      title: '⚖️ Weekly Weigh-In!',
      body: `${userName}, time for your weekly weight check! Track your progress.`,
      tag: 'weight-reminder',
      url: '/weight',
      data: { type: 'weekly_weight_reminder' }
    });
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'Notification' in window;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }
}

// Export singleton instance
export const localNotificationManager = LocalNotificationManager.getInstance();