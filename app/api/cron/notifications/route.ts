import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getCurrentTimeInTimezone, getCurrentDateInTimezone } from '@/lib/utils/timezone';
import { NextResponse } from 'next/server';

/**
 * Unified Notification Cron Job
 * Runs every hour and processes all scheduled notifications based on notification_messages table
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const now = new Date();
    
    console.log(`[Unified Cron] Running notification check at ${now.toISOString()}`);

    // Get all active and enabled notification messages
    const { data: notificationConfigs, error: configError } = await adminClient
      .from('notification_messages')
      .select('*')
      .eq('is_active', true)
      .eq('is_enabled', true);

    if (configError) {
      console.error('Error fetching notification configs:', configError);
      return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 });
    }

    if (!notificationConfigs || notificationConfigs.length === 0) {
      console.log('No active notification configurations found');
      return NextResponse.json({ message: 'No active notifications to process' });
    }

    // Get all users with notifications enabled
    const { data: users, error: usersError } = await adminClient
      .from('user_preferences')
      .select(`
        id,
        full_name,
        timezone,
        notifications_enabled,
        meal_reminders_enabled,
        breakfast_time,
        snack1_time,
        lunch_time,
        snack2_time,
        dinner_time
      `)
      .eq('notifications_enabled', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log('No users with notifications enabled');
      return NextResponse.json({ message: 'No users to notify' });
    }

    let totalSent = 0;
    const results: any[] = [];

    // Process each notification configuration
    for (const config of notificationConfigs) {
      const configResults = await processNotificationConfig(config, users, adminClient);
      totalSent += configResults.sent;
      results.push({
        type: config.notification_type,
        sent: configResults.sent,
        errors: configResults.errors
      });
    }

    console.log(`[Unified Cron] Total notifications sent: ${totalSent}`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalSent,
      totalUsers: users.length,
      results
    });

  } catch (error: any) {
    console.error('[Unified Cron] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function processNotificationConfig(config: any, users: any[], adminClient: any) {
  let sent = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      const userTimezone = user.timezone || 'Asia/Kolkata';
      const shouldSend = await shouldSendNotification(config, user, userTimezone);

      if (shouldSend.send) {
        const success = await sendNotificationToUser(config, user, userTimezone, adminClient);
        if (success) {
          sent++;
          // Update last_sent_at for this config
          await adminClient
            .from('notification_messages')
            .update({ last_sent_at: new Date().toISOString() })
            .eq('id', config.id);
        } else {
          errors.push(`Failed to send ${config.notification_type} to user ${user.id}`);
        }
      }
    } catch (error: any) {
      console.error(`Error processing ${config.notification_type} for user ${user.id}:`, error);
      errors.push(`Error processing user ${user.id}: ${error.message}`);
    }
  }

  return { sent, errors };
}

async function shouldSendNotification(config: any, user: any, userTimezone: string) {
  const userTime = getCurrentTimeInTimezone(userTimezone);
  const today = getCurrentDateInTimezone(userTimezone);

  // Check if we already sent this notification today
  const supabase = await createClient();
  const { data: existingLog } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('notification_type', config.notification_type)
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`)
    .single();

  if (existingLog) {
    return { send: false, reason: 'Already sent today' };
  }

  // Check scheduling based on repeat pattern and time
  return checkScheduleMatch(config, user, userTime, userTimezone);
}

function checkScheduleMatch(config: any, user: any, userTime: any, userTimezone: string) {
  const { notification_type, schedule_time, repeat_pattern } = config;

  // Parse schedule time
  let targetHour = 9; // default
  let targetMinute = 0;
  
  if (schedule_time) {
    const [hour, minute] = schedule_time.split(':').map(Number);
    targetHour = hour;
    targetMinute = minute;
  }

  // Special handling for different notification types
  switch (notification_type) {
    case 'good_morning':
      // Send when it's 7:00 AM in user's timezone (cron runs hourly, so check for hour 7)
      return { 
        send: userTime.hour === 7 && userTime.minute >= 0 && userTime.minute < 60,
        reason: `Good morning check: current ${userTime.hour}:${userTime.minute}, need 7:xx`
      };
      
    case 'good_night':
      // Send at 8 PM or 1 hour after dinner time (whichever is later) in user's timezone
      let nightHour = 20;
      if (user.dinner_time) {
        const [dinnerHour] = user.dinner_time.split(':').map(Number);
        nightHour = Math.max(20, Math.min(23, dinnerHour + 1));
      }
      return { 
        send: userTime.hour === nightHour && userTime.minute >= 0 && userTime.minute < 60,
        reason: `Good night check: current ${userTime.hour}:${userTime.minute}, need ${nightHour}:xx (dinner: ${user.dinner_time || 'not set'})`
      };
      
    case 'water_reminder':
      // Every 2 hours during waking hours (8 AM - 10 PM) - send at the top of even hours
      if (repeat_pattern === 'hourly') {
        return { 
          send: userTime.hour >= 8 && userTime.hour <= 22 && 
                userTime.hour % 2 === 0 && userTime.minute >= 0 && userTime.minute < 60,
          reason: `Water reminder: current ${userTime.hour}:${userTime.minute}, need even hour 8-22`
        };
      }
      break;
      
    case 'meal_reminder_breakfast':
      return checkMealReminder(user, 'breakfast', userTime);
    case 'meal_reminder_snack1':
      return checkMealReminder(user, 'snack1', userTime);
    case 'meal_reminder_lunch':
      return checkMealReminder(user, 'lunch', userTime);
    case 'meal_reminder_snack2':
      return checkMealReminder(user, 'snack2', userTime);
    case 'meal_reminder_dinner':
      return checkMealReminder(user, 'dinner', userTime);
      
    case 'weekly_measurement_reminder':
    case 'weekly_weight_reminder':
      // Send on Sundays at specified time in user's timezone
      if (repeat_pattern === 'weekly') {
        const userDate = getCurrentDateInTimezone(userTimezone);
        const dayOfWeek = new Date(userDate).getDay(); // 0 = Sunday
        return { 
          send: dayOfWeek === 0 && userTime.hour === targetHour && userTime.minute >= 0 && userTime.minute < 60,
          reason: `Weekly reminder: current ${dayOfWeek === 0 ? 'Sunday' : 'not Sunday'} ${userTime.hour}:${userTime.minute}, need Sunday ${targetHour}:xx`
        };
      }
      break;
      
    default:
      // Default scheduling based on schedule_time and repeat_pattern
      if (repeat_pattern === 'daily') {
        return { 
          send: userTime.hour === targetHour && userTime.minute >= 0 && userTime.minute < 60,
          reason: `Daily notification: current ${userTime.hour}:${userTime.minute}, need ${targetHour}:xx`
        };
      }
  }

  return { send: false, reason: 'Schedule not matched' };
}

function checkMealReminder(user: any, mealType: string, userTime: any) {
  const mealTimeField = `${mealType}_time`;
  const mealTime = user[mealTimeField];
  
  if (!mealTime || !user.meal_reminders_enabled) {
    return { send: false, reason: 'Meal time not configured or reminders disabled' };
  }

  // Send reminder 1 hour after meal time (hourly check, so check for the reminder hour)
  const [mealHour, mealMinute] = mealTime.split(':').map(Number);
  const reminderHour = (mealHour + 1) % 24;
  
  return { 
    send: userTime.hour === reminderHour && userTime.minute >= 0 && userTime.minute < 60,
    reason: `Meal reminder for ${mealType}: meal at ${mealTime}, reminder at ${reminderHour}:xx, current ${userTime.hour}:${userTime.minute}`
  };
}

async function sendNotificationToUser(config: any, user: any, userTimezone: string, adminClient: any) {
  try {
    // Get FCM tokens for this user
    const { data: tokens } = await adminClient
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user.id);

    if (!tokens || tokens.length === 0) {
      console.log(`No FCM tokens for user ${user.id}`);
      return false;
    }

    // Process message with placeholders
    const processedMessage = processMessagePlaceholders(config, user, userTimezone);

    // Send push notification
    const fcmResult = await sendPushNotification({
      tokens: tokens.map((t: { token: any; }) => t.token),
      title: processedMessage.title,
      body: processedMessage.body,
      data: {
        type: config.notification_type,
        action: getNotificationAction(config.notification_type),
        timestamp: new Date().toISOString()
      }
    });

    if (fcmResult.success) {
      // Log the notification
      await adminClient
        .from('notification_logs')
        .insert({
          user_id: user.id,
          notification_type: config.notification_type,
          title: processedMessage.title,
          body: processedMessage.body,
          sent_at: new Date().toISOString(),
          metadata: {
            successCount: fcmResult.successCount,
            failureCount: fcmResult.failureCount
          }
        });

      console.log(`Sent ${config.notification_type} to user ${user.id} (${user.full_name})`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error sending notification to user ${user.id}:`, error);
    return false;
  }
}

function processMessagePlaceholders(config: any, user: any, userTimezone: string) {
  let title = config.title;
  let body = config.message;

  // Replace common placeholders
  const userName = user.full_name?.split(' ')[0] || 'there';
  const currentTime = getCurrentTimeInTimezone(userTimezone).timeString;

  title = title.replace(/{name}/g, userName);
  body = body.replace(/{name}/g, userName);
  title = title.replace(/{currentTime}/g, currentTime);
  body = body.replace(/{currentTime}/g, currentTime);

  // Add type-specific placeholder processing here as needed
  // e.g., {mealsCompleted}, {daysLeft}, etc.

  return { title, body };
}

function getNotificationAction(notificationType: string): string {
  const actionMap: Record<string, string> = {
    'good_morning': 'open_app',
    'good_night': 'open_meals',
    'water_reminder': 'open_water',
    'meal_reminder_breakfast': 'open_meals',
    'meal_reminder_snack1': 'open_meals',
    'meal_reminder_lunch': 'open_meals',
    'meal_reminder_snack2': 'open_meals',
    'meal_reminder_dinner': 'open_meals',
    'weekly_measurement_reminder': 'open_measurements',
    'weekly_weight_reminder': 'open_weight',
    'feedback_request': 'open_feedback',
    'membership_expiring': 'open_subscription',
    'membership_expired': 'open_subscription'
  };
  
  return actionMap[notificationType] || 'open_app';
}