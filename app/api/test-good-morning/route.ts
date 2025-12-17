import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    console.log('Test good morning notification starting...');
    
    // Get all users who should receive good morning notification
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
    const results: any[] = [];

    for (const user of users) {
      try {
        console.log(`Processing user ${user.id} (${user.full_name})`);

        // Get FCM tokens for this user
        const { data: tokens } = await supabase
          .from('fcm_tokens')
          .select('token')
          .eq('user_id', user.id);
        
        console.log(`Found ${tokens?.length || 0} FCM tokens for user ${user.id}`);
        
        if (!tokens || tokens.length === 0) {
          results.push({
            userId: user.id,
            name: user.full_name,
            status: 'skipped',
            reason: 'No FCM tokens'
          });
          continue;
        }

        // Send good morning notification
        const notificationPayload = {
          title: '🌅 Test Good Morning!',
          body: `Good morning ${user.full_name || 'there'}! This is a test notification.`,
          data: {
            type: 'test_good_morning',
            action: 'open_app',
            timestamp: new Date().toISOString()
          }
        };

        console.log(`Sending notification to ${tokens.length} tokens for user ${user.id}`);

        // Send push notification using Firebase Admin SDK
        const fcmResult = await sendPushNotification({
          tokens: tokens.map(t => t.token),
          title: notificationPayload.title,
          body: notificationPayload.body,
          data: notificationPayload.data
        });

        console.log(`FCM Result for user ${user.id}:`, fcmResult);

        if (fcmResult.success) {
          notificationsSent++;
          console.log(`Test notification sent to user ${user.id} (${user.full_name})`);
          
          // Log the notification
          await supabase
            .from('notification_logs')
            .insert({
              user_id: user.id,
              notification_type: 'test_good_morning',
              title: notificationPayload.title,
              body: notificationPayload.body,
              sent_at: new Date().toISOString(),
              metadata: {
                successCount: fcmResult.successCount,
                failureCount: fcmResult.failureCount,
                test: true
              }
            });

          results.push({
            userId: user.id,
            name: user.full_name,
            status: 'success',
            successCount: fcmResult.successCount,
            failureCount: fcmResult.failureCount
          });
        } else {
          errors.push(`Failed to send to user ${user.id}: ${fcmResult.error}`);
          results.push({
            userId: user.id,
            name: user.full_name,
            status: 'failed',
            error: fcmResult.error
          });
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        errors.push(`Error processing user ${user.id}: ${userError}`);
        results.push({
          userId: user.id,
          name: user.full_name,
          status: 'error',
          error: userError
        });
      }
    }

    console.log(`Test notifications sent: ${notificationsSent}`);
    if (errors.length > 0) {
      console.error('Errors:', errors);
    }

    return NextResponse.json({
      success: true,
      notificationsSent,
      totalUsers: users.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Test good morning notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}