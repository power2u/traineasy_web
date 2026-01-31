
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('[Migration] Starting membership migration...');

    // 1. Setup Connections
    const sourceUrl = process.env.SUPABASE_DB_URL;
    const targetUrl = process.env.DATABASE_URL;

    if (!sourceUrl || !targetUrl) {
        console.error('❌ Missing SUPABASE_DB_URL or DATABASE_URL in .env.local');
        process.exit(1);
    }

    const sourcePool = new Pool({ connectionString: sourceUrl });
    const targetPool = new Pool({ connectionString: targetUrl });

    try {
        // 2. Fetch Source Data
        console.log('[Migration] Fetching memberships from Supabase...');
        // Note: Adjust table name if it differs in Supabase (e.g. "public"."user_memberships")
        const sourceRes = await sourcePool.query('SELECT * FROM "public"."user_memberships"');
        const memberships = sourceRes.rows;
        console.log(`[Migration] Found ${memberships.length} memberships.`);

        if (memberships.length === 0) {
            console.log('[Migration] No memberships to migrate.');
            return;
        }

        // 3. Insert into Target
        console.log('[Migration] Inserting into Target DB...');
        let successCount = 0;
        let errorCount = 0;

        for (const m of memberships) {
            try {
                await targetPool.query(`
          INSERT INTO "user_memberships" (
            "id",
            "user_id",
            "package_id",
            "status",
            "start_date",
            "end_date",
            "created_at",
            "updated_at"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT ("id") DO UPDATE SET
            "status" = EXCLUDED."status",
            "end_date" = EXCLUDED."end_date",
            "updated_at" = EXCLUDED."updated_at"
        `, [
                    m.id,
                    m.user_id,
                    m.package_id,
                    m.status || 'active',
                    m.start_date,
                    m.end_date,
                    m.created_at || new Date(),
                    m.updated_at || new Date()
                ]);
                successCount++;
            } catch (err) {
                console.error(`❌ Failed to migrate membership ${m.id}:`, err.message);
                errorCount++;
            }
        }

        console.log('--- MIGRATION SUMMARY ---');
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);

    } catch (error) {
        console.error('❌ specific error:', error);
    } finally {
        await sourcePool.end();
        await targetPool.end();
    }
}

main();
