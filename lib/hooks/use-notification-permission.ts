import { useState, useEffect, useCallback } from 'react';
import { useLocalNotifications } from './use-local-notifications';
import { useAuthUser } from '@/lib/contexts/auth-context';

/**
 * Hook to manage notification permission prompt state
 */
export function useNotificationPermission() {
  const user = useAuthUser();
  const { isSupported, permissionStatus } = useLocalNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);

  // Check if we should show the permission prompt
  const shouldShowPrompt = useCallback(() => {
    if (!user || !isSupported || hasShownPrompt) return false;
    if (permissionStatus !== 'default') return false;
    
    // Check if user has dismissed the prompt recently (within 24 hours)
    const dismissedKey = `notification-prompt-dismissed-${user.id}`;
    const dismissedTime = localStorage.getItem(dismissedKey);
    
    if (dismissedTime) {
      const dismissedAt = new Date(dismissedTime);
      const now = new Date();
      const hoursSinceDismissed = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60);
      
      // Don't show again for 24 hours
      if (hoursSinceDismissed < 24) {
        return false;
      }
    }
    
    return true;
  }, [user, isSupported, permissionStatus, hasShownPrompt]);

  // Show prompt after user has been active for a bit
  useEffect(() => {
    if (shouldShowPrompt()) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
        setHasShownPrompt(true);
      }, 5000); // Wait 5 seconds after login
      
      return () => clearTimeout(timer);
    }
  }, [shouldShowPrompt]);

  // Handle prompt dismissal
  const handleDismissPrompt = useCallback(() => {
    setShowPrompt(false);
    
    if (user) {
      // Remember that user dismissed the prompt
      const dismissedKey = `notification-prompt-dismissed-${user.id}`;
      localStorage.setItem(dismissedKey, new Date().toISOString());
    }
  }, [user]);

  // Handle permission granted
  const handlePermissionGranted = useCallback(() => {
    setShowPrompt(false);
    
    if (user) {
      // Clear the dismissed flag since user granted permission
      const dismissedKey = `notification-prompt-dismissed-${user.id}`;
      localStorage.removeItem(dismissedKey);
    }
  }, [user]);

  // Manually trigger the prompt (for settings page, etc.)
  const triggerPrompt = useCallback(() => {
    if (isSupported && permissionStatus === 'default') {
      setShowPrompt(true);
      setHasShownPrompt(true);
    }
  }, [isSupported, permissionStatus]);

  return {
    showPrompt,
    shouldShowPrompt: shouldShowPrompt(),
    canShowPrompt: isSupported && permissionStatus === 'default',
    permissionStatus,
    isSupported,
    handleDismissPrompt,
    handlePermissionGranted,
    triggerPrompt,
  };
}