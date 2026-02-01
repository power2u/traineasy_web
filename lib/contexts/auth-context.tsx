'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import type { AuthUser, AuthContextValue, AuthProvider as AppAuthProvider, AuthCredentials } from '@/lib/types';

// Define context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Map session to AuthUser
  const user: AuthUser | null = useMemo(() => {
    if (!session?.user) return null;
    return {
      id: (session.user as any).id || '', // id is added in jwt callback
      email: session.user.email || undefined,
      provider: 'email', // Default to email as we are using credentials
      createdAt: new Date(), // NextAuth doesn't provide this by default, would need to fetch
      displayName: session.user.name || undefined, // Use name from session
      name: (session.user as any).name || undefined, // Also provide name property (with type assertion)
      role: (session.user as any).role,
    };
  }, [session]);

  const signIn = useCallback(async (provider: AppAuthProvider, credentials: AuthCredentials) => {
    try {
      setError(null);

      if (provider === 'email' && credentials.email && credentials.password) {
        const result = await nextAuthSignIn('credentials', {
          email: credentials.email,
          password: credentials.password,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        window.location.href = '/dashboard';
      } else {
        throw new Error('Only email/password login is supported in this migration.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      throw err;
    }
  }, [router]);

  const signOut = useCallback(async () => {
    try {
      await nextAuthSignOut({ redirect: true, callbackUrl: '/auth/login' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Simple FCM token registration on login (for admin notifications only)
  useEffect(() => {
    if (user?.id) {
      const registerFCMToken = async () => {
        try {
          // Only register FCM token if user already has notification permission
          // Don't prompt for permission here - let the modal system handle it
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const { requestNotificationPermission, saveFCMToken } = await import('@/lib/firebase/messaging');
            const token = await requestNotificationPermission();
            if (token) {
              await saveFCMToken(user.id, token);
              console.log('✅ FCM token registered for admin notifications');
            }
          }
        } catch (error) {
          console.warn('FCM token registration failed (this is normal):', error);
        }
      };

      // Register FCM token after login (only if permission already granted)
      setTimeout(registerFCMToken, 2000);
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signOut,
    error,
  }), [user, loading, signIn, signOut, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthUser() {
  const { user } = useAuth();
  return useMemo(() => user, [user]);
}

export function useAuthLoading() {
  const { loading } = useAuth();
  return loading;
}

export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;
  return useMemo(() => ({
    isAuthenticated,
    loading
  }), [isAuthenticated, loading]);
}
