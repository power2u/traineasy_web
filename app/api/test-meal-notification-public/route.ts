import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';

// PUBLIC TEST ENDPOINT - FOR DEVELOPMENT ONLY
// This endpoint doesn't require authentication and uses a test user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mealType = searchParams.get('meal') || 'breakfast';
    const testUserId = searchParams.get('userId'); // Optional: specify a user ID

    const adminClient = createAdminClient();
    
    // Get a test user (first user with notifications enabled)
    let userQuery = adminClient
      .from('user_preferences')
      .select('id, full_name')
      .eq('notifications_enabled', true);
    
    if (testUserId) {
      userQuery = userQuery.eq('id', testUserId);
    }
    
    const { data: users, error: usersError } = await userQuery.limit(1);

    if (usersError || !users || users.length === 0) {
      return NextResponse.json(
        { 
          error: 'No test users found with notifications enabled',
          details: usersError,
          suggestion: 'Make sure at least one user has notifications_enabled = true'
        },
        { status: 404 }
      );
    }

    const testUser = users[0];

    // Get user's FCM tokens
    const { data: tokens, error: tokensError } = await adminClient
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', testUser.id);

    if (tokensError) {
      return NextResponse.json(
        { error: 'Failed to fetch FCM tokens', details: tokensError },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { 
          error: 'No active FCM tokens found for test user',
          details: { userId: testUser.id, userName: testUser.full_name },
          suggestion: 'The test user needs to have registered for push notifications'
        },
        { status: 400 }
      );
    }

    // Meal type labels
    const mealLabels: Record<string, string> = {
      breakfast: 'breakfast',
      snack1: 'morning snack',
      lunch: 'lunch',
      snack2: 'afternoon snack',
      dinner: 'dinner',
    };

    const mealLabel = mealLabels[mealType] || mealType;
    const userName = testUser.full_name || 'there';
    
    // Create test notification message
    const notificationMessage = `🧪 Test notification for ${mealLabel}! This is a development test for ${userName}.`;

    // Send notification
    const fcmResult = await sendPushNotification({
      tokens: tokens.map(t => t.token),
      title: '🧪 Dev Test Notification',
      body: notificationMessage,
      data: {
        type: 'dev_test_notification',
        meal_type: mealType,
        date: new Date().toISOString().split('T')[0],
        url: '/meals',
        test: 'true'
      },
    });

    // Clean up invalid tokens if any
    if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
      await adminClient
        .from('fcm_tokens')
        .delete()
        .eq('user_id', testUser.id)
        .in('token', fcmResult.invalidTokens);
    }

    return NextResponse.json({
      success: fcmResult.success,
      message: fcmResult.success 
        ? `Test notification sent successfully to ${fcmResult.successCount} device(s)`
        : fcmResult.error || 'Failed to send notification',
      details: {
        userId: testUser.id,
        userName: testUser.full_name,
        mealType,
        mealLabel,
        notificationMessage,
        tokensCount: tokens.length,
        fcmResponse: {
          success: fcmResult.success,
          successCount: fcmResult.successCount,
          failureCount: fcmResult.failureCount,
          invalidTokens: fcmResult.invalidTokens?.length || 0
        }
      }
    });

  } catch (error: any) {
    console.error('Public test meal notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Support both GET and POST methods
  return GET(request);
}