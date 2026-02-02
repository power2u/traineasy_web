'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from '@heroui/react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { requestNotificationPermission, saveFCMToken, areNotificationsEnabled, isNotificationSupported } from '@/lib/firebase/messaging';
import { useAuthUser } from '@/lib/contexts/auth-context';

export function NotificationPermissionPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const user = useAuthUser();

  // Only render on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Check if we should show the prompt
    const checkShouldShow = () => {
      if (!user || isDismissed) return false;
      
      // Don't show if notifications are not supported
      if (!isNotificationSupported()) return false;
      
      // Don't show if notifications are already enabled
      if (areNotificationsEnabled()) return false;
      
      // Check if user has previously dismissed this session
      const dismissed = sessionStorage.getItem('notification-prompt-dismissed');
      if (dismissed) return false;
      
      return true;
    };

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      if (checkShouldShow()) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, isDismissed, isClient]);

  const handleEnableNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const token = await requestNotificationPermission();
      
      if (token) {
        // Save token to database
        const success = await saveFCMToken(user.id, token);
        
        if (success) {
          toast.success('🎉 Notifications enabled! You\'ll receive a welcome message shortly.');
          setIsVisible(false);
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

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const handleNotNow = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('notification-prompt-dismissed', 'true');
    toast.info('You can enable notifications later from your profile settings.');
  };

  // Don't render anything during SSR or if not visible
  if (!isClient || !isVisible || !user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <Card className="p-4 shadow-lg border border-primary/20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Stay on track with notifications
            </h3>
            <p className="text-xs text-default-500 mb-3">
              Get gentle reminders for meals, water intake, and progress updates to help you reach your fitness goals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                variant="primary"
                onPress={handleEnableNotifications}
                isDisabled={isLoading}
                className="flex-1 justify-center"
              >
                <Bell className="w-4 h-4 mr-1" />
                Enable
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onPress={handleNotNow}
                isDisabled={isLoading}
                className="justify-center"
              >
                Not now
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onPress={handleDismiss}
            isDisabled={isLoading}
            className="min-w-0 p-1 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}