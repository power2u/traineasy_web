import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminMessaging } from '@/lib/firebase/admin';

/**
 * Send custom notification to all users
 * Can be used for welcome messages, offers, announcements, etc.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Extract custom title and body from request, with defaults
    const customTitle = body.title || '🚀 TrainEasy Notification';
    const customBody = body.body || 'Stay consistent with your fitness goals! 💪';
    const notificationType = body.type || 'admin_notification';
    
    console.log(`🎉 Custom notification API called - Title: "${customTitle}", Body: "${customBody}"`);
    
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
            
            // Personalize the body message if it contains placeholder
            let personalizedBody = customBody;
            if (customBody.includes('{name}')) {
              personalizedBody = customBody.replace('{name}', user.fullName || 'there');
            }
            
            await adminMessaging.send({
              token: fcmToken.token,
              notification: {
                title: customTitle,
                body: personalizedBody,
              },
              data: {
                type: notificationType,
                userId: user.id,
                timestamp: new Date().toISOString(),
              },
            });
            
            totalSent++;
            console.log(`✅ Sent to token: ${fcmToken.id}`);
          } catch (tokenError: any) {
            console.error(`❌ Failed to send notification to token ${fcmToken.id}:`, tokenError.code, tokenError.message);
            
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
      title: customTitle,
      body: customBody,
      type: notificationType,
      message: `Custom notifications sent: ${totalSent}/${totalTokens} tokens for ${totalUsers} users`,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Custom notification summary:`, summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Custom notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}