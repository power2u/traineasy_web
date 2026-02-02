'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TopBar } from './top-bar';
import { MotivationMarquee } from '@/components/ui/motivation-marquee';
import { MealTimingDialog } from '@/components/onboarding/meal-timing-dialog';
import { useMealTimingOnboarding } from '@/lib/hooks/use-meal-timing-onboarding';
import { useAuthUser } from '@/lib/contexts/auth-context';
import { ForcePasswordChange } from '@/components/auth/force-password-change';

interface AppShellProps {
  children: React.ReactNode;
}

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const user = useAuthUser();
  const { showDialog, handleComplete } = useMealTimingOnboarding(user?.id);

  // Only render on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Motivation Marquee - Above everything */}
          <MotivationMarquee />

          {/* Mobile Top Bar */}
          <TopBar />

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </div>
      </div>

      {/* Meal Timing Onboarding Dialog */}
      <MealTimingDialog isOpen={showDialog} onComplete={handleComplete} />

      {/* Force Password Change Dialog */}
      <ForcePasswordChange />
    </>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Don't show app shell on auth pages or landing page
  const isAuthPage = pathname?.startsWith('/auth') || pathname === '/';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <AuthenticatedContent>{children}</AuthenticatedContent>;
}
