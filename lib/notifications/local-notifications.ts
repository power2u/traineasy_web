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
  data?: Record<string, unknown>;
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

    try {
      // For iOS, we need to handle the case where the permission request might not show
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // Check if we're in a PWA context
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
        
        if (!isStandalone) {
          console.warn('iOS notifications require PWA installation');
          // Still try to request permission, but it might not work
        }
      }

      // Request permission
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  private recentNotifications = new Set<string>();

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

      // Create unique key for deduplication
      const notificationKey = `${payload.title}-${payload.body}-${payload.tag || 'default'}`;
      
      // Check if we recently showed this notification (prevent duplicates)
      if (this.recentNotifications.has(notificationKey)) {
        console.log('Duplicate notification prevented:', notificationKey);
        return false;
      }
      
      // Add to recent notifications
      this.recentNotifications.add(notificationKey);
      
      // Remove after 30 seconds to allow legitimate duplicates later
      setTimeout(() => {
        this.recentNotifications.delete(notificationKey);
      }, 30000);

      // Use service worker if available, otherwise fallback to direct API
      // But NOT both to prevent duplicates
      if (this.serviceWorkerRegistration) {
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

      // Fallback to direct notification API only if service worker failed
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
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'Notification' in window;
  }

  /**
   * Check if we're running as a PWA
   */
  isPWA(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    return isStandalone;
  }

  /**
   * Check if we're on iOS
   */
  isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined') return 'default';
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }
}

// Export singleton instance
export const localNotificationManager = LocalNotificationManager.getInstance();