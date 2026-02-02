import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Manual FCM token cleanup endpoint for admin use
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admin users
    if (!session || !session.user || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    console.log('🧹 Manual FCM token cleanup started...');
    
    // Remove tokens older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldTokensResult = await prisma.fcmToken.deleteMany({
      where: {
        updatedAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    // Remove tokens older than 30 days that haven't been used
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const unusedTokensResult = await prisma.fcmToken.deleteMany({
      where: {
        lastUsedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    // Get remaining token count
    const remainingTokens = await prisma.fcmToken.count();

    const totalRemoved = oldTokensResult.count + unusedTokensResult.count;

    console.log(`✅ Manual cleanup completed: ${totalRemoved} tokens removed, ${remainingTokens} remaining`);

    return NextResponse.json({
      success: true,
      removed: totalRemoved,
      details: {
        oldTokens: oldTokensResult.count,
        unusedTokens: unusedTokensResult.count,
        remainingTokens,
      },
      message: `Removed ${totalRemoved} old/unused FCM tokens`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Manual cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}