'use client';

/**
 * Service Worker Manager for Background Notifications
 * Integrates with React Query cache and triggers local notifications
 */

export class ServiceWorkerNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;

  /**
   * Initialize and register the service worker
   */
  async initialize() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw-notifications.js');
      console.log('Notification service worker registered');

      // Request notification permission
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      // Register periodic background sync (if supported)
      if ('periodicSync' in this.registration) {
        try {
          await (this.registration as any).periodicSync.register('check-reminders', {
            minInterval: 60 * 60 * 1000, // Check every hour
          });
          console.log('Periodic background sync registered');
        } catch (error) {
          console.warn('Periodic background sync not available:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return false;
    }
  }

  /**
   * Send a notification immediately
   */
  async sendNotification(title: string, options: NotificationOptions & { actions?: Array<{ action: string; title: string }> }) {
    if (!this.registration) {
      console.warn('Service worker not registered');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      await this.registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Check local data and send reminders
   * This reads from React Query cache or IndexedDB
   */
  async checkAndSendLocalReminders() {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    try {
      // Check water intake from IndexedDB
      const waterData = await this.getLocalWaterData(today);
      if (hour >= 12 && waterData.totalGlasses < 4) {
        await this.sendNotification('💧 Hydration Reminder', {
          body: `You've only had ${waterData.totalGlasses} glasses today. Stay hydrated!`,
          tag: 'water-reminder',
          data: { url: '/water' },
          actions: [
            { action: 'log-water', title: 'Log Water' },
            { action: 'dismiss', title: 'Dismiss' },
          ],
        });
      }

      // Check meals from IndexedDB
      const mealsData = await this.getLocalMealsData(today);
      if (hour >= 14 && mealsData.completedCount === 0) {
        await this.sendNotification('🍽️ Meal Reminder', {
          body: 'Don\'t forget to log your meals today!',
          tag: 'meal-reminder',
          data: { url: '/meals' },
          actions: [
            { action: 'log-meal', title: 'Log Meal' },
            { action: 'dismiss', title: 'Dismiss' },
          ],
        });
      }

      // Check weight logging (weekly reminder on Monday)
      if (hour === 9 && new Date().getDay() === 1) {
        const hasWeightLog = await this.hasRecentWeightLog();
        if (!hasWeightLog) {
          await this.sendNotification('⚖️ Weight Log Reminder', {
            body: 'Time for your weekly weigh-in!',
            tag: 'weight-reminder',
            data: { url: '/weight' },
            actions: [
              { action: 'log-weight', title: 'Log Weight' },
              { action: 'dismiss', title: 'Dismiss' },
            ],
          });
        }
      }
    } catch (error) {
      console.error('Error checking local reminders:', error);
    }
  }

  /**
   * Get water data from IndexedDB
   */
  private async getLocalWaterData(date: string): Promise<{ totalGlasses: number }> {
    return new Promise((resolve) => {
      const request = indexedDB.open('fitness-tracker-db', 1);

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['water_logs'], 'readonly');
        const store = tx.objectStore('water_logs');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const logs = getAllRequest.result.filter((log: any) => log.date === date);
          const totalGlasses = logs.reduce((sum: number, log: any) => sum + (log.glasses || 0), 0);
          resolve({ totalGlasses });
        };

        getAllRequest.onerror = () => resolve({ totalGlasses: 0 });
      };

      request.onerror = () => resolve({ totalGlasses: 0 });
    });
  }

  /**
   * Get meals data from IndexedDB
   */
  private async getLocalMealsData(date: string): Promise<{ completedCount: number }> {
    return new Promise((resolve) => {
      const request = indexedDB.open('fitness-tracker-db', 1);

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['meals'], 'readonly');
        const store = tx.objectStore('meals');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const meals = getAllRequest.result.filter(
            (meal: any) => meal.date === date && meal.completed
          );
          resolve({ completedCount: meals.length });
        };

        getAllRequest.onerror = () => resolve({ completedCount: 0 });
      };

      request.onerror = () => resolve({ completedCount: 0 });
    });
  }

  /**
   * Check if user has logged weight in the last 7 days
   */
  private async hasRecentWeightLog(): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open('fitness-tracker-db', 1);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['weight_logs'], 'readonly');
        const store = tx.objectStore('weight_logs');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const recentLogs = getAllRequest.result.filter(
            (log: any) => log.date >= weekAgoStr
          );
          resolve(recentLogs.length > 0);
        };

        getAllRequest.onerror = () => resolve(false);
      };

      request.onerror = () => resolve(false);
    });
  }

  /**
   * Start periodic checks (fallback if background sync not available)
   */
  startPeriodicChecks(intervalMinutes: number = 60) {
    setInterval(() => {
      this.checkAndSendLocalReminders();
    }, intervalMinutes * 60 * 1000);
  }
}

// Singleton instance
let managerInstance: ServiceWorkerNotificationManager | null = null;

export function getServiceWorkerNotificationManager(): ServiceWorkerNotificationManager {
  if (!managerInstance) {
    managerInstance = new ServiceWorkerNotificationManager();
  }
  return managerInstance;
}
