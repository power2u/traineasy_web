'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Switch } from '@heroui/react';
import { Bell, BellOff, Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { requestNotificationPermission, saveFCMToken, areNotificationsEnabled, refreshFCMToken, isNotificationSupported } from '@/lib/firebase/messaging';
import { useAuthUser } from '@/lib/contexts/auth-context';

export function NotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const user = useAuthUser();

  useEffect(() => {
    // Check current notification status and support
    setIsSupported(isNotificationSupported());
    setNotificationsEnabled(areNotificationsEnabled());
  }, []);

  const handleToggleNotifications = async () => {
    if (!user) return;

    if (notificationsEnabled) {
      // User wants to disable notifications
      toast.info('To disable notifications, please turn them off in your browser settings.');
      return;
    }

    // User wants to enable notifications
    setIsLoading(true);
    
    try {
      const token = await requestNotificationPermission();
      
      if (token) {
        // Save token to database
        const success = await saveFCMToken(user.id, token);
        
        if (success) {
          setNotificationsEnabled(true);
          toast.success('🎉 Notifications enabled successfully!');
        } else {
          toast.error('Failed to save notification settings. Please try again.');
        }
      } else {
        toast.error('Failed to enable notifications. Please check your browser settings.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const newToken = await refreshFCMToken(user.id);
      
      if (newToken) {
        toast.success('🔄 Notification token refreshed successfully!');
      } else {
        toast.error('Failed to refresh token. Please try again.');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Failed to refresh token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/fcm/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Test notification sent! ${data.message}`);
      } else {
        toast.error(data.error || 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if notifications are not supported
  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <BellOff className="w-5 h-5 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Notifications Not Supported</h3>
            <p className="text-sm text-default-500">
              Your browser or device doesn't support push notifications.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Notification Settings</h3>
          <p className="text-sm text-default-500">Manage your push notifications</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {notificationsEnabled ? (
              <Bell className="w-5 h-5 text-success flex-shrink-0" />
            ) : (
              <BellOff className="w-5 h-5 text-default-400 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-default-500">
                {notificationsEnabled 
                  ? 'Receive reminders and updates' 
                  : 'Enable to get meal and progress reminders'
                }
              </p>
            </div>
          </div>
          
          <Switch
            isSelected={notificationsEnabled}
            onChange={handleToggleNotifications}
            isDisabled={isLoading}
            className="flex-shrink-0"
          />
        </div>

        {notificationsEnabled && (
          <div className="pt-2 border-t border-divider space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onPress={handleTestNotification}
              isDisabled={isLoading}
              className="w-full justify-center"
            >
              {isLoading ? 'Sending...' : 'Send Test Notification'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onPress={handleRefreshToken}
              isDisabled={isLoading}
              className="w-full justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh Token
            </Button>
          </div>
        )}

        <div className="text-xs text-default-400 pt-2">
          <p>
            💡 Tokens are automatically refreshed every 30 minutes and when you return to the app.
          </p>
        </div>
      </div>
    </Card>
  );
}