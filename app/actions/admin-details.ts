'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserPreference, Meal, WaterIntake, BodyMeasurement } from '@/lib/generated/prisma';

// Define strict types for return data to ensure type safety on client
export interface AdminUserDetails {
    user: UserPreference;
    weightLogs: BodyMeasurement[];
    mealLogs: Meal[];
    waterLogs: WaterIntake[];
    measurements: BodyMeasurement[];
    membership: any; // Using any for now to include custom calculated fields like isExpired
}

export type AdminUserDetailsResponse =
    | { success: true; data: AdminUserDetails }
    | { success: false; error: string; details?: any };

export async function getAdminUserDetails(userId: string): Promise<AdminUserDetailsResponse> {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Check if user has admin role
        const isSuperAdmin = session.user.role === 'super_admin';

        if (!isSuperAdmin) {
            return { success: false, error: 'Admin access required' };
        }

        // Get user profile and preferences
        const profile = await prisma.userPreference.findUnique({
            where: { id: userId }
        });

        if (!profile) {
            return {
                success: false,
                error: 'User not found'
            };
        }

        const userProfile = profile;

        // Run parallel queries for logs
        const [mealLogs, waterLogs, measurements, membership] = await Promise.all([
            prisma.meal.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
            prisma.waterIntake.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } }),
            prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
            prisma.userMembership.findFirst({
                where: { userId, status: 'active' },
                include: { package: true }
            })
        ]);

        // Filter weight measurements from body_measurements for backward compatibility/separate view
        const weightLogs = measurements.filter((m: BodyMeasurement) => m.measurementType === 'weight');

        // Calculate isExpired for membership if it exists
        let enhancedMembership = null;
        if (membership) {
            const now = new Date();
            const endDate = new Date(membership.endDate);
            const isExpired = endDate < now || membership.status === 'expired';

            enhancedMembership = {
                ...membership,
                isExpired
            };
        }

        return {
            success: true,
            data: {
                user: userProfile,
                weightLogs,
                mealLogs,
                waterLogs,
                measurements, // All body measurements including weight
                membership: enhancedMembership,
            }
        };

    } catch (error: any) {
        console.error('Error fetching admin user details:', error);
        return { success: false, error: 'Internal server error', details: error.message };
    }
}

export async function updateAdminUserProfile(userId: string, profileData: any) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Check if user has admin role
        const isSuperAdmin = session.user.role === 'super_admin';

        if (!isSuperAdmin) {
            return { success: false, error: 'Admin access required' };
        }

        console.log('Update admin user profile data:', profileData);

        // Remove ID and other immutable or managed fields
        const { id, email, createdAt, updatedAt, lastSignInAt, lastActiveAt, role, ...dataToUpdate } = profileData;

        const user = await prisma.userPreference.update({
            where: { id: userId },
            data: dataToUpdate
        });

        return { success: true, user };
    } catch (error: any) {
        console.error('Error updating admin user profile:', error);
        return { success: false, error: error.message || 'Failed to update profile' };
    }
}
