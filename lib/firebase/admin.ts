import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let app: App;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials for server-side operations
 */
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Option 1: Use service account JSON file path
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    app = initializeApp({
      credential: cert(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
    });
    return app;
  }

  // Option 2: Use service account JSON as environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    return app;
  }

  // Option 3: Use individual service account fields
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    return app;
  }

  throw new Error('Firebase Admin credentials not configured');
}

/**
 * Send push notification using Firebase Admin SDK
 */
export async function sendPushNotification({
  tokens,
  title,
  body,
  data,
  imageUrl,
}: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}) {
  try {
    const app = initializeFirebaseAdmin();
    const messaging = getMessaging(app);

    // Deduplicate tokens to prevent multiple notifications to the same device (if tokens are duplicated)
    const uniqueTokens = [...new Set(tokens)];

    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      data: data || {},
      tokens: uniqueTokens,
      android: {
        priority: 'high' as const,
        ttl: 7200 * 1000, // 2 hours in milliseconds
      },
      webpush: {
        headers: {
          TTL: '7200', // 2 hours in seconds
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    console.log('Successfully sent notifications:', response.successCount);
    console.log('Failed to send notifications:', response.failureCount);

    // Collect invalid tokens for cleanup
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code;
        // These error codes indicate the token is invalid and should be removed
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(uniqueTokens[idx]);
        }
      }
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
      invalidTokens, // Return invalid tokens for cleanup
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send notification to a single token
 */
export async function sendToToken({
  token,
  title,
  body,
  data,
}: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  return sendPushNotification({
    tokens: [token],
    title,
    body,
    data,
  });
}

/**
 * Send notification to multiple tokens
 */
export async function sendToMultipleTokens({
  tokens,
  title,
  body,
  data,
}: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  return sendPushNotification({
    tokens,
    title,
    body,
    data,
  });
}
