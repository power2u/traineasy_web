'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button, TextField, Label, Input, Card, Text, Spinner } from '@heroui/react';
import { getAuthErrorMessage } from '@/lib/utils/auth-helpers';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading: authLoading } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Avoid hydration mismatch by waiting for mount or defaulting to safe state
  const loading = !isMounted || authLoading || submitting;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);

    try {
      await signIn('email', { email, password });
    } catch (err: any) {
      const errorMsg = getAuthErrorMessage(err);
      setLocalError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      {/* Theme Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Fitness Tracker" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          <Text className="mt-2 text-default-500">Sign in to your fitness tracker</Text>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <TextField value={email} onChange={setEmail} isRequired isDisabled={loading}>
            <Label>Email</Label>
            <Input type="email" placeholder="Enter your email" />
          </TextField>

          <TextField value={password} onChange={setPassword} isRequired isDisabled={loading}>
            <Label>Password</Label>
            <Input type="password" placeholder="Enter your password" />
          </TextField>

          <div className="text-right">
            <a
              href="/auth/forgot-password"
              className="text-sm text-blue-500 hover:text-blue-600 hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          {localError && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              <div className="font-semibold mb-1">⚠️ Login Failed</div>
              <div>{localError}</div>

            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200"
            isDisabled={loading}
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner
                  color="accent"
                  size="sm"
                  className="scale-90"
                />
                <span className="text-white text-sm font-medium animate-pulse">
                  Authenticating...
                </span>
              </div>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Google Login Removed */}
        {/* 
        <div className="mt-6 text-center text-sm">
          <Text className="text-gray-400">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-blue-500 hover:underline">
              Sign up
            </Link>
          </Text>
        </div> */}
      </Card>
    </div>
  );
}
