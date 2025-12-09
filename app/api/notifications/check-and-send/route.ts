import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';

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
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

    console.log(`[Cron] Running meal reminder check at ${currentTime}`);

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
        dinner_time
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

        // Parse meal time (format: "HH:MM:SS" or "HH:MM")
        const [mealHour, mealMinute] = mealInfo.time.split(':').map(Number);
        const mealTimeInMinutes = mealHour * 60 + mealMinute;
        const currentTimeInMinutes = currentHour * 60 + currentMinutes;

        // Check if meal time has passed by at least 1 hour (60 minutes)
        const timeSinceMeal = currentTimeInMinutes - mealTimeInMinutes;

        if (
          timeSinceMeal >= 60 && // At least 1 hour has passed
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

    const mealLabels: Record<string, string> = {
      breakfast: 'breakfast',
      snack1: 'morning snack',
      lunch: 'lunch',
      snack2: 'afternoon snack',
      dinner: 'dinner',
    };

    const displayName = userName || 'there';
    const mealLabel = mealLabels[mealType] || mealType;
    const message = `Hey ${displayName}! You missed your ${mealLabel}. Don't forget to log it!`;

    // Send via Firebase Admin SDK
    const result = await sendPushNotification({
      tokens: tokens.map((t: any) => t.token),
      title: '🍽️ Meal Reminder',
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
