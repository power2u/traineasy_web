import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeInTimezone } from '@/lib/utils/timezone';

export async function GET(request: Request) {
  try {
    const now = new Date();

    // Fetch users for the test - limiting to 50 for performance in manual check
    const users = await prisma.userPreference.findMany({
      where: { notificationsEnabled: true },
      select: {
        id: true,
        fullName: true,
        timezone: true,
        breakfastTime: true,
        snack1Time: true,
        lunchTime: true,
        snack2Time: true,
        dinnerTime: true,
        // Add other fields if needed for the logic below
      },
      take: 50
    });

    const results = [];

    for (const user of users) {
      const userTimezone = user.timezone || 'Asia/Kolkata';

      // Get time in user's timezone using the robust utility
      const { hour: userHours, minute: userMinutes, timeString: userTimeStr } = getCurrentTimeInTimezone(userTimezone);

      // Check notification times
      const notificationTimes = [
        { type: 'breakfast', time: user.breakfastTime },
        { type: 'snack1', time: user.snack1Time },
        { type: 'lunch', time: user.lunchTime },
        { type: 'snack2', time: user.snack2Time },
        { type: 'dinner', time: user.dinnerTime },
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
      }

      results.push({
        user_id: user.id,
        user_name: user.fullName,
        user_timezone: userTimezone,
        user_time: userTimeStr,
        user_hours: userHours,
        user_minutes: userMinutes,
        notification_times: {
          breakfast: user.breakfastTime,
          lunch: user.lunchTime,
          dinner: user.dinnerTime,
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