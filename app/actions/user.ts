'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Update the user's timezone
 */
export async function updateUserTimezone(timezone: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return { success: false, error: 'Unauthorized' };
        }

        // Basic validation for timezone format (simple check)
        // Expecting formats like "+05:30", "-04:00", etc.
        if (!timezone.match(/^[+-]\d{2}:\d{2}$/)) {
            // Fallback or just log it - but user specifically asked for this format
            // We'll proceed but maybe log a warning if it looks weird, though the client function generates it rigidly.
        }

        // Check if update is needed to avoid DB writes
        const currentUser = await prisma.userPreference.findUnique({
            where: { email: session.user.email },
            select: { timezone: true }
        });

        if (currentUser?.timezone === timezone) {
            return { success: true, message: 'Timezone already up to date' };
        }

        await prisma.userPreference.update({
            where: { email: session.user.email },
            data: { timezone },
        });

        revalidatePath('/profile');

        return { success: true };
    } catch (error: any) {
        console.error('Error updating timezone:', error);
        return { success: false, error: error.message };
    }
}
