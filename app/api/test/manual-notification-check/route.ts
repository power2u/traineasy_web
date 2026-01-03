import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Manual test endpoint to check notification logic
 * This helps debug why users are being skipped
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    console.log(`[Manual Test] Running notification check at ${now.toISOString()}`);

    // Get all users with notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select(`
        id,
        full_name,
        notifications_enabled,
        meal_reminders_enabled,
        water_reminders_enabled,
        weight_reminders_enabled,
        breakfast_time,
        snack1_time,
        lunch_time,
        snack2_time,
        dinner_time,
        timezone
      `)
      .eq('notifications_enabled', true);

    if (usersError) throw usersError;

    const results = [];

    for (const user of users || []) {
      const userTimezone = user.timezone || 'Asia/Kolkata';
      
      // Get time in user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const parts = formatter.formatToParts(now);
      const userHours = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
      const userMinutes = parseInt(parts.find(part => part.type === 'minute')?.value || '0');
      const userTimeStr = `${userHours.toString().padStart(2, '0')}:${userMinutes.toString().padStart(2, '0')}`;
      
      // Check notification times
      const notificationTimes = [
        { type: 'breakfast', time: user.breakfast_time },
        { type: 'snack1', time: user.snack1_time },
        { type: 'lunch', time: user.lunch_time },
        { type: 'snack2', time: user.snack2_time },
        { type: 'dinner', time: user.dinner_time },
        { type: 'water', time: '12:00' },
        { type: 'good_morning', time: '07:00' },
        { type: 'good_night', time: '21:00' },
      ];

      // Add weekly measurement reminder (Saturday 19:00)
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 6) {
        notificationTimes.push({ type: 'weekly_measurement', time: '19:00' });
      }

      const matches = [];
      for (const notif of notificationTimes) {
        if (!notif.time) continue;
        
        // Handle both "HH:MM" and "HH:MM:SS" formats
        const timeParts = notif.time.split(':');
        const targetHours = parseInt(timeParts[0]);
        const targetMinutes = parseInt(timeParts[1]);
        
        const userTotalMin = userHours * 60 + userMinutes;
        const targetTotalMin = targetHours * 60 + targetMinutes;
        const diff = Math.abs(userTotalMin - targetTotalMin);
        const isMatch = diff <= 30; // ±30 minutes window for hourly cron
        
        matches.push({
          type: notif.type,
          time: notif.time,
          target_hours: targetHours,
          target_minutes: targetMinutes,
          user_total_min: userTotalMin,
          target_total_min: targetTotalMin,
          diff: diff,
          is_match: isMatch
        });
        
        if (isMatch) {
          // This will be included in matches above
        }
      }

      results.push({
        user_id: user.id,
        user_name: user.full_name,
        user_timezone: userTimezone,
        user_time: userTimeStr,
        user_hours: userHours,
        user_minutes: userMinutes,
        notification_times: {
          breakfast: user.breakfast_time,
          lunch: user.lunch_time,
          dinner: user.dinner_time,
          water: '12:00'
        },
        matches: matches.filter(m => m.is_match),
        all_checks: matches,
        should_process: matches.some(m => m.is_match)
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      current_day_of_week: new Date().getDay(),
      total_users: users?.length || 0,
      results: results
    });
  } catch (error: any) {
    console.error('[Manual Test] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}