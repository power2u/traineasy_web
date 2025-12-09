import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const mealType = searchParams.get('meal') || 'breakfast';
    const testMode = searchParams.get('test') === 'true';

    // Validate meal type
    const validMealTypes = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];
    if (!validMealTypes.includes(mealType)) {
      return NextResponse.json(
        { error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = preferences?.full_name || user.email?.split('@')[0] || 'there';

    // Prepare meal label
    const mealLabels: Record<string, string> = {
      breakfast: 'breakfast',
      snack1: 'morning snack',
      lunch: 'lunch',
      snack2: 'afternoon snack',
      dinner: 'dinner',
    };

    const mealLabel = mealLabels[mealType];
    const message = `Hey ${userName}! You missed your ${mealLabel}. Don't forget to log it!`;

    // Get user's FCM tokens from database
    const { data: tokens, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user.id);

    if (tokenError || !tokens || tokens.length === 0) {
      return NextResponse.json(
        {
          error: 'No FCM tokens found for user',
          details: 'User needs to grant notification permission first',
        },
        { status: 404 }
      );
    }

    // Send notification via Firebase Admin SDK
    const { sendPushNotification } = await import('@/lib/firebase/admin');
    
    const result = await sendPushNotification({
      tokens: tokens.map(t => t.token),
      title: '🍽️ Meal Reminder',
      body: message,
      data: {
        type: 'meal_reminder',
        meal_type: mealType,
        date: new Date().toISOString().split('T')[0],
        test: testMode.toString(),
        url: '/meals',
      },
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to send notification',
          details: result.error || 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Clean up invalid tokens if any
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      const { error: cleanupError } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', user.id)
        .in('token', result.invalidTokens);

      if (cleanupError) {
        console.warn('Failed to cleanup invalid tokens:', cleanupError);
      } else {
        console.log(`Cleaned up ${result.invalidTokens.length} invalid token(s)`);
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully!',
      details: {
        userId: user.id,
        userName: userName,
        mealType: mealType,
        mealLabel: mealLabel,
        notificationMessage: message,
        tokensCount: tokens?.length || 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        invalidTokensCleaned: result.invalidTokens?.length || 0,
        fcmResponse: result,
      },
    });

  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS for CORS if needed
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
