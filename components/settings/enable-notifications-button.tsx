'use client';

import { useState, useCallback } from 'react';
import { Card, Button, Text } from '@heroui/react';
import { Bell, BellOff } from 'lucide-react';
import { useLocalNotifications } from '@/lib/hooks/use-local-notifications';

export function EnableNotificationsButton() {
    const { isSupported, permissionStatus, requestPermission } = useLocalNotifications();
    const [loading, setLoading] = useState(false);

    const handleEnable = useCallback(async () => {
        setLoading(true);
        try {
            await requestPermission();
        } finally {
            setLoading(false);
        }
    }, [requestPermission]);

    if (!isSupported || permissionStatus === 'granted') {
        return null;
    }

    return (
        <Card className="mb-4 bg-primary/10 border-primary/20 p-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6 text-primary" />
                    <div>
                        <h3 className="font-semibold text-primary">Enable Notifications</h3>
                        <Text className="text-sm text-foreground/70">
                            Get timely reminders for water, meals, and weight logs.
                        </Text>
                    </div>
                </div>
                <Button
                    variant='primary'
                    onClick={handleEnable}

                    isDisabled={permissionStatus === 'denied'}
                >
                    {permissionStatus === 'denied' ? 'Denied' : 'Enable'}
                </Button>
            </div>
            {permissionStatus === 'denied' && (
                <Text className="mt-2 text-xs text-destructive">
                    Notifications are blocked. Please enable them in your browser settings.
                </Text>
            )}
        </Card>
    );
}
