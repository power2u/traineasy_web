
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env
dotenv.config({ path: '.env.local' });

async function main() {
    const targetEmail = process.argv[2]; // Get email from command line
    const newPassword = process.argv[3] || "Fitness@123";

    if (!targetEmail) {
        console.error('❌ Please provide an email address as the first argument.');
        console.log('Usage: node scripts/reset-user-password.js <email> [new_password]');
        process.exit(1);
    }

    console.log(`[Script] Resetting password for: ${targetEmail}`);
    console.log('[Script] Initializing database connection...');

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

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        console.log(`[Script] Generated hash for '${newPassword}'`);

        // Update user
        const updatedUser = await prisma.userPreference.update({
            where: { email: targetEmail },
            data: {
                passwordHash: hashedPassword,
                passwordChangeRequired: true // Force them to change it
            }
        });

        console.log(`✅ Successfully updated password for user ID: ${updatedUser.id}`);
        console.log(`👉 New Password: ${newPassword}`);
        console.log(`👉 Status: Change Required on next login`);

        await prisma.$disconnect();
        await pool.end();
    } catch (error) {
        if (error.code === 'P2025') {
            console.error('❌ User not found with that email.');
        } else {
            console.error('❌ Update failed:', error);
        }
        process.exit(1);
    }
}

main();
