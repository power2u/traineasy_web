'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export function useThemeSync() {
    const { theme } = useTheme();

    // Sync theme changes to server when user is logged in
    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;
        
        const syncTheme = async () => {
            try {
                // Dynamically import auth context to avoid SSR issues
                const { useAuthUser } = await import('@/lib/contexts/auth-context');
                const user = useAuthUser();
                
                if (!user || !theme) return;

                const { updateProfile } = await import('@/app/actions/profile');
                await updateProfile(user.id, { theme });
            } catch (error) {
                console.error('Failed to sync theme:', error);
            }
        };

        // Debounce could be good here but simplistic for now
        const timer = setTimeout(syncTheme, 1000);
        return () => clearTimeout(timer);
    }, [theme]);
}
