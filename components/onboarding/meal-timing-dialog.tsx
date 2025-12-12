'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button, Select, Label, Description, ListBox } from '@heroui/react';
import { Clock, Globe, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { COMMON_TIMEZONES } from '@/lib/utils/timezone';
import { useTheme } from '@/lib/contexts/theme-context';

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
  timezone: string;
  theme?: 'light' | 'dark' | 'system';
}

const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast_time: '08:00',
  snack1_time: '10:30',
  lunch_time: '13:00',
  snack2_time: '16:00',
  dinner_time: '19:00',
  timezone: 'Asia/Kolkata', // Default to India
  theme: 'dark', // Default to dark theme
};

const THEME_OPTIONS = [
  { value: 'light', label: '☀️ Light Mode', description: 'Clean and bright interface' },
  { value: 'dark', label: '🌙 Dark Mode', description: 'Easy on the eyes' },
  { value: 'system', label: '🔄 System', description: 'Follow device settings' },
] as const;

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
  const { theme: currentTheme } = useTheme();

  // Auto-detect user's timezone and current theme on component mount
  useEffect(() => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[MealTimingDialog] Detected timezone:', detectedTimezone);
      
      // Check if detected timezone is in our common list, otherwise default to Asia/Kolkata
      const isSupported = COMMON_TIMEZONES.some(tz => tz.value === detectedTimezone);
      const timezone = isSupported ? detectedTimezone : 'Asia/Kolkata';
      
      setMealTimes(prev => ({ 
        ...prev, 
        timezone,
        theme: currentTheme // Use current theme as default
      }));
    } catch (error) {
      console.warn('[MealTimingDialog] Failed to detect timezone:', error);
    }
  }, [currentTheme]);

  const handleTimeChange = useCallback((key: keyof MealTimes, value: string) => {
    setMealTimes(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleTimezoneChange = useCallback((timezone: string) => {
    setMealTimes(prev => ({ ...prev, timezone }));
  }, []);

  const handleThemeChange = useCallback((theme: 'light' | 'dark' | 'system') => {
    setMealTimes(prev => ({ ...prev, theme }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      console.log('[MealTimingDialog] Submitting meal times with timezone and theme:', mealTimes);
      await onComplete(mealTimes);
      console.log('[MealTimingDialog] onComplete finished successfully');
      toast.success('Settings saved! We\'ll remind you at the right time 🍽️');
    } catch (error) {
      toast.error('Failed to save settings. Please try a again.');
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
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border border-divider rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <h2 className="text-2xl font-bold">Welcome! 🎉</h2>
            <p className="text-sm text-default-500">
              Let's personalize your experience with meal schedules, timezone, and theme preferences
            </p>
          </div>
        
        {/* Body */}
        <div className="space-y-4">
            {/* Info Card */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1 text-foreground">Why meal times?</h3>
                  <p className="text-xs text-foreground/70">
                    We'll send you a gentle reminder if you forget to mark your meal as completed. 
                    This helps you stay on track with your nutrition goals!
                  </p>
                </div>
              </div>
            </div>

            {/* Timezone Selection */}
            <div className="space-y-2">
              <Select
                defaultSelectedKey={mealTimes.timezone}
                onSelectionChange={(key) => {
                  if (key) handleTimezoneChange(key as string);
                }}
              >
                <Label className="text-sm font-medium text-foreground">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Your Timezone
                </Label>
                <Select.Trigger className="w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Description className="text-xs text-foreground/60">
                  This ensures you get reminders at the right time in your local timezone.
                </Description>
                <Select.Popover className="max-h-60 overflow-y-auto">
                  <ListBox>
                    {COMMON_TIMEZONES.map((tz) => (
                      <ListBox.Item key={tz.value} id={tz.value}>
                        <Label>{tz.label}</Label>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Theme Selection */}
            <div className="space-y-2">
              <Select
                defaultSelectedKey={mealTimes.theme || 'dark'}
                onSelectionChange={(key) => {
                  if (key) handleThemeChange(key as 'light' | 'dark' | 'system');
                }}
              >
                <Label className="text-sm font-medium text-foreground">
                  <Palette className="w-4 h-4 inline mr-2" />
                  App Theme
                </Label>
                <Select.Trigger className="w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Description className="text-xs text-foreground/60">
                  Choose your preferred appearance for the app.
                </Description>
                <Select.Popover>
                  <ListBox>
                    {THEME_OPTIONS.map((themeOption) => (
                      <ListBox.Item key={themeOption.value} id={themeOption.value}>
                        <Label>{themeOption.label}</Label>
                        <Description className="text-xs text-foreground/60">
                          {themeOption.description}
                        </Description>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Meal Time Inputs */}
            <div className="space-y-3">
              {MEAL_CONFIG.map((meal) => (
                <div 
                  key={meal.key}
                  className="flex items-center gap-3 p-4 rounded-lg border-2 border-divider hover:border-primary/50 transition-colors bg-content1"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <span className="text-2xl">{meal.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground">{meal.label}</div>
                    <div className="text-xs text-foreground/60 truncate">{meal.description}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-content2 rounded-lg px-3 py-2 border border-divider">
                    <Clock className="w-4 h-4 text-foreground/60" />
                    <input
                      type="time"
                      value={mealTimes[meal.key]}
                      onChange={(e) => handleTimeChange(meal.key, e.target.value)}
                      className="w-20 text-sm font-medium bg-transparent text-foreground border-none outline-none focus:ring-0"
                    />
                  </div>
                </div>
              ))}
            </div>

          {/* Footer Note */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="text-lg">⏰</div>
              <div className="flex-1">
                <p className="text-xs text-foreground/70">
                  You can always change these times later in your profile settings.
                </p>
              </div>
            </div>
          </div>
        </div>
        
          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-divider">
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
