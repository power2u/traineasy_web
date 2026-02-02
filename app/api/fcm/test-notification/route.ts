import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { adminMessaging } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's FCM tokens
    const fcmTokens = await prisma.fcmToken.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (fcmTokens.length === 0) {
      return NextResponse.json(
        { error: 'No active FCM tokens found' },
        { status: 404 }
      );
    }

    if (!adminMessaging) {
      return NextResponse.json(
        { error: 'Firebase messaging not initialized' },
        { status: 500 }
      );
    }

    // Send test notification to all user's devices
    const results = [];
    
    for (const fcmToken of fcmTokens) {
      try {
        await adminMessaging.send({
          token: fcmToken.token,
          notification: {
            title: '🧪 Test Notification',
            body: 'This is a test notification to verify your setup is working correctly!',
          },
          data: {
            type: 'test',
            userId,
            timestamp: new Date().toISOString(),
          },
        });
        
        results.push({ tokenId: fcmToken.id, success: true });
      } catch (error) {
        console.error('Failed to send test notification to token:', fcmToken.id, error);
        results.push({ 
          tokenId: fcmToken.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${successCount} device(s)`,
      results: {
        total: fcmTokens.length,
        success: successCount,
        failed: failureCount,
        details: results,
      },
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}