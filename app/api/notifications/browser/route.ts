import { NextResponse } from 'next/server';

/**
 * Browser Notification API
 * Triggers local notifications via Server-Sent Events or WebSocket
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
    const notification = {
      id: Date.now().toString(),
      userId,
      title,
      body,
      tag: tag || 'fitness-reminder',
      url: url || '/dashboard',
      data: data || {},
      timestamp: new Date().toISOString(),
      delivered: false
    };

    // In a real implementation, you might use:
    // - Redis for storing active notifications
    // - WebSocket connections to push to active clients
    // - Server-Sent Events (SSE) for real-time delivery
    
    // For now, we'll use a simple in-memory store
    global.activeNotifications = global.activeNotifications || new Map();
    
    if (!global.activeNotifications.has(userId)) {
      global.activeNotifications.set(userId, []);
    }
    
    global.activeNotifications.get(userId).push(notification);
    
    // Keep only last 10 notifications per user
    const userNotifications = global.activeNotifications.get(userId);
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

    // Get pending notifications for this user
    global.activeNotifications = global.activeNotifications || new Map();
    const userNotifications = global.activeNotifications.get(userId) || [];
    
    // Mark as delivered and clear
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