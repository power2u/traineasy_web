import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { EnableNotificationsButton } from '@/components/settings/enable-notifications-button';
import { WaterCard } from './components/water-card';
import { MealsCard } from './components/meals-card';
import { WeightCard } from './components/weight-card';
import { MembershipSection } from './components/membership-section';
import { QuickStats } from './components/quick-stats';
import { CardSkeleton, MembershipSkeleton, QuickStatsSkeleton } from './components/skeletons';

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
        <h2 className="text-xl font-bold md:text-3xl">
          Welcome back, {(user as any).name || user.email?.split('@')[0]}!
        </h2>

        <Suspense fallback={<MembershipSkeleton />}>
          <MembershipSection userId={userId} isAdmin={isAdmin} />
        </Suspense>
      </div>

      <EnableNotificationsButton />

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

