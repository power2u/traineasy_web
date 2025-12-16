import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get current UTC time
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    console.log(`Good Morning cron running at ${now.toISOString()}`);
    
    // Get all users who should receive good morning notification (7 AM in their timezone)
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select(`
        id,
        full_name,
        timezone,
        notifications_enabled
      `)
      .eq('notifications_enabled', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      console.log('No users found with notifications enabled');
      return NextResponse.json({ message: 'No users to notify' });
    }

    let notificationsSent = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Calculate user's local time
        const userTimezone = user.timezone || 'Asia/Kolkata';
        const userLocalTime = new Date().toLocaleString('en-US', { 
          timeZone: userTimezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const [userHour, userMinute] = userLocalTime.split(':').map(Number);
        
        // Check if it's 7:00 AM in user's timezone (with 60-minute window since cron runs hourly)
        if (userHour === 7) {
          // Check if we already sent a good morning notification today
          const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
          const { data: existingNotification } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('notification_type', 'good_morning')
            .gte('created_at', `${today}T00:00:00Z`)
            .lt('created_at', `${today}T23:59:59Z`)
            .single();

          if (existingNotification) {
            console.log(`Good morning notification already sent today for user ${user.id}`);
            continue;
          }

          // Get FCM tokens for this user
          const { data: tokens } = await supabase
            .from('fcm_tokens')
            .select('token')
            .eq('user_id', user.id)
            .eq('is_active', true);
          
          if (!tokens || tokens.length === 0) {
            console.log(`No active FCM tokens for user ${user.id}`);
            continue;
          }

          // Send good morning notification
          const notificationPayload = {
            title: '🌅 Good Morning!',
            body: `Good morning ${user.full_name || 'there'}! Ready to start your wellness journey today?`,
            data: {
              type: 'good_morning',
              action: 'open_app',
              timestamp: now.toISOString()
            }
          };

          // Send to FCM service
          const fcmResponse = await fetch(`http://localhost:3000/api/fcm/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tokens: tokens.map(t => t.token),
              notification: notificationPayload
            })
          });

          if (fcmResponse.ok) {
            notificationsSent++;
            console.log(`Good morning notification sent to user ${user.id} (${user.full_name})`);
            
            // Log the notification to prevent duplicates
            await supabase
              .from('notification_logs')
              .insert({
                user_id: user.id,
                notification_type: 'good_morning',
                title: notificationPayload.title,
                body: notificationPayload.body,
                sent_at: now.toISOString()
              });
          } else {
            const errorText = await fcmResponse.text();
            errors.push(`Failed to send to user ${user.id}: ${errorText}`);
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        errors.push(`Error processing user ${user.id}: ${userError}`);
      }
    }

    console.log(`Good morning notifications sent: ${notificationsSent}`);
    if (errors.length > 0) {
      console.error('Errors:', errors);
    }

    return NextResponse.json({
      success: true,
      notificationsSent,
      totalUsers: users.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Good morning notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}