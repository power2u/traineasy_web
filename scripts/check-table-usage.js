const fs = require('fs');
const path = require('path');

const tables = [
    'user_memberships',
    'user_membership_details',
    'fcm_tokens',
    'water_intake',
    'meals',
    'cron_config',
    'notification_messages',
    'body_measurements',
    'user_preferences',
    'cron_logs',
    'notification_logs',
    'user_plans',
    'motivation_banners',
    'packages',
    'user_packages',
    'daily_wellness_checkin'
];

const rootDir = path.resolve(__dirname, '..');
const dirsToScan = ['app', 'lib', 'components', 'utils', 'hooks', 'types', 'scripts'];
const skipFiles = ['check-table-usage.js', 'sync-auth-emails.ts'];

const counts = {};
tables.forEach(t => counts[t] = 0);

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else {
            if (skipFiles.includes(file)) continue;

            const content = fs.readFileSync(fullPath, 'utf8');
            tables.forEach(table => {
                // Simple string match, case sensitive? 
                // Postgres tables are usually lower case.
                // We look for exact string match of table name.
                if (content.includes(table)) {
                    counts[table]++;
                }
            });
        }
    }
}

dirsToScan.forEach(d => scanDir(path.join(rootDir, d)));

console.log("Table Usage Report:");
console.log("-------------------");
const unused = [];
tables.forEach(table => {
    console.log(`${table}: ${counts[table]}`);
    if (counts[table] === 0) unused.push(table);
});

console.log("\nPotentially Unused Tables:");
console.log(unused.join(', '));
