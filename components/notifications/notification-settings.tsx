'use client';

import { useState } from 'react';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';
import { useNotificationPermission } from '@/lib/hooks/use-notification-permission';
import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle, Settings } from 'lucide-react';

export function NotificationSettings() {
  const {
    isSupported,
    permissionStatus,
    requestPermission,
    showTestNotification,
  } = useLocalNotifications();

  const {
    triggerPrompt,
    canShowPrompt,
  } = useNotificationPermission();

  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleEnableNotifications = async () => {
    if (canShowPrompt) {
      triggerPrompt();
    } else {
      setIsRequesting(true);
      try {
        await requestPermission();
      } catch (error) {
        console.error('Error requesting permission:', error);
      } finally {
        setIsRequesting(false);
      }
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const success = await showTestNotification();
      if (!success) {
        alert('Failed to send test notification. Please check your notification settings.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Error sending test notification.');
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        status: 'Not Supported',
        description: 'Your browser does not support notifications.',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
      };
    }

    switch (permissionStatus) {
      case 'granted':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
          status: 'Enabled',
          description: 'Notifications are working perfectly!',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        };
      case 'denied':
        return {
          icon: <BellOff className="w-5 h-5 text-red-500" />,
          status: 'Blocked',
          description: 'Notifications are blocked. Please enable them in your browser settings.',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-yellow-500" />,
          status: 'Not Enabled',
          description: 'Click the button below to enable notifications.',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        <h2 className="text-xl font-semibold">Notification Settings</h2>
      </div>

      {/* Status Card */}
      <div className={`p-4 rounded-lg ${statusInfo.bgColor}`}>
        <div className="flex items-start gap-3">
          {statusInfo.icon}
          <div className="flex-1">
            <h3 className={`font-medium ${statusInfo.color}`}>
              {statusInfo.status}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {statusInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          What you'll get with notifications:
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex items-center gap-2">
            <span className="text-green-500">🍽️</span>
            <span>Meal reminders to stay on track with nutrition</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-500">💧</span>
            <span>Hydration reminders throughout the day</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-500">⚖️</span>
            <span>Weekly weight tracking reminders</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-orange-500">🌅</span>
            <span>Daily motivation and progress updates</span>
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {permissionStatus === 'default' && (
          <button
            onClick={handleEnableNotifications}
            disabled={isRequesting || !isSupported}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isRequesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Enable Notifications
              </>
            )}
          </button>
        )}

        {permissionStatus === 'granted' && (
          <button
            onClick={handleTestNotification}
            disabled={isTesting}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Test Notification
              </>
            )}
          </button>
        )}

        {permissionStatus === 'denied' && (
          <div className="flex-1 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              To enable notifications, please:
            </p>
            <ol className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
              <li>1. Click the lock icon in your browser's address bar</li>
              <li>2. Change notifications from "Block" to "Allow"</li>
              <li>3. Refresh this page</li>
            </ol>
          </div>
        )}
      </div>

      {/* iOS Instructions */}
      {typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200">
                iOS Users
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                For notifications to work on iOS, you need to add this app to your Home Screen 
                and launch it from there (not from the browser).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}