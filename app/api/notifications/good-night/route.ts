import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get current UTC time
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    console.log(`Good Night cron running at ${now.toISOString()}`);
    
    // Get all users who should receive good night notification (8 PM in their timezone)
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select(`
        id,
        full_name,
        timezone,
        notifications_enabled
      `)
      .eq('notifications_enabled', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log('No users found with notifications enabled');
      return NextResponse.json({ message: 'No users to notify' });
    }

    let notificationsSent = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Calculate user's local time
        const userTimezone = user.timezone || 'Asia/Kolkata';
        const userLocalTime = new Date().toLocaleString('en-US', { 
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const [userHour, userMinute] = userLocalTime.split(':').map(Number);
        
        // Check if it's 8:00 PM (20:00) in user's timezone (with 60-minute window since cron runs hourly)
        if (userHour === 20) {
          // Check if we already sent a good night notification today
          const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
          const { data: existingNotification } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('notification_type', 'good_night')
            .gte('created_at', `${today}T00:00:00Z`)
            .lt('created_at', `${today}T23:59:59Z`)
            .single();

          if (existingNotification) {
            console.log(`Good night notification already sent today for user ${user.id}`);
            continue;
          }

          // Get FCM tokens for this user
          const { data: tokens } = await supabase
            .from('fcm_tokens')
            .select('token')
            .eq('user_id', user.id);
          
          if (!tokens || tokens.length === 0) {
            console.log(`No active FCM tokens for user ${user.id}`);
            continue;
          }

          // Check today's meal completion for personalized message
          const todayForMeals = new Date().toISOString().split('T')[0];
          const { data: todayMeal } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', todayForMeals)
            .single();

          let completedMeals = 0;
          if (todayMeal) {
            completedMeals = [
              todayMeal.breakfast_completed,
              todayMeal.snack1_completed,
              todayMeal.lunch_completed,
              todayMeal.snack2_completed,
              todayMeal.dinner_completed
            ].filter(Boolean).length;
          }

          // Personalized good night message based on meal completion
          let bodyMessage = `Good night ${user.full_name || 'there'}! 🌙`;
          let actionUrl = '/meals';

          if (completedMeals >= 4) {
            bodyMessage += ' Great job completing your meals today! Sweet dreams! 😴';
            actionUrl = '/dashboard';
          } else if (completedMeals >= 2) {
            bodyMessage += ' You did well today! Don\'t forget to log tomorrow\'s meals. 📝';
          } else {
            bodyMessage += ' Remember to track your meals tomorrow for better health! 🍽️';
          }

          // Send good night notification
          const notificationPayload = {
            title: '🌙 Good Night!',
            body: bodyMessage,
            data: {
              type: 'good_night',
              action: 'open_meals',
              url: actionUrl,
              mealsCompleted: completedMeals.toString(),
              timestamp: now.toISOString()
            }
          };

          // Send push notification using Firebase Admin SDK
          const fcmResult = await sendPushNotification({
            tokens: tokens.map(t => t.token),
            title: notificationPayload.title,
            body: notificationPayload.body,
            data: notificationPayload.data
          });

          if (fcmResult.success) {
            notificationsSent++;
            console.log(`Good night notification sent to user ${user.id} (${user.full_name}) - ${completedMeals} meals completed`);
            
            // Log the notification to prevent duplicates
            await supabase
              .from('notification_logs')
              .insert({
                user_id: user.id,
                notification_type: 'good_night',
                title: notificationPayload.title,
                body: bodyMessage,
                sent_at: now.toISOString(),
                metadata: {
                  mealsCompleted: completedMeals,
                  successCount: fcmResult.successCount,
                  failureCount: fcmResult.failureCount
                }
              });
          } else {
            errors.push(`Failed to send to user ${user.id}: ${fcmResult.error}`);
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        errors.push(`Error processing user ${user.id}: ${userError}`);
      }
    }

    console.log(`Good night notifications sent: ${notificationsSent}`);
    if (errors.length > 0) {
      console.error('Errors:', errors);
    }

    return NextResponse.json({
      success: true,
      notificationsSent,
      totalUsers: users.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Good night notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}