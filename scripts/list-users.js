
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('[Script] Listing users...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  try {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    await prisma.$connect();

    const users = await prisma.userPreference.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    console.log(`--- FOUND ${users.length} USERS ---`);
    console.table(users);

    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

main();
