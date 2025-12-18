import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    // This is a test endpoint - in production, add proper authentication
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Use admin client to get FCM tokens
    const adminClient = createAdminClient();
    
    // Get all active FCM tokens
    const { data: tokens, error: tokensError } = await adminClient
      .from('fcm_tokens')
      .select('token, user_id')
      .order('created_at', { ascending: false });

    if (tokensError) {
      console.error('Error fetching FCM tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: true,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        message: 'No FCM tokens found in the database',
      });
    }

    // Extract unique tokens
    const uniqueTokens = [...new Set(tokens.map(t => t.token))];

    console.log(`[Test Admin Notification] Sending to ${uniqueTokens.length} tokens: "${title}"`);

    // Send notification using Firebase Admin SDK
    const result = await sendPushNotification({
      tokens: uniqueTokens,
      title,
      body,
      data: {
        type: 'test_admin_notification',
        timestamp: new Date().toISOString(),
        url: '/dashboard',
      },
    });

    // Clean up invalid tokens if any
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      await adminClient
        .from('fcm_tokens')
        .delete()
        .in('token', result.invalidTokens);
    }

    return NextResponse.json({
      success: result.success,
      totalTokens: uniqueTokens.length,
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      message: result.success 
        ? `Test notification sent successfully to ${result.successCount || 0} out of ${uniqueTokens.length} devices`
        : result.error || 'Failed to send notification',
    });

  } catch (error: any) {
    console.error('Error in test admin notification:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        success: false,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        message: 'Failed to send notification due to server error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test Admin Notifications Endpoint',
    usage: {
      method: 'POST',
      body: {
        title: 'string',
        body: 'string'
      }
    },
    example: 'POST /api/test-admin-notifications with body: {"title": "Test", "body": "Test message"}'
  });
}