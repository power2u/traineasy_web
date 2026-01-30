import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Cleanup invalid FCM tokens for the current user
 * This endpoint removes tokens that Firebase reports as invalid
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const { invalidTokens } = await request.json();

    if (!invalidTokens || !Array.isArray(invalidTokens)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { invalidTokens: string[] }' },
        { status: 400 }
      );
    }

    // Delete invalid tokens
    await prisma.fcmToken.deleteMany({
      where: {
        userId: userId,
        token: {
          in: invalidTokens
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Removed ${invalidTokens.length} invalid token(s)`,
      removedCount: invalidTokens.length,
    });

  } catch (error: any) {
    console.error('Error cleaning up invalid tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
