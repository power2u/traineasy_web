import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getActiveNotificationMessage } from '@/app/actions/notification-messages';
import { getCurrentTimeInTimezone } from '@/lib/utils/timezone';

// Types
interface NotificationResult {
  userId: string;
  userName: string;
  type: string;
  message: string;
  success: boolean;
}

/**
 * API Route for checking user activity and sending notifications
 * This should be called by a cron job every hour (e.g., Vercel Cron)
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const TIMEOUT_MS = 9000; // Increased timeout slightly

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayDate = new Date(today);

    console.log(`[Cron] Running notification check at ${now.toISOString()}`);

    // Get all users with notifications enabled
    const users = await prisma.userPreference.findMany({
      where: { notificationsEnabled: true },
      select: {
        id: true,
        fullName: true,
        notificationsEnabled: true,
        mealRemindersEnabled: true,
        waterRemindersEnabled: true,
        weightRemindersEnabled: true,
        breakfastTime: true,
        snack1Time: true,
        lunchTime: true,
        snack2Time: true,
        dinnerTime: true,
        timezone: true,
        lastActiveAt: true // For login check
      },
      take: 100
    });

    const notifications: NotificationResult[] = [];
    let processedUsers = 0;
    let skippedUsers = 0;

    for (const user of users) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log(`[Cron] Timeout reached, processed ${processedUsers} users`);
        break;
      }

      const userTimezone = user.timezone || 'Asia/Kolkata';
      const { hour: userHours, minute: userMinutes, timeString: userTimeStr } = getCurrentTimeInTimezone(userTimezone);

      const shouldProcess = await shouldProcessUser(user, userHours, userMinutes);
      if (!shouldProcess) {
        skippedUsers++;
        continue;
      }

      processedUsers++;

      // Check if logged in (active in last 24h)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const loggedIn = user.lastActiveAt ? user.lastActiveAt > oneDayAgo : false;

      // Process notifications
      await processUserNotifications(user, userHours, userMinutes, userTimeStr, loggedIn, todayDate, now, notifications);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      duration: `${duration}ms`,
      total_users: users.length,
      processed_users: processedUsers,
      skipped_users: skippedUsers,
      sent: notifications.filter(n => n.success).length,
      failed: notifications.filter(n => !n.success).length,
      notifications: notifications.slice(0, 10),
    });
  } catch (error: any) {
    console.error('[Cron] Error in notification check:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper to check if user needs processing
async function shouldProcessUser(user: any, userHours: number, userMinutes: number): Promise<boolean> {
  const notificationTimes = [
    user.breakfastTime,
    user.snack1Time,
    user.lunchTime,
    user.snack2Time,
    user.dinnerTime,
    '12:00', // water reminder
    '07:00', // good morning
    '21:00', // good night
  ];

  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 6) { // Saturday
    notificationTimes.push('19:00');
  }

  return notificationTimes.some((time: string | null) => time && isTimeMatch(userHours, userMinutes, time));
}

// Process user notifications
async function processUserNotifications(
  user: any,
  userHours: number,
  userMinutes: number,
  userTimeStr: string,
  loggedIn: boolean,
  today: Date, // Date object at 00:00 UTC (or implied local if stored as YYYY-MM-DD but Prisma uses DateTime)
  // Wait, Prisma Meal.date is DateTime.
  // If stored as "2024-01-30T00:00:00Z", we need to match it.
  now: Date,
  notifications: NotificationResult[]
) {
  // We need 'today' as a Date object that matches what Meal.date stores.
  // Assuming Meal.date stores UTC midnight of that day.
  const startOfToday = new Date(today); // today param passed as Date(todayStr) in GET?
  // In GET: const today = now.toISOString().split('T')[0]; const todayDate = new Date(today);
  // new Date('2024-01-30') results in UTC midnight.
  // Make sure this matches how Meals are created.

  // MEAL REMINDERS
  if (user.mealRemindersEnabled) {
    await processMealReminders(user, userHours, userMinutes, userTimeStr, loggedIn, startOfToday, now, notifications);
  }

  // WATER REMINDER
  if (user.waterRemindersEnabled && isTimeMatch(userHours, userMinutes, '12:00')) {
    await processWaterReminder(user, userTimeStr, loggedIn, startOfToday, notifications);
  }

  // GOOD MORNING
  if (isTimeMatch(userHours, userMinutes, '07:00') && !loggedIn) {
    await processGenericNotification(user, userTimeStr, 'good_morning', startOfToday, notifications);
  }

  // GOOD NIGHT
  if (isTimeMatch(userHours, userMinutes, '21:00') && !loggedIn) {
    await processGenericNotification(user, userTimeStr, 'good_night', startOfToday, notifications);
  }

  // WEEKLY MEASUREMENT
  if (user.weightRemindersEnabled) {
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 6 && isTimeMatch(userHours, userMinutes, '19:00') && !loggedIn) {
      await processGenericNotification(user, userTimeStr, 'weekly_measurement_reminder', startOfToday, notifications);
    }
  }
}

async function processMealReminders(
  user: any,
  userHours: number,
  userMinutes: number,
  userTimeStr: string,
  loggedIn: boolean,
  today: Date,
  now: Date,
  notifications: NotificationResult[]
) {
  const mealReminders = [
    { type: 'breakfast', time: user.breakfastTime, field: 'breakfast' as const },
    { type: 'snack1', time: user.snack1Time, field: 'snack1' as const },
    { type: 'lunch', time: user.lunchTime, field: 'lunch' as const },
    { type: 'snack2', time: user.snack2Time, field: 'snack2' as const },
    { type: 'dinner', time: user.dinnerTime, field: 'dinner' as const },
  ];

  // Get meal
  let meal = await prisma.meal.findFirst({
    where: {
      userId: user.id,
      date: today
    }
  });

  if (!meal) {
    // Create if missing (matching old logic)
    meal = await prisma.meal.create({
      data: {
        userId: user.id,
        date: today
      }
    });
  }

  for (const reminder of mealReminders) {
    if (!reminder.time) continue;
    if (!isTimeMatch(userHours, userMinutes, reminder.time)) continue;

    // Construct field names
    // Prisma uses camelCase: breakfastCompleted, breakfastNotificationSentAt
    const completedField = `${reminder.field}Completed` as keyof typeof meal;
    const notifField = `${reminder.field}NotificationSentAt` as keyof typeof meal;

    const mealNotCompleted = !meal[completedField];
    const notYetNotified = !meal[notifField];

    const lastNotificationTime = meal[notifField] as Date | null;
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentlySent = lastNotificationTime && lastNotificationTime > oneHourAgo;

    if ((mealNotCompleted || !loggedIn) && notYetNotified && !recentlySent) {
      const result = await sendNotification({
        userId: user.id,
        userName: user.fullName,
        type: `meal_reminder_${reminder.type}`,
      });

      if (result.success && meal) {
        await prisma.meal.update({
          where: { id: meal.id },
          data: { [notifField]: now }
        });
      }

      notifications.push({
        userId: user.id,
        userName: user.fullName || 'User',
        type: `meal_reminder_${reminder.type}`,
        message: result.message,
        success: result.success as boolean,
      });

      console.log(`[${user.fullName}] Meal ${reminder.type} at ${userTimeStr}: SENT`);
    } else if (recentlySent) {
      console.log(`[${user.fullName}] Meal ${reminder.type} at ${userTimeStr}: SKIPPED (recently sent)`);
    }
  }
}

async function processWaterReminder(
  user: any,
  userTimeStr: string,
  loggedIn: boolean,
  today: Date, // assumes UTC midnight for comparison
  notifications: NotificationResult[]
) {
  // Check if notification sent today
  const existingNotification = await prisma.notificationLog.findFirst({
    where: {
      userId: user.id,
      notificationType: 'water_reminder',
      sentAt: { gte: today } // greater than start of today
    }
  });

  // Check if logged water today
  // waterIntake uses created_at.
  const waterLog = await prisma.waterIntake.findFirst({
    where: {
      userId: user.id,
      createdAt: { gte: today }
    }
  });

  if ((!loggedIn || !waterLog) && !existingNotification) {
    const result = await sendNotification({
      userId: user.id,
      userName: user.fullName,
      type: 'water_reminder',
    });

    notifications.push({
      userId: user.id,
      userName: user.fullName || 'User',
      type: 'water_reminder',
      message: result.message,
      success: result.success as boolean,
    });

    console.log(`[${user.fullName}] Water reminder at ${userTimeStr}: SENT`);
  } else if (existingNotification) {
    console.log(`[${user.fullName}] Water reminder at ${userTimeStr}: SKIPPED (already sent today)`);
  } else {
    console.log(`[${user.fullName}] Water reminder at ${userTimeStr}: SKIPPED (user logged water)`);
  }
}

async function processGenericNotification(
  user: any,
  userTimeStr: string,
  type: string,
  today: Date,
  notifications: NotificationResult[]
) {
  const existingNotification = await prisma.notificationLog.findFirst({
    where: {
      userId: user.id,
      notificationType: type,
      sentAt: { gte: today }
    }
  });

  if (!existingNotification) {
    const result = await sendNotification({
      userId: user.id,
      userName: user.fullName,
      type: type,
    });

    notifications.push({
      userId: user.id,
      userName: user.fullName || 'User',
      type: type,
      message: result.message,
      success: result.success as boolean,
    });

    console.log(`[${user.fullName}] ${type} at ${userTimeStr}: SENT`);
  } else {
    console.log(`[${user.fullName}] ${type} at ${userTimeStr}: SKIPPED (already sent today)`);
  }
}

async function sendNotification({
  userId,
  userName,
  type,
}: {
  userId: string;
  userName: string | null;
  type: string;
}) {
  try {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true }
    });

    if (!tokens || tokens.length === 0) {
      return { success: false, message: 'No FCM tokens found' };
    }

    const messageResult = await getActiveNotificationMessage(type);

    let title = 'Train Easy';
    let message = 'Time for your notification!';
    let urlPath = '/dashboard';

    if (messageResult.success && messageResult.message) {
      title = messageResult.message.title;
      message = messageResult.message.message;
      const displayName = userName?.split(' ')[0] || 'there';
      title = title.replace(/{name}/g, displayName);
      message = message.replace(/{name}/g, displayName);
    }

    // Determine URL
    if (type.includes('meal')) urlPath = '/meals';
    if (type.includes('water')) urlPath = '/water';
    if (type.includes('weight') || type.includes('measurement')) urlPath = '/weight';

    const result = await sendPushNotification({
      tokens: tokens.map((t: { token: any; }) => t.token),
      title,
      body: message,
      data: {
        type,
        date: new Date().toISOString().split('T')[0],
        url: urlPath
      }
    });

    // Clean invalid tokens
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      await prisma.fcmToken.deleteMany({
        where: {
          userId,
          token: { in: result.invalidTokens }
        }
      });
    }

    if (result.success && (result.successCount || 0) > 0) {
      await prisma.notificationLog.create({
        data: {
          userId,
          notificationType: type,
          title,
          body: message,
          // sentAt defaults to now
          metadata: {
            success_count: result.successCount || 0,
            total_tokens: tokens.length,
            url_path: urlPath
          }
        }
      });
    }

    return {
      success: result.success && (result.successCount || 0) > 0,
      message: result.success ? `Sent to ${result.successCount || 0} device(s)` : result.error || 'Failed to send',
    };

  } catch (error: any) {
    console.error('[Cron] Error sending notification:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

// Time Utils handled by imported function from '@/lib/utils/timezone';

function isTimeMatch(userHours: number, userMinutes: number, targetTime: string): boolean {
  if (!targetTime) return false;

  const timeParts = targetTime.split(':');
  const targetHours = parseInt(timeParts[0]);
  const targetMinutes = parseInt(timeParts[1]);

  const userTotalMin = userHours * 60 + userMinutes;
  const targetTotalMin = targetHours * 60 + targetMinutes;
  const diff = Math.abs(userTotalMin - targetTotalMin);
  return diff <= 30;
}
