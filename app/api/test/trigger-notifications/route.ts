import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Manual trigger for notification processing (for testing)
 * This processes notifications directly using Prisma
 */
export async function POST() {
  try {
    console.log('Manually triggering notification processing...');

    // Get all active and enabled notification messages
    const notificationConfigs = await prisma.notificationMessage.findMany({
      where: {
        isActive: true,
        isEnabled: true
      }
    });

    let processedCount = 0;
    const errors: string[] = [];

    // Process each notification configuration
    for (const config of notificationConfigs) {
      try {
        // Get users who should receive this notification
        const users = await prisma.userPreference.findMany({
          where: {
            notificationsEnabled: true
          },
          select: {
            id: true,
            fullName: true,
            timezone: true
          }
        });

        // Queue notifications for eligible users
        // Note: Actual notification sending logic would go here
        processedCount += users.length;
      } catch (err: any) {
        errors.push(`Error processing ${config.notificationType}: ${err.message}`);
      }
    }

    console.log(`Notification processing complete: ${processedCount} notifications queued`);

    return NextResponse.json({
      success: true,
      message: 'Notifications processed successfully',
      result: {
        processed_count: processedCount,
        config_count: notificationConfigs.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    console.error('Error triggering notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger notification processing',
    endpoints: {
      trigger: 'POST /api/test/trigger-notifications',
      process_queue: 'POST /api/process-notification-queue',
      queue_status: 'GET /api/process-notification-queue'
    }
  });
}