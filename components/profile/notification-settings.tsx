'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Switch, TextField, Label, Input, Text } from '@heroui/react';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  saveUserFCMToken,
  type NotificationPreferences,
} from '@/app/actions/notifications';
import { requestNotificationPermission, getNotificationPermission } from '@/lib/firebase/messaging';

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    loadPreferences();
    setPermissionStatus(getNotificationPermission());
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    const result = await getUserNotificationPreferences();
    if (result.success && result.preferences) {
      setPreferences(result.preferences);
      setHasToken(!!result.preferences.fcm_token);
    }
    setIsLoading(false);
  };

  const handleRequestPermission = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      await saveUserFCMToken(token);
      setPermissionStatus('granted');
      setHasToken(true);
      await loadPreferences();
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setIsSaving(true);
    const result = await updateUserNotificationPreferences(preferences);
    setIsSaving(false);

    if (result.success) {
      alert('Notification settings saved successfully!');
    } else {
      alert('Failed to save settings: ' + result.error);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Text>Loading notification settings...</Text>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card className="p-6">
        <Text className="text-red-500">Failed to load notification settings</Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Permission</h3>
        
        {permissionStatus === 'default' && (
          <div className="space-y-3">
            <Text className="text-default-500">
              Enable push notifications to receive reminders for meals, water, and weight tracking.
            </Text>
            <Button variant="primary" onPress={handleRequestPermission}>
              Enable Notifications
            </Button>
          </div>
        )}

        {permissionStatus === 'denied' && (
          <div className="space-y-3">
            <Text className="text-red-500">
              Notifications are blocked. Please enable them in your browser settings.
            </Text>
          </div>
        )}

        {permissionStatus === 'granted' && (
          <div className="space-y-3">
            <Text className="text-green-500">
              ✓ Notifications are enabled {hasToken && '(Token registered)'}
            </Text>
          </div>
        )}
      </Card>

      {/* General Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Push Notifications</div>
              <div className="text-sm text-default-500">Receive notifications on this device</div>
            </div>
            <Switch
              isSelected={preferences.push_enabled}
              onChange={(value: boolean) => updatePreference('push_enabled', value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-default-500">Receive notifications via email</div>
            </div>
            <Switch
              isSelected={preferences.email_enabled}
              onChange={(value: boolean) => updatePreference('email_enabled', value)}
            />
          </div>
        </div>
      </Card>

      {/* Meal Reminders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Meal Reminders</h3>
          <Switch
            isSelected={preferences.meal_reminders_enabled}
            onChange={(value: boolean) => updatePreference('meal_reminders_enabled', value)}
          />
        </div>

        {preferences.meal_reminders_enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                value={preferences.breakfast_time}
                onChange={(value) => updatePreference('breakfast_time', value)}
              >
                <Label>Breakfast Time</Label>
                <Input type="time" />
              </TextField>
              <TextField
                value={preferences.snack1_time}
                onChange={(value) => updatePreference('snack1_time', value)}
              >
                <Label>Snack 1 Time</Label>
                <Input type="time" />
              </TextField>
              <TextField
                value={preferences.lunch_time}
                onChange={(value) => updatePreference('lunch_time', value)}
              >
                <Label>Lunch Time</Label>
                <Input type="time" />
              </TextField>
              <TextField
                value={preferences.snack2_time}
                onChange={(value) => updatePreference('snack2_time', value)}
              >
                <Label>Snack 2 Time</Label>
                <Input type="time" />
              </TextField>
              <TextField
                value={preferences.dinner_time}
                onChange={(value) => updatePreference('dinner_time', value)}
              >
                <Label>Dinner Time</Label>
                <Input type="time" />
              </TextField>
              <TextField
                value={preferences.meal_reminder_delay_minutes.toString()}
                onChange={(value) => updatePreference('meal_reminder_delay_minutes', parseInt(value) || 30)}
              >
                <Label>Reminder Delay (minutes)</Label>
                <Input type="number" min="0" max="120" />
              </TextField>
            </div>
            <Text className="text-sm text-default-500">
              You'll be reminded {preferences.meal_reminder_delay_minutes} minutes after each meal time if not marked.
            </Text>
          </div>
        )}
      </Card>

      {/* Water Reminders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Water Reminders</h3>
          <Switch
            isSelected={preferences.water_reminders_enabled}
            onChange={(value: boolean) => updatePreference('water_reminders_enabled', value)}
          />
        </div>

        {preferences.water_reminders_enabled && (
          <div className="space-y-3">
            <Text className="text-sm text-default-500">
              Reminder times: {preferences.water_reminder_times.join(', ')}
            </Text>
            <Text className="text-xs text-default-400">
              Default: Mid-morning (10:00), Mid-afternoon (15:00), Evening (20:00)
            </Text>
          </div>
        )}
      </Card>

      {/* Weight Reminders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Weight Reminders</h3>
          <Switch
            isSelected={preferences.weight_reminders_enabled}
            onChange={(value: boolean) => updatePreference('weight_reminders_enabled', value)}
          />
        </div>

        {preferences.weight_reminders_enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                value={preferences.weight_reminder_day.toString()}
                onChange={(value) => updatePreference('weight_reminder_day', parseInt(value) || 1)}
              >
                <Label>Reminder Day</Label>
                <select className="w-full p-2 border border-default-300 rounded-lg bg-default-100">
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </TextField>
              <TextField
                value={preferences.weight_reminder_time}
                onChange={(value) => updatePreference('weight_reminder_time', value)}
              >
                <Label>Reminder Time</Label>
                <Input type="time" />
              </TextField>
            </div>
            <Text className="text-sm text-default-500">
              You'll be reminded weekly on {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][preferences.weight_reminder_day]} at {preferences.weight_reminder_time}
            </Text>
          </div>
        )}
      </Card>

      {/* Plan Reminders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Plan End Reminders</h3>
          <Switch
            isSelected={preferences.plan_reminders_enabled}
            onChange={(value: boolean) => updatePreference('plan_reminders_enabled', value)}
          />
        </div>

        {preferences.plan_reminders_enabled && (
          <div className="space-y-3">
            <TextField
              value={preferences.plan_end_reminder_days.toString()}
              onChange={(value) => updatePreference('plan_end_reminder_days', parseInt(value) || 3)}
            >
              <Label>Days Before Plan Ends</Label>
              <Input type="number" min="1" max="30" />
            </TextField>
            <Text className="text-sm text-default-500">
              You'll be reminded {preferences.plan_end_reminder_days} days before your plan ends.
            </Text>
          </div>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onPress={handleSave}
          isDisabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
