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

    // Check if token already exists
    const existingToken = await prisma.fcmToken.findFirst({
      where: {
        userId,
        token,
      },
    });

    if (existingToken) {
      // Update the existing token's timestamp
      await prisma.fcmToken.update({
        where: { id: existingToken.id },
        data: { updatedAt: new Date() },
      });
      
      console.log('FCM token updated for user:', userId);
      return NextResponse.json({ success: true, message: 'Token updated' });
    }

    // Save new token
    const fcmToken = await prisma.fcmToken.create({
      data: {
        userId,
        token,
        deviceInfo: request.headers.get('user-agent') || 'Unknown',
      },
    });

    console.log('New FCM token saved for user:', userId);

    // Send welcome notification for first-time token registration
    if (adminMessaging) {
      try {
        await adminMessaging.send({
          token,
          notification: {
            title: '🎉 Welcome to TrainEasy!',
            body: 'Notifications are now enabled. We\'ll help you stay on track with your fitness goals!',
          },
          data: {
            type: 'welcome',
            userId,
          },
        });
        
        console.log('Welcome notification sent to user:', userId);
      } catch (notificationError) {
        console.error('Failed to send welcome notification:', notificationError);
        // Don't fail the token save if notification fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Token saved and welcome notification sent',
      tokenId: fcmToken.id 
    });

  } catch (error) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}