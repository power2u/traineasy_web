import { prisma } from '@/lib/prisma';
import { adminMessaging } from '@/lib/firebase/admin';

export type CustomNotificationInput = {
  title?: string;
  body?: string;
  type?: string;
};

export type CustomNotificationSummary = {
  success: boolean;
  sent: number;
  users: number;
  tokens: number;
  title: string;
  body: string;
  type: string;
  message: string;
  timestamp: string;
};

export async function sendCustomNotificationToActiveUsers(
  input: CustomNotificationInput = {}
): Promise<CustomNotificationSummary> {
  const customTitle = input.title || '🚀 TrainEasy Notification';
  const customBody = input.body || 'Stay consistent with your fitness goals! 💪';
  const notificationType = input.type || 'admin_notification';

  console.log(
    `🎉 Custom notification job - Title: "${customTitle}", Body: "${customBody}", Type: "${notificationType}"`
  );

  if (!adminMessaging) {
    console.error('❌ Firebase admin messaging not initialized');
    throw new Error('Firebase admin not initialized');
  }

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
    take: 100,
  });

  console.log(`📊 Found ${activeUsers.length} users with active FCM tokens`);

  let totalSent = 0;
  const totalUsers = activeUsers.length;
  let totalTokens = 0;

  for (const user of activeUsers) {
    console.log(`👤 Processing user: ${user.fullName || user.email} (${user.fcmTokens.length} tokens)`);
    totalTokens += user.fcmTokens.length;

    try {
      for (const fcmToken of user.fcmTokens) {
        try {
          console.log(`📱 Sending to token: ${fcmToken.id}`);

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
          console.error(
            `❌ Failed to send notification to token ${fcmToken.id}:`,
            tokenError.code,
            tokenError.message
          );

          if (
            tokenError.code === 'messaging/registration-token-not-registered' ||
            tokenError.code === 'messaging/invalid-registration-token'
          ) {
            console.log(`🗑️ Removing invalid token: ${fcmToken.id}`);
            await prisma.fcmToken
              .delete({
                where: { id: fcmToken.id },
              })
              .catch(() => {});
          }
        }
      }
    } catch (userError) {
      console.error(`❌ Error processing user ${user.id}:`, userError);
    }
  }

  const summary: CustomNotificationSummary = {
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

  return summary;
}

