import { NextResponse } from 'next/server';
import { cronManager } from '@/lib/cron/local-cron-manager';
import { createClient } from '@/lib/supabase/server';

/**
 * Sync cron jobs when user logs in (DISABLED - using API-based system instead)
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

    // Log user activity for login tracking
    const supabase = await createClient();
    try {
      await supabase
        .from('user_activity')
        .insert({
          user_id: userId,
          activity_type: 'login',
          activity_data: { note: 'Using API-based notification system' },
        });
    } catch (activityError) {
      console.warn('Failed to log user activity:', activityError);
    }

    // Return success - we're using the API-based notification system now
    return NextResponse.json({
      success: true,
      message: 'Using API-based notification system (no local cron needed)',
      synced: false,
      system: 'api-based',
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in cron sync endpoint:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}