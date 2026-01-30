import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/firebase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Test endpoint to send a real notification to verify FCM integration
 */
export async function POST(request: Request) {
  try {
    // Security Check: Verify Super Admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.userPreferences.findFirst({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    // Get a test user with FCM tokens
    const testUser = await prisma.userPreferences.findFirst({
      where: { notificationsEnabled: true },
      select: { id: true, fullName: true }
    });

    if (!testUser) {
      return NextResponse.json({ error: 'No test users found' }, { status: 404 });
    }

    // Get FCM tokens for this user
    const tokens = await prisma.fcmTokens.findMany({
      where: { userId: testUser.id },
      select: { token: true }
    });

    if (tokens.length === 0) {
      return NextResponse.json({
        error: 'No FCM tokens found for test user',
        user: testUser
      }, { status: 404 });
    }

    // Send test notification
    const userName = testUser.fullName?.split(' ')[0] || 'there';
    const fcmResult = await sendPushNotification({
      tokens: tokens.map((t: { token: string }) => t.token),
      title: '🧪 Test Notification',
      body: `Hi ${userName}! This is a test notification from your unified notification system. Everything is working perfectly! 🚀`,
      data: {
        type: 'test_notification',
        action: 'open_app',
        timestamp: new Date().toISOString()
      }
    });

    // Log the test notification
    if (fcmResult.success) {
      await prisma.notificationLogs.create({
        data: {
          userId: testUser.id,
          notificationType: 'test_notification',
          title: '🧪 Test Notification',
          body: `Hi ${userName}! This is a test notification from your unified notification system. Everything is working perfectly! 🚀`,
          sentAt: new Date(),
          metadata: {
            successCount: fcmResult.successCount,
            failureCount: fcmResult.failureCount,
            test: true
          }
        }
      });
    }

    return NextResponse.json({
      success: fcmResult.success,
      message: fcmResult.success ? 'Test notification sent successfully!' : 'Failed to send test notification',
      details: {
        user: testUser,
        tokensCount: tokens.length,
        fcmResult: {
          successCount: fcmResult.successCount,
          failureCount: fcmResult.failureCount,
          errors: fcmResult.error
        }
      }
    });

  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}