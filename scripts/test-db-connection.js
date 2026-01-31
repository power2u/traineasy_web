
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Testing Database Connection...');
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL not set');
        process.exit(1);
    }

    try {
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });

        console.log('Attempting to connect...');
        await prisma.$connect();
        console.log('✅ Connection successful!');

        const count = await prisma.userPreference.count();
        console.log(`✅ Database query successful. User count: ${count}`);

        await prisma.$disconnect();
        await pool.end();
    } catch (error) {
        console.error('❌ Connection failed:', error);
        process.exit(1);
    }
}

main();
