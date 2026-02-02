import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { WaterCard } from './components/water-card';
import { MealsCard } from './components/meals-card';
import { WeightCard } from './components/weight-card';
import { MembershipSection } from './components/membership-section';
import { QuickStats } from './components/quick-stats';
import { CardSkeleton, MembershipSkeleton, QuickStatsSkeleton } from './components/skeletons';
import { TestNotificationButton } from '@/components/notifications/test-notification-button';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const user = session.user;
  const userId = user.id;

  // Check if user is admin
  const isAdmin = user.role === 'super_admin';

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold md:text-3xl">
            Welcome back, {(user as any).name || user.email?.split('@')[0]}!
          </h2>
          
          {process.env.NODE_ENV === 'development' && (
            <TestNotificationButton />
          )}
        </div>

        <Suspense fallback={<MembershipSkeleton />}>
          <MembershipSection userId={userId} isAdmin={isAdmin} />
        </Suspense>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<CardSkeleton />}>
          <WaterCard userId={userId} />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <MealsCard userId={userId} />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <WeightCard userId={userId} />
        </Suspense>
      </div>

      <Suspense fallback={<QuickStatsSkeleton />}>
        <QuickStats userId={userId} />
      </Suspense>
    </>
  );
}

