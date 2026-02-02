import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminMessaging } from '@/lib/firebase/admin';

/**
 * Send welcome notification to all users when scheduler starts
 * Internal endpoint called by the scheduler
 */
export async function POST() {
  try {
    console.log('🎉 Welcome notification API called - starting process...');
    
    if (!adminMessaging) {
      console.error('❌ Firebase admin messaging not initialized');
      return NextResponse.json(
        { error: 'Firebase admin not initialized' },
        { status: 500 }
      );
    }

    // Get users with active FCM tokens (updated in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log(`🔍 Looking for users with FCM tokens updated since: ${sevenDaysAgo.toISOString()}`);

    const activeUsers = await prisma.userPreference.findMany({
      where: {
        notificationsEnabled: true,
        fcmTokens: {
          some: {
            updatedAt: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
      include: {
        fcmTokens: {
          where: {
            updatedAt: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
      take: 100, // Limit to prevent overwhelming
    });

    console.log(`📊 Found ${activeUsers.length} users with active FCM tokens`);

    let totalSent = 0;
    let totalUsers = activeUsers.length;
    let totalTokens = 0;

    for (const user of activeUsers) {
      console.log(`👤 Processing user: ${user.fullName || user.email} (${user.fcmTokens.length} tokens)`);
      totalTokens += user.fcmTokens.length;
      
      try {
        // Send to all user's active tokens
        for (const fcmToken of user.fcmTokens) {
          try {
            console.log(`📱 Sending to token: ${fcmToken.id}`);
            
            await adminMessaging.send({
              token: fcmToken.token,
              notification: {
                title: '🚀 TrainEasy Scheduler Active!',
                body: `Hi ${user.fullName || 'there'}! Your meal reminders and notifications are now active. Stay consistent with your fitness goals! 💪`,
              },
              data: {
                type: 'scheduler_welcome',
                userId: user.id,
                timestamp: new Date().toISOString(),
              },
            });
            
            totalSent++;
            console.log(`✅ Sent to token: ${fcmToken.id}`);
          } catch (tokenError: any) {
            console.error(`❌ Failed to send welcome notification to token ${fcmToken.id}:`, tokenError.code, tokenError.message);
            
            // Clean up invalid tokens
            if (tokenError.code === 'messaging/registration-token-not-registered' || 
                tokenError.code === 'messaging/invalid-registration-token') {
              console.log(`🗑️ Removing invalid token: ${fcmToken.id}`);
              await prisma.fcmToken.delete({
                where: { id: fcmToken.id },
              }).catch(() => {}); // Ignore cleanup errors
            }
          }
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user.id}:`, userError);
      }
    }

    const summary = {
      success: true,
      sent: totalSent,
      users: totalUsers,
      tokens: totalTokens,
      message: `Welcome notifications sent: ${totalSent}/${totalTokens} tokens for ${totalUsers} users`,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Welcome notification summary:`, summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Welcome notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}