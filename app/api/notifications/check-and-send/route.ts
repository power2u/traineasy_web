<<<<<<< HEAD
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * API Route for checking user activity and sending notifications
 * This should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    // Get all users with notification preferences
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select('user_id, water_reminders, meal_reminders, weight_reminders')
      .eq('notifications_enabled', true);

    if (usersError) throw usersError;

    const notifications: Array<{
      userId: string;
      type: string;
      message: string;
    }> = [];

    // Check each user's activity
    for (const user of users || []) {
      // Check water intake (send reminder at 12 PM if less than 4 glasses)
      if (user.water_reminders && hour === 12) {
        const { data: waterLogs } = await supabase
          .from('water_intake')
          .select('glasses')
          .eq('user_id', user.user_id)
          .eq('date', today);

        const totalGlasses = waterLogs?.reduce((sum, log) => sum + log.glasses, 0) || 0;

        if (totalGlasses < 4) {
          notifications.push({
            userId: user.user_id,
            type: 'water',
            message: `💧 You've only had ${totalGlasses} glasses today. Stay hydrated!`,
          });
        }
      }

      // Check meals (send reminder at 2 PM if no meals logged)
      if (user.meal_reminders && hour === 14) {
        const { data: meals } = await supabase
          .from('meals')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('date', today)
          .eq('completed', true);

        if (!meals || meals.length === 0) {
          notifications.push({
            userId: user.user_id,
            type: 'meal',
            message: '🍽️ Don\'t forget to log your meals today!',
          });
        }
      }

      // Check weight logging (send reminder on Monday at 9 AM if not logged this week)
      if (user.weight_reminders && hour === 9 && new Date().getDay() === 1) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: weightLogs } = await supabase
          .from('weight_logs')
          .select('id')
          .eq('user_id', user.user_id)
          .gte('date', weekAgo.toISOString().split('T')[0]);

        if (!weightLogs || weightLogs.length === 0) {
          notifications.push({
            userId: user.user_id,
            type: 'weight',
            message: '⚖️ Time for your weekly weigh-in!',
          });
        }
      }
    }

    // Send notifications via OneSignal
    const results = await Promise.all(
      notifications.map(notif => sendOneSignalNotification(notif))
    );

    return NextResponse.json({
      success: true,
      checked: users?.length || 0,
      sent: results.filter(r => r.success).length,
      notifications,
    });
  } catch (error) {
    console.error('Error in notification check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendOneSignalNotification({
  userId,
  type,
  message,
}: {
  userId: string;
  type: string;
  message: string;
}) {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_AUTH_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        contents: { en: message },
        headings: { en: getNotificationTitle(type) },
        data: { type, url: getNotificationUrl(type) },
      }),
    });

    const result = await response.json();
    return { success: response.ok, result };
  } catch (error) {
    console.error('Error sending OneSignal notification:', error);
    return { success: false, error };
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
=======
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';
import { shouldSendMealReminder, getCurrentDateInTimezone } from '@/lib/utils/timezone';
import { getActiveNotificationMessage } from '@/app/actions/notification-messages';

/**
 * API Route for checking user activity and sending notifications
 * This should be called by a cron job every hour (e.g., Vercel Cron)
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
    const today = now.toISOString().split('T')[0]; // Keep as UTC for database consistency
    
    console.log(`[Cron] Running meal reminder check at ${now.toISOString()}`);

    // Get all users with meal reminders enabled
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select(`
        id,
        full_name,
        notifications_enabled,
        meal_reminders_enabled,
        meal_times_configured,
        breakfast_time,
        snack1_time,
        lunch_time,
        snack2_time,
        dinner_time,
        timezone
      `)
      .eq('notifications_enabled', true)
      .eq('meal_reminders_enabled', true)
      .eq('meal_times_configured', true);

    if (usersError) throw usersError;

    const notifications: Array<{
      userId: string;
      userName: string;
      mealType: string;
      message: string;
      success: boolean;
    }> = [];

    // Check each user's meals
    for (const user of users || []) {
      // Get or create today's meal record
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

      if (!meal) continue;

      // Check each meal type
      const mealTypes = [
        { type: 'breakfast', time: user.breakfast_time, completed: meal.breakfast_completed, notified: meal.breakfast_notification_sent_at },
        { type: 'snack1', time: user.snack1_time, completed: meal.snack1_completed, notified: meal.snack1_notification_sent_at },
        { type: 'lunch', time: user.lunch_time, completed: meal.lunch_completed, notified: meal.lunch_notification_sent_at },
        { type: 'snack2', time: user.snack2_time, completed: meal.snack2_completed, notified: meal.snack2_notification_sent_at },
        { type: 'dinner', time: user.dinner_time, completed: meal.dinner_completed, notified: meal.dinner_notification_sent_at },
      ];

      for (const mealInfo of mealTypes) {
        if (!mealInfo.time) continue; // Skip if meal time not configured

        // Check if notification should be sent using timezone-aware logic
        const userTimezone = user.timezone || 'Asia/Kolkata';
        const reminderCheck = shouldSendMealReminder(mealInfo.time, userTimezone, 1);
        
        console.log(`[${user.full_name}] ${mealInfo.type}: ${reminderCheck.userCurrentTime} vs ${reminderCheck.mealTime}, diff: ${reminderCheck.timeSinceMeal}min, should send: ${reminderCheck.shouldSend}`);

        if (
          reminderCheck.shouldSend && // At least 1 hour has passed (timezone-aware)
          !mealInfo.completed && // Meal not completed
          !mealInfo.notified // Notification not sent yet
        ) {
          // Send notification
          const result = await sendMealNotification({
            userId: user.id,
            userName: user.full_name,
            mealType: mealInfo.type,
            supabase,
          });

          if (result.success) {
            // Mark notification as sent
            await supabase
              .from('meals')
              .update({ [`${mealInfo.type}_notification_sent_at`]: now.toISOString() })
              .eq('id', meal.id);
          }

          notifications.push({
            userId: user.id,
            userName: user.full_name || 'User',
            mealType: mealInfo.type,
            message: result.message,
            success: result.success,
          });
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

async function sendMealNotification({
  userId,
  userName,
  mealType,
  supabase,
}: {
  userId: string;
  userName: string | null;
  mealType: string;
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

    // Get active meal reminder message from database
    const notificationType = `meal_reminder_${mealType}`;
    const messageResult = await getActiveNotificationMessage(notificationType);
    
    let title = '🍽️ Meal Reminder';
    let message = `Hey ${userName || 'there'}! Time for your meal reminder!`;
    
    if (messageResult.success && messageResult.message) {
      title = messageResult.message.title;
      message = messageResult.message.message;
      
      // Replace {name} placeholder with user's name
      const displayName = userName?.split(' ')[0] || 'there';
      title = title.replace(/{name}/g, displayName);
      message = message.replace(/{name}/g, displayName);
    }

    // Send via Firebase Admin SDK
    const result = await sendPushNotification({
      tokens: tokens.map((t: any) => t.token),
      title,
      body: message,
      data: {
        type: 'meal_reminder',
        meal_type: mealType,
        date: new Date().toISOString().split('T')[0],
        url: '/meals',
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
    console.error('[Cron] Error sending meal notification:', error);
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
>>>>>>> main
