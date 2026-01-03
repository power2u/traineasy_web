'use client';

import { useState, useEffect } from 'react';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';
import { useAuthUser } from '@/lib/contexts/auth-context';
import { X, Bell, Smartphone, Chrome, Globe } from 'lucide-react';

interface NotificationPermissionPromptProps {
  onClose?: () => void;
}

export function NotificationPermissionPrompt({ onClose }: NotificationPermissionPromptProps) {
  const user = useAuthUser();
  const { isSupported, permissionStatus, requestPermission } = useLocalNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Detect if user is on iOS
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIOSChrome = isIOS && /CriOS/.test(navigator.userAgent);
  const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);

  useEffect(() => {
    // Show prompt if user is logged in, notifications are supported, and permission is default
    if (user && isSupported && permissionStatus === 'default') {
      // Delay showing the prompt to avoid overwhelming the user
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, isSupported, permissionStatus]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    
    try {
      const permission = await requestPermission();
      
      if (permission === 'granted') {
        setIsVisible(false);
        onClose?.();
      } else if (permission === 'denied') {
        // Show iOS instructions if on iOS and permission was denied
        if (isIOS) {
          setShowIOSInstructions(true);
        } else {
          setIsVisible(false);
          onClose?.();
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      // Show iOS instructions if there was an error on iOS
      if (isIOS) {
        setShowIOSInstructions(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setShowIOSInstructions(false);
    onClose?.();
  };

  if (!isVisible || !user || !isSupported) {
    return null;
  }

  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {isIOSChrome && <Chrome className="w-5 h-5" />}
              {isIOSSafari && <Globe className="w-5 h-5" />}
              <Smartphone className="w-5 h-5" />
              iOS Setup Required
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              To get notifications working on iOS, you need to:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium">Add to Home Screen</p>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Tap the Share button {isIOSChrome ? 'in Chrome' : 'in Safari'} and select "Add to Home Screen"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium">Launch from Home Screen</p>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Open the app from your Home Screen (not from the browser)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium">Enable Notifications</p>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    The notification prompt will appear when you open the app from the Home Screen
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> Notifications only work when the app is installed as a PWA on iOS. 
                Regular browser tabs don't support notifications.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Enable Notifications
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Hi {user.displayName}! 👋
          </p>
          
          <p className="text-gray-600 dark:text-gray-300">
            Stay on track with your fitness goals! Enable notifications to get:
          </p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">🍽️</span>
              <span>Meal reminders throughout the day</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">💧</span>
              <span>Hydration reminders to drink water</span>
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

          {isIOS && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>iOS Users:</strong> If the permission prompt doesn't appear, you may need to add this app to your Home Screen first.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
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
          </div>
        </div>
      </div>
    </div>
  );
}