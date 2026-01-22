/**
 * Notification utility functions for graceful permission handling
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if notifications are supported in the current browser
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Check if notifications are currently enabled
 */
export function areNotificationsEnabled(): boolean {
  return getNotificationPermissionStatus() === 'granted';
}

/**
 * Request notification permission gracefully (doesn't throw errors)
 */
export async function requestNotificationPermissionGracefully(): Promise<{
  success: boolean;
  permission: NotificationPermissionStatus;
  message: string;
}> {
  if (!isNotificationSupported()) {
    return {
      success: false,
      permission: 'unsupported',
      message: 'Notifications are not supported in this browser'
    };
  }

  const currentPermission = Notification.permission;
  
  if (currentPermission === 'granted') {
    return {
      success: true,
      permission: 'granted',
      message: 'Notifications are already enabled'
    };
  }

  if (currentPermission === 'denied') {
    return {
      success: false,
      permission: 'denied',
      message: 'Notifications are blocked. Please enable them in browser settings.'
    };
  }

  try {
    const permission = await Notification.requestPermission();
    
    return {
      success: permission === 'granted',
      permission: permission as NotificationPermissionStatus,
      message: permission === 'granted' 
        ? 'Notifications enabled successfully' 
        : 'Notification permission was denied'
    };
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return {
      success: false,
      permission: 'denied',
      message: 'Failed to request notification permission'
    };
  }
}

/**
 * Show a test notification (only if permission is granted)
 */
export function showTestNotification(title: string = 'Test Notification', body: string = 'This is a test notification'): boolean {
  if (!areNotificationsEnabled()) {
    console.warn('Cannot show notification: permission not granted');
    return false;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'test-notification',
      requireInteraction: false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return true;
  } catch (error) {
    console.error('Error showing test notification:', error);
    return false;
  }
}

/**
 * Get user-friendly message for notification permission status
 */
export function getPermissionStatusMessage(status: NotificationPermissionStatus): string {
  switch (status) {
    case 'granted':
      return 'Notifications are enabled ✅';
    case 'denied':
      return 'Notifications are blocked ❌';
    case 'default':
      return 'Notification permission not requested yet ⏳';
    case 'unsupported':
      return 'Notifications not supported in this browser ⚠️';
    default:
      return 'Unknown notification status';
  }
}

/**
 * Get instructions for enabling notifications when blocked
 */
export function getEnableNotificationsInstructions(): string[] {
  return [
    '1. Click the lock icon (🔒) or info icon (ℹ️) in your browser\'s address bar',
    '2. Find "Notifications" in the permissions list',
    '3. Change the setting from "Block" to "Allow"',
    '4. Refresh the page',
    '5. You may need to sign out and sign back in'
  ];
}