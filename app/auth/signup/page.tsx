'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button, TextField, Label, Input, Card, Text } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthErrorMessage } from '@/lib/utils/auth-helpers';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: displayName,
            full_name: displayName,
          },
        },
      });

      if (signUpError) {
        // Handle specific error cases
        if (signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead, or use "Continue with Google" if you signed up with Google.');
        }
        throw signUpError;
      }

      // Check if user already exists (Supabase returns user even if already exists)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('This email is already registered. Please sign in instead, or use "Continue with Google" if you signed up with Google.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      const errorMsg = getAuthErrorMessage(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      const errorMsg = getAuthErrorMessage(err);
      setError(errorMsg);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md p-8 text-center">
          <img src="/logo.png" alt="Fitness Tracker" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Account Created!</h1>
          <Text className="mt-2 text-default-500">
            Check your email to verify your account. Redirecting to login...
          </Text>
        </Card>
      </div>
    );
  }

  // Disable public signup
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Fitness Tracker" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Sign Up Disabled</h1>
          <Text className="mt-2 text-default-500">
            New user registration is currently disabled. Please contact an administrator to create an account.
          </Text>
        </div>

        <div className="space-y-4">
          <Link href="/auth/login" className="block">
            <Button variant="primary" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );

  // Original signup form (disabled)
  /*
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <Text className="mt-2 text-gray-400">Start tracking your fitness journey</Text>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <TextField value={displayName} onChange={setDisplayName} isRequired isDisabled={loading}>
            <Label>Full Name</Label>
            <Input placeholder="Enter your full name" />
          </TextField>

          <TextField value={email} onChange={setEmail} isRequired isDisabled={loading}>
            <Label>Email</Label>
            <Input type="email" placeholder="Enter your email" />
          </TextField>

          <TextField value={password} onChange={setPassword} isRequired isDisabled={loading}>
            <Label>Password</Label>
            <Input type="password" placeholder="Create a password" />
          </TextField>

          <TextField value={confirmPassword} onChange={setConfirmPassword} isRequired isDisabled={loading}>
            <Label>Confirm Password</Label>
            <Input type="password" placeholder="Confirm your password" />
          </TextField>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              <div className="font-semibold mb-1">⚠️ Sign Up Failed</div>
              <div>{error}</div>
              {error.includes('already registered') && (
                <div className="mt-3 flex flex-col gap-2">
                  <Link href="/auth/login" className="text-blue-400 hover:underline text-xs font-medium">
                    → Go to Sign In page
                  </Link>
                  <Text className="text-xs text-gray-400">
                    Or use "Continue with Google" if you signed up with Google
                  </Text>
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isDisabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-700" />
          <Text className="text-sm text-gray-400">OR</Text>
          <div className="h-px flex-1 bg-gray-700" />
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleGoogleSignup}
          isDisabled={loading}
        >
          Continue with Google
        </Button>

        <div className="mt-6 text-center text-sm">
          <Text className="text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
  */
}
