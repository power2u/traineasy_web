'use client';

import { useEffect } from 'react';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';
import { useNotificationPermission } from '@/lib/hooks/use-notification-permission';
import { useMealScheduler } from '@/lib/hooks/use-meal-scheduler';
import { useAuthUser } from '@/lib/contexts/auth-context';
import { NotificationPermissionPrompt } from './notification-permission-prompt';
import { waterScheduler } from '@/lib/notifications/water-scheduler';

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

  // Initialize meal scheduler
  const { hasPermission } = useMealScheduler();

  // Initialize water scheduler when user logs in
  useEffect(() => {
    if (user?.id && hasPermission) {
      waterScheduler.initialize(user);
    } else if (!user) {
      waterScheduler.stop();
    }
  }, [user, hasPermission]);

  // Log notification status for debugging
  useEffect(() => {
    if (user) {
      console.log('🔔 Notification Status:', {
        supported: isSupported,
        permission: permissionStatus,
        initialized: isInitialized,
        user: user.displayName
      });
    }
  }, [user, isSupported, permissionStatus, isInitialized, hasPermission]);

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