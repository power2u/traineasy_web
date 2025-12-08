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
