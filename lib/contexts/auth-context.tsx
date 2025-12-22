'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser, AuthContextValue, AuthProvider, AuthCredentials } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { requestNotificationPermission, saveFCMToken, removeFCMToken } from '@/lib/firebase/messaging';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Cache for auth state to prevent excessive requests
let authCache: {
  user: AuthUser | null;
  timestamp: number;
  loading: boolean;
} = {
  user: null,
  timestamp: 0,
  loading: true
};

const CACHE_DURATION = 30 * 1000; // 30 seconds cache
const FCM_SETUP_DELAY = 2000; // 2 seconds delay for FCM setup

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(authCache.user);
  const [loading, setLoading] = useState(authCache.loading);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fcmSetupRef = useRef<boolean>(false);
  const authCheckRef = useRef<boolean>(false);

  const mapUser = useCallback((supabaseUser: User): AuthUser => {
    // Extract display name from user metadata (Google OAuth provides this)
    const displayName =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split('@')[0] ||
      'User';

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      phone: supabaseUser.phone,
      banned_until: (supabaseUser as { banned_until?: string }).banned_until,
      provider: (supabaseUser.app_metadata.provider as AuthProvider) || 'email',
      createdAt: new Date(supabaseUser.created_at),
      displayName,
      raw_app_meta_data: supabaseUser.app_metadata,
      raw_user_meta_data: supabaseUser.user_metadata,
    };
  }, []);

  const updateAuthCache = useCallback((newUser: AuthUser | null, isLoading: boolean = false) => {
    authCache = {
      user: newUser,
      timestamp: Date.now(),
      loading: isLoading
    };
    setUser(newUser);
    setLoading(isLoading);
  }, []);

  const setupFCMToken = useCallback(async (userId: string) => {
    if (fcmSetupRef.current) return; // Prevent duplicate FCM setup
    fcmSetupRef.current = true;

    try {
      const token = await requestNotificationPermission();
      if (token) {
        await saveFCMToken(userId, token);
        console.log('FCM token saved successfully');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('FCM token setup skipped:', errorMessage);
    } finally {
      // Reset flag after delay to allow retry if needed
      setTimeout(() => {
        fcmSetupRef.current = false;
      }, FCM_SETUP_DELAY * 2);
    }
  }, []);

  const registerUserCronJobs = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/cron/sync-on-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.synced) {
          console.log('Cron jobs synced on login:', result.message);
        } else {
          console.log('Cron jobs up to date:', result.message);
        }
      } else {
        console.warn('Failed to sync cron jobs:', response.statusText);
      }
    } catch (error) {
      console.warn('Error syncing cron jobs:', error);
    }
  }, []);

  const handleUserUpdate = useCallback((supabaseUser: User | null) => {
    if (!supabaseUser) {
      updateAuthCache(null, false);
      localStorage.removeItem('user_data');
      return;
    }

    const mappedUser = mapUser(supabaseUser);

    // Check if user is banned
    if (mappedUser?.banned_until) {
      if (new Date(mappedUser.banned_until) > new Date()) {
        console.log('User is banned, signing out...');
        supabase.auth.signOut().then(() => {
          updateAuthCache(null, false);
          router.push('/auth/login?error=account_disabled');
        });
        return;
      }
    }

    updateAuthCache(mappedUser, false);

    // Save user data to local storage for service worker
    localStorage.setItem('user_data', JSON.stringify({
      id: mappedUser.id,
      email: mappedUser.email,
      full_name: mappedUser.displayName,
    }));

    // Setup FCM token with delay (async, non-blocking)
    setTimeout(() => {
      setupFCMToken(mappedUser.id);
    }, FCM_SETUP_DELAY);

    // Register cron jobs for new users (async, non-blocking)
    setTimeout(() => {
      registerUserCronJobs(mappedUser.id);
    }, FCM_SETUP_DELAY + 1000);
  }, [mapUser, updateAuthCache, setupFCMToken, registerUserCronJobs, supabase, router]);

  useEffect(() => {
    // Check if we have recent cached auth state
    const now = Date.now();
    if (authCache.timestamp && (now - authCache.timestamp) < CACHE_DURATION && !authCache.loading) {
      setUser(authCache.user);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous auth checks
    if (authCheckRef.current) return;
    authCheckRef.current = true;

    // Check active session with getUser to ensure fresh data (including banned status)
    supabase.auth.getUser().then(({ data: { user }, error }: { data: { user: User | null }, error: Error | null }) => {
      authCheckRef.current = false;
      
      if (error || !user) {
        updateAuthCache(null, false);
        return;
      }

      handleUserUpdate(user);
    }).catch(() => {
      authCheckRef.current = false;
      updateAuthCache(null, false);
    });

    // Listen for auth changes (debounced)
    let authChangeTimeout: NodeJS.Timeout;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: { user: User | null } | null) => {
      // Debounce auth state changes to prevent rapid fire requests
      clearTimeout(authChangeTimeout);
      authChangeTimeout = setTimeout(() => {
        console.log('Auth state changed:', event);
        handleUserUpdate(session?.user || null);
      }, 100);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(authChangeTimeout);
    };
  }, [supabase, handleUserUpdate, updateAuthCache]);

  const signIn = useCallback(async (provider: AuthProvider, credentials: AuthCredentials) => {
    try {
      setError(null);
      setLoading(true);

      if (provider === 'email' && credentials.email && credentials.password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) {
          // Check if user exists but signed up with different provider
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. If you signed up with Google, please use "Continue with Google" instead.');
          }
          throw error;
        }
      } else if (provider === 'phone' && credentials.phone && credentials.code) {
        const { error } = await supabase.auth.verifyOtp({
          phone: credentials.phone,
          token: credentials.code,
          type: 'sms',
        });
        if (error) throw error;
      } else if (provider === 'google') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      
      // Remove ALL FCM tokens from database (complete logout)
      if (user) {
        await removeFCMToken(user.id, true).catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error('Failed to remove FCM token:', errorMessage);
        });
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    }
  }, [user, router, supabase]);

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

// Optimized hook for components that only need user ID
export function useAuthUser() {
  const { user } = useAuth();
  return useMemo(() => user, [user]); // Simplified dependency
}

// Optimized hook for components that only need loading state
export function useAuthLoading() {
  const { loading } = useAuth();
  return loading;
}

// Optimized hook for components that only need auth status
export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;
  return useMemo(() => ({ 
    isAuthenticated, 
    loading 
  }), [isAuthenticated, loading]);
}
