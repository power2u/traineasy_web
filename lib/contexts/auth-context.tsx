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
      displayName: session.user.name || undefined,
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

        router.push('/dashboard');
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

  // Side effects for FCM and Cron sync (simplified/commented out for now or need reintegration)
  // Since we are migrating auth first, let's focus on login/logout.
  // Ideally we should call FCM setup here when user is set.
  /*
  useEffect(() => {
      if (user?.id) {
          // Re-implement FCM setup if needed
      }
  }, [user]);
  */

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
