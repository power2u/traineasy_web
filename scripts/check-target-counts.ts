import { prisma } from '../lib/prisma';

async function main() {
    const tables = [
        'userPreference',
        'waterIntake',
        'meal',
        'bodyMeasurement',
        'dailyWellnessCheckin',
        'userPlan',
        'package',
        'userPackage',
        'userMembership',
        'notificationMessage',
        'notificationLog',
        'fcmToken',
        'motivationBanner',
        'cronConfig',
        'cronLog',
        'mealReminder'
    ];

    console.log('--- Target Database Row Counts ---');
    for (const table of tables) {
        try {
            const count = await (prisma as any)[table].count();
            console.log(`${table}: ${count}`);
        } catch (err: any) {
            console.log(`${table}: ERROR (${err.message.split('\n')[0]})`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
