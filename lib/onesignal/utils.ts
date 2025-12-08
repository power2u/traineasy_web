import OneSignal from 'react-onesignal';

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permission = await OneSignal.Notifications.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get the current user's OneSignal player ID
 */
export async function getPlayerId(): Promise<string | null> {
  try {
    const userId = await OneSignal.User.PushSubscription.id;
    return userId ?? null;
  } catch (error) {
    console.error('Error getting player ID:', error);
    return null;
  }
}

/**
 * Set external user ID (e.g., your app's user ID)
 */
export async function setExternalUserId(userId: string): Promise<void> {
  try {
    await OneSignal.login(userId);
  } catch (error) {
    console.error('Error setting external user ID:', error);
  }
}

/**
 * Remove external user ID (on logout)
 */
export async function removeExternalUserId(): Promise<void> {
  try {
    await OneSignal.logout();
  } catch (error) {
    console.error('Error removing external user ID:', error);
  }
}

/**
 * Add tags to the user for segmentation
 */
export async function addTags(tags: Record<string, string>): Promise<void> {
  try {
    await OneSignal.User.addTags(tags);
  } catch (error) {
    console.error('Error adding tags:', error);
  }
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  try {
    return OneSignal.Notifications.permission;
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
}
