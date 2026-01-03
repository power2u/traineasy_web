import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/firebase/admin';

/**
 * Test endpoint to send a real notification to verify FCM integration
 */
export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient();
    
    // Get a test user with FCM tokens
    const { data: users, error: usersError } = await adminClient
      .from('user_preferences')
      .select('id, full_name')
      .eq('notifications_enabled', true)
      .limit(1);

    if (usersError || !users || users.length === 0) {
      return NextResponse.json({ error: 'No test users found' }, { status: 404 });
    }

    const testUser = users[0];

    // Get FCM tokens for this user
    const { data: tokens, error: tokensError } = await adminClient
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', testUser.id);

    if (tokensError || !tokens || tokens.length === 0) {
      return NextResponse.json({ 
        error: 'No FCM tokens found for test user',
        user: testUser 
      }, { status: 404 });
    }

    // Send test notification
    const userName = testUser.full_name?.split(' ')[0] || 'there';
    const fcmResult = await sendPushNotification({
      tokens: tokens.map(t => t.token),
      title: '🧪 Test Notification',
      body: `Hi ${userName}! This is a test notification from your unified notification system. Everything is working perfectly! 🚀`,
      data: {
        type: 'test_notification',
        action: 'open_app',
        timestamp: new Date().toISOString()
      }
    });

    // Log the test notification
    if (fcmResult.success) {
      await adminClient
        .from('notification_logs')
        .insert({
          user_id: testUser.id,
          notification_type: 'test_notification',
          title: '🧪 Test Notification',
          body: `Hi ${userName}! This is a test notification from your unified notification system. Everything is working perfectly! 🚀`,
          sent_at: new Date().toISOString(),
          metadata: {
            successCount: fcmResult.successCount,
            failureCount: fcmResult.failureCount,
            test: true
          }
        });
    }

    return NextResponse.json({
      success: fcmResult.success,
      message: fcmResult.success ? 'Test notification sent successfully!' : 'Failed to send test notification',
      details: {
        user: testUser,
        tokensCount: tokens.length,
        fcmResult: {
          successCount: fcmResult.successCount,
          failureCount: fcmResult.failureCount,
          errors: fcmResult.error
        }
      }
    });

  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}