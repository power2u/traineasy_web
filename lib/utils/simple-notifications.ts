/**
 * Simple, production-focused notification system
 * Bypasses complex service worker layers for reliability
 */

export class SimpleNotifications {
  /**
   * Check if notifications are supported and enabled
   */
  static isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    );
  }

  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 Permission requested:', permission);
      return permission;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return 'denied';
    }
  }

  /**
   * Show a simple notification (production-safe)
   */
  static show(title: string, body: string, options: {
    icon?: string;
    tag?: string;
    url?: string;
    autoClose?: number;
  } = {}): boolean {
    if (!this.isAvailable()) {
      console.warn('❌ Notifications not available');
      return false;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: options.icon || '/logo.png',
        tag: options.tag || 'simple-notification',
        requireInteraction: false,
      });

      // Handle click
      if (options.url) {
        notification.onclick = () => {
          window.focus();
          window.location.href = options.url!;
          notification.close();
        };
      }

      // Auto close
      const closeTime = options.autoClose || 5000;
      setTimeout(() => {
        notification.close();
      }, closeTime);

      console.log('✅ Simple notification shown:', title);
      return true;
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
      return false;
    }
  }

  /**
   * Show test notification
   */
  static showTest(userName: string = 'there'): boolean {
    return this.show(
      '🧪 Test Notification',
      `Hi ${userName}! Your notifications are working perfectly!`,
      {
        tag: 'test-notification',
        url: '/dashboard',
        autoClose: 5000
      }
    );
  }

  /**
   * Show meal reminder
   */
  static showMealReminder(mealType: string, userName: string = 'there'): boolean {
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

    return this.show(
      `${emoji} ${mealName} Time!`,
      `Hey ${userName}! Time for your ${mealName.toLowerCase()}. Stay on track with your nutrition goals!`,
      {
        tag: `meal-${mealType}`,
        url: '/meals',
        autoClose: 30000
      }
    );
  }

  /**
   * Show water reminder
   */
  static showWaterReminder(userName: string = 'there'): boolean {
    return this.show(
      '💧 Hydration Time!',
      `${userName}, don't forget to drink water! Stay hydrated throughout the day.`,
      {
        tag: 'water-reminder',
        url: '/water',
        autoClose: 15000
      }
    );
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).SimpleNotifications = SimpleNotifications;
}