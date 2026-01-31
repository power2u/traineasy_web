
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: '.env.local' });

async function main() {
    const email = "jaspreet.codrity@gmail.com";
    console.log(`[Script] Inspecting user: ${email}...`);

    const connectionString = process.env.DATABASE_URL;
    try {
        const pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });

        await prisma.$connect();

        const user = await prisma.userPreference.findUnique({
            where: { email },
        });

        if (user) {
            console.log('--- USER DETAILS ---');
            console.log('ID:', user.id);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Banned Until:', user.bannedUntil);
            console.log('Email Verified:', user.emailVerified);
            console.log('Password Change Required:', user.passwordChangeRequired);
            console.log('Hash length:', user.passwordHash?.length);
        } else {
            console.log('User not found.');
        }

        await prisma.$disconnect();
        await pool.end();
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

main();
