import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Get request body to check if specific token should be removed
    const body = await request.json();
    const { token, removeAll } = body;

    // If specific token provided, remove only that token
    if (token && !removeAll) {
      await prisma.fcmToken.deleteMany({
        where: {
          userId: userId,
          token: token
        }
      });
    } else {
      // Otherwise remove all tokens (for complete logout)
      await prisma.fcmToken.deleteMany({
        where: {
          userId: userId
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: token && !removeAll ? 'Specific token removed' : 'All tokens removed'
    });

  } catch (error: any) {
    console.error('Error in remove-token API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
