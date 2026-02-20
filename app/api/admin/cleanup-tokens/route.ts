import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminMessaging } from '@/lib/firebase/admin';

type TokenCleanupResults = {
  totalTokens: number;
  oldTokensRemoved: number;
  invalidTokensRemoved: number;
  validTokensKept: number;
  errors: number;
};

type TokenCleanupSummary = {
  success: boolean;
  removed: number;
  results: TokenCleanupResults;
  message: string;
  timestamp: string;
};

export async function runFcmTokenCleanupJob(): Promise<TokenCleanupSummary> {
  console.log('🧹 Starting FCM token cleanup...');

  const results: TokenCleanupResults = {
    totalTokens: 0,
    oldTokensRemoved: 0,
    invalidTokensRemoved: 0,
    validTokensKept: 0,
    errors: 0,
  };

  const allTokens = await prisma.fcmToken.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  results.totalTokens = allTokens.length;
  console.log(`📊 Found ${allTokens.length} total FCM tokens`);

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

  if (adminMessaging) {
    const recentTokens = await prisma.fcmToken.findMany({
      where: {
        updatedAt: {
          gte: ninetyDaysAgo,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    console.log(`🧪 Testing ${recentTokens.length} recent tokens for validity...`);

    const invalidTokenIds: string[] = [];

    for (const tokenRecord of recentTokens) {
      try {
        await adminMessaging.send(
          {
            token: tokenRecord.token,
            notification: {
              title: 'Test',
              body: 'Test',
            },
            data: {
              type: 'test',
            },
          },
          true
        );

        results.validTokensKept++;
      } catch (error: any) {
        console.log(`❌ Invalid token found: ${tokenRecord.id} (${error.code})`);
        invalidTokenIds.push(tokenRecord.id);
        results.invalidTokensRemoved++;
      }
    }

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
  console.log(
    `✅ Token cleanup completed: ${totalRemoved} tokens removed, ${results.validTokensKept} valid tokens kept`
  );

  return {
    success: true,
    removed: totalRemoved,
    results,
    message: `Cleaned up ${totalRemoved} FCM tokens`,
    timestamp: new Date().toISOString(),
  };
}

export async function POST() {
  try {
    const result = await runFcmTokenCleanupJob();

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Token cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
