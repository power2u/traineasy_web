import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getActiveNotificationMessage } from '@/app/actions/notification-messages';
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
    const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    
    console.log(`Weekly measurement reminder cron running at ${now.toISOString()}, day: ${currentDay}`);
    
    // Get all users who should receive weekly measurement reminders
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
        const userDate = new Date().toLocaleDateString('en-US', { 
          timeZone: userTimezone,
          weekday: 'long'
        });
        const userTime = new Date().toLocaleTimeString('en-US', { 
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const weekday = userDate;
        const [userHour] = userTime.split(':').map(Number);
        
        // Send reminder on Sunday at 10:00 AM in user's timezone
        if (weekday === 'Sunday' && userHour === 10) {
          // Check if we already sent a weekly measurement reminder this week
          const weekStart = new Date();
          weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()); // Start of current week (Sunday)
          weekStart.setUTCHours(0, 0, 0, 0);
          
          const { data: existingNotification } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('notification_type', 'weekly_measurement_reminder')
            .gte('created_at', weekStart.toISOString())
            .single();

          if (existingNotification) {
            console.log(`Weekly measurement reminder already sent this week for user ${user.id}`);
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

          // Check last measurement date for personalized message
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const { data: recentMeasurements } = await supabase
            .from('body_measurements')
            .select('date, measurement_type')
            .eq('user_id', user.id)
            .gte('date', oneWeekAgo.toISOString().split('T')[0])
            .order('date', { ascending: false });

          const hasRecentWeight = recentMeasurements?.some(m => m.measurement_type === 'weight') ?? false;
          const hasRecentBodyMeasurements = recentMeasurements?.some(m => m.measurement_type !== 'weight') ?? false;
          
          // Get active weekly measurement reminder message from database
          const messageResult = await getActiveNotificationMessage('weekly_measurement_reminder');
          
          let title = '📏 Weekly Measurement Reminder';
          let bodyMessage = `Hey ${user.full_name || 'there'}! Time for your weekly measurements!`;
          
          if (messageResult.success && messageResult.message) {
            title = messageResult.message.title;
            bodyMessage = messageResult.message.message;
            
            // Replace {name} placeholder with user's name
            const userName = user.full_name?.split(' ')[0] || 'there';
            title = title.replace(/{name}/g, userName);
            bodyMessage = bodyMessage.replace(/{name}/g, userName);
          }

          const actionUrl = '/measurements';

          // Send weekly measurement reminder notification
          const notificationPayload = {
            title,
            body: bodyMessage,
            data: {
              type: 'weekly_measurement_reminder',
              action: 'open_measurements',
              url: actionUrl,
              hasRecentWeight: hasRecentWeight.toString(),
              hasRecentBodyMeasurements: hasRecentBodyMeasurements.toString(),
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
            console.log(`Weekly measurement reminder sent to user ${user.id} (${user.full_name})`);
            
            // Log the notification to prevent duplicates
            await supabase
              .from('notification_logs')
              .insert({
                user_id: user.id,
                notification_type: 'weekly_measurement_reminder',
                title: notificationPayload.title,
                body: bodyMessage,
                sent_at: now.toISOString(),
                metadata: { 
                  hasRecentWeight, 
                  hasRecentBodyMeasurements,
                  weekStart: weekStart.toISOString(),
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

    console.log(`Weekly measurement reminders sent: ${notificationsSent}`);
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
    console.error('Weekly measurement reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}