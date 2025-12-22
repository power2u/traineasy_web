import { NextResponse } from 'next/server';
import { cronManager } from '@/lib/cron/local-cron-manager';
import { createClient } from '@/lib/supabase/server';

/**
 * Sync cron jobs when user logs in (limited to once per day)
 * POST /api/cron/sync-on-login
 */
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify user exists and get their preferences
    const supabase = await createClient();
    const { data: user, error: userError } = await supabase
      .from('user_preferences')
      .select('id, notifications_enabled, updated_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has notifications enabled
    if (!user.notifications_enabled) {
      return NextResponse.json({
        success: true,
        message: 'Notifications disabled for user',
        synced: false,
      });
    }

    // Check when cron jobs were last updated
    const { data: lastCronUpdate } = await supabase
      .from('user_cron_jobs')
      .select('updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    let shouldSync = true;
    let reason = 'First time setup';

    if (lastCronUpdate && lastCronUpdate.length > 0) {
      const lastUpdate = new Date(lastCronUpdate[0].updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        shouldSync = false;
        reason = `Last updated ${Math.round(hoursSinceUpdate)} hours ago`;
      } else {
        reason = `Last updated ${Math.round(hoursSinceUpdate)} hours ago, syncing now`;
      }
    }

    if (!shouldSync) {
      return NextResponse.json({
        success: true,
        message: `Cron jobs already up to date. ${reason}`,
        synced: false,
        lastUpdate: lastCronUpdate?.[0]?.updated_at,
      });
    }

    // Sync cron jobs (this will check daily limit internally too)
    const result = await cronManager.registerUserCronJobs(userId);

    // Log user activity for login tracking
    try {
      await supabase
        .from('user_activity')
        .insert({
          user_id: userId,
          activity_type: 'cron_sync',
          activity_data: { reason, synced: result.success },
        });
    } catch (activityError) {
      console.warn('Failed to log user activity:', activityError);
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      synced: result.success,
      reason,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error syncing cron jobs on login:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}