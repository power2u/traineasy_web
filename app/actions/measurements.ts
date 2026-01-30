'use server';

import { prisma } from '@/lib/prisma';
import { MeasurementType as AppMeasurementType, BodyMeasurement } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MeasurementType as PrismaMeasurementType } from '@prisma/client';

export interface MeasurementsData {
    measurements: BodyMeasurement[];
    preferences: {
        preferred_unit: 'kg' | 'lbs' | 'cm' | 'in';
    };
    stats: {
        weeklyAverage: number | null;
        monthlyAverage: number | null;
    };
    canLogToday: boolean;
}

async function checkAuth(userId: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).id !== userId) {
        throw new Error("Unauthorized");
    }
}

export async function getMeasurementsData(userId: string, type: AppMeasurementType, days: number = 90): Promise<MeasurementsData> {
    await checkAuth(userId);

    // 1. Fetch Preferences
    const prefs = await prisma.userPreference.findUnique({
        where: { id: userId },
        select: { preferredUnit: true }
    });

    const preferredUnit = type === 'weight' ? (prefs?.preferredUnit || 'kg') : 'cm';

    // 2. Fetch Measurements
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Cast AppMeasurementType string to PrismaMeasurementType enum if possible, or use string if Prisma allows (it expects Enum)
    // Assuming enum keys match strings exactly or Prisma generated client maps them.
    // If Prisma enum is MeasurementType.weight, MeasurementType.biceps_left etc.
    const prismaType = type as unknown as PrismaMeasurementType;

    const data = await prisma.bodyMeasurement.findMany({
        where: {
            userId: userId,
            measurementType: prismaType,
            date: {
                gte: startDate
            }
        },
        orderBy: {
            date: 'desc'
        }
    });

    // Map Prisma camelCase to App snake_case
    const measurementList: BodyMeasurement[] = data.map(m => ({
        id: m.id,
        user_id: m.userId,
        measurement_type: m.measurementType as unknown as AppMeasurementType,
        value: Number(m.value),
        unit: m.unit as 'kg' | 'lbs' | 'cm' | 'in',
        date: m.date.toISOString().split('T')[0], // format YYYY-MM-DD
        notes: m.notes || undefined,
        created_at: m.createdAt.toISOString(),
        updated_at: m.updatedAt.toISOString() // Assuming updatedAt exists on model
    }));

    // 3. Calculate Stats
    const calculateAverage = (items: BodyMeasurement[], numDays: number) => {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - numDays);
        const thresholdStr = thresholdDate.toISOString().split('T')[0];

        const filtered = items.filter(m => m.date >= thresholdStr);
        if (filtered.length === 0) return null;

        const sum = filtered.reduce((acc, curr) => acc + curr.value, 0);
        return sum / filtered.length;
    };

    const weeklyAverage = calculateAverage(measurementList, 7);
    const monthlyAverage = calculateAverage(measurementList, 30);

    // 4. Can Log Today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Check purely based on fetched list (which covers 'days' range).
    // If 'days' is small, it might miss today? No, 'days' usually includes today.
    // Logic: check recent list.
    const todayStr = today.toISOString().split('T')[0];
    const loggedToday = measurementList.some(m => m.date === todayStr);

    // Alternatively, verify against DB if list is truncated/empty passed 'days'.
    // Safe to rely on DB check if we want accuracy regardless of 'days' param.
    // user's original code used list.some().
    // We'll stick to DB check to be safe if 'days' is short.

    const countToday = await prisma.bodyMeasurement.count({
        where: {
            userId: userId,
            measurementType: prismaType,
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    });

    return {
        measurements: measurementList,
        preferences: {
            preferred_unit: preferredUnit as 'kg' | 'lbs' | 'cm' | 'in'
        },
        stats: {
            weeklyAverage,
            monthlyAverage
        },
        canLogToday: countToday === 0
    };
}

export async function saveMeasurementAction(
    userId: string,
    type: AppMeasurementType,
    value: number,
    unit: string,
    notes?: string
) {
    await checkAuth(userId);

    // Prisma upsert needs unique identifier.
    // Unlike Supabase which can match on Unique Index columns.
    // If we have unique constraint on (userId, measurementType, date), we can use upsert(where: { userId_measurementType_date: ... }).
    // I need to check schema for unique constraint.
    // Assuming NO unique constraint for now because I didn't see one besides id.
    // Supabase .upsert() acts as "insert or update if conflict".
    // If there is a unique index, it works.
    // I previously assumed I should do findFirst then Update/Create.

    const prismaType = type as unknown as PrismaMeasurementType;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const existing = await prisma.bodyMeasurement.findFirst({
        where: {
            userId: userId,
            measurementType: prismaType,
            date: startOfDay
        }
    });

    if (existing) {
        await prisma.bodyMeasurement.update({
            where: { id: existing.id },
            data: {
                value: value,
                unit: unit,
                notes: notes
            }
        });
    } else {
        await prisma.bodyMeasurement.create({
            data: {
                userId: userId,
                measurementType: prismaType,
                value: value,
                unit: unit,
                date: startOfDay,
                notes: notes
            }
        });
    }

    revalidatePath('/measurements');
    return { success: true };
}

export async function deleteMeasurementAction(id: string, userId: string) {
    await checkAuth(userId);

    // Use deleteMany to ensure ownership check
    await prisma.bodyMeasurement.deleteMany({
        where: {
            id: id,
            userId: userId
        }
    });

    revalidatePath('/measurements');
    return { success: true };
}
