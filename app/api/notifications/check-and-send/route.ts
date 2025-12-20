import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getActiveNotificationMessage } from '@/app/actions/notification-messages';

/**
 * API Route for checking user activity and sending notifications
 * This should be called by a cron job every hour (e.g., Vercel Cron)
 * 
 * Timezone-aware ±5 minute window notifications
 */
export async function GET(request: Request) {
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

    // Get all users with notifications enabled
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
      .eq('notifications_enabled', true);

    if (usersError) throw usersError;

    const notifications: Array<{
      userId: string;
      userName: string;
      type: string;
      message: string;
      success: boolean;
    }> = [];

    // Helper function to check if user is logged in (has activity in last 24 hours)
    const isUserLoggedIn = async (userId: string): Promise<boolean> => {
      const { data } = await supabase
        .from('user_activity')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .single();
      return !!data;
    };

    // Helper to get time in user's timezone
    const getTimeInTimezone = (timezone: string): { hours: number; minutes: number; timeStr: string } => {
      const now_utc = new Date();
      const timeStr = now_utc.toLocaleString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { hours, minutes, timeStr };
    };

    // Helper to check if current time is within ±5 minutes of target time
    const isTimeMatch = (userHours: number, userMinutes: number, targetTime: string | null): boolean => {
      if (!targetTime) return false;
      const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
      const userTotalMin = userHours * 60 + userMinutes;
      const targetTotalMin = targetHours * 60 + targetMinutes;
      const diff = Math.abs(userTotalMin - targetTotalMin);
      return diff <= 5; // ±5 minutes window
    };

    // Process each user
    for (const user of users || []) {
      const userTimezone = user.timezone || 'Asia/Kolkata';
      const { hours: userHours, minutes: userMinutes, timeStr: userTimeStr } = getTimeInTimezone(userTimezone);
      
      // Check if user is logged in
      const loggedIn = await isUserLoggedIn(user.id);

      // MEAL REMINDERS (breakfast, snack1, lunch, snack2, dinner)
      if (user.meal_reminders_enabled) {
        const mealReminders = [
          { type: 'breakfast', time: user.breakfast_time, field: 'breakfast' },
          { type: 'snack1', time: user.snack1_time, field: 'snack1' },
          { type: 'lunch', time: user.lunch_time, field: 'lunch' },
          { type: 'snack2', time: user.snack2_time, field: 'snack2' },
          { type: 'dinner', time: user.dinner_time, field: 'dinner' },
        ];

        // Get meal record
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

          // Send if: within ±5 min AND (meal not completed OR user not logged in) AND not notified yet
          const mealField = reminder.field as keyof typeof meal;
          const notifField = `${reminder.field}_notification_sent_at` as keyof typeof meal;
          const completedField = `${reminder.field}_completed` as keyof typeof meal;

          const isTimeToSend = isTimeMatch(userHours, userMinutes, reminder.time);
          const mealNotCompleted = !meal?.[completedField];
          const notYetNotified = !meal?.[notifField];
          
          if (isTimeToSend && (mealNotCompleted || !loggedIn) && notYetNotified) {
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
          }
        }
      }

      // WATER REMINDER (12:00 daily)
      if (user.water_reminders_enabled && isTimeMatch(userHours, userMinutes, '12:00')) {
        // Send if user not logged in OR not yet sent today
        const { data: waterLog } = await supabase
          .from('water_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', `${today}T00:00:00`)
          .limit(1)
          .single();

        if (!loggedIn || !waterLog) {
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
        }
      }

      // GOOD MORNING (07:00 daily)
      if (isTimeMatch(userHours, userMinutes, '07:00')) {
        // Send if user not logged in
        if (!loggedIn) {
          const result = await sendNotification({
            userId: user.id,
            userName: user.full_name,
            type: 'good_morning',
            supabase,
          });

          notifications.push({
            userId: user.id,
            userName: user.full_name || 'User',
            type: 'good_morning',
            message: result.message,
            success: result.success,
          });

          console.log(`[${user.full_name}] Good morning at ${userTimeStr}: SENT`);
        }
      }

      // GOOD NIGHT (21:00 daily)
      if (isTimeMatch(userHours, userMinutes, '21:00')) {
        // Send if user not logged in
        if (!loggedIn) {
          const result = await sendNotification({
            userId: user.id,
            userName: user.full_name,
            type: 'good_night',
            supabase,
          });

          notifications.push({
            userId: user.id,
            userName: user.full_name || 'User',
            type: 'good_night',
            message: result.message,
            success: result.success,
          });

          console.log(`[${user.full_name}] Good night at ${userTimeStr}: SENT`);
        }
      }

      // WEEKLY MEASUREMENT REMINDER (Saturday 19:00)
      if (user.weight_reminders_enabled) {
        const dayOfWeek = new Date(today).getDay(); // 0=Sunday, 6=Saturday
        if (dayOfWeek === 6 && isTimeMatch(userHours, userMinutes, '19:00')) {
          // Send if user not logged in
          if (!loggedIn) {
            const result = await sendNotification({
              userId: user.id,
              userName: user.full_name,
              type: 'weekly_measurement_reminder',
              supabase,
            });

            notifications.push({
              userId: user.id,
              userName: user.full_name || 'User',
              type: 'weekly_measurement_reminder',
              message: result.message,
              success: result.success,
            });

            console.log(`[${user.full_name}] Weekly measurement at ${userTimeStr}: SENT`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      checked: users?.length || 0,
      sent: notifications.filter(n => n.success).length,
      failed: notifications.filter(n => !n.success).length,
      notifications,
    });
  } catch (error: any) {
    console.error('[Cron] Error in notification check:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
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
      tokens: tokens.map((t: any) => t.token),
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

    return {
      success: result.success && (result.successCount || 0) > 0,
      message: result.success ? `Sent to ${result.successCount || 0} device(s)` : result.error || 'Failed to send',
    };
  } catch (error: any) {
    console.error('[Cron] Error sending notification:', error);
    return { success: false, message: error.message };
  }
}

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    water: 'Hydration Reminder',
    meal: 'Meal Reminder',
    weight: 'Weight Log Reminder',
    motivation: 'Stay Motivated!',
  };
  return titles[type] || 'Fitness Tracker';
}

function getNotificationUrl(type: string): string {
  const urls: Record<string, string> = {
    water: '/water',
    meal: '/meals',
    weight: '/weight',
    motivation: '/dashboard',
  };
  return urls[type] || '/dashboard';
}
