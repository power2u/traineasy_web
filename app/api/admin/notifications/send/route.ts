import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const isSuperAdmin = session.user.role === 'super_admin';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    // Use session user info
    const user = {
      id: session.user.id,
      email: session.user.email
    };
    const { data: profile } = await adminClient
      .from('user_preferences')
      .select('id, full_name')
      .eq('id', user.id)
      .single();

    // Use email as fallback if no profile found
    const adminName = profile?.full_name || user.email || 'Admin';

    // Parse request body
    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Get all active FCM tokens using admin client
    const { data: tokens, error: tokensError } = await adminClient
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

    console.log(`[Admin Notification] ${adminName} sending to ${uniqueTokens.length} tokens: "${title}"`);

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
      await adminClient
        .from('fcm_tokens')
        .delete()
        .in('token', result.invalidTokens);
    }

    // Aggregate error details
    const errorDetails: Record<string, number> = {};
    if (result.responses) {
      result.responses.forEach((resp: any) => {
        if (!resp.success && resp.error) {
          const msg = resp.error.message || resp.error.code || 'Unknown error';
          errorDetails[msg] = (errorDetails[msg] || 0) + 1;
        }
      });
    }

    const details = Object.entries(errorDetails).map(([error, count]) => ({
      error,
      count
    }));

    return NextResponse.json({
      success: result.success,
      totalTokens: uniqueTokens.length,
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      message: result.success
        ? `Notification sent successfully to ${result.successCount || 0} out of ${uniqueTokens.length} devices`
        : result.error || 'Failed to send notification',
      details,
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