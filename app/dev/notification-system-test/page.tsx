'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from '@heroui/react';
import { Bell, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { useAuthUser } from '@/lib/contexts/auth-context';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';
import { useMealScheduler } from '@/lib/hooks/use-meal-scheduler';
import { waterScheduler } from '@/lib/notifications/water-scheduler';

export default function NotificationSystemTestPage() {
  const user = useAuthUser();
  const { permissionStatus, showTestNotification } = useLocalNotifications();
  const { isEnabled: mealEnabled, getNextMeal, scheduledCount } = useMealScheduler();
  
  const [message, setMessage] = useState<string>('');
  const [nextMeal, setNextMeal] = useState<{ meal: string; time: Date } | null>(null);

  useEffect(() => {
    const next = getNextMeal();
    setNextMeal(next);
  }, [getNextMeal]);

  const testAllNotifications = async () => {
    if (!user) return;

    setMessage('Testing notifications...');

    try {
      // Test local notification
      const localSuccess = await showTestNotification();
      
      // Test meal notification
      const mealSuccess = mealEnabled() ? true : false;
      
      // Test water notification
      const waterSuccess = waterScheduler.showTestWaterNotification();

      const results = {
        local: localSuccess,
        meal: mealSuccess,
        water: waterSuccess
      };

      const successCount = Object.values(results).filter(Boolean).length;
      setMessage(`✅ ${successCount}/3 notification systems working`);
    } catch (error) {
      setMessage('❌ Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const StatusIcon = ({ enabled }: { enabled: boolean }) => {
    return enabled ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">Notification System Test</h1>
          <p>Please log in to test notifications.</p>
        </Card>
      </div>
    );
  }

  const hasPermission = permissionStatus === 'granted';

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Notification System Test</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p><strong>User:</strong> {user.displayName}</p>
            <p><strong>Permission:</strong> {hasPermission ? '✅ Granted' : '❌ Not granted'}</p>
          </div>
          <div>
            <p><strong>Scheduled:</strong> {scheduledCount || 0} notifications</p>
            {nextMeal && <p><strong>Next Meal:</strong> {nextMeal.meal} at {nextMeal.time.toLocaleTimeString()}</p>}
          </div>
        </div>

        <Button
          onClick={testAllNotifications}
          isDisabled={!hasPermission}
          className="bg-blue-500 text-white mr-2"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test All Notifications
        </Button>

        {message && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm">{message}</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <StatusIcon enabled={hasPermission} />
            <span>Browser Notifications</span>
          </div>
          
          <div className="flex items-center gap-3">
            <StatusIcon enabled={mealEnabled()} />
            <span>Meal Scheduler</span>
          </div>
          
          <div className="flex items-center gap-3">
            <StatusIcon enabled={waterScheduler.isEnabled()} />
            <span>Water Scheduler</span>
          </div>
        </div>
      </Card>
    </div>
  );
}