import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Manual trigger for notification processing (for testing)
 * This calls the PL/pgSQL function directly
 */
export async function POST() {
  try {
    const adminClient = createAdminClient();
    
    console.log('Manually triggering notification processing...');
    
    // Call the PL/pgSQL function
    const { data: result, error } = await adminClient
      .rpc('process_hourly_notifications');

    if (error) {
      console.error('Error calling process_hourly_notifications:', error);
      return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 });
    }

    console.log('Notification processing result:', result);

    return NextResponse.json({
      success: true,
      message: 'Notifications processed successfully',
      result: result?.[0] || null
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