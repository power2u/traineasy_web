import { NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

/**
 * Get local notifications for a user (offline fallback)
 * GET /api/notifications/local?userId=<userId>
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Read local notifications file
    const notificationsDir = path.join(process.cwd(), 'data', 'notifications');
    const userNotificationsFile = path.join(notificationsDir, `${userId}.json`);

    let notifications = [];
    
    if (existsSync(userNotificationsFile)) {
      try {
        const data = readFileSync(userNotificationsFile, 'utf8');
        notifications = JSON.parse(data);
      } catch (error) {
        console.error('Error reading local notifications:', error);
        notifications = [];
      }
    }

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting local notifications:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Mark local notifications as read
 * POST /api/notifications/local
 */
export async function POST(request: Request) {
  try {
    const { userId, notificationIds } = await request.json();

    if (!userId || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'User ID and notification IDs are required' },
        { status: 400 }
      );
    }

    // Read and update local notifications file
    const notificationsDir = path.join(process.cwd(), 'data', 'notifications');
    const userNotificationsFile = path.join(notificationsDir, `${userId}.json`);

    if (existsSync(userNotificationsFile)) {
      try {
        const data = readFileSync(userNotificationsFile, 'utf8');
        let notifications = JSON.parse(data);

        // Mark specified notifications as read
        notifications = notifications.map((notification: { id: string; read: boolean }) => {
          if (notificationIds.includes(notification.id)) {
            return { ...notification, read: true };
          }
          return notification;
        });

        // Write back to file
        writeFileSync(userNotificationsFile, JSON.stringify(notifications, null, 2));

        return NextResponse.json({
          success: true,
          message: `Marked ${notificationIds.length} notifications as read`,
        });
      } catch (error) {
        console.error('Error updating local notifications:', error);
        return NextResponse.json(
          { error: 'Failed to update notifications' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'No notifications found',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error marking local notifications as read:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}