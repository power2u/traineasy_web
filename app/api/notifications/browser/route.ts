import { NextResponse } from 'next/server';

// Type-safe global notification store
interface NotificationData {
  id: string;
  userId: string;
  title: string;
  body: string;
  tag: string;
  url: string;
  data: Record<string, unknown>;
  timestamp: string;
  delivered: boolean;
}

// Extend global type
declare global {
  var activeNotifications: Map<string, NotificationData[]> | undefined;
}

/**
 * Browser Notification API
 * Triggers local notifications via in-memory queue
 * POST /api/notifications/browser
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, body, tag, url, data } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      );
    }

    // Store notification for active sessions to pick up
    const notification: NotificationData = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId,
      title,
      body,
      tag: tag || 'fitness-reminder',
      url: url || '/dashboard',
      data: data || {},
      timestamp: new Date().toISOString(),
      delivered: false
    };

    // Initialize global store if needed
    if (!global.activeNotifications) {
      global.activeNotifications = new Map();
    }
    
    if (!global.activeNotifications.has(userId)) {
      global.activeNotifications.set(userId, []);
    }
    
    const userNotifications = global.activeNotifications.get(userId)!;
    userNotifications.push(notification);
    
    // Keep only last 10 notifications per user to prevent memory leaks
    if (userNotifications.length > 10) {
      global.activeNotifications.set(userId, userNotifications.slice(-10));
    }

    console.log(`Browser notification queued for user ${userId}: ${title}`);

    return NextResponse.json({
      success: true,
      message: 'Browser notification queued',
      notificationId: notification.id,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error queuing browser notification:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get pending notifications for a user
 * GET /api/notifications/browser?userId=<userId>
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

    // Initialize global store if needed
    if (!global.activeNotifications) {
      global.activeNotifications = new Map();
    }

    // Get pending notifications for this user
    const userNotifications = global.activeNotifications.get(userId) || [];
    
    // Mark as delivered and clear (consume notifications)
    global.activeNotifications.set(userId, []);

    return NextResponse.json({
      success: true,
      notifications: userNotifications,
      count: userNotifications.length,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting browser notifications:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}