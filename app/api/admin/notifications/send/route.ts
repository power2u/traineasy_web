import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const role = user.app_metadata?.role || user.user_metadata?.role;
    const isSuperAdmin = role === 'super_admin';
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from('user_preferences')
      .select('id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Parse request body
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Get all active FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token, user_id')
      .order('created_at', { ascending: false });

    if (tokensError) {
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

    // Extract unique tokens (in case a user has multiple tokens)
    const uniqueTokens = [...new Set(tokens.map(t => t.token))];

    console.log(`[Admin Notification] ${profile.full_name} sending to ${uniqueTokens.length} tokens: "${title}"`);

    // Send notification using Firebase Admin SDK
    const result = await sendPushNotification({
      tokens: uniqueTokens,
      title,
      body,
      data: {
        type: 'admin_notification',
        timestamp: new Date().toISOString(),
        url: '/dashboard',
      },
    });

    // Clean up invalid tokens if any
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      await supabase
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
        ? `Notification sent successfully to ${result.successCount || 0} out of ${uniqueTokens.length} devices`
        : result.error || 'Failed to send notification',
    });

  } catch (error: any) {
    console.error('Error in admin notification send:', error);
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