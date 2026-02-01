'use client';

import { useState, useEffect } from 'react';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';
import { useNotificationPermission } from '@/lib/hooks/use-notification-permission';
import { useMealScheduler } from '@/lib/hooks/use-meal-scheduler';
import { getEnableNotificationsInstructions } from '@/lib/utils/notification-utils';
import { SimpleNotifications } from '@/lib/utils/simple-notifications';
import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle, Settings, Clock, Droplets, Utensils } from 'lucide-react';

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

  const {
    isEnabled: mealEnabled,
    getNextMeal,
    status: mealStatus,
    scheduledCount
  } = useMealScheduler();

  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [nextMeal, setNextMeal] = useState<{ meal: string; time: Date } | null>(null);

  // Update next meal info
  useEffect(() => {
    const next = getNextMeal();
    setNextMeal(next);
    
    // Debug logging
    console.log('🔍 Notification Settings Debug:', {
      permissionStatus,
      mealEnabledResult: mealEnabled(),
      mealStatus: status,
      scheduledCount,
      nextMeal: next
    });
  }, [getNextMeal, mealStatus, permissionStatus, mealEnabled, status, scheduledCount]);

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
      console.log('🧪 Test notification button clicked');
      console.log('📋 Current permission:', permissionStatus);
      console.log('🔧 Meal scheduler enabled:', mealEnabled());
      console.log('📊 Meal scheduler status:', status);
      
      // Try simple notification first (more reliable)
      let success = false;
      
      if (SimpleNotifications.isAvailable()) {
        console.log('🎯 Using simple notification system...');
        success = SimpleNotifications.showTest('there');
      } else {
        console.log('🎯 Falling back to complex notification system...');
        success = await showTestNotification();
      }
      
      console.log('🎯 Test notification result:', success);
      
      if (!success) {
        alert('Failed to send test notification. Please check your notification settings and browser console for details.');
      } else {
        console.log('✅ Test notification should have appeared');
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      alert('Error sending test notification: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

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

      {/* Notification Status (when enabled) */}
      {permissionStatus === 'granted' && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">Active Notifications</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-green-600" />
                <span className="text-green-700 dark:text-green-300">
                  Meal Reminders: {mealEnabled() ? '✅ Active' : '❌ Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-600" />
                <span className="text-green-700 dark:text-green-300">
                  Water Reminders: ✅ Active
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-green-700 dark:text-green-300">
                  Scheduled: {scheduledCount || 0} notifications
                </span>
              </div>
              {nextMeal && (
                <div className="text-green-700 dark:text-green-300">
                  Next: {nextMeal.meal} at {nextMeal.time.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
      </div>

      {/* Instructions for blocked notifications */}
      {permissionStatus === 'denied' && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Notifications are blocked
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            To enable notifications and get meal reminders, follow these steps:
          </p>
          <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            {getEnableNotificationsInstructions().map((instruction, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="font-medium">{index + 1}.</span>
                <span>{instruction.replace(/^\d+\.\s*/, '')}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* iOS Instructions */}
      {isIOS && permissionStatus !== 'granted' && (
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