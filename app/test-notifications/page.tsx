'use client';

import { useState } from 'react';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';
import { useNotificationPermission } from '@/lib/hooks/use-notification-permission';
import { NotificationPermissionPrompt } from '@/components/notifications/notification-permission-prompt';
import { NotificationSettings } from '@/components/notifications/notification-settings';
import { TestTube, Smartphone, Chrome, Globe } from 'lucide-react';

export default function TestNotificationsPage() {
  const {
    isSupported,
    isPWA,
    isIOS,
    permissionStatus,
    showTestNotification,
    showMealReminder,
    showWaterReminder,
  } = useLocalNotifications();

  const {
    showPrompt,
    triggerPrompt,
    handleDismissPrompt,
  } = useNotificationPermission();

  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async (type: string) => {
    setIsTesting(true);
    try {
      let success = false;
      
      switch (type) {
        case 'test':
          success = await showTestNotification();
          break;
        case 'meal':
          success = await showMealReminder('lunch');
          break;
        case 'water':
          success = await showWaterReminder();
          break;
      }
      
      if (!success) {
        alert('Failed to send notification. Check your permission settings.');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification.');
    } finally {
      setIsTesting(false);
    }
  };

  const getBrowserInfo = () => {
    if (typeof window === 'undefined') return 'Unknown';
    
    const userAgent = navigator.userAgent;
    if (isIOS) {
      if (/CriOS/.test(userAgent)) return 'iOS Chrome';
      if (/Safari/.test(userAgent)) return 'iOS Safari';
      return 'iOS Browser';
    }
    
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    
    return 'Unknown Browser';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Notification System Test</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Test and debug the universal notification system
        </p>
      </div>

      {/* System Information */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          System Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Browser:</span>
              <span className="flex items-center gap-1">
                {isIOS && /CriOS/.test(navigator.userAgent) && <Chrome className="w-4 h-4" />}
                {isIOS && /Safari/.test(navigator.userAgent) && !(/CriOS/.test(navigator.userAgent)) && <Globe className="w-4 h-4" />}
                {getBrowserInfo()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Platform:</span>
              <span>{isIOS ? 'iOS' : 'Desktop/Android'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">PWA Mode:</span>
              <span className={isPWA ? 'text-green-600' : 'text-red-600'}>
                {isPWA ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Notifications Supported:</span>
              <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
                {isSupported ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Permission Status:</span>
              <span className={
                permissionStatus === 'granted' ? 'text-green-600' :
                permissionStatus === 'denied' ? 'text-red-600' : 'text-yellow-600'
              }>
                {permissionStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">User Agent:</span>
              <span className="text-xs truncate max-w-[200px]" title={navigator.userAgent}>
                {navigator.userAgent}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="bg-white dark:bg-gray-900 border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Test Controls
        </h2>
        
        <div className="space-y-4">
          <button
            onClick={() => triggerPrompt()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Trigger Permission Prompt
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handleTest('test')}
              disabled={isTesting || permissionStatus !== 'granted'}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? 'Sending...' : 'Test Notification'}
            </button>
            
            <button
              onClick={() => handleTest('meal')}
              disabled={isTesting || permissionStatus !== 'granted'}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? 'Sending...' : 'Meal Reminder'}
            </button>
            
            <button
              onClick={() => handleTest('water')}
              disabled={isTesting || permissionStatus !== 'granted'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? 'Sending...' : 'Water Reminder'}
            </button>
          </div>
          
          {permissionStatus !== 'granted' && (
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Enable notifications first to test the system
            </p>
          )}
        </div>
      </div>

      {/* iOS Instructions */}
      {isIOS && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">
            iOS Setup Instructions
          </h2>
          
          <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
            <p>For notifications to work on iOS, follow these steps:</p>
            
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Tap the Share button in {/CriOS/.test(navigator.userAgent) ? 'Chrome' : 'Safari'}</li>
              <li>Select "Add to Home Screen"</li>
              <li>Confirm the installation</li>
              <li>Launch the app from your Home Screen (not from the browser)</li>
              <li>The notification permission prompt will appear</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800/30 rounded">
              <p className="font-medium">Current Status:</p>
              <p>PWA Mode: {isPWA ? '✅ Enabled' : '❌ Not installed'}</p>
              <p>Notifications: {permissionStatus === 'granted' ? '✅ Allowed' : '❌ Not allowed'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-900 border rounded-lg p-6">
        <NotificationSettings />
      </div>

      {/* Permission Prompt */}
      {showPrompt && (
        <NotificationPermissionPrompt onClose={handleDismissPrompt} />
      )}
    </div>
  );
}