import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, token } = await request.json();
    
    if (!userId || !token) {
      return NextResponse.json(
        { error: 'Missing userId or token' },
        { status: 400 }
      );
    }

    // Verify the user matches the session
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if token exists and is recent (within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existingToken = await prisma.fcmToken.findFirst({
      where: {
        userId,
        token,
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return NextResponse.json({ 
      exists: !!existingToken,
      tokenId: existingToken?.id || null,
      lastUpdated: existingToken?.updatedAt || null,
    });

  } catch (error) {
    console.error('Error checking FCM token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}