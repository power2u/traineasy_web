import { Card, Button, Text } from '@heroui/react';
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
        <Card className="p-3 md:p-6">
            <div className="mb-2 flex items-center justify-between md:mb-4">
                <h3 className="text-base font-semibold md:text-xl">Meals</h3>
                <Utensils className="h-6 w-6 text-orange-400 md:h-8 md:w-8" />
            </div>
            <div className="mb-3 md:mb-4">
                <div className="text-2xl font-bold md:text-4xl">{mealsCompleted}/5</div>
                <Text className="text-xs text-muted-foreground md:text-sm">meals completed</Text>
            </div>
            <Link href="/meals">
                <Button variant="primary" size="sm" className="w-full md:text-base">
                    Track Meals
                </Button>
            </Link>
        </Card>
    );
}
