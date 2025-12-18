import { NextResponse } from 'next/server';
import { getCurrentTimeInTimezone } from '@/lib/utils/timezone';

/**
 * Demo endpoint to show how notifications work across different timezones
 * This simulates the hourly cron job checking users in different timezones
 */
export async function GET(request: Request) {
  try {
    // Simulate users in different timezones
    const testUsers = [
      { name: 'Alice', timezone: 'America/New_York', location: 'New York' },
      { name: 'Bob', timezone: 'Europe/London', location: 'London' },
      { name: 'Charlie', timezone: 'Asia/Kolkata', location: 'India' },
      { name: 'Diana', timezone: 'Australia/Sydney', location: 'Sydney' },
      { name: 'Eva', timezone: 'America/Los_Angeles', location: 'Los Angeles' },
      { name: 'Frank', timezone: 'Asia/Tokyo', location: 'Tokyo' }
    ];

    const currentUTC = new Date();
    const results = testUsers.map(user => {
      const userTime = getCurrentTimeInTimezone(user.timezone);
      
      // Check what notifications this user would receive right now
      const notifications = [];
      
      // Good Morning (7:xx AM local time)
      if (userTime.hour === 7) {
        notifications.push('🌅 Good Morning');
      }
      
      // Good Night (8:xx PM local time)
      if (userTime.hour === 20) {
        notifications.push('🌙 Good Night');
      }
      
      // Water Reminders (even hours 8-22)
      if (userTime.hour >= 8 && userTime.hour <= 22 && userTime.hour % 2 === 0) {
        notifications.push('💧 Water Reminder');
      }
      
      // Breakfast Reminder (9:xx AM - 1 hour after 8 AM breakfast)
      if (userTime.hour === 9) {
        notifications.push('🍳 Breakfast Reminder');
      }
      
      // Lunch Reminder (2:xx PM - 1 hour after 1 PM lunch)
      if (userTime.hour === 14) {
        notifications.push('🍱 Lunch Reminder');
      }
      
      // Dinner Reminder (8:xx PM - 1 hour after 7 PM dinner)
      if (userTime.hour === 20) {
        notifications.push('🍽️ Dinner Reminder');
      }

      return {
        user: user.name,
        location: user.location,
        timezone: user.timezone,
        localTime: userTime.timeString,
        localDate: userTime.timeString,
        hour: userTime.hour,
        notifications: notifications.length > 0 ? notifications : ['No notifications at this time'],
        wouldReceiveCount: notifications.length
      };
    });

    const totalNotifications = results.reduce((sum, user) => sum + user.wouldReceiveCount, 0);

    return NextResponse.json({
      success: true,
      timestamp: currentUTC.toISOString(),
      description: "This shows how the hourly cron job would work with users in different timezones",
      summary: {
        totalUsers: testUsers.length,
        totalNotifications: totalNotifications,
        usersReceivingNotifications: results.filter(u => u.wouldReceiveCount > 0).length
      },
      userResults: results,
      explanation: {
        cronSchedule: "Runs every hour (0 * * * *)",
        logic: "Each hour, check all users and send notifications based on their local time",
        examples: {
          goodMorning: "Sent when it's 7:xx AM in user's timezone",
          goodNight: "Sent when it's 8:xx PM in user's timezone", 
          waterReminder: "Sent during even hours (8, 10, 12, 14, 16, 18, 20, 22) in user's timezone",
          mealReminders: "Sent 1 hour after configured meal times in user's timezone"
        }
      }
    });

  } catch (error: any) {
    console.error('Timezone demo error:', error);
    return NextResponse.json(
      { error: 'Demo failed', details: error.message },
      { status: 500 }
    );
  }
}