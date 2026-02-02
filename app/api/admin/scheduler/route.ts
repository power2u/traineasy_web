import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { internalScheduler } from '@/lib/cron/internal-scheduler';

/**
 * Admin endpoint to manage the internal scheduler
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admin users (temporarily allowing all authenticated users for testing)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 403 }
      );
    }
    
    // TODO: Uncomment this line in production to restrict to super_admin only
    // if (session.user.role !== 'super_admin') {
    //   return NextResponse.json(
    //     { error: 'Unauthorized - Admin access required' },
    //     { status: 403 }
    //   );
    // }

    const status = internalScheduler.getStatus();
    
    return NextResponse.json({
      success: true,
      scheduler: status,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Start/stop the internal scheduler
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admin users (temporarily allowing all authenticated users for testing)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 403 }
      );
    }
    
    // TODO: Uncomment this line in production to restrict to super_admin only
    // if (session.user.role !== 'super_admin') {
    //   return NextResponse.json(
    //     { error: 'Unauthorized - Admin access required' },
    //     { status: 403 }
    //   );
    // }

    const { action } = await request.json();
    
    if (action === 'start') {
      internalScheduler.start();
      return NextResponse.json({
        success: true,
        message: 'Scheduler started',
        status: internalScheduler.getStatus(),
      });
    } else if (action === 'stop') {
      internalScheduler.stop();
      return NextResponse.json({
        success: true,
        message: 'Scheduler stopped',
        status: internalScheduler.getStatus(),
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error managing scheduler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}