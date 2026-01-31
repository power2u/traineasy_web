import { NextResponse } from 'next/server';
import { requireAdminWithSecurityChecks } from '@/lib/utils/server-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        // Require admin access
        const { user, error } = await requireAdminWithSecurityChecks(request);
        if (error) return error;

        // Get recent security-related events from database
        // This is a basic implementation - in production you'd have a dedicated security log table
        
        const recentUsers = await prisma.userPreference.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true,
                lastSignInAt: true,
                emailVerified: true,
                bannedUntil: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const suspiciousUsers = recentUsers.filter(user => 
            !user.emailVerified || 
            user.email.includes('test') || 
            user.email.includes('admin') ||
            user.fullName.toLowerCase().includes('admin') ||
            user.fullName.toLowerCase().includes('test')
        );

        const stats = {
            totalUsers: await prisma.userPreference.count(),
            unverifiedUsers: await prisma.userPreference.count({
                where: { emailVerified: false }
            }),
            adminUsers: await prisma.userPreference.count({
                where: { role: 'super_admin' }
            }),
            bannedUsers: await prisma.userPreference.count({
                where: { 
                    bannedUntil: {
                        gt: new Date()
                    }
                }
            }),
            recentRegistrations: await prisma.userPreference.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                }
            })
        };

        return NextResponse.json({
            stats,
            recentUsers: recentUsers.slice(0, 20),
            suspiciousUsers,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Security API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch security logs' },
            { status: 500 }
        );
    }
}