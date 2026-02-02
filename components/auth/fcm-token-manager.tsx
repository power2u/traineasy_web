'use client';

import { useEffect } from 'react';
import { useFCMTokenRefresh } from '@/lib/hooks/use-fcm-token-refresh';
import { useAuth } from '@/lib/contexts/auth-context';

/**
 * Component that manages FCM token refresh for authenticated users
 * This component should be placed inside the AuthProvider context
 */
export function FCMTokenManager() {
  const { user } = useAuth();
  
  // Only use the FCM token refresh hook if user is authenticated
  useFCMTokenRefresh();

  return null; // This component doesn't render anything
}