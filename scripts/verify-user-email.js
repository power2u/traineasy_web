
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: '.env.local' });

async function main() {
    const email = "jaspreet.codrity@gmail.com";
    console.log(`[Script] Verifying email for: ${email}...`);

    const connectionString = process.env.DATABASE_URL;
    try {
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });

        await prisma.$connect();

        // Simplified update - removed Date field to avoid type friction for now
        const user = await prisma.userPreference.update({
            where: { email },
            data: {
                emailVerified: true
            }
        });

        console.log('✅ Success! User details updated:');
        console.log('Email Verified:', user.emailVerified);

        await prisma.$disconnect();
        await pool.end();
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

main();
