import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getActiveNotificationMessage } from '@/app/actions/notification-messages';

interface UserPreference {
  id: string;
  full_name: string | null;
  notifications_enabled: boolean;
  meal_reminders_enabled: boolean;
  water_reminders_enabled: boolean;
  weight_reminders_enabled: boolean;
  breakfast_time: string | null;
  snack1_time: string | null;
  lunch_time: string | null;
  snack2_time: string | null;
  dinner_time: string | null;
  timezone: string | null;
}

interface NotificationResult {
  userId: string;
  userName: string;
  type: string;
  message: string;
  success: boolean;
}

interface SupabaseClient {
  from: (table: string) => any;
}

interface MealRecord {
  id: string;
  user_id: string;
  date: string;
  breakfast_completed?: boolean;
  snack1_completed?: boolean;
  lunch_completed?: boolean;
  snack2_completed?: boolean;
  dinner_completed?: boolean;
  breakfast_notification_sent_at?: string;
  snack1_notification_sent_at?: string;
  lunch_notification_sent_at?: string;
  snack2_notification_sent_at?: string;
  dinner_notification_sent_at?: string;
}

/**
 * API Route for checking user activity and sending notifications
 * This should be called by a cron job every hour (e.g., Vercel Cron)
 * 
 * Timezone-aware ±30 minute window notifications
 * Optimized for performance with batching and early returns
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const TIMEOUT_MS = 4000; // 4 seconds to leave buffer for response
  
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    console.log(`[Cron] Running notification check at ${now.toISOString()}`);

    // Get current hour and minute to pre-filter users who might need notifications
    // const currentHour = now.getUTCHours();
    // const currentMinute = now.getUTCMinutes();

    // Get all users with notifications enabled (limit to reduce processing time)
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select(`
        id,
        full_name,
        notifications_enabled,
        meal_reminders_enabled,
        water_reminders_enabled,
        weight_reminders_enabled,
        breakfast_time,
        snack1_time,
        lunch_time,
        snack2_time,
        dinner_time,
        timezone
      `)
      .eq('notifications_enabled', true)
      .limit(100); // Limit to prevent timeout

    if (usersError) throw usersError;

    const notifications: NotificationResult[] = [];

    let processedUsers = 0;
    let skippedUsers = 0;

    // Process users in batches with timeout check
    for (const user of users || []) {
      // Check timeout - leave 1 second for response
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log(`[Cron] Timeout reached, processed ${processedUsers} users`);
        break;
      }

      const userTimezone = user.timezone || 'Asia/Kolkata';
      const { hours: userHours, minutes: userMinutes, timeStr: userTimeStr } = getTimeInTimezone(userTimezone);
      
      // Quick check: skip user if no notification times match current time (±5 min)
      const shouldProcess = await shouldProcessUser(user, userHours, userMinutes);
      if (!shouldProcess) {
        skippedUsers++;
        continue;
      }

      processedUsers++;
      
      // Check if user is logged in (has activity in last 24 hours)
      const loggedIn = await isUserLoggedIn(user.id, supabase);

      // Process notifications for this user
      await processUserNotifications(user, userHours, userMinutes, userTimeStr, loggedIn, today, now, supabase, notifications);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      duration: `${duration}ms`,
      total_users: users?.length || 0,
      processed_users: processedUsers,
      skipped_users: skippedUsers,
      sent: notifications.filter(n => n.success).length,
      failed: notifications.filter(n => !n.success).length,
      notifications: notifications.slice(0, 10), // Limit response size
    });
  } catch (error: any) {
    console.error('[Cron] Error in notification check:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to quickly determine if user needs processing
async function shouldProcessUser(user: any, userHours: number, userMinutes: number): Promise<boolean> {
  // Check if current time matches any notification time (±5 minutes)
  const notificationTimes = [
    user.breakfast_time,
    user.snack1_time, 
    user.lunch_time,
    user.snack2_time,
    user.dinner_time,
    '12:00', // water reminder
    '07:00', // good morning
    '21:00', // good night
  ];

  // Add weekly measurement reminder (Saturday 19:00)
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 6) {
    notificationTimes.push('19:00');
  }

  return notificationTimes.some(time => time && isTimeMatch(userHours, userMinutes, time));
}

// Helper function to check if user is logged in (optimized)
async function isUserLoggedIn(userId: string, supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from('user_activity')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
    .single();
  return !!data;
}

// Process all notifications for a single user
async function processUserNotifications(
  user: any,
  userHours: number,
  userMinutes: number,
  userTimeStr: string,
  loggedIn: boolean,
  today: string,
  now: Date,
  supabase: any,
  notifications: NotificationResult[]
) {
  // MEAL REMINDERS (breakfast, snack1, lunch, snack2, dinner)
  if (user.meal_reminders_enabled) {
    await processMealReminders(user, userHours, userMinutes, userTimeStr, loggedIn, today, now, supabase, notifications);
  }

  // WATER REMINDER (12:00 daily)
  if (user.water_reminders_enabled && isTimeMatch(userHours, userMinutes, '12:00')) {
    await processWaterReminder(user, userTimeStr, loggedIn, today, supabase, notifications);
  }

  // GOOD MORNING (07:00 daily)
  if (isTimeMatch(userHours, userMinutes, '07:00') && !loggedIn) {
    await processGenericNotification(user, userTimeStr, 'good_morning', supabase, notifications);
  }

  // GOOD NIGHT (21:00 daily)
  if (isTimeMatch(userHours, userMinutes, '21:00') && !loggedIn) {
    await processGenericNotification(user, userTimeStr, 'good_night', supabase, notifications);
  }

  // WEEKLY MEASUREMENT REMINDER (Saturday 19:00)
  if (user.weight_reminders_enabled) {
    const dayOfWeek = new Date(today).getDay();
    if (dayOfWeek === 6 && isTimeMatch(userHours, userMinutes, '19:00') && !loggedIn) {
      await processGenericNotification(user, userTimeStr, 'weekly_measurement_reminder', supabase, notifications);
    }
  }
}

// Process meal reminders for a user
async function processMealReminders(
  user: any,
  userHours: number,
  userMinutes: number,
  userTimeStr: string,
  loggedIn: boolean,
  today: string,
  now: Date,
  supabase: any,
  notifications: NotificationResult[]
) {
  const mealReminders = [
    { type: 'breakfast', time: user.breakfast_time, field: 'breakfast' },
    { type: 'snack1', time: user.snack1_time, field: 'snack1' },
    { type: 'lunch', time: user.lunch_time, field: 'lunch' },
    { type: 'snack2', time: user.snack2_time, field: 'snack2' },
    { type: 'dinner', time: user.dinner_time, field: 'dinner' },
  ];

  // Get meal record once
  let { data: meal } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  if (!meal) {
    const { data: newMeal } = await supabase
      .from('meals')
      .insert({ user_id: user.id, date: today })
      .select()
      .single();
    meal = newMeal;
  }

  for (const reminder of mealReminders) {
    if (!reminder.time) continue;

    const isTimeToSend = isTimeMatch(userHours, userMinutes, reminder.time);
    if (!isTimeToSend) continue;

    const notifField = `${reminder.field}_notification_sent_at` as keyof typeof meal;
    const completedField = `${reminder.field}_completed` as keyof typeof meal;

    const mealNotCompleted = !meal?.[completedField];
    const notYetNotified = !meal?.[notifField];
    
    // Additional check: don't send if notification was sent in the last hour
    const lastNotificationTime = meal?.[notifField];
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentlySent = lastNotificationTime && new Date(lastNotificationTime) > oneHourAgo;
    
    if ((mealNotCompleted || !loggedIn) && notYetNotified && !recentlySent) {
      const result = await sendNotification({
        userId: user.id,
        userName: user.full_name,
        type: `meal_reminder_${reminder.type}`,
        supabase,
      });

      if (result.success && meal) {
        await supabase
          .from('meals')
          .update({ [notifField]: now.toISOString() })
          .eq('id', meal.id);
      }

      notifications.push({
        userId: user.id,
        userName: user.full_name || 'User',
        type: `meal_reminder_${reminder.type}`,
        message: result.message,
        success: result.success,
      });

      console.log(`[${user.full_name}] Meal ${reminder.type} at ${userTimeStr}: SENT`);
    } else if (recentlySent) {
      console.log(`[${user.full_name}] Meal ${reminder.type} at ${userTimeStr}: SKIPPED (recently sent)`);
    }
  }
}

// Process water reminder
async function processWaterReminder(
  user: any, 
  userTimeStr: string, 
  loggedIn: boolean, 
  today: string, 
  supabase: any, 
  notifications: NotificationResult[]
) {
  // Check if water reminder was already sent today
  const { data: existingNotification } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('notification_type', 'water_reminder')
    .gte('sent_at', `${today}T00:00:00`)
    .limit(1)
    .single();

  // Send if user not logged in AND not already notified today
  const { data: waterLog } = await supabase
    .from('water_logs')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', `${today}T00:00:00`)
    .limit(1)
    .single();

  if ((!loggedIn || !waterLog) && !existingNotification) {
    const result = await sendNotification({
      userId: user.id,
      userName: user.full_name,
      type: 'water_reminder',
      supabase,
    });

    notifications.push({
      userId: user.id,
      userName: user.full_name || 'User',
      type: 'water_reminder',
      message: result.message,
      success: result.success,
    });

    console.log(`[${user.full_name}] Water reminder at ${userTimeStr}: SENT`);
  } else if (existingNotification) {
    console.log(`[${user.full_name}] Water reminder at ${userTimeStr}: SKIPPED (already sent today)`);
  } else {
    console.log(`[${user.full_name}] Water reminder at ${userTimeStr}: SKIPPED (user logged water)`);
  }
}

// Process generic notifications (good morning, good night, weekly measurement)
async function processGenericNotification(
  user: any, 
  userTimeStr: string, 
  type: string, 
  supabase: any, 
  notifications: NotificationResult[]
) {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if this notification was already sent today
  const { data: existingNotification } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('notification_type', type)
    .gte('sent_at', `${today}T00:00:00`)
    .limit(1)
    .single();

  if (!existingNotification) {
    const result = await sendNotification({
      userId: user.id,
      userName: user.full_name,
      type: type,
      supabase,
    });

    notifications.push({
      userId: user.id,
      userName: user.full_name || 'User',
      type: type,
      message: result.message,
      success: result.success,
    });

    console.log(`[${user.full_name}] ${type} at ${userTimeStr}: SENT`);
  } else {
    console.log(`[${user.full_name}] ${type} at ${userTimeStr}: SKIPPED (already sent today)`);
  }
}

// Helper to get time in user's timezone
function getTimeInTimezone(timezone: string): { hours: number; minutes: number; timeStr: string } {
  const now = new Date();
  
  // Use Intl.DateTimeFormat for more accurate timezone handling
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const hours = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
  const minutes = parseInt(parts.find(part => part.type === 'minute')?.value || '0');
  const seconds = parseInt(parts.find(part => part.type === 'second')?.value || '0');
  
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  return { hours, minutes, timeStr };
}

// Helper to check if current time is within ±30 minutes of target time
function isTimeMatch(userHours: number, userMinutes: number, targetTime: string | null): boolean {
  if (!targetTime) return false;
  
  // Handle both "HH:MM" and "HH:MM:SS" formats
  const timeParts = targetTime.split(':');
  const targetHours = parseInt(timeParts[0]);
  const targetMinutes = parseInt(timeParts[1]);
  
  const userTotalMin = userHours * 60 + userMinutes;
  const targetTotalMin = targetHours * 60 + targetMinutes;
  const diff = Math.abs(userTotalMin - targetTotalMin);
  return diff <= 30; // ±30 minutes window for hourly cron
}

async function sendNotification({
  userId,
  userName,
  type,
  supabase,
}: {
  userId: string;
  userName: string | null;
  type: string;
  supabase: any;
}) {
  try {
    // Get user's FCM tokens
    const { data: tokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId);

    if (!tokens || tokens.length === 0) {
      return { success: false, message: 'No FCM tokens found' };
    }

    // Get notification message from database
    const messageResult = await getActiveNotificationMessage(type);
    
    let title = 'Train Easy';
    let message = 'Time for your notification!';
    let urlPath = '/dashboard';
    
    if (messageResult.success && messageResult.message) {
      title = messageResult.message.title;
      message = messageResult.message.message;
      
      // Replace {name} placeholder
      const displayName = userName?.split(' ')[0] || 'there';
      title = title.replace(/{name}/g, displayName);
      message = message.replace(/{name}/g, displayName);
    }

    // Determine URL path based on notification type
    if (type.includes('meal')) urlPath = '/meals';
    if (type.includes('water')) urlPath = '/water';
    if (type.includes('weight') || type.includes('measurement')) urlPath = '/weight';

    // Send via Firebase
    const result = await sendPushNotification({
      tokens: tokens.map((t: { token: string }) => t.token),
      title,
      body: message,
      data: {
        type: type,
        date: new Date().toISOString().split('T')[0],
        url: urlPath,
      },
    });

    // Clean up invalid tokens
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId)
        .in('token', result.invalidTokens);
    }

    // Log the notification if it was successful
    if (result.success && (result.successCount || 0) > 0) {
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          notification_type: type,
          title: title,
          body: message,
          sent_at: new Date().toISOString(),
          metadata: {
            success_count: result.successCount || 0,
            total_tokens: tokens.length,
            url_path: urlPath
          }
        });
    }

    return {
      success: result.success && (result.successCount || 0) > 0,
      message: result.success ? `Sent to ${result.successCount || 0} device(s)` : result.error || 'Failed to send',
    };
  } catch (error: unknown) {
    console.error('[Cron] Error sending notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, message: errorMessage };
  }
}


