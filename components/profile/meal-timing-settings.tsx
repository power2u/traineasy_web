'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button, Select, Label, Description, ListBox, Card } from '@heroui/react';
import { Clock, Settings, Edit3, X } from 'lucide-react';
import { toast } from 'sonner';
import { COMMON_TIMEZONES } from '@/lib/utils/timezone';
import { useTheme } from '@/lib/contexts/theme-context';

interface MealTimingSettingsProps {
  userId: string;
  initialMealTimes?: MealTimes | null;
  onSave?: (mealTimes: MealTimes) => Promise<void>;
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
  timezone: 'Asia/Kolkata',
  theme: 'dark',
};

const THEME_OPTIONS = [
  { value: 'light', label: '☀️ Light Mode', description: 'Clean and bright interface' },
  { value: 'dark', label: '🌙 Dark Mode', description: 'Easy on the eyes' },
  { value: 'system', label: '🔄 System', description: 'Follow device settings' },
] as const;

const MEAL_CONFIG = [
  { key: 'breakfast_time', label: 'Breakfast', icon: '🌅', description: 'Start your day right' },
  { key: 'snack1_time', label: 'Morning Snack', icon: '🍎', description: 'Mid-morning energy boost' },
  { key: 'lunch_time', label: 'Lunch', icon: '☀️', description: 'Midday meal' },
  { key: 'snack2_time', label: 'Afternoon Snack', icon: '🍪', description: 'Afternoon fuel' },
  { key: 'dinner_time', label: 'Dinner', icon: '🌙', description: 'Evening meal' },
] as const;

export function MealTimingSettings({ userId, initialMealTimes, onSave }: MealTimingSettingsProps) {
  const [mealTimes, setMealTimes] = useState<MealTimes>(initialMealTimes || DEFAULT_MEAL_TIMES);
  const [editingMealTimes, setEditingMealTimes] = useState<MealTimes>(initialMealTimes || DEFAULT_MEAL_TIMES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { theme: currentTheme } = useTheme();

  // Initialize with current data or defaults
  useEffect(() => {
    if (initialMealTimes) {
      setMealTimes(initialMealTimes);
      setEditingMealTimes(initialMealTimes);
    } else {
      // Auto-detect timezone if no initial data
      try {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isSupported = COMMON_TIMEZONES.some(tz => tz.value === detectedTimezone);
        const timezone = isSupported ? detectedTimezone : 'Asia/Kolkata';

        const themeValue = ((currentTheme === 'light' || currentTheme === 'dark' || currentTheme === 'system') ? currentTheme : 'dark') as 'light' | 'dark' | 'system';

        const defaultTimes = {
          ...DEFAULT_MEAL_TIMES,
          timezone,
          theme: themeValue
        };

        setMealTimes(defaultTimes);
        setEditingMealTimes(defaultTimes);
      } catch (error) {
        console.warn('[MealTimingSettings] Failed to detect timezone:', error);
      }
    }
  }, [initialMealTimes, currentTheme]);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(mealTimes) !== JSON.stringify(editingMealTimes);
    setHasUnsavedChanges(hasChanges);
  }, [mealTimes, editingMealTimes]);

  const handleTimeChange = useCallback((key: keyof MealTimes, value: string) => {
    setEditingMealTimes(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleTimezoneChange = useCallback((timezone: string) => {
    setEditingMealTimes(prev => ({ ...prev, timezone }));
  }, []);

  const handleThemeChange = useCallback((theme: 'light' | 'dark' | 'system') => {
    setEditingMealTimes(prev => ({ ...prev, theme }));
  }, []);

  const handleOpenDialog = useCallback(() => {
    setEditingMealTimes(mealTimes); // Reset editing state to current saved state
    setIsDialogOpen(true);
  }, [mealTimes]);

  const handleCloseDialog = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close without saving?');
      if (!confirmClose) return;
    }
    setIsDialogOpen(false);
    setEditingMealTimes(mealTimes); // Reset to saved state
  }, [hasUnsavedChanges, mealTimes]);

  const handleSave = useCallback(async () => {
    setIsSubmitting(true);
    try {
      console.log('[MealTimingSettings] Saving meal times:', editingMealTimes);

      if (onSave) {
        await onSave(editingMealTimes);
      }

      // Update the main state with saved values
      setMealTimes(editingMealTimes);
      setIsDialogOpen(false);

      toast.success('Meal timing settings saved successfully! 🍽️');
    } catch (error) {
      toast.error('Failed to save settings. Please try again.');
      console.error('[MealTimingSettings] Failed to save meal times:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingMealTimes, onSave]);

  const handleReset = useCallback(() => {
    const confirmReset = window.confirm('Are you sure you want to reset all settings to defaults?');
    if (confirmReset) {
      setEditingMealTimes(DEFAULT_MEAL_TIMES);
      toast.info('Settings reset to defaults');
    }
  }, []);

  return (
    <>
      {/* Summary Card */}
      <Card className="p-3 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Meal Timing & Preferences</h2>
              <p className="text-sm text-default-500">
                Manage your meal schedules and notification preferences
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onPress={handleOpenDialog}
            className="min-w-0 flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Button>
        </div>

        {/* Current Settings Summary */}
        <div className="space-y-3">
          {/* Timezone and Theme display removed */}
          <div className="flex flex-wrap gap-2 mt-3">
            {MEAL_CONFIG.map((meal) => (
              <div key={meal.key} className="flex items-center gap-1 px-2 py-1 bg-content2 rounded-md text-xs">
                <span>{meal.icon}</span>
                <span className="font-medium">{mealTimes[meal.key]}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      {isDialogOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={handleCloseDialog} />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-divider rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Edit Meal Timing Settings</h2>
                  <p className="text-sm text-default-500 mt-1">
                    Customize your meal schedules, timezone, and theme preferences
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleCloseDialog}
                  className="min-w-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Dialog Body */}
              <div className="space-y-6">
                {/* Info Card */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1 text-foreground">About meal reminders</h3>
                      <p className="text-xs text-foreground/70">
                        We'll send you gentle reminders if you forget to mark your meals as completed.
                        This helps you stay consistent with your nutrition tracking!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timezone and Theme selection removed as they are now auto-handled */}

                {/* Meal Time Inputs */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground mb-3">Meal Times</h3>
                  {MEAL_CONFIG.map((meal) => (
                    <div
                      key={meal.key}
                      className="flex items-center gap-3 p-3 rounded-lg border border-divider hover:border-primary/50 transition-colors bg-content1"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <span className="text-lg">{meal.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">{meal.label}</div>
                        <div className="text-xs text-foreground/60 truncate">{meal.description}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-content2 rounded-lg px-3 py-2 border border-divider">
                        <Clock className="w-4 h-4 text-foreground/60" />
                        <input
                          type="time"
                          value={editingMealTimes[meal.key]}
                          onChange={(e) => handleTimeChange(meal.key, e.target.value)}
                          className="w-20 text-sm font-medium bg-transparent text-foreground border-none outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unsaved Changes Warning */}
                {hasUnsavedChanges && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <div className="text-lg">⚠️</div>
                      <div className="flex-1">
                        <p className="text-sm text-warning-600 dark:text-warning-400 font-medium">
                          You have unsaved changes
                        </p>
                        <p className="text-xs text-warning-600/70 dark:text-warning-400/70 mt-1">
                          Don't forget to save your changes before closing this dialog.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="flex flex-col gap-3 pt-6 border-t border-divider mt-6 sm:flex-row">
                <Button
                  variant="primary"
                  size="lg"
                  onPress={handleSave}
                  isDisabled={isSubmitting || !hasUnsavedChanges}
                  className="flex-1"
                >
                  {isSubmitting ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onPress={handleReset}
                  isDisabled={isSubmitting}
                  className="sm:w-auto sm:min-w-[120px]"
                >
                  Reset to Defaults
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onPress={handleCloseDialog}
                  isDisabled={isSubmitting}
                  className="sm:w-auto sm:min-w-[80px]"
                >
                  Cancel
                </Button>
              </div>

              {/* Footer Note */}
              <div className="bg-default/10 border border-default/20 rounded-lg p-3 mt-4">
                <div className="flex items-start gap-2">
                  <div className="text-lg">⏰</div>
                  <div className="flex-1">
                    <p className="text-xs text-foreground/70">
                      Changes will take effect immediately after saving. You'll receive notifications based on your updated schedule.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}