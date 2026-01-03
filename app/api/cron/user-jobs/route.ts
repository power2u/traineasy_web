import { NextResponse } from 'next/server';
import { cronManager } from '@/lib/cron/local-cron-manager';

/**
 * Get all cron jobs for a user
 * GET /api/cron/user-jobs?userId=<userId>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's cron jobs
    const cronJobs = await cronManager.getUserCronJobs(userId);

    return NextResponse.json({
      success: true,
      cronJobs,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting user cron jobs:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Toggle cron jobs for a user (enable/disable)
 * POST /api/cron/user-jobs
 */
export async function POST(request: Request) {
  try {
    const { userId, enabled } = await request.json();

    if (!userId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'User ID and enabled status are required' },
        { status: 400 }
      );
    }

    // Toggle cron jobs
    const result = await cronManager.toggleUserCronJobs(userId, enabled);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error toggling user cron jobs:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}