import OneSignal from 'react-onesignal';

/**
 * Check if OneSignal is initialized
 */
function isOneSignalInitialized(): boolean {
  try {
    return typeof window !== 'undefined' && 
           typeof OneSignal !== 'undefined' && 
           OneSignal.User !== undefined;
  } catch {
    return false;
  }
}

/**
 * Wait for OneSignal to be initialized
 */
async function waitForOneSignal(maxWaitMs = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (!isOneSignalInitialized()) {
    if (Date.now() - startTime > maxWaitMs) {
      console.warn('OneSignal initialization timeout');
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return true;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!await waitForOneSignal()) return false;
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
    if (!await waitForOneSignal()) return null;
    const userId = OneSignal.User.PushSubscription.id;
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
    if (!await waitForOneSignal()) {
      console.warn('OneSignal not initialized, skipping user ID setup');
      return;
    }
    
    console.log('Setting OneSignal user ID:', userId);
    await OneSignal.login(userId);
    console.log('OneSignal user ID set successfully');
  } catch (error) {
    console.error('Error setting external user ID:', error);
  }
}

/**
 * Remove external user ID (on logout)
 */
export async function removeExternalUserId(): Promise<void> {
  try {
    if (!isOneSignalInitialized()) {
      console.warn('OneSignal not initialized, skipping logout');
      return;
    }
    
    await OneSignal.logout();
    console.log('OneSignal user logged out');
  } catch (error) {
    console.error('Error removing external user ID:', error);
  }
}

/**
 * Add tags to the user for segmentation
 */
export async function addTags(tags: Record<string, string>): Promise<void> {
  try {
    if (!await waitForOneSignal()) return;
    OneSignal.User.addTags(tags);
  } catch (error) {
    console.error('Error adding tags:', error);
  }
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  try {
    if (!isOneSignalInitialized()) return false;
    return OneSignal.Notifications.permission;
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
}
