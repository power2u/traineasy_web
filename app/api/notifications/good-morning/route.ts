import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/firebase/admin';
import { shouldSendGoodMorningNotification, getCurrentDateInTimezone } from '@/lib/utils/timezone';
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
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    console.log(`Good Morning cron running at ${now.toISOString()}`);
    
    // Get all users who should receive good morning notification (7 AM in their timezone)
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
        // Check if it's time to send good morning notification for this user
        const userTimezone = user.timezone || 'Asia/Kolkata';
        const timeCheck = shouldSendGoodMorningNotification(userTimezone);
        
        console.log(`User ${user.id} (${user.full_name}): Local time is ${timeCheck.userCurrentTime}, should send: ${timeCheck.shouldSend}`);
        
        // Check if it's 7:00 AM in user's timezone
        if (timeCheck.shouldSend) {
          // Check if we already sent a good morning notification today (in user's timezone)
          const today = getCurrentDateInTimezone(userTimezone);
          const { data: existingNotification } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('notification_type', 'good_morning')
            .gte('created_at', `${today}T00:00:00Z`)
            .lt('created_at', `${today}T23:59:59Z`)
            .single();

          if (existingNotification) {
            console.log(`Good morning notification already sent today for user ${user.id}`);
            continue;
          }

          // Get FCM tokens for this user
          const { data: tokens } = await supabase
            .from('fcm_tokens')
            .select('token')
            .eq('user_id', user.id);
          
          if (!tokens || tokens.length === 0) {
            console.log(`No FCM tokens for user ${user.id}`);
            continue;
          }
          
          console.log(`Found ${tokens.length} FCM tokens for user ${user.id}`);

          // Get active good morning message from database
          const messageResult = await getActiveNotificationMessage('good_morning');
          
          let title = 'Good Morning!';
          let body = 'Have a great day ahead!';
          
          if (messageResult.success && messageResult.message) {
            title = messageResult.message.title;
            body = messageResult.message.message;
            
            // Replace {name} placeholder with user's name
            const userName = user.full_name?.split(' ')[0] || 'there';
            title = title.replace(/{name}/g, userName);
            body = body.replace(/{name}/g, userName);
          }

          const notificationPayload = {
            title,
            body,
            data: {
              type: 'good_morning',
              action: 'open_app',
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
            console.log(`Good morning notification sent to user ${user.id} (${user.full_name})`);
            
            // Log the notification to prevent duplicates
            await supabase
              .from('notification_logs')
              .insert({
                user_id: user.id,
                notification_type: 'good_morning',
                title: notificationPayload.title,
                body: notificationPayload.body,
                sent_at: now.toISOString(),
                metadata: {
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

    console.log(`Good morning notifications sent: ${notificationsSent}`);
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
    console.error('Good morning notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}