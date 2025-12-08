/**
 * Server-side OneSignal utilities
 * Use these in API routes and server actions
 */

interface SendNotificationParams {
  userId: string | string[];
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Send a push notification via OneSignal API
 * @param params Notification parameters
 * @returns Response from OneSignal API
 */
export async function sendOneSignalNotification({
  userId,
  title,
  message,
  url = '/dashboard',
  data = {},
}: SendNotificationParams) {
  try {
    const userIds = Array.isArray(userId) ? userId : [userId];

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_AUTH_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        include_external_user_ids: userIds,
        headings: { en: title },
        contents: { en: message },
        url: url,
        data: {
          ...data,
          url,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal API error:', result);
      return { success: false, error: result };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending OneSignal notification:', error);
    return { success: false, error };
  }
}

/**
 * Send notification to multiple users by segment
 * @param segment OneSignal segment name
 * @param title Notification title
 * @param message Notification message
 * @param url URL to open when clicked
 */
export async function sendToSegment({
  segment,
  title,
  message,
  url = '/dashboard',
}: {
  segment: string;
  title: string;
  message: string;
  url?: string;
}) {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_AUTH_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        included_segments: [segment],
        headings: { en: title },
        contents: { en: message },
        url: url,
      }),
    });

    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    console.error('Error sending to segment:', error);
    return { success: false, error };
  }
}

/**
 * Send notification to all subscribed users
 */
export async function sendToAll({
  title,
  message,
  url = '/dashboard',
}: {
  title: string;
  message: string;
  url?: string;
}) {
  return sendToSegment({
    segment: 'Subscribed Users',
    title,
    message,
    url,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string) {
  try {
    const response = await fetch(
      `https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${process.env.ONESIGNAL_AUTH_KEY}`,
        },
      }
    );

    return { success: response.ok };
  } catch (error) {
    console.error('Error canceling notification:', error);
    return { success: false, error };
  }
}
