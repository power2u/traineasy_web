'use client';

import { useAuthUser } from '@/lib/contexts/auth-context';
import { useCallback, useMemo } from 'react';
import { Button, Card, Spinner } from '@heroui/react';
import { useMealsData } from '@/lib/hooks/use-meals-data';
import { toast } from 'sonner';
import { WellnessCheckIn } from '@/components/meals/wellness-checkin';

interface TodayMeals {
  id?: string;
  date: string;
  breakfast_completed: boolean;
  breakfast_time?: string | null;
  snack1_completed: boolean;
  snack1_time?: string | null;
  lunch_completed: boolean;
  lunch_time?: string | null;
  snack2_completed: boolean;
  snack2_time?: string | null;
  dinner_completed: boolean;
  dinner_time?: string | null;
  notes?: string | null;
}

interface MealReminder {
  id: string;
  meal_type: string;
  reminder_time: string;
  is_active: boolean;
}

interface HistoryEntry {
  date: string;
  breakfast_completed: boolean;
  snack1_completed: boolean;
  lunch_completed: boolean;
  snack2_completed: boolean;
  dinner_completed: boolean;
  total_completed: number;
}

export default function MealsPage() {
  const user = useAuthUser();
  const { meals, history, isLoading, toggleMeal: toggleMealMutation, isToggling } = useMealsData(user?.id || '');

  const handleToggleMeal = useCallback((
    mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner',
    currentState: boolean
  ) => {
    try {
      toggleMealMutation({ mealType, completed: !currentState });
      const mealNames = {
        breakfast: 'Breakfast',
        snack1: 'Snack 1',
        lunch: 'Lunch',
        snack2: 'Snack 2',
        dinner: 'Dinner',
      };
      const action = !currentState ? 'completed' : 'uncompleted';
      toast.success(`${mealNames[mealType]} ${action}! 🍽️`);
    } catch (error) {
      toast.error('Failed to update meal');
      console.error('Failed to toggle meal:', error);
    }
  }, [toggleMealMutation]);

  const mealsList = useMemo(() => [
    {
      type: 'breakfast' as const,
      icon: '🌅',
      label: 'Breakfast',
      completed: meals?.breakfast_completed || false,
      time: meals?.breakfast_time,
    },
    {
      type: 'snack1' as const,
      icon: '🍎',
      label: 'Snack 1',
      completed: meals?.snack1_completed || false,
      time: meals?.snack1_time,
    },
    {
      type: 'lunch' as const,
      icon: '☀️',
      label: 'Lunch',
      completed: meals?.lunch_completed || false,
      time: meals?.lunch_time,
    },
    {
      type: 'snack2' as const,
      icon: '🍪',
      label: 'Snack 2',
      completed: meals?.snack2_completed || false,
      time: meals?.snack2_time,
    },
    {
      type: 'dinner' as const,
      icon: '🌙',
      label: 'Dinner',
      completed: meals?.dinner_completed || false,
      time: meals?.dinner_time,
    },
  ], [meals]);

  const completedCount = useMemo(() => 
    mealsList.filter((m) => m.completed).length,
    [mealsList]
  );
  
  const totalMeals = 5;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-3 md:mb-6">
        <h1 className="text-xl font-bold md:text-2xl">Meals Tracker</h1>
        <p className="text-xs text-default-500 mt-0.5 md:text-sm md:mt-1">Track your daily meals</p>
      </div>

      {/* Progress Card */}
      <Card className="p-3 mb-3 md:p-6 md:mb-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div>
            <h2 className="text-base font-semibold md:text-xl">Today's Progress</h2>
            <p className="text-xs text-default-500 mt-0.5 md:text-sm md:mt-1">
              {completedCount} of {totalMeals} meals completed
            </p>
          </div>
          <div className="text-2xl font-bold text-blue-500 md:text-4xl">
            {completedCount}/{totalMeals}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-default-200 rounded-full overflow-hidden md:h-3">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(completedCount / totalMeals) * 100}%` }}
          />
        </div>
      </Card>

      {/* Meals Checklist */}
      <Card className="p-3 mb-3 md:p-6 md:mb-6">
        <h2 className="text-base font-semibold mb-3 md:text-xl md:mb-4">Meals Checklist</h2>
        <div className="space-y-2 md:space-y-3">
          {mealsList.map((meal) => (
            <div
              key={meal.type}
              className={`flex items-center justify-between p-2.5 rounded-lg border-2 transition-all md:p-4 ${
                meal.completed
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-default-200 hover:border-default-300'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 md:gap-4">
                <div className="text-2xl md:text-3xl">{meal.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm md:text-lg">{meal.label}</div>
                  {meal.completed && meal.time && (
                    <div className="text-xs text-default-500 md:text-sm">
                      Completed at {new Date(meal.time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant={meal.completed ? 'ghost' : 'primary'}
                size="sm"
                onPress={() => handleToggleMeal(meal.type, meal.completed)}
                isDisabled={isToggling}
                className="min-w-[80px] text-xs md:min-w-[120px] md:size-lg md:text-sm"
              >
                {isToggling ? (
                  'Updating...'
                ) : meal.completed ? (
                  <>✓ Done</>
                ) : (
                  'Mark Done'
                )}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Wellness Check-In */}
      {user && <WellnessCheckIn userId={user.id} />}
    </div>
  );
}
