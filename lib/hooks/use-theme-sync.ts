'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { useAuthUser } from '@/lib/contexts/auth-context';

export function useThemeSync() {
    const { theme } = useTheme();
    const user = useAuthUser();

    // Sync theme changes to server when user is logged in
    useEffect(() => {
        const syncTheme = async () => {
            if (!user || !theme) return;

            try {
                const { updateProfile } = await import('@/app/actions/profile');
                // Only sync if it's a valid 'light' or 'dark' setting? 
                // Or store 'system' too? The backend likely stores a string.
                await updateProfile(user.id, { theme });
            } catch (error) {
                console.error('Failed to sync theme:', error);
            }
        };

        // Debounce could be good here but simplistic for now
        const timer = setTimeout(syncTheme, 1000);
        return () => clearTimeout(timer);
    }, [theme, user]);
}
