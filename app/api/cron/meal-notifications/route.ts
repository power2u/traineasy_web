import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminMessaging } from '@/lib/firebase/admin';

interface MealNotificationData {
  userId: string;
  mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
  mealTime: string;
  timezone: string;
  userTimezone: string;
  currentTime: Date;
  mealDateTime: Date;
  timeDiffMinutes: number;
}

/**
 * Internal cron job for sending meal notifications
 * Runs every hour to check if users need meal reminders
 */
export async function GET(request: Request) {
  try {
    // Security check - only allow from localhost or with secret
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Starting meal notification cron job...');
    
    if (!adminMessaging) {
      console.error('❌ Firebase admin messaging not initialized');
      return NextResponse.json(
        { error: 'Firebase admin not initialized' },
        { status: 500 }
      );
    }

    const now = new Date();
    const results = {
      totalUsers: 0,
      eligibleUsers: 0,
      notificationsSent: 0,
      errors: 0,
      details: [] as any[],
    };

    // Get all users with meal times configured and notifications enabled
    const users = await prisma.userPreference.findMany({
      where: {
        mealTimesConfigured: true,
        notificationsEnabled: true,
        // Only users with at least one meal time set
        OR: [
          { breakfastTime: { not: null } },
          { snack1Time: { not: null } },
          { lunchTime: { not: null } },
          { snack2Time: { not: null } },
          { dinnerTime: { not: null } },
        ],
      },
      include: {
        fcmTokens: {
          where: {
            // Only active tokens updated in last 30 days
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        meals: {
          where: {
            date: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            },
          },
          take: 1,
        },
      },
    });

    results.totalUsers = users.length;
    console.log(`📊 Found ${users.length} users with meal notifications enabled`);

    for (const user of users) {
      try {
        // Skip users without FCM tokens
        if (user.fcmTokens.length === 0) {
          continue;
        }

        results.eligibleUsers++;

        // Get user's current time in their timezone
        const userTimezone = user.timezone || 'Asia/Kolkata';
        const userCurrentTime = getCurrentTimeInUserTimezone(now, userTimezone);
        
        // Get today's meal completion status
        const todayMeal = user.meals[0];
        
        // Check each meal type
        const mealTypes = [
          { type: 'breakfast' as const, time: user.breakfastTime, completed: todayMeal?.breakfastCompleted || false },
          { type: 'snack1' as const, time: user.snack1Time, completed: todayMeal?.snack1Completed || false },
          { type: 'lunch' as const, time: user.lunchTime, completed: todayMeal?.lunchCompleted || false },
          { type: 'snack2' as const, time: user.snack2Time, completed: todayMeal?.snack2Completed || false },
          { type: 'dinner' as const, time: user.dinnerTime, completed: todayMeal?.dinnerCompleted || false },
        ];

        for (const meal of mealTypes) {
          if (!meal.time || meal.completed) {
            continue; // Skip if no time set or already completed
          }

          // Convert meal time to user's timezone for today
          const mealDateTime = getMealDateTimeInUserTimezone(meal.time, userTimezone);
          const timeDiffMinutes = (userCurrentTime.getTime() - mealDateTime.getTime()) / (1000 * 60);

          // Send notification if:
          // 1. Current time is after meal time (timeDiffMinutes > 0)
          // 2. But not more than 60 minutes after (timeDiffMinutes <= 60)
          // 3. Meal is not completed
          if (timeDiffMinutes > 0 && timeDiffMinutes <= 60) {
            console.log(`🍽️ Sending ${meal.type} notification to user ${user.id} (${Math.round(timeDiffMinutes)}min late)`);
            
            const notificationData: MealNotificationData = {
              userId: user.id,
              mealType: meal.type,
              mealTime: meal.time,
              timezone: userTimezone,
              userTimezone: userCurrentTime.toLocaleString(),
              currentTime: now,
              mealDateTime,
              timeDiffMinutes: Math.round(timeDiffMinutes),
            };

            // Send notification to all user's devices
            let sentCount = 0;
            for (const fcmToken of user.fcmTokens) {
              try {
                await adminMessaging.send({
                  token: fcmToken.token,
                  notification: {
                    title: getMealNotificationTitle(meal.type),
                    body: getMealNotificationBody(meal.type, user.fullName || 'there', Math.round(timeDiffMinutes)),
                  },
                  data: {
                    type: 'meal_reminder',
                    mealType: meal.type,
                    userId: user.id,
                    mealTime: meal.time,
                    timeLate: Math.round(timeDiffMinutes).toString(),
                  },
                });
                sentCount++;
              } catch (tokenError: any) {
                console.error(`❌ Failed to send to token ${fcmToken.id}:`, tokenError.code);
                
                // If token is invalid, mark it for cleanup
                if (tokenError.code === 'messaging/registration-token-not-registered' || 
                    tokenError.code === 'messaging/invalid-registration-token') {
                  await prisma.fcmToken.delete({
                    where: { id: fcmToken.id },
                  }).catch(() => {}); // Ignore cleanup errors
                }
              }
            }

            if (sentCount > 0) {
              results.notificationsSent++;
              results.details.push({
                userName: user.fullName || 'Unknown',
                timeLate: Math.round(timeDiffMinutes),
                devicesSent: sentCount,
                ...notificationData,
              });
            }
          }
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError);
        results.errors++;
      }
    }

    console.log(`✅ Cron job completed: ${results.notificationsSent} notifications sent to ${results.eligibleUsers} eligible users`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get current time in user's timezone
 */
function getCurrentTimeInUserTimezone(now: Date, timezone: string): Date {
  try {
    // Create a date in the user's timezone
    const userTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    return userTime;
  } catch (error) {
    console.warn(`Invalid timezone ${timezone}, using UTC`);
    return now;
  }
}

/**
 * Get meal datetime in user's timezone for today
 */
function getMealDateTimeInUserTimezone(mealTime: string, timezone: string): Date {
  try {
    const [hours, minutes] = mealTime.split(':').map(Number);
    const now = new Date();
    
    // Get today's date in user's timezone
    const userToday = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    
    // Set the meal time
    userToday.setHours(hours, minutes, 0, 0);
    
    return userToday;
  } catch (error) {
    console.warn(`Error parsing meal time ${mealTime}`);
    return new Date();
  }
}

/**
 * Get notification title for meal type
 */
function getMealNotificationTitle(mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner'): string {
  const titles = {
    breakfast: '🌅 Breakfast Reminder',
    snack1: '🍎 Morning Snack Reminder',
    lunch: '☀️ Lunch Reminder',
    snack2: '🍪 Afternoon Snack Reminder',
    dinner: '🌙 Dinner Reminder',
  };
  return titles[mealType] || '🍽️ Meal Reminder';
}

/**
 * Get notification body for meal type
 */
function getMealNotificationBody(mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner', userName: string, minutesLate: number): string {
  const mealNames = {
    breakfast: 'breakfast',
    snack1: 'morning snack',
    lunch: 'lunch',
    snack2: 'afternoon snack',
    dinner: 'dinner',
  };
  
  const mealName = mealNames[mealType] || 'meal';
  
  if (minutesLate <= 15) {
    return `Hi ${userName}! Don't forget to log your ${mealName}. Stay consistent with your nutrition goals! 💪`;
  } else if (minutesLate <= 30) {
    return `Hi ${userName}! Your ${mealName} time was ${minutesLate} minutes ago. Remember to log it to stay on track! 🎯`;
  } else {
    return `Hi ${userName}! It's been ${minutesLate} minutes since your ${mealName} time. Don't forget to log it! ⏰`;
  }
}