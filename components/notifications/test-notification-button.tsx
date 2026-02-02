'use client';

import { useState } from 'react';
import { Button } from '@heroui/react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

export function TestNotificationButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTestNotification = async () => {
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

  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={handleTestNotification}
      isDisabled={isLoading}
      className="flex items-center gap-2"
    >
      <Bell className="w-4 h-4" />
      {isLoading ? 'Sending...' : 'Test Notification'}
    </Button>
  );
}