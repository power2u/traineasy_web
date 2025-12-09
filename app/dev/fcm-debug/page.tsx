'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { requestNotificationPermission, saveFCMToken } from '@/lib/firebase/messaging';
import { useAuth } from '@/lib/contexts/auth-context';

export default function FCMDebugPage() {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tokens, setTokens] = useState<any[]>([]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const response = await fetch('/api/fcm/list-tokens');
      const data = await response.json();
      if (data.tokens) {
        setTokens(data.tokens);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    setMessage('');
    try {
      const newToken = await requestNotificationPermission();
      if (newToken) {
        setToken(newToken);
        if (user?.id) {
          await saveFCMToken(user.id, newToken);
          setMessage('✅ Token generated and saved successfully!');
          await loadTokens();
        }
      } else {
        setMessage('❌ Failed to get token. Check console for errors.');
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async (tokenToDelete: string) => {
    try {
      const response = await fetch('/api/fcm/remove-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToDelete }),
      });
      
      if (response.ok) {
        setMessage('✅ Token deleted successfully!');
        await loadTokens();
      }
    } catch (error) {
      setMessage('❌ Failed to delete token');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">FCM Token Debug</h1>

      <div className="space-y-6">
        {/* Permission Status */}
        <div className="p-4 border rounded-lg">
          <h2 className="font-semibold mb-2">Notification Permission</h2>
          <p className="mb-4">
            Status: <span className={`font-bold ${
              permission === 'granted' ? 'text-green-600' : 
              permission === 'denied' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {permission.toUpperCase()}
            </span>
          </p>
          
          {permission === 'denied' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ Notifications are blocked. To enable:
                <br />1. Click the lock icon in the address bar
                <br />2. Find "Notifications" and change to "Allow"
                <br />3. Refresh the page
              </p>
            </div>
          )}

          <Button
            color="primary"
            onPress={handleRequestPermission}
            isLoading={loading}
            isDisabled={permission === 'denied'}
          >
            {permission === 'granted' ? 'Refresh Token' : 'Request Permission & Get Token'}
          </Button>
        </div>

        {/* Current Token */}
        {token && (
          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">Current Token</h2>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs break-all">
              {token}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="p-4 border rounded-lg">
            <p>{message}</p>
          </div>
        )}

        {/* Saved Tokens */}
        <div className="p-4 border rounded-lg">
          <h2 className="font-semibold mb-4">Saved Tokens ({tokens.length})</h2>
          {tokens.length === 0 ? (
            <p className="text-gray-500">No tokens saved yet</p>
          ) : (
            <div className="space-y-3">
              {tokens.map((t, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="text-xs text-gray-500">
                      Created: {new Date(t.created_at).toLocaleString()}
                    </div>
                    <Button
                      size="sm"
                      color="danger"
                      variant="ghost"
                      onPress={() => handleDeleteToken(t.token)}
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                    {t.token}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Troubleshooting */}
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <h2 className="font-semibold mb-2">Troubleshooting</h2>
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li>Firebase notifications work on localhost (http://localhost:3000)</li>
            <li>Make sure VAPID key is set in .env.local</li>
            <li>Check browser console for any Firebase errors</li>
            <li>If token is old, click "Refresh Token" to get a new one</li>
            <li>Service worker must be registered (check Application tab in DevTools)</li>
            <li>Try in incognito mode if issues persist</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
