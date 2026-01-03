import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentTimeInTimezone, getCurrentDateInTimezone } from '@/lib/utils/timezone';

/**
 * Test endpoint to simulate the unified cron job without actually sending notifications
 * This helps verify the logic works correctly before deploying
 */
export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient();
    const now = new Date();
    
    console.log(`[Test Cron] Simulating notification check at ${now.toISOString()}`);

    // Get all active and enabled notification messages
    const { data: notificationConfigs, error: configError } = await adminClient
      .from('notification_messages')
      .select('*')
      .eq('is_active', true)
      .eq('is_enabled', true);

    if (configError) {
      throw new Error(`Failed to fetch configs: ${configError.message}`);
    }

    // Get sample users (limit to 3 for testing)
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
      .eq('notifications_enabled', true)
      .limit(3);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const simulationResults: any[] = [];

    // Process each notification configuration
    for (const config of notificationConfigs || []) {
      const configResult = await simulateNotificationConfig(config, users || [], adminClient);
      simulationResults.push({
        notification_type: config.notification_type,
        schedule_time: config.schedule_time,
        repeat_pattern: config.repeat_pattern,
        ...configResult
      });
    }

    const totalWouldSend = simulationResults.reduce((sum, result) => sum + result.would_send_count, 0);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        total_configs: notificationConfigs?.length || 0,
        total_users: users?.length || 0,
        total_would_send: totalWouldSend
      },
      simulation_results: simulationResults,
      note: "This is a simulation - no actual notifications were sent"
    });

  } catch (error: any) {
    console.error('[Test Cron] Error:', error);
    return NextResponse.json(
      { error: 'Simulation failed', details: error.message },
      { status: 500 }
    );
  }
}

async function simulateNotificationConfig(config: any, users: any[], adminClient: any) {
  let wouldSendCount = 0;
  const userResults: any[] = [];

  for (const user of users) {
    try {
      const userTimezone = user.timezone || 'Asia/Kolkata';
      const shouldSend = await simulateShouldSendNotification(config, user, userTimezone, adminClient);

      userResults.push({
        user_id: user.id,
        user_name: user.full_name,
        timezone: userTimezone,
        would_send: shouldSend.send,
        reason: shouldSend.reason,
        local_time: getCurrentTimeInTimezone(userTimezone).timeString
      });

      if (shouldSend.send) {
        wouldSendCount++;
      }
    } catch (error: any) {
      userResults.push({
        user_id: user.id,
        error: error.message,
        would_send: false
      });
    }
  }

  return {
    would_send_count: wouldSendCount,
    user_results: userResults
  };
}

async function simulateShouldSendNotification(config: any, user: any, userTimezone: string, adminClient: any) {
  const userTime = getCurrentTimeInTimezone(userTimezone);
  const today = getCurrentDateInTimezone(userTimezone);

  // Check if we already sent this notification today (simulation - check logs)
  const { data: existingLog } = await adminClient
    .from('notification_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('notification_type', config.notification_type)
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`)
    .single();

  if (existingLog) {
    return { send: false, reason: 'Already sent today (found in logs)' };
  }

  // Check scheduling based on repeat pattern and time
  return simulateScheduleMatch(config, user, userTime, userTimezone);
}

function simulateScheduleMatch(config: any, user: any, userTime: any, userTimezone: string) {
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
      // Send when it's 7:00 AM in user's timezone (hourly check, so any minute in hour 7)
      const morningMatch = userTime.hour === 7;
      return { 
        send: morningMatch, 
        reason: morningMatch ? `Good morning time (7:xx AM) - current ${userTime.timeString}` : `Current time ${userTime.timeString}, need 7:xx`
      };
      
    case 'good_night':
      // Send at 8 PM or 1 hour after dinner time (whichever is later) in user's timezone
      let nightHour = 20;
      if (user.dinner_time) {
        const [dinnerHour] = user.dinner_time.split(':').map(Number);
        nightHour = Math.max(20, Math.min(23, dinnerHour + 1));
      }
      const nightMatch = userTime.hour === nightHour;
      return { 
        send: nightMatch, 
        reason: nightMatch 
          ? `Good night time (${nightHour}:xx) - current ${userTime.timeString}` 
          : `Current time ${userTime.timeString}, need ${nightHour}:xx (dinner: ${user.dinner_time || 'not set'})`
      };
      
    case 'water_reminder':
      // Every 2 hours during waking hours (8 AM - 10 PM) - send during even hours
      if (repeat_pattern === 'hourly') {
        const waterMatch = userTime.hour >= 8 && userTime.hour <= 22 && userTime.hour % 2 === 0;
        return { 
          send: waterMatch, 
          reason: waterMatch 
            ? `Water reminder time (even hour ${userTime.hour}:xx between 8-22) - current ${userTime.timeString}`
            : `Current time ${userTime.timeString}, need even hour between 8-22`
        };
      }
      break;
      
    case 'meal_reminder_breakfast':
    case 'meal_reminder_snack1':
    case 'meal_reminder_lunch':
    case 'meal_reminder_snack2':
    case 'meal_reminder_dinner':
      return simulateMealReminder(user, notification_type.replace('meal_reminder_', ''), userTime);
      
    case 'weekly_measurement_reminder':
    case 'weekly_weight_reminder':
      // Send on Sundays at specified time in user's timezone (hourly check)
      if (repeat_pattern === 'weekly') {
        const userDate = getCurrentDateInTimezone(userTimezone);
        const dayOfWeek = new Date(userDate).getDay(); // 0 = Sunday
        const weeklyMatch = dayOfWeek === 0 && userTime.hour === targetHour;
        return { 
          send: weeklyMatch, 
          reason: weeklyMatch 
            ? `Weekly reminder time (Sunday ${targetHour}:xx) - current ${userTime.timeString}`
            : `Current: ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]} ${userTime.timeString}, need Sunday ${targetHour}:xx`
        };
      }
      break;
      
    default:
      // Default scheduling based on schedule_time and repeat_pattern
      if (repeat_pattern === 'daily') {
        const dailyMatch = userTime.hour === targetHour;
        return { 
          send: dailyMatch, 
          reason: dailyMatch 
            ? `Daily notification time (${targetHour}:xx) - current ${userTime.timeString}`
            : `Current time ${userTime.timeString}, need ${targetHour}:xx`
        };
      }
  }

  return { send: false, reason: `Schedule pattern '${repeat_pattern}' not matched` };
}

function simulateMealReminder(user: any, mealType: string, userTime: any) {
  const mealTimeField = `${mealType}_time`;
  const mealTime = user[mealTimeField];
  
  if (!mealTime || !user.meal_reminders_enabled) {
    return { 
      send: false, 
      reason: `Meal time not configured (${mealTimeField}: ${mealTime}) or reminders disabled (${user.meal_reminders_enabled})`
    };
  }

  // Send reminder 1 hour after meal time (hourly check, so any minute in the reminder hour)
  const [mealHour, mealMinute] = mealTime.split(':').map(Number);
  const reminderHour = (mealHour + 1) % 24;
  
  const mealMatch = userTime.hour === reminderHour;
  
  return { 
    send: mealMatch,
    reason: mealMatch 
      ? `Meal reminder time (${mealType} at ${mealTime} + 1 hour = ${reminderHour}:xx) - current ${userTime.timeString}`
      : `Current time ${userTime.timeString}, need ${reminderHour}:xx (${mealType} at ${mealTime} + 1 hour)`
  };
}