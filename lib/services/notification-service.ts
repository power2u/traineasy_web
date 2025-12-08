'use server';

import { createClient } from '@/lib/supabase/server';

export interface NotificationPreferences {
  user_id: string;
  fcm_token: string | null;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  meal_reminders_enabled: boolean;
  breakfast_time: string;
  snack1_time: string;
  lunch_time: string;
  snack2_time: string;
  dinner_time: string;
  meal_reminder_delay_minutes: number;
  water_reminders_enabled: boolean;
  water_reminder_times: string[];
  weight_reminders_enabled: boolean;
  weight_reminder_day: number;
  weight_reminder_time: string;
  plan_reminders_enabled: boolean;
  plan_end_reminder_days: number;
}

export interface NotificationQueue {
  id: string;
  user_id: string;
  type: 'meal_reminder' | 'water_reminder' | 'weight_reminder' | 'plan_end_reminder';
  title: string;
  body: string;
  data: Record<string, any>;
  scheduled_for: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  error_message: string | null;
}

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(userId?: string): Promise<NotificationPreferences | null> {
  const supabase = await createClient();
  
  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!targetUserId) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', targetUserId)
    .single();

  if (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }

  return data;
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: user.id,
      ...preferences,
    });

  if (error) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Save FCM token for user
 */
export async function saveFCMToken(token: string): Promise<{ success: boolean; error?: string }> {
  return updateNotificationPreferences({ fcm_token: token });
}

/**
 * Send push notification via FCM
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's FCM token
    const preferences = await getNotificationPreferences(userId);
    
    if (!preferences?.fcm_token || !preferences.push_enabled) {
      return { success: false, error: 'Push notifications not enabled or no token' };
    }

    // Send notification via FCM API
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${process.env.FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: preferences.fcm_token,
        notification: {
          title,
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
        },
        data: data || {},
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('FCM API error:', error);
      return { success: false, error: 'Failed to send notification' };
    }

    // Log to notification history
    const supabase = await createClient();
    await supabase.from('notification_history').insert({
      user_id: userId,
      type: data?.type || 'general',
      title,
      body,
      channel: 'push',
      status: 'sent',
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Schedule a notification
 */
export async function scheduleNotification(
  userId: string,
  type: NotificationQueue['type'],
  title: string,
  body: string,
  scheduledFor: Date,
  data?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('notification_queue').insert({
    user_id: userId,
    type,
    title,
    body,
    data: data || {},
    scheduled_for: scheduledFor.toISOString(),
    status: 'pending',
  });

  if (error) {
    console.error('Error scheduling notification:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get pending notifications that should be sent
 */
export async function getPendingNotifications(): Promise<NotificationQueue[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Error fetching pending notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark notification as sent
 */
export async function markNotificationSent(
  notificationId: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('notification_queue')
    .update({
      status: success ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      error_message: errorMessage || null,
    })
    .eq('id', notificationId);
}

/**
 * Cancel scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notification_queue')
    .update({ status: 'cancelled' })
    .eq('id', notificationId);

  return { success: !error };
}

/**
 * Get notification history for user
 */
export async function getNotificationHistory(
  userId?: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = await createClient();
  
  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!targetUserId) return [];

  const { data, error } = await supabase
    .from('notification_history')
    .select('*')
    .eq('user_id', targetUserId)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notification history:', error);
    return [];
  }

  return data || [];
}
