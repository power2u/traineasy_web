'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, Spinner } from '@heroui/react';
import Link from 'next/link';
import { Dumbbell, Droplet, Utensils, Scale } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center gap-8 text-center">
        <img src="/logo.png" alt="Fitness Tracker" className="h-20 w-20 mb-4" />
        <h1 className="text-5xl font-bold">Fitness Tracker</h1>
        <p className="text-xl text-gray-400 max-w-2xl">
          Track your water intake, meals, and weight all in one place.
          Stay healthy, stay motivated.
        </p>
        <div className="flex gap-4 mt-4">
          <Link href="/auth/signup">
            <Button variant='tertiary' >
              Get Started
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button variant='primary' className="bg-blue-600" >
              Sign In
            </Button>
          </Link>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3 max-w-4xl">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <Droplet className="h-8 w-8 mb-3 text-blue-400" />
            <h3 className="text-lg font-semibold mb-2">Water Tracking</h3>
            <p className="text-sm text-gray-400">
              Monitor your daily hydration with simple glass counting
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <Utensils className="h-8 w-8 mb-3 text-orange-400" />
            <h3 className="text-lg font-semibold mb-2">Meals Tracker</h3>
            <p className="text-sm text-gray-400">
              Track your daily meals with a simple checklist
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <Scale className="h-8 w-8 mb-3 text-green-400" />
            <h3 className="text-lg font-semibold mb-2">Weight Progress</h3>
            <p className="text-sm text-gray-400">
              Log your weight weekly and visualize your progress
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
