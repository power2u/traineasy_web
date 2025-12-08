'use client';

/**
 * Meal reminder notification utilities
 * Sends notifications when users haven't marked meals as completed
 */

const NOTIFICATION_STORAGE_KEY = 'meal_notifications_sent';

interface SentNotification {
  mealType: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

/**
 * Check if notification was already sent today for this meal
 */
function wasNotificationSent(
  mealType: string,
  date: string
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!stored) return false;

    const sent: SentNotification[] = JSON.parse(stored);
    return sent.some(
      (n) => n.mealType === mealType && n.date === date
    );
  } catch (error) {
    console.error('Error checking sent notifications:', error);
    return false;
  }
}

/**
 * Mark notification as sent
 */
function markNotificationSent(mealType: string, date: string): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const sent: SentNotification[] = stored ? JSON.parse(stored) : [];

    // Add new notification
    sent.push({
      mealType,
      date,
      timestamp: Date.now(),
    });

    // Keep only today's notifications (cleanup old ones)
    const today = new Date().toISOString().split('T')[0];
    const filtered = sent.filter((n) => n.date === today);

    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error marking notification sent:', error);
  }
}

/**
 * Send meal reminder notification
 */
export async function sendMealReminder(
  userId: string,
  mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner',
  mealLabel: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Check if already sent today
  if (wasNotificationSent(mealType, today)) {
    console.log(`Notification already sent for ${mealLabel} today`);
    return;
  }

  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return;
  }

  // Check permission
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    // Send browser notification
    const notification = new Notification('Meal Reminder 🍽️', {
      body: `Don't forget to mark your ${mealLabel} as completed!`,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: `meal-${mealType}-${today}`,
      requireInteraction: false,
      silent: false,
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      window.location.href = '/meals';
      notification.close();
    };

    // Mark as sent
    markNotificationSent(mealType, today);

    console.log(`Sent notification for ${mealLabel}`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (!('Notification' in window)) {
    return false;
  }

  return Notification.permission === 'granted';
}

/**
 * Clear notification history (for testing)
 */
export function clearNotificationHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
}
