import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/firebase/admin';

/**
 * Process notification queue - sends FCM notifications for queued items
 * This endpoint is called by external services or can be triggered manually
 */
export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient();
    
    // Get unprocessed notifications from queue
    const { data: queuedNotifications, error: queueError } = await adminClient
      .from('notification_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(100); // Process in batches

    if (queueError) {
      console.error('Error fetching notification queue:', queueError);
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    if (!queuedNotifications || queuedNotifications.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No notifications to process',
        processed: 0 
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each notification
    for (const notification of queuedNotifications) {
      try {
        const tokens = notification.fcm_tokens as string[];
        
        if (tokens && tokens.length > 0) {
          // Send FCM notification
          const fcmResult = await sendPushNotification({
            tokens,
            title: notification.title,
            body: notification.body,
            data: notification.payload?.data || {}
          });

          if (fcmResult.success) {
            // Mark as processed
            await adminClient
              .from('notification_queue')
              .update({ 
                processed: true, 
                processed_at: new Date().toISOString() 
              })
              .eq('id', notification.id);

            // Update notification log with success info
            await adminClient
              .from('notification_logs')
              .update({
                metadata: {
                  ...notification.payload,
                  fcm_result: {
                    successCount: fcmResult.successCount,
                    failureCount: fcmResult.failureCount
                  }
                }
              })
              .eq('user_id', notification.user_id)
              .eq('notification_type', notification.notification_type)
              .eq('title', notification.title);

            successCount++;
          } else {
            throw new Error(fcmResult.error || 'FCM send failed');
          }
        } else {
          throw new Error('No FCM tokens available');
        }
      } catch (error: any) {
        console.error(`Error processing notification ${notification.id}:`, error);
        
        // Mark as processed with error
        await adminClient
          .from('notification_queue')
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString(),
            error_message: error.message 
          })
          .eq('id', notification.id);

        errors.push(`Notification ${notification.id}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`Processed ${successCount} notifications successfully, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      processed: queuedNotifications.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error processing notification queue:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check queue status
export async function GET() {
  try {
    const adminClient = createAdminClient();
    
    const { data: queueStats, error } = await adminClient
      .from('notification_queue')
      .select('processed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (error) {
      return NextResponse.json({ error: 'Failed to get queue stats' }, { status: 500 });
    }

    const total = queueStats?.length || 0;
    const processed = queueStats?.filter(n => n.processed).length || 0;
    const pending = total - processed;

    return NextResponse.json({
      success: true,
      stats: {
        total,
        processed,
        pending,
        last24Hours: true
      }
    });

  } catch (error: any) {
    console.error('Error getting queue stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}