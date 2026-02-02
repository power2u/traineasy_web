/**
 * Simple, production-focused notification system
 * Mobile-compatible functionality
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
   * Request notification permission with mobile compatibility
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      // Ensure we're in a user gesture context (required for mobile)
      // This should be called from a click handler
      console.log('🔔 Requesting notification permission...');
      
      // Use the callback-style API for better mobile compatibility
      let permission: NotificationPermission;
      
      if (typeof Notification.requestPermission === 'function') {
        // Modern promise-based API
        permission = await Notification.requestPermission();
      } else {
        // Fallback for older browsers
        permission = await new Promise((resolve) => {
          Notification.requestPermission((result) => {
            resolve(result as NotificationPermission);
          });
        });
      }
      
      console.log('🔔 Permission result:', permission);
      
      // Test notification capability immediately after permission grant
      if (permission === 'granted') {
        console.log('✅ Permission granted, testing notification capability...');
        
        // Small delay to ensure permission is fully processed
        setTimeout(() => {
          try {
            const testNotification = new Notification('Permission Granted', {
              body: 'Notifications are now enabled!',
              icon: '/logo.png',
              tag: 'permission-test',
              requireInteraction: false,
            });
            
            setTimeout(() => {
              testNotification.close();
            }, 2000);
          } catch (error) {
            console.warn('⚠️ Test notification failed:', error);
          }
        }, 100);
      }
      
      return permission;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return Notification.permission;
    }
  }

  /**
   * Show notification with mobile compatibility
   */
  static show(title: string, body: string, options: {
    icon?: string;
    tag?: string;
    url?: string;
    autoClose?: number;
  } = {}): boolean {
    if (!this.isAvailable()) {
      console.warn('❌ Notifications not available');
      console.log('📋 Permission status:', Notification.permission);
      console.log('📋 Notification support:', 'Notification' in window);
      return false;
    }

    try {
      console.log('🔔 Creating notification:', title);
      
      // Create notification with mobile-compatible options
      const notificationOptions: NotificationOptions = {
        body,
        icon: options.icon || '/logo.png',
        tag: options.tag || 'simple-notification',
        requireInteraction: false,
        silent: false, // Ensure sound/vibration on mobile
      };

      // Add badge for mobile PWA support
      if ('badge' in Notification.prototype) {
        (notificationOptions as any).badge = '/logo.png';
      }

      // Add vibration pattern for mobile
      if ('vibrate' in navigator) {
        (notificationOptions as any).vibrate = [200, 100, 200];
      }

      const notification = new Notification(title, notificationOptions);

      // Enhanced event handling
      notification.onshow = () => {
        console.log('✅ Notification displayed:', title);
      };

      notification.onerror = (error) => {
        console.error('❌ Notification error:', error);
      };

      notification.onclose = () => {
        console.log('🔔 Notification closed:', title);
      };

      // Handle click with mobile-friendly navigation
      if (options.url) {
        notification.onclick = (event) => {
          console.log('🖱️ Notification clicked:', title);
          event.preventDefault();
          
          try {
            // For mobile, try to focus existing window first
            if (window.parent && window.parent !== window) {
              window.parent.focus();
            } else {
              window.focus();
            }
            
            // Navigate to URL
            if (options.url!.startsWith('/')) {
              window.location.href = options.url!;
            } else {
              window.open(options.url!, '_blank');
            }
          } catch (navError) {
            console.error('❌ Navigation error:', navError);
          }
          
          notification.close();
        };
      }

      // Auto close with mobile-appropriate timing
      const closeTime = options.autoClose || 8000; // Longer for mobile
      setTimeout(() => {
        try {
          notification.close();
        } catch (e) {
          // Ignore close errors
        }
      }, closeTime);

      console.log('✅ Notification created successfully:', title);
      return true;
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
      console.log('📋 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        permission: Notification.permission,
        userAgent: navigator.userAgent
      });
      return false;
    }
  }

  /**
   * Show test notification
   */
  static showTest(userName: string = 'there'): boolean {
    console.log('🧪 Test notification starting...');
    console.log('📱 User agent:', navigator.userAgent);
    console.log('🔔 Permission:', Notification.permission);
    
    return this.show(
      '🧪 Test Notification',
      `Hi ${userName}! Your notifications are working!`,
      {
        tag: 'test-notification',
        url: '/dashboard',
        autoClose: 8000
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
        autoClose: 20000
      }
    );
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).SimpleNotifications = SimpleNotifications;
}