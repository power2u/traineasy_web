import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTodayMeals, getMealsHistory } from '@/app/actions/meals';
import { getTodayWellnessCheckIn } from '@/app/actions/wellness';
import { MealsClient } from './meals-client';

export default async function MealsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const userId = (session.user as any).id;

  // Parallel data fetching
  const [mealsResult, historyResult, wellnessResult] = await Promise.all([
    getTodayMeals(userId),
    getMealsHistory(userId, 7),
    getTodayWellnessCheckIn(userId)
  ]);

  const initialData = {
    meals: mealsResult.success ? mealsResult.meals : null,
    history: historyResult.success && historyResult.history ? historyResult.history : [],
    wellnessCheckIn: wellnessResult.success && wellnessResult.checkIn ? wellnessResult.checkIn : null,
  };

  return <MealsClient userId={userId} initialData={initialData} />;
}
