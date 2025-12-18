'use client';

import { useState } from 'react';
import { Card, Button } from '@heroui/react';
import { Bell, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'snack1', label: 'Morning Snack', icon: '🍎' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'snack2', label: 'Afternoon Snack', icon: '🍪' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
];

export default function TestNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sendTestNotification = async (mealType: string) => {
    setLoading(true);
    setResult(null);

    try {
      // Try authenticated endpoint first
      let response = await fetch(`/api/test-meal-notification?meal=${mealType}&test=true`);
      let data = await response.json();

      // If authentication fails, try public endpoint
      if (response.status === 401) {
        console.log('Authentication failed, trying public endpoint...');
        response = await fetch(`/api/test-meal-notification-public?meal=${mealType}`);
        data = await response.json();
      }

      setResult(data);

      if (response.ok) {
        toast.success(`Test notification sent for ${mealType}!`);
      } else {
        toast.error(data.error || 'Failed to send notification');
      }
    } catch (error: any) {
      toast.error('Error sending notification');
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 pb-24 md:pb-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Test Meal Notifications</h1>
        </div>
        <p className="text-sm text-default-500">
          Send test notifications to your device for development
        </p>
      </div>

      {/* Environment Check */}
      <Card className="mb-4 p-4">
        <h2 className="text-lg font-semibold mb-3">Environment Check</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span>NEXT_PUBLIC_FIREBASE_API_KEY</span>
          </div>
          <div className="flex items-center gap-2">
            {process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span>NEXT_PUBLIC_FIREBASE_VAPID_KEY</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-default-500">
              Note: FIREBASE_SERVER_KEY is server-side only (check will happen on API call)
            </span>
          </div>
        </div>
      </Card>

      {/* Test Buttons */}
      <Card className="mb-4 p-4">
        <h2 className="text-lg font-semibold mb-3">Send Test Notification</h2>
        <p className="text-sm text-default-500 mb-4">
          Click any meal type to send a test notification to your device
        </p>
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {MEAL_TYPES.map((meal) => (
            <Button
              key={meal.value}
              variant="primary"
              onPress={() => sendTestNotification(meal.value)}
              isDisabled={loading}
              className="w-full justify-start gap-3"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="text-xl">{meal.icon}</span>
              )}
              <span>Test {meal.label}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className={`p-4 ${result.success ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {result.success ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                Success!
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                Error
              </>
            )}
          </h2>
          
          <div className="space-y-3">
            {result.success && result.details && (
              <>
                <div>
                  <div className="text-sm font-medium text-default-700">User</div>
                  <div className="text-sm text-default-500">{result.details.userName} ({result.details.userId})</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-default-700">Meal Type</div>
                  <div className="text-sm text-default-500">{result.details.mealLabel}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-default-700">Message</div>
                  <div className="text-sm text-default-500">{result.details.notificationMessage}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-default-700">Tokens Sent To</div>
                  <div className="text-sm text-default-500">{result.details.tokensCount} device(s)</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-default-700">FCM Response</div>
                  <pre className="text-xs bg-default-100 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(result.details.fcmResponse, null, 2)}
                  </pre>
                </div>
              </>
            )}

            {result.error && (
              <>
                <div>
                  <div className="text-sm font-medium text-red-700">Error Message</div>
                  <div className="text-sm text-red-600">{result.error}</div>
                </div>
                {result.details && (
                  <div>
                    <div className="text-sm font-medium text-red-700">Details</div>
                    <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-4 p-4 bg-blue-500/5 border-blue-500/20">
        <h2 className="text-lg font-semibold mb-3">📝 Instructions</h2>
        <div className="space-y-2 text-sm text-default-600">
          <p>1. Make sure you're logged in</p>
          <p>2. Grant notification permissions when prompted</p>
          <p>3. Click any meal type button above</p>
          <p>4. Check your device for the notification</p>
          <p className="mt-4 text-xs text-default-500">
            💡 Tip: You can also test directly via URL:
            <code className="block mt-1 bg-default-100 p-2 rounded">
              /api/test-meal-notification?meal=breakfast&test=true
            </code>
          </p>
        </div>
      </Card>
    </div>
  );
}
