'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser, AuthContextValue, AuthProvider, AuthCredentials } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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
      provider: (supabaseUser.app_metadata.provider as AuthProvider) || 'email',
      createdAt: new Date(supabaseUser.created_at),
      displayName,
      raw_app_meta_data: supabaseUser.app_metadata,
      raw_user_meta_data: supabaseUser.user_metadata,
    };
  }, []);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const mappedUser = session?.user ? mapUser(session.user) : null;
      setUser(mappedUser);
      
      // Save user data to local storage for service worker
      if (mappedUser) {
        localStorage.setItem('user_data', JSON.stringify({
          id: mappedUser.id,
          email: mappedUser.email,
          full_name: mappedUser.displayName,
        }));
      } else {
        localStorage.removeItem('user_data');
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const mappedUser = session?.user ? mapUser(session.user) : null;
      setUser(mappedUser);
      
      // Save user data to local storage for service worker
      if (mappedUser) {
        localStorage.setItem('user_data', JSON.stringify({
          id: mappedUser.id,
          email: mappedUser.email,
          full_name: mappedUser.displayName,
        }));
      } else {
        localStorage.removeItem('user_data');
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, mapUser]);

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
            // Check if user exists with this email
            const { data: users } = await supabase.auth.admin.listUsers();
            // Note: admin.listUsers() won't work from client, so we'll handle this differently
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
    } catch (err: any) {
      const errorMessage = err.message || 'Authentication failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
      throw err;
    }
  }, [router, supabase]);

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
