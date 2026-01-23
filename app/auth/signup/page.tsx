'use client';

import { useState } from 'react';
import { Button, TextField, Label, Input, Card, Text } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: displayName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            Your account has been created. Redirecting to login...
          </Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Fitness Tracker" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
          <Text className="mt-2 text-default-500">Start tracking your fitness journey</Text>
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
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              <div className="font-semibold mb-1">⚠️ Sign Up Failed</div>
              <div>{error}</div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            isDisabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Text className="text-default-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
