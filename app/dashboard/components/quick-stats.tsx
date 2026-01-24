import { Card, Text } from '@heroui/react';
import { getTodayWaterCount, getWaterTarget, getTodayMeals } from '@/lib/data/cached-queries';

export async function QuickStats({ userId }: { userId: string }) {
    const [waterCountResult, waterTargetResult, mealsResult] = await Promise.all([
        getTodayWaterCount(userId),
        getWaterTarget(userId),
        getTodayMeals(userId)
    ]);

    const waterCount = waterCountResult.success ? waterCountResult.count : 0;
    const waterTarget = waterTargetResult.success ? waterTargetResult.target : 14;

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
        <Card className="mt-3 p-3 md:mt-6 md:p-6">
            <h3 className="mb-2 text-base font-semibold md:mb-4 md:text-xl">Today's Summary</h3>
            <div className="grid gap-3 sm:grid-cols-3">
                <div>
                    <Text className="text-[10px] text-muted-foreground md:text-sm">Water Goal</Text>
                    <div className="mt-0.5 text-lg font-bold md:text-2xl">{waterCount} / {waterTarget} glasses</div>
                </div>
                <div>
                    <Text className="text-[10px] text-muted-foreground md:text-sm">Meals Today</Text>
                    <div className="mt-0.5 text-lg font-bold md:text-2xl">{mealsCompleted}/5</div>
                </div>
                <div>
                    <Text className="text-[10px] text-muted-foreground md:text-sm">Completion Rate</Text>
                    <div className="mt-0.5 text-lg font-bold md:text-2xl">{Math.round((mealsCompleted / 5) * 100)}%</div>
                </div>
            </div>
        </Card>
    );
}
