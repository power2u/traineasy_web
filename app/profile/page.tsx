import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProfile, getActivePlan } from '@/app/actions/profile';
import { ProfileClient } from './profile-client';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const userId = (session.user as any).id;

  // Parallel data fetching
  const [profileResult, planResult] = await Promise.all([
    getProfile(userId),
    getActivePlan(userId),
  ]);

  const initialProfile = profileResult.success && profileResult.profile ? profileResult.profile : null;
  const initialPlan = planResult.success && planResult.plan ? planResult.plan : null;

  return <ProfileClient initialProfile={initialProfile} initialPlan={initialPlan} />;
}
