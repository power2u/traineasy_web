// Supabase Edge Function for Meal Reminders
// Deploy this and call it via cron-job.org or similar service
// Or use Supabase's built-in cron triggers

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MealType {
  type: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
  time: string | null;
  completed: boolean | null;
  notificationSent: string | null;
}

Deno.serve(async (req) => {
  try {
    // Verify request is from authorized source (cron job)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const oneSignalAppId = Deno.env.get('NEXT_PUBLIC_ONESIGNAL_APP_ID')!;
    const oneSignalAuthKey = Deno.env.get('ONESIGNAL_AUTH_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const currentTime = new Date();
    const currentDate = currentTime.toISOString().split('T')[0];

    // Fetch users with meal reminders enabled
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('notifications_enabled', true)
      .eq('meal_reminders_enabled', true)
      .eq('meal_times_configured', true);

    if (usersError) throw usersError;

    let notificationsSent = 0;
    const errors: string[] = [];

    for (const user of users || []) {
      // Get or create today's meal record
      let { data: meal, error: mealError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', currentDate)
        .single();

      if (mealError && mealError.code === 'PGRST116') {
        // No record exists, create one
        const { data: newMeal, error: createError } = await supabase
          .from('meals')
          .insert({ user_id: user.id, date: currentDate })
          .select()
          .single();

        if (createError) {
          errors.push(`Failed to create meal record for user ${user.id}`);
          continue;
        }
        meal = newMeal;
      } else if (mealError) {
        errors.push(`Failed to fetch meal for user ${user.id}`);
        continue;
      }

      // Check each meal type
      const meals: MealType[] = [
        {
          type: 'breakfast',
          time: user.breakfast_time,
          completed: meal.breakfast_completed,
          notificationSent: meal.breakfast_notification_sent_at,
        },
        {
          type: 'snack1',
          time: user.snack1_time,
          completed: meal.snack1_completed,
          notificationSent: meal.snack1_notification_sent_at,
        },
        {
          type: 'lunch',
          time: user.lunch_time,
          completed: meal.lunch_completed,
          notificationSent: meal.lunch_notification_sent_at,
        },
        {
          type: 'snack2',
          time: user.snack2_time,
          completed: meal.snack2_completed,
          notificationSent: meal.snack2_notification_sent_at,
        },
        {
          type: 'dinner',
          time: user.dinner_time,
          completed: meal.dinner_completed,
          notificationSent: meal.dinner_notification_sent_at,
        },
      ];

      for (const mealInfo of meals) {
        if (!mealInfo.time) continue;

        // Parse meal time and check if it's 1+ hour overdue
        const [hours, minutes] = mealInfo.time.split(':').map(Number);
        const scheduledTime = new Date(currentTime);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const oneHourAfter = new Date(scheduledTime.getTime() + 60 * 60 * 1000);

        // Check if meal is overdue, not completed, and notification not sent
        if (
          currentTime >= oneHourAfter &&
          !mealInfo.completed &&
          !mealInfo.notificationSent
        ) {
          // Send notification
          const mealName = {
            breakfast: 'breakfast',
            snack1: 'morning snack',
            lunch: 'lunch',
            snack2: 'afternoon snack',
            dinner: 'dinner',
          }[mealInfo.type];

          const greeting = user.full_name ? ` ${user.full_name}` : '';
          const message = `Hey${greeting}! You missed your ${mealName}. Don't forget to log it!`;

          try {
            const response = await fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${oneSignalAuthKey}`,
              },
              body: JSON.stringify({
                app_id: oneSignalAppId,
                include_external_user_ids: [user.id],
                headings: { en: 'Meal Reminder' },
                contents: { en: message },
                url: '/meals',
                data: {
                  type: 'meal_reminder',
                  meal_type: mealInfo.type,
                  date: currentDate,
                },
              }),
            });

            if (response.ok) {
              // Mark notification as sent
              const updateField = `${mealInfo.type}_notification_sent_at`;
              await supabase
                .from('meals')
                .update({ [updateField]: currentTime.toISOString() })
                .eq('id', meal.id);

              notificationsSent++;
            } else {
              const errorData = await response.json();
              errors.push(
                `Failed to send ${mealInfo.type} notification to user ${user.id}: ${JSON.stringify(errorData)}`
              );
            }
          } catch (error) {
            errors.push(
              `Error sending ${mealInfo.type} notification to user ${user.id}: ${error.message}`
            );
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent,
        usersProcessed: users?.length || 0,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in meal-reminders function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
