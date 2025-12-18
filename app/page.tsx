'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, Spinner, Card } from '@heroui/react';
import Link from 'next/link';
import { Droplet, Utensils, Scale } from 'lucide-react';

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg"  />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <main className="flex flex-col items-center gap-8 text-center max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="flex flex-col items-center gap-6">
          <img 
            src="/logo.png" 
            alt="Fitness Tracker" 
            className="h-20 w-20 mb-2 drop-shadow-lg" 
          />
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-info bg-clip-text text-transparent">
            Fitness Tracker
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Track your water intake, meals, and weight all in one place.
            Stay healthy, stay motivated.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <Link href="/auth/signup">
            <Button 
              size="lg" 
              variant="ghost" 
              className="min-w-[140px] font-medium"
              style={{
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)'
              }}
            >
              Get Started
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button 
              size="lg" 
              variant="primary"
              className="min-w-[140px] font-medium"
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none'
              }}
            >
              Sign In
            </Button>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-3 w-full max-w-5xl">
          <Card className="group hover:scale-105 transition-transform duration-200 p-8 text-center card-enhanced">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Droplet className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Water Tracking
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Monitor your daily hydration with simple glass counting
            </p>
          </Card>

          <Card className="group hover:scale-105 transition-transform duration-200 p-8 text-center card-enhanced">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-warning/10 group-hover:bg-warning/20 transition-colors">
                <Utensils className="h-8 w-8 text-warning" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Meals Tracker
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Track your daily meals with a simple checklist
            </p>
          </Card>

          <Card className="group hover:scale-105 transition-transform duration-200 p-8 text-center card-enhanced">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-success/10 group-hover:bg-success/20 transition-colors">
                <Scale className="h-8 w-8 text-success" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">
              Weight Progress
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Log your weight weekly and visualize your progress
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
