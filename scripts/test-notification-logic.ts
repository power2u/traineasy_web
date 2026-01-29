
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1); // Error case
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const USER_ID = process.argv[2];

async function runTest() {
    if (!USER_ID) {
        console.log('No USER_ID provided. Fetching first user...');
        try {
            const { data: users, error } = await supabase
                .from('user_preferences')
                .select('id, full_name, timezone')
                .limit(1); // Just get one to be safe

            if (error) {
                console.error('Error:', error.message);
            } else if (users && users.length > 0) {
                console.log('User Found:', users[0]);
                console.log(`\nRun again with: npx tsx scripts/test-notification-logic.ts ${users[0].id}`);
            } else {
                console.log('No users found.');
            }
        } catch (e: any) {
            console.error('Exception:', e.message);
        }
        // Allow flush
        setTimeout(() => process.exit(0), 1000);
        return;
    }

    console.log(`Testing logic for user: ${USER_ID}`);

    // 1. Fetch User Preferences
    const { data: user, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', USER_ID)
        .single();

    if (error || !user) {
        console.error('Error fetching user:', error);
        setTimeout(() => process.exit(1), 1000);
        return;
    }

    console.log(`Name: ${user.full_name}, Timezone: ${user.timezone || 'Default'}`);

    // 2. Calculate User Time
    const timezone = user.timezone || 'Asia/Kolkata';
    const { hours, minutes, timeStr } = getTimeInTimezone(timezone);
    console.log(`User Local Time: ${timeStr} (${hours}:${minutes})`);

    // 3. Check Logic
    const triggers = [
        { type: 'breakfast', time: user.breakfast_time },
        { type: 'snack1', time: user.snack1_time },
        { type: 'lunch', time: user.lunch_time },
        { type: 'snack2', time: user.snack2_time },
        { type: 'dinner', time: user.dinner_time },
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
