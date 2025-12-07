'use client';

import { useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

interface MealTimingDialogProps {
  isOpen: boolean;
  onComplete: (mealTimes: MealTimes) => Promise<void>;
}

export interface MealTimes {
  breakfast_time: string;
  snack1_time: string;
  lunch_time: string;
  snack2_time: string;
  dinner_time: string;
}

const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast_time: '08:00',
  snack1_time: '10:30',
  lunch_time: '13:00',
  snack2_time: '16:00',
  dinner_time: '19:00',
};

const MEAL_CONFIG = [
  { key: 'breakfast_time', label: 'Breakfast', icon: '🌅', description: 'Start your day right' },
  { key: 'snack1_time', label: 'Snack 1', icon: '🍎', description: 'Mid-morning snack' },
  { key: 'lunch_time', label: 'Lunch', icon: '☀️', description: 'Midday meal' },
  { key: 'snack2_time', label: 'Snack 2', icon: '🍪', description: 'Afternoon snack' },
  { key: 'dinner_time', label: 'Dinner', icon: '🌙', description: 'Evening meal' },
] as const;

export function MealTimingDialog({ isOpen, onComplete }: MealTimingDialogProps) {
  const [mealTimes, setMealTimes] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTimeChange = useCallback((key: keyof MealTimes, value: string) => {
    setMealTimes(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      console.log('[MealTimingDialog] Submitting meal times...');
      await onComplete(mealTimes);
      console.log('[MealTimingDialog] onComplete finished successfully');
      toast.success('Meal times saved! We\'ll remind you if you forget to log your meals 🍽️');
    } catch (error) {
      toast.error('Failed to save meal times. Please try again.');
      console.error('[MealTimingDialog] Failed to save meal times:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [mealTimes, onComplete]);

  console.log('[MealTimingDialog] Render - isOpen:', isOpen);
  
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-content1 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <h2 className="text-2xl font-bold">Welcome! 🎉</h2>
            <p className="text-sm text-default-500">
              Let's set up your meal schedule so we can send you helpful reminders
            </p>
          </div>
        
        {/* Body */}
        <div className="space-y-4">
            {/* Info Card */}
            <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Why meal times?</h3>
                  <p className="text-xs text-default-600">
                    We'll send you a gentle reminder if you forget to mark your meal as completed. 
                    This helps you stay on track with your nutrition goals!
                  </p>
                </div>
              </div>
            </div>

            {/* Meal Time Inputs */}
            <div className="space-y-3">
              {MEAL_CONFIG.map((meal) => (
                <div 
                  key={meal.key}
                  className="flex items-center gap-3 p-4 rounded-lg border-2 border-default-200 dark:border-default-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors bg-default-50 dark:bg-default-100/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800">
                    <span className="text-2xl">{meal.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{meal.label}</div>
                    <div className="text-xs text-default-500 truncate">{meal.description}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-content2 rounded-lg px-3 py-2 border border-default-300 dark:border-default-700">
                    <Clock className="w-4 h-4 text-default-500" />
                    <input
                      type="time"
                      value={mealTimes[meal.key]}
                      onChange={(e) => handleTimeChange(meal.key, e.target.value)}
                      className="w-20 text-sm font-medium bg-transparent text-foreground border-none outline-none focus:ring-0 [color-scheme:dark]"
                    />
                  </div>
                </div>
              ))}
            </div>

          {/* Footer Note */}
          <div className="bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="text-lg">⏰</div>
              <div className="flex-1">
                <p className="text-xs text-default-600">
                  You can always change these times later in your profile settings.
                </p>
              </div>
            </div>
          </div>
        </div>
        
          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-default-200">
            <Button
              variant="primary"
              size="lg"
              onPress={handleSubmit}
              isDisabled={isSubmitting}
              className="w-full font-semibold"
            >
              {isSubmitting ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
