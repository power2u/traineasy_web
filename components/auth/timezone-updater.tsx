'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateUserTimezone } from '@/app/actions/user';

export function TimezoneUpdater() {
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.user) {
            const updateTimezone = async () => {
                try {
                    const offset = new Date().getTimezoneOffset();
                    const sign = offset > 0 ? "-" : "+";
                    const abs = Math.abs(offset);
                    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
                    const minutes = String(abs % 60).padStart(2, "0");
                    const timezone = `${sign}${hours}:${minutes}`;

                    // We can't easily check the server value here without an extra fetch, 
                    // but the server action checks before writing, so it's safe to fire and forget.
                    // To be nicer to the network, we could store in sessionStorage.

                    const storedTz = sessionStorage.getItem('user_timezone_synced');
                    if (storedTz === timezone) {
                        return;
                    }

                    await updateUserTimezone(timezone);
                    sessionStorage.setItem('user_timezone_synced', timezone);
                    console.log(`[Timezone] Synced: ${timezone}`);

                } catch (error) {
                    console.error('[Timezone] Sync failed', error);
                }
            };

            updateTimezone();
        }
    }, [session]);

    return null; // This component renders nothing
}
