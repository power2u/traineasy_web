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

    // Get all tokens for this user
    const userTokens = await prisma.fcmToken.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (userTokens.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No tokens to cleanup',
        removed: 0 
      });
    }

    const invalidTokens: string[] = [];
    const validTokens: string[] = [];

    // Test each token by trying to send a dry-run message
    if (adminMessaging) {
      for (const tokenRecord of userTokens) {
        try {
          // Try to send a dry-run message to test token validity
          await adminMessaging.send({
            token: tokenRecord.token,
            notification: {
              title: 'Test',
              body: 'Test',
            },
            data: {
              type: 'test',
            },
          }, true); // dry-run = true

          validTokens.push(tokenRecord.token);
        } catch (error: any) {
          // Token is invalid
          console.log('Invalid token found:', tokenRecord.id, error.code);
          invalidTokens.push(tokenRecord.id);
        }
      }
    }

    // Remove invalid tokens from database
    let removedCount = 0;
    if (invalidTokens.length > 0) {
      const result = await prisma.fcmToken.deleteMany({
        where: {
          id: { in: invalidTokens },
          userId, // Extra safety check
        },
      });
      removedCount = result.count;
    }

    // Also remove tokens older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldTokensResult = await prisma.fcmToken.deleteMany({
      where: {
        userId,
        updatedAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    const totalRemoved = removedCount + oldTokensResult.count;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${totalRemoved} invalid/old tokens`,
      removed: totalRemoved,
      details: {
        invalidTokens: removedCount,
        oldTokens: oldTokensResult.count,
        validTokens: validTokens.length,
      },
    });

  } catch (error) {
    console.error('Error cleaning up FCM tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}