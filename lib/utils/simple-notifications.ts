/**
 * Simple, production-focused notification system
 * Enhanced for mobile and PWA support
 */

export class SimpleNotifications {
  /**
   * Detect if running as PWA
   */
  static isPWA(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check if running in standalone mode (PWA)
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  /**
   * Detect mobile device
   */
  static isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Detect iOS device
   */
  static isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * Check if notifications are supported and enabled
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    // For iOS, notifications only work in PWA mode
    if (this.isIOS() && !this.isPWA()) {
      console.log('ℹ️ iOS notifications require PWA mode (add to home screen)');
      return false;
    }

    return Notification.permission === 'granted';
  }

  /**
   * Request notification permission with mobile-specific handling
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    // Check iOS PWA requirement
    if (this.isIOS() && !this.isPWA()) {
      console.warn('⚠️ iOS requires app to be added to home screen for notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      // For mobile, we need to request permission in response to user interaction
      const permission = await Notification.requestPermission();
      console.log('🔔 Permission requested (mobile-aware):', permission);
      
      // Additional mobile-specific setup
      if (permission === 'granted' && this.isMobile()) {
        await this.setupMobileNotifications();
      }
      
      return permission;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return 'denied';
    }
  }

  /**
   * Setup mobile-specific notification handling
   */
  static async setupMobileNotifications(): Promise<void> {
    try {
      // Register service worker for PWA notifications
      if ('serviceWorker' in navigator && this.isPWA()) {
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service worker ready for mobile notifications');
        
        // Store registration for later use
        (window as any).swRegistration = registration;
      }
    } catch (error) {
      console.warn('⚠️ Mobile notification setup failed:', error);
    }
  }

  /**
   * Show notification with mobile/PWA support
   */
  static show(title: string, body: string, options: {
    icon?: string;
    tag?: string;
    url?: string;
    autoClose?: number;
  } = {}): boolean {
    if (!this.isAvailable()) {
      console.warn('❌ Notifications not available');
      this.showFallbackAlert(title, body);
      return false;
    }

    try {
      // Use service worker for PWA notifications on mobile
      if (this.isPWA() && this.isMobile() && (window as any).swRegistration) {
        return this.showPWANotification(title, body, options);
      }

      // Standard notification for desktop and mobile browsers
      return this.showStandardNotification(title, body, options);
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
      this.showFallbackAlert(title, body);
      return false;
    }
  }

  /**
   * Show PWA notification via service worker
   */
  static showPWANotification(title: string, body: string, options: {
    icon?: string;
    tag?: string;
    url?: string;
    autoClose?: number;
  } = {}): boolean {
    try {
      const registration = (window as any).swRegistration;
      if (!registration) {
        return this.showStandardNotification(title, body, options);
      }

      const notificationOptions = {
        body,
        icon: options.icon || '/logo.png',
        badge: '/logo.png',
        tag: options.tag || 'pwa-notification',
        requireInteraction: this.isMobile(), // Keep visible on mobile
        data: {
          url: options.url || '/dashboard',
          timestamp: Date.now()
        },
        actions: this.isMobile() ? [
          {
            action: 'open',
            title: 'Open App',
            icon: '/logo.png'
          }
        ] : undefined
      };

      registration.showNotification(title, notificationOptions);
      console.log('✅ PWA notification shown:', title);
      
      // Auto-close for non-mobile (mobile handles this differently)
      if (!this.isMobile() && options.autoClose) {
        // PWA notifications don't support setTimeout, handled by service worker
      }
      
      return true;
    } catch (error) {
      console.error('❌ PWA notification failed:', error);
      return this.showStandardNotification(title, body, options);
    }
  }

  /**
   * Show standard browser notification
   */
  static showStandardNotification(title: string, body: string, options: {
    icon?: string;
    tag?: string;
    url?: string;
    autoClose?: number;
  } = {}): boolean {
    try {
      const notification = new Notification(title, {
        body,
        icon: options.icon || '/logo.png',
        tag: options.tag || 'simple-notification',
        requireInteraction: this.isMobile(), // Keep visible on mobile
      });

      // Handle click
      if (options.url) {
        notification.onclick = () => {
          window.focus();
          window.location.href = options.url!;
          notification.close();
        };
      }

      // Auto close (longer timeout for mobile)
      const closeTime = options.autoClose || (this.isMobile() ? 10000 : 5000);
      setTimeout(() => {
        notification.close();
      }, closeTime);

      console.log('✅ Standard notification shown:', title);
      return true;
    } catch (error) {
      console.error('❌ Standard notification failed:', error);
      return false;
    }
  }

  /**
   * Fallback alert for when notifications fail
   */
  static showFallbackAlert(title: string, body: string): void {
    if (this.isMobile()) {
      // On mobile, show a less intrusive console message
      console.log(`📱 ${title}: ${body}`);
    } else {
      // On desktop, can use alert as fallback
      alert(`${title}\n\n${body}`);
    }
  }

  /**
   * Show test notification with mobile detection
   */
  static showTest(userName: string = 'there'): boolean {
    const deviceInfo = this.getDeviceInfo();
    console.log('🧪 Test notification - Device info:', deviceInfo);
    
    return this.show(
      '🧪 Test Notification',
      `Hi ${userName}! Your notifications are working on ${deviceInfo.type}!`,
      {
        tag: 'test-notification',
        url: '/dashboard',
        autoClose: this.isMobile() ? 8000 : 5000
      }
    );
  }

  /**
   * Get device information for debugging
   */
  static getDeviceInfo(): { type: string; isPWA: boolean; canNotify: boolean } {
    return {
      type: this.isIOS() ? 'iOS' : this.isMobile() ? 'Mobile' : 'Desktop',
      isPWA: this.isPWA(),
      canNotify: this.isAvailable()
    };
  }

  /**
   * Show meal reminder with mobile optimization
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
        autoClose: this.isMobile() ? 30000 : 20000 // Longer on mobile
      }
    );
  }

  /**
   * Show water reminder with mobile optimization
   */
  static showWaterReminder(userName: string = 'there'): boolean {
    return this.show(
      '💧 Hydration Time!',
      `${userName}, don't forget to drink water! Stay hydrated throughout the day.`,
      {
        tag: 'water-reminder',
        url: '/water',
        autoClose: this.isMobile() ? 20000 : 15000
      }
    );
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).SimpleNotifications = SimpleNotifications;
}