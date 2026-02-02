import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminMessaging } from '@/lib/firebase/admin';

/**
 * Clean up old and invalid FCM tokens
 * Internal endpoint called by the scheduler
 */
export async function POST() {
  try {
    console.log('🧹 Starting FCM token cleanup...');
    
    const results = {
      totalTokens: 0,
      oldTokensRemoved: 0,
      invalidTokensRemoved: 0,
      validTokensKept: 0,
      errors: 0,
    };

    // Get all FCM tokens
    const allTokens = await prisma.fcmToken.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    results.totalTokens = allTokens.length;
    console.log(`📊 Found ${allTokens.length} total FCM tokens`);

    // 1. Remove tokens older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldTokensResult = await prisma.fcmToken.deleteMany({
      where: {
        updatedAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    results.oldTokensRemoved = oldTokensResult.count;
    console.log(`🗑️ Removed ${oldTokensResult.count} tokens older than 90 days`);

    // 2. Test remaining tokens for validity (if Firebase admin is available)
    if (adminMessaging) {
      const recentTokens = await prisma.fcmToken.findMany({
        where: {
          updatedAt: {
            gte: ninetyDaysAgo,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100, // Limit to prevent overwhelming Firebase
      });

      console.log(`🧪 Testing ${recentTokens.length} recent tokens for validity...`);

      const invalidTokenIds: string[] = [];

      for (const tokenRecord of recentTokens) {
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

          results.validTokensKept++;
        } catch (error: any) {
          // Token is invalid
          console.log(`❌ Invalid token found: ${tokenRecord.id} (${error.code})`);
          invalidTokenIds.push(tokenRecord.id);
          results.invalidTokensRemoved++;
        }
      }

      // Remove invalid tokens from database
      if (invalidTokenIds.length > 0) {
        await prisma.fcmToken.deleteMany({
          where: {
            id: { in: invalidTokenIds },
          },
        });
        console.log(`🗑️ Removed ${invalidTokenIds.length} invalid tokens`);
      }
    } else {
      console.warn('⚠️ Firebase admin not available, skipping token validation');
      results.validTokensKept = allTokens.length - results.oldTokensRemoved;
    }

    const totalRemoved = results.oldTokensRemoved + results.invalidTokensRemoved;
    console.log(`✅ Token cleanup completed: ${totalRemoved} tokens removed, ${results.validTokensKept} valid tokens kept`);

    return NextResponse.json({
      success: true,
      removed: totalRemoved,
      results,
      message: `Cleaned up ${totalRemoved} FCM tokens`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Token cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}