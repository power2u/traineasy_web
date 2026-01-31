import Link from 'next/link';
import { Utensils } from 'lucide-react';
import { getTodayMeals } from '@/lib/data/cached-queries';

export async function MealsCard({ userId }: { userId: string }) {
    const mealsResult = await getTodayMeals(userId);

    let mealsCompleted = 0;
    if (mealsResult.success && mealsResult.meals) {
        const meals = mealsResult.meals;
        mealsCompleted =
            (meals.breakfast_completed ? 1 : 0) +
            (meals.snack1_completed ? 1 : 0) +
            (meals.lunch_completed ? 1 : 0) +
            (meals.snack2_completed ? 1 : 0) +
            (meals.dinner_completed ? 1 : 0);
    }

    return (
        <div className="p-3 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between md:mb-4">
                <h3 className="text-base font-semibold md:text-xl">Meals</h3>
                <Utensils className="h-6 w-6 text-orange-400 md:h-8 md:w-8" />
            </div>
            <div className="mb-3 md:mb-4">
                <div className="text-2xl font-bold md:text-4xl">{mealsCompleted}/5</div>
                <span className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">meals completed</span>
            </div>
            <Link href="/meals" className="block w-full">
                <div className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors md:text-base">
                    Track Meals
                </div>
            </Link>
        </div>
    );
}
