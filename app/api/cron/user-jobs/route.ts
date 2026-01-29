import { NextResponse } from 'next/server';
import { cronManager } from '@/lib/cron/local-cron-manager';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Security Check: Verify Authentication & Authorization
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      );
    }

    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only view your own jobs' },
        { status: 403 }
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

    // Security Check: Verify Authentication & Authorization
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      );
    }

    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only modify your own jobs' },
        { status: 403 }
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