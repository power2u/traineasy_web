'use client';

import { useEffect } from 'react';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';
import { useNotificationPermission } from '@/lib/hooks/use-notification-permission';
import { useAuthUser } from '@/lib/contexts/auth-context';
import { NotificationPermissionPrompt } from './notification-permission-prompt';

/**
 * Provider component to initialize and manage local notifications
 */
export function LocalNotificationProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthUser();
  const {
    isSupported,
    permissionStatus,
    isInitialized,
  } = useLocalNotifications();

  const {
    showPrompt,
    handleDismissPrompt,
    handlePermissionGranted,
  } = useNotificationPermission();

  // Log notification status for debugging
  useEffect(() => {
    if (user) {
      console.log('🔔 Local Notification Status:', {
        supported: isSupported,
        permission: permissionStatus,
        initialized: isInitialized,
        user: user.displayName
      });
    }
  }, [user, isSupported, permissionStatus, isInitialized]);

  const handlePromptClose = () => {
    if (permissionStatus === 'granted') {
      handlePermissionGranted();
    } else {
      handleDismissPrompt();
    }
  };

  return (
    <>
      {children}
      {showPrompt && (
        <NotificationPermissionPrompt onClose={handlePromptClose} />
      )}
    </>
  );
}