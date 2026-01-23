import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getWeightLogs, checkCanLogToday, getWeightStatistics } from '@/app/actions/weight';
import { getProfile } from '@/app/actions/profile';
import { WeightClient } from './weight-client';

export default async function WeightPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const userId = (session.user as any).id;

  // Parallel data fetching
  const [logsResult, canLogResult, statsResult, profileResult] = await Promise.all([
    getWeightLogs(userId, 30),
    checkCanLogToday(userId),
    getWeightStatistics(userId),
    getProfile(userId)
  ]);

  // Transform logs to match exact type if needed (dates are typically Date objects in server action response, but props might expect Date)
  // The server action returns Date objects, so we are good.

  const initialLogs = logsResult.success && logsResult.logs ? logsResult.logs : [];
  const canLogToday = canLogResult.success && canLogResult.canLog !== undefined ? canLogResult.canLog : true;
  const weeklyAverage = statsResult.success ? statsResult.weeklyAverage : null;
  const monthlyAverage = statsResult.success ? statsResult.monthlyAverage : null;
  const preferences = profileResult.success ? profileResult.profile : null;

  return (
    <WeightClient
      userId={userId}
      initialLogs={initialLogs}
      canLogToday={canLogToday}
      weeklyAverage={weeklyAverage}
      monthlyAverage={monthlyAverage}
      preferences={preferences}
    />
  );
}
