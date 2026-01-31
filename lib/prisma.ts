import { PrismaClient } from "./generated/prisma"
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set')
    }

    console.log('[Prisma] Initializing database connection...')

    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
    })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

// Enhanced error handling for database operations
const createPrismaClient = () => {
    try {
        const client = prismaClientSingleton()

        // Test connection on initialization in production
        if (process.env.NODE_ENV === 'production') {
            client.$connect()
                .then(() => console.log('[Prisma] Database connection established'))
                .catch((error) => console.error('[Prisma] Failed to connect to database:', error))
        }

        return client
    } catch (error) {
        console.error('[Prisma] Failed to initialize database client:', error)
        throw error
    }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown handler
process.on('beforeExit', async () => {
    try {
        await prisma.$disconnect()
        console.log('[Prisma] Database connection closed')
    } catch (error) {
        console.error('[Prisma] Error during database disconnect:', error)
    }
})
