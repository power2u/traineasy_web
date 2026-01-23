import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTodayWaterCount, getAllWaterEntries, getWaterTarget } from '@/app/actions/water';
import { WaterClient } from './water-client';

export default async function WaterPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const userId = (session.user as any).id;

  // Parallel data fetching
  const [countResult, entriesResult, targetResult] = await Promise.all([
    getTodayWaterCount(userId),
    getAllWaterEntries(userId),
    getWaterTarget(userId)
  ]);

  const initialData = {
    count: countResult.success ? countResult.count : 0,
    entries: entriesResult.success && entriesResult.entries ? entriesResult.entries : [],
    target: targetResult.success ? targetResult.target : 14,
  };

  return (
    <>
      <h1 className="text-xl font-bold mb-3 md:text-2xl md:mb-6">Water Tracking</h1>
      <WaterClient userId={userId} initialData={initialData} />
    </>
  );
}
