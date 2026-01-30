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

    const { token, deviceInfo } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    // Check if token already exists for this user
    const existingToken = await prisma.fcmToken.findFirst({
      where: {
        userId: userId,
        token: token
      }
    });

    if (existingToken) {
      // Update existing token
      await prisma.fcmToken.update({
        where: { id: existingToken.id },
        data: {
          deviceInfo: deviceInfo || {},
          lastUsedAt: new Date(),
        }
      });
    } else {
      // Create new token
      await prisma.fcmToken.create({
        data: {
          userId: userId,
          token: token,
          deviceInfo: deviceInfo || {},
          lastUsedAt: new Date(),
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in save-token API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
