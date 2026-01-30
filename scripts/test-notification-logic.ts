
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@/lib/generated/prisma/client';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const prisma = new PrismaClient();

const USER_ID = process.argv[2];

async function runTest() {
    if (!USER_ID) {
        console.log('No USER_ID provided. Fetching first user...');
        try {
            const user = await prisma.userPreference.findFirst({
                select: {
                    id: true,
                    fullName: true,
                    timezone: true,
                },
            });

            if (user) {
                console.log('User Found:', user);
                console.log(`\nRun again with: npx tsx scripts/test-notification-logic.ts ${user.id}`);
            } else {
                console.log('No users found.');
            }
        } catch (e: any) {
            console.error('Exception:', e.message);
        } finally {
            await prisma.$disconnect();
        }
        // Allow flush
        setTimeout(() => process.exit(0), 1000);
        return;
    }

    console.log(`Testing logic for user: ${USER_ID}`);

    try {
        // 1. Fetch User Preferences
        const user = await prisma.userPreference.findUnique({
            where: { id: USER_ID },
        });

        if (!user) {
            console.error('Error fetching user: User not found');
            setTimeout(() => process.exit(1), 1000);
            return;
        }

        console.log(`Name: ${user.fullName}, Timezone: ${user.timezone || 'Default'}`);

        // 2. Calculate User Time
        const timezone = user.timezone || 'Asia/Kolkata';
        const { hours, minutes, timeStr } = getTimeInTimezone(timezone);
        console.log(`User Local Time: ${timeStr} (${hours}:${minutes})`);

        // 3. Check Logic
        const triggers = [
            { type: 'breakfast', time: user.breakfastTime },
            { type: 'snack1', time: user.snack1Time },
            { type: 'lunch', time: user.lunchTime },
            { type: 'snack2', time: user.snack2Time },
            { type: 'dinner', time: user.dinnerTime },
            { type: 'water_reminder', time: '12:00' },
            { type: 'good_morning', time: '07:00' },
            { type: 'good_night', time: '21:00' }
        ];

        for (const trigger of triggers) {
            if (!trigger.time) continue;

            const isMatch = isTimeMatch(hours, minutes, trigger.time);
            const diff = getTimeDiff(hours, minutes, trigger.time);

            console.log(`[${trigger.type}] Target: ${trigger.time} | Match: ${isMatch} | Diff: ${diff} mins`);
        }
    } catch (error: any) {
        console.error('Error during test:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Helpers
function getTimeInTimezone(timezone: string) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    return { hours, minutes, timeStr: `${hours}:${minutes}` };
}

function isTimeMatch(h: number, m: number, target: string) {
    const [th, tm] = target.split(':').map(Number);
    const diff = Math.abs((h * 60 + m) - (th * 60 + tm));
    return diff <= 30;
}

function getTimeDiff(h: number, m: number, target: string) {
    const [th, tm] = target.split(':').map(Number);
    return (h * 60 + m) - (th * 60 + tm);
}

runTest();
