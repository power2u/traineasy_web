<<<<<<< HEAD
'use client';

/**
 * Meal Service Worker Manager
 * Handles registration and communication with the meal notification service worker
 */

export class MealServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;

  /**
   * Initialize and register the meal notification service worker
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[Meal SW Manager] Service Workers not supported');
      return false;
    }

    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register(
        '/sw-meal-notifications.js',
        { scope: '/' }
      );

      console.log('[Meal SW Manager] Service worker registered');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Request notification permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('[Meal SW Manager] Notification permission:', permission);
      }

      // Register periodic background sync (if supported)
      if ('periodicSync' in this.registration) {
        try {
          await (this.registration as any).periodicSync.register('check-meals', {
            minInterval: 60 * 1000, // Check every minute
          });
          console.log('[Meal SW Manager] Periodic sync registered');
        } catch (error) {
          console.warn('[Meal SW Manager] Periodic sync not available:', error);
        }
      }

      // Set up message listener
      this.setupMessageListener();

      // Cache initial data
      await this.cacheLocalData();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[Meal SW Manager] Registration failed:', error);
      return false;
    }
  }

  /**
   * Set up listener for messages from service worker
   */
  private setupMessageListener() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[Meal SW Manager] Message from SW:', event.data);

      const { type, ...data } = event.data;

      switch (type) {
        case 'GET_LOCAL_STORAGE':
          this.handleGetLocalStorage(event, data.key);
          break;

        case 'MARK_NOTIFICATION_SENT':
          this.handleMarkNotificationSent(data);
          break;

        case 'MARK_MEAL_COMPLETED':
          this.handleMarkMealCompleted(data.mealType);
          break;

        default:
          console.log('[Meal SW Manager] Unknown message type:', type);
      }
    });
  }

  /**
   * Handle request for local storage data from service worker
   */
  private handleGetLocalStorage(event: MessageEvent, key: string) {
    try {
      const value = localStorage.getItem(key);
      const port = event.ports[0];
      
      if (port) {
        port.postMessage(value);
      }
    } catch (error) {
      console.error('[Meal SW Manager] Error getting local storage:', error);
    }
  }

  /**
   * Handle marking notification as sent
   */
  private handleMarkNotificationSent(data: {
    mealType: string;
    date: string;
    timestamp: number;
  }) {
    try {
      const stored = localStorage.getItem('meal_notifications_sent');
      const notifications = stored ? JSON.parse(stored) : [];

      notifications.push(data);

      // Keep only today's notifications
      const today = new Date().toISOString().split('T')[0];
      const filtered = notifications.filter((n: any) => n.date === today);

      localStorage.setItem('meal_notifications_sent', JSON.stringify(filtered));
      console.log('[Meal SW Manager] Notification marked as sent:', data.mealType);
    } catch (error) {
      console.error('[Meal SW Manager] Error marking notification sent:', error);
    }
  }

  /**
   * Handle marking meal as completed from notification action
   */
  private handleMarkMealCompleted(mealType: string) {
    console.log('[Meal SW Manager] Mark meal completed:', mealType);

    // Dispatch custom event that the app can listen to
    window.dispatchEvent(
      new CustomEvent('meal-completed-from-notification', {
        detail: { mealType },
      })
    );
  }

  /**
   * Cache local storage data for offline access
   */
  async cacheLocalData() {
    if (!this.registration || !this.registration.active) {
      return;
    }

    try {
      // Cache meal times configured flag
      const configured = localStorage.getItem('meal_times_configured');
      if (configured) {
        this.registration.active.postMessage({
          type: 'CACHE_LOCAL_STORAGE',
          key: 'meal_times_configured',
          value: configured,
        });
      }

      // Cache meal times
      const mealTimes = localStorage.getItem('meal_times');
      if (mealTimes) {
        this.registration.active.postMessage({
          type: 'CACHE_LOCAL_STORAGE',
          key: 'meal_times',
          value: mealTimes,
        });
      }

      // Cache user data
      const userData = localStorage.getItem('user_data');
      if (userData) {
        this.registration.active.postMessage({
          type: 'CACHE_LOCAL_STORAGE',
          key: 'user_data',
          value: userData,
        });
      }

      console.log('[Meal SW Manager] Local data cached');
    } catch (error) {
      console.error('[Meal SW Manager] Error caching data:', error);
    }
  }

  /**
   * Trigger immediate meal check
   */
  async checkMealsNow() {
    if (!this.registration || !this.registration.active) {
      console.warn('[Meal SW Manager] Service worker not active');
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'CHECK_MEALS_NOW',
      });
      console.log('[Meal SW Manager] Triggered immediate meal check');
    } catch (error) {
      console.error('[Meal SW Manager] Error triggering check:', error);
    }
  }

  /**
   * Update cached data when meal times change
   */
  async updateMealTimes(mealTimes: any) {
    if (!this.registration || !this.registration.active) {
      return;
    }

    try {
      // Update configured flag
      this.registration.active.postMessage({
        type: 'CACHE_LOCAL_STORAGE',
        key: 'meal_times_configured',
        value: 'true',
      });

      // Update meal times
      this.registration.active.postMessage({
        type: 'CACHE_LOCAL_STORAGE',
        key: 'meal_times',
        value: JSON.stringify(mealTimes),
      });
      console.log('[Meal SW Manager] Meal times updated in cache');
    } catch (error) {
      console.error('[Meal SW Manager] Error updating meal times:', error);
    }
  }

  /**
   * Update cached user data
   */
  async updateUserData(userData: { full_name?: string; [key: string]: any }) {
    if (!this.registration || !this.registration.active) {
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'CACHE_LOCAL_STORAGE',
        key: 'user_data',
        value: JSON.stringify(userData),
      });
      console.log('[Meal SW Manager] User data updated in cache');
    } catch (error) {
      console.error('[Meal SW Manager] Error updating user data:', error);
    }
  }

  /**
   * Check if service worker is supported and registered
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled(): boolean {
    return Notification.permission === 'granted';
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[Meal SW Manager] Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister() {
    if (this.registration) {
      await this.registration.unregister();
      this.registration = null;
      this.isInitialized = false;
      console.log('[Meal SW Manager] Service worker unregistered');
    }
  }
}

// Singleton instance
let managerInstance: MealServiceWorkerManager | null = null;

export function getMealServiceWorkerManager(): MealServiceWorkerManager {
  if (!managerInstance) {
    managerInstance = new MealServiceWorkerManager();
  }
  return managerInstance;
}

/**
 * Hook to listen for meal completion from notifications
 */
export function useMealCompletionListener(
  onMealCompleted: (mealType: string) => void
) {
  if (typeof window === 'undefined') return;

  const handleMealCompleted = (event: CustomEvent) => {
    onMealCompleted(event.detail.mealType);
  };

  window.addEventListener(
    'meal-completed-from-notification',
    handleMealCompleted as EventListener
  );

  return () => {
    window.removeEventListener(
      'meal-completed-from-notification',
      handleMealCompleted as EventListener
    );
  };
}
=======
'use client';

/**
 * Meal Service Worker Manager
 * Handles registration and communication with the meal notification service worker
 */

export class MealServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;

  /**
   * Initialize and register the meal notification service worker
   * DISABLED: All meal notifications now handled by server-side FCM system
   */
  async initialize(): Promise<boolean> {
    console.log('🚫 [Meal SW Manager] DISABLED - Using server-side FCM for meal notifications');
    console.log('✅ [Meal SW Manager] This prevents duplicate notifications');
    
    // Mark as initialized but don't actually register service worker
    this.isInitialized = true;
    return false; // Return false to indicate no service worker registered
    
    /* ORIGINAL CODE DISABLED TO PREVENT DUPLICATE NOTIFICATIONS
    if (this.isInitialized) {
      return true;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[Meal SW Manager] Service Workers not supported');
      return false;
    }

    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register(
        '/sw-meal-notifications.js',
        { scope: '/' }
      );

      console.log('[Meal SW Manager] Service worker registered');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Request notification permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('[Meal SW Manager] Notification permission:', permission);
      }

      // Register periodic background sync (if supported)
      if ('periodicSync' in this.registration) {
        try {
          await (this.registration as any).periodicSync.register('check-meals', {
            minInterval: 60 * 1000, // Check every minute
          });
          console.log('[Meal SW Manager] Periodic sync registered');
        } catch (error) {
          console.warn('[Meal SW Manager] Periodic sync not available:', error);
        }
      }

      // Set up message listener
      this.setupMessageListener();

      // Cache initial data
      await this.cacheLocalData();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[Meal SW Manager] Registration failed:', error);
      return false;
    }
    */
  }

  /**
   * Set up listener for messages from service worker
   */
  private setupMessageListener() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[Meal SW Manager] Message from SW:', event.data);

      const { type, ...data } = event.data;

      switch (type) {
        case 'GET_LOCAL_STORAGE':
          this.handleGetLocalStorage(event, data.key);
          break;

        case 'MARK_NOTIFICATION_SENT':
          this.handleMarkNotificationSent(data);
          break;

        case 'MARK_MEAL_COMPLETED':
          this.handleMarkMealCompleted(data.mealType);
          break;

        default:
          console.log('[Meal SW Manager] Unknown message type:', type);
      }
    });
  }

  /**
   * Handle request for local storage data from service worker
   */
  private handleGetLocalStorage(event: MessageEvent, key: string) {
    try {
      const value = localStorage.getItem(key);
      const port = event.ports[0];
      
      if (port) {
        port.postMessage(value);
      }
    } catch (error) {
      console.error('[Meal SW Manager] Error getting local storage:', error);
    }
  }

  /**
   * Handle marking notification as sent
   */
  private handleMarkNotificationSent(data: {
    mealType: string;
    date: string;
    timestamp: number;
  }) {
    try {
      const stored = localStorage.getItem('meal_notifications_sent');
      const notifications = stored ? JSON.parse(stored) : [];

      notifications.push(data);

      // Keep only today's notifications
      const today = new Date().toISOString().split('T')[0];
      const filtered = notifications.filter((n: any) => n.date === today);

      localStorage.setItem('meal_notifications_sent', JSON.stringify(filtered));
      console.log('[Meal SW Manager] Notification marked as sent:', data.mealType);
    } catch (error) {
      console.error('[Meal SW Manager] Error marking notification sent:', error);
    }
  }

  /**
   * Handle marking meal as completed from notification action
   */
  private handleMarkMealCompleted(mealType: string) {
    console.log('[Meal SW Manager] Mark meal completed:', mealType);

    // Dispatch custom event that the app can listen to
    window.dispatchEvent(
      new CustomEvent('meal-completed-from-notification', {
        detail: { mealType },
      })
    );
  }

  /**
   * Cache local storage data for offline access
   */
  async cacheLocalData() {
    if (!this.registration || !this.registration.active) {
      return;
    }

    try {
      // Cache meal times configured flag
      const configured = localStorage.getItem('meal_times_configured');
      if (configured) {
        this.registration.active.postMessage({
          type: 'CACHE_LOCAL_STORAGE',
          key: 'meal_times_configured',
          value: configured,
        });
      }

      // Cache meal times
      const mealTimes = localStorage.getItem('meal_times');
      if (mealTimes) {
        this.registration.active.postMessage({
          type: 'CACHE_LOCAL_STORAGE',
          key: 'meal_times',
          value: mealTimes,
        });
      }

      // Cache user data
      const userData = localStorage.getItem('user_data');
      if (userData) {
        this.registration.active.postMessage({
          type: 'CACHE_LOCAL_STORAGE',
          key: 'user_data',
          value: userData,
        });
      }

      console.log('[Meal SW Manager] Local data cached');
    } catch (error) {
      console.error('[Meal SW Manager] Error caching data:', error);
    }
  }

  /**
   * Trigger immediate meal check
   */
  async checkMealsNow() {
    if (!this.registration || !this.registration.active) {
      console.warn('[Meal SW Manager] Service worker not active');
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'CHECK_MEALS_NOW',
      });
      console.log('[Meal SW Manager] Triggered immediate meal check');
    } catch (error) {
      console.error('[Meal SW Manager] Error triggering check:', error);
    }
  }

  /**
   * Update cached data when meal times change
   */
  async updateMealTimes(mealTimes: any) {
    if (!this.registration || !this.registration.active) {
      return;
    }

    try {
      // Update configured flag
      this.registration.active.postMessage({
        type: 'CACHE_LOCAL_STORAGE',
        key: 'meal_times_configured',
        value: 'true',
      });

      // Update meal times
      this.registration.active.postMessage({
        type: 'CACHE_LOCAL_STORAGE',
        key: 'meal_times',
        value: JSON.stringify(mealTimes),
      });
      console.log('[Meal SW Manager] Meal times updated in cache');
    } catch (error) {
      console.error('[Meal SW Manager] Error updating meal times:', error);
    }
  }

  /**
   * Update cached user data
   */
  async updateUserData(userData: { full_name?: string; [key: string]: any }) {
    if (!this.registration || !this.registration.active) {
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'CACHE_LOCAL_STORAGE',
        key: 'user_data',
        value: JSON.stringify(userData),
      });
      console.log('[Meal SW Manager] User data updated in cache');
    } catch (error) {
      console.error('[Meal SW Manager] Error updating user data:', error);
    }
  }

  /**
   * Check if service worker is supported and registered
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Check if notifications are enabled
   */
  areNotificationsEnabled(): boolean {
    return Notification.permission === 'granted';
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[Meal SW Manager] Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister() {
    if (this.registration) {
      await this.registration.unregister();
      this.registration = null;
      this.isInitialized = false;
      console.log('[Meal SW Manager] Service worker unregistered');
    }
  }
}

// Singleton instance
let managerInstance: MealServiceWorkerManager | null = null;

export function getMealServiceWorkerManager(): MealServiceWorkerManager {
  if (!managerInstance) {
    managerInstance = new MealServiceWorkerManager();
  }
  return managerInstance;
}

/**
 * Hook to listen for meal completion from notifications
 */
export function useMealCompletionListener(
  onMealCompleted: (mealType: string) => void
) {
  if (typeof window === 'undefined') return;

  const handleMealCompleted = (event: CustomEvent) => {
    onMealCompleted(event.detail.mealType);
  };

  window.addEventListener(
    'meal-completed-from-notification',
    handleMealCompleted as EventListener
  );

  return () => {
    window.removeEventListener(
      'meal-completed-from-notification',
      handleMealCompleted as EventListener
    );
  };
}
>>>>>>> main
