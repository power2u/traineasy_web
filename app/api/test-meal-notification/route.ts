import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mealType = searchParams.get('meal') || 'breakfast';
    const isTest = searchParams.get('test') === 'true';

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated', details: authError },
        { status: 401 }
      );
    }

    // Try to get user profile, use email as fallback
    const { data: userProfile } = await supabase
      .from('user_preferences')
      .select('id, full_name')
      .eq('id', user.id)
      .single();

    // Use email as fallback if no profile found
    const userName = userProfile?.full_name || user.email?.split('@')[0] || 'User';

    // Get user's FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user.id);

    if (tokensError) {
      return NextResponse.json(
        { error: 'Failed to fetch FCM tokens', details: tokensError },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'No active FCM tokens found. Please enable notifications first.' },
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
    const displayName = userName || 'there';
    
    // Create test notification message
    const notificationMessage = isTest 
      ? `🧪 Test notification for ${mealLabel}! This is a test from the dev panel.`
      : `Hey ${displayName}! You missed your ${mealLabel}. Don't forget to log it!`;

    // Send notification
    const fcmResult = await sendPushNotification({
      tokens: tokens.map(t => t.token),
      title: isTest ? '🧪 Test Meal Notification' : '🍽️ Meal Reminder',
      body: notificationMessage,
      data: {
        type: isTest ? 'test_meal_notification' : 'meal_reminder',
        meal_type: mealType,
        date: new Date().toISOString().split('T')[0],
        url: '/meals',
        test: isTest.toString()
      },
    });

    // Clean up invalid tokens if any
    if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
      await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', user.id)
        .in('token', fcmResult.invalidTokens);
    }

    return NextResponse.json({
      success: fcmResult.success,
      message: fcmResult.success 
        ? `Test notification sent successfully to ${fcmResult.successCount} device(s)`
        : fcmResult.error || 'Failed to send notification',
      details: {
        userId: user.id,
        userName: userName,
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
    console.error('Test meal notification error:', error);
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