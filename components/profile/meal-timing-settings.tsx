'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button } from '@heroui/react';
import { getMealTimes, setMealTimes, type MealTimes } from '@/app/actions/meal-timing';
import { toast } from 'sonner';

interface MealTimingSettingsProps {
  userId: string;
}

const MEAL_CONFIG = [
  { key: 'breakfast_time', label: 'Breakfast', icon: '🌅', description: 'Morning meal' },
  { key: 'snack1_time', label: 'Snack 1', icon: '🍎', description: 'Mid-morning snack' },
  { key: 'lunch_time', label: 'Lunch', icon: '☀️', description: 'Midday meal' },
  { key: 'snack2_time', label: 'Snack 2', icon: '🍪', description: 'Afternoon snack' },
  { key: 'dinner_time', label: 'Dinner', icon: '🌙', description: 'Evening meal' },
] as const;

export function MealTimingSettings({ userId }: MealTimingSettingsProps) {
  const [mealTimes, setMealTimesState] = useState<MealTimes>({
    breakfast_time: '08:00',
    snack1_time: '10:30',
    lunch_time: '13:00',
    snack2_time: '16:00',
    dinner_time: '19:00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMealTimes();
  }, [userId]);

  const loadMealTimes = async () => {
    setIsLoading(true);
    try {
      const result = await getMealTimes(userId);
      if (result.success && result.mealTimes) {
        // Convert TIME format (HH:MM:SS) to HH:MM for input
        const times = result.mealTimes;
        setMealTimesState({
          breakfast_time: times.breakfast_time.substring(0, 5),
          snack1_time: times.snack1_time.substring(0, 5),
          lunch_time: times.lunch_time.substring(0, 5),
          snack2_time: times.snack2_time.substring(0, 5),
          dinner_time: times.dinner_time.substring(0, 5),
        });
      }
    } catch (error) {
      console.error('Failed to load meal times:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeChange = useCallback((key: keyof MealTimes, value: string) => {
    setMealTimesState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await setMealTimes(userId, mealTimes);
      if (result.success) {
        toast.success('Meal times updated successfully! 🍽️');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update meal times');
      console.error('Failed to save meal times:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-default-500">Loading meal times...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Meal Timing</h2>
        <p className="text-sm text-default-500">
          Set your preferred meal times. We'll send you reminders if you forget to log your meals.
        </p>
      </div>

      <div className="space-y-4">
        {MEAL_CONFIG.map((meal) => (
          <div 
            key={meal.key}
            className="flex items-center gap-4 p-3 rounded-lg border border-default-200"
          >
            <div className="text-2xl">{meal.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-sm">{meal.label}</div>
              <div className="text-xs text-default-500">{meal.description}</div>
            </div>
            <input
              type="time"
              value={mealTimes[meal.key]}
              onChange={(e) => handleTimeChange(meal.key, e.target.value)}
              className="w-32 px-2 py-1 text-sm bg-default-100 rounded border border-default-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          onPress={handleSave}
          isDisabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Meal Times'}
        </Button>
      </div>
    </Card>
  );
}
