'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updatePreferences } from '@/app/actions/profile';

function getTimezoneOffsetString() {
    const offset = new Date().getTimezoneOffset();
    const sign = offset > 0 ? "-" : "+";
    const abs = Math.abs(offset);
    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
    const minutes = String(abs % 60).padStart(2, "0");
    return `${sign}${hours}:${minutes}`;
}

export function TimezoneSync() {
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.user?.id) {
            const browserTimezone = getTimezoneOffsetString();
            const storedTimezone = (session.user as any).timezone;

            if (browserTimezone !== storedTimezone) {
                console.log(`[TimezoneSync] Updating timezone from ${storedTimezone} to ${browserTimezone}`);
                updatePreferences((session.user as any).id, { timezone: browserTimezone })
                    .catch(err => console.error('[TimezoneSync] Failed to update timezone:', err));
            }
        }
    }, [session]);

    return null;
}
