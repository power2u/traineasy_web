'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateLastActive } from "@/lib/utils/activity-tracker";
import { MeasurementType } from '@prisma/client';

export interface WeightLog {
    id: string;
    userId: string;
    weight: number;
    unit: 'kg' | 'lbs';
    date: Date;
    notes?: string;
    createdAt: Date;
}

async function checkAuth(userId: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).id !== userId) {
        throw new Error("Unauthorized");
    }
}

export async function getWeightLogs(userId: string, limit = 30) {
    try {
        await checkAuth(userId);

        const data = await prisma.bodyMeasurement.findMany({
            where: {
                userId: userId,
                measurementType: MeasurementType.weight
            },
            orderBy: {
                date: 'desc'
            },
            take: limit
        });

        return {
            success: true,
            logs: (data || []).map((data) => ({
                id: data.id,
                userId: data.userId,
                weight: Number(data.value),
                unit: data.unit as 'kg' | 'lbs',
                date: data.date,
                notes: data.notes || undefined,
                createdAt: data.createdAt,
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getLatestWeightLog(userId: string) {
    try {
        await checkAuth(userId);

        const data = await prisma.bodyMeasurement.findFirst({
            where: {
                userId: userId,
                measurementType: MeasurementType.weight
            },
            orderBy: {
                date: 'desc'
            }
        });

        return {
            success: true,
            log: data ? {
                id: data.id,
                userId: data.userId,
                weight: Number(data.value),
                unit: data.unit as 'kg' | 'lbs',
                date: data.date,
                notes: data.notes || undefined,
                createdAt: data.createdAt,
            } : null
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function checkCanLogToday(userId: string) {
    try {
        await checkAuth(userId);
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        const count = await prisma.bodyMeasurement.count({
            where: {
                userId: userId,
                measurementType: MeasurementType.weight,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        return { success: true, canLog: count === 0 };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createWeightLog(
    userId: string,
    weight: number,
    unit: 'kg' | 'lbs',
    notes?: string
) {
    try {
        await checkAuth(userId);
        const canLogResult = await checkCanLogToday(userId);
        if (canLogResult.success && !canLogResult.canLog) {
            return { success: false, error: 'You have already logged your weight today.' };
        }

        const data = await prisma.bodyMeasurement.create({
            data: {
                userId: userId,
                measurementType: MeasurementType.weight,
                value: weight,
                unit: unit,
                date: new Date(),
                notes: notes
            }
        });

        revalidatePath('/dashboard');
        revalidatePath('/weight');

        // Track activity
        await updateLastActive(userId);

        return {
            success: true,
            log: {
                id: data.id,
                userId: data.userId,
                weight: Number(data.value),
                unit: data.unit as 'kg' | 'lbs',
                date: data.date,
                notes: data.notes || undefined,
                createdAt: data.createdAt,
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteWeightLog(logId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            throw new Error("Unauthorized");
        }
        const userId = (session.user as any).id;

        const result = await prisma.bodyMeasurement.deleteMany({
            where: {
                id: logId,
                measurementType: MeasurementType.weight,
                userId: userId
            }
        });

        revalidatePath('/dashboard');
        revalidatePath('/weight');

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getWeightStatistics(userId: string) {
    try {
        await checkAuth(userId);

        // Fetch last 30 days for stats calculation
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const data = await prisma.bodyMeasurement.findMany({
            where: {
                userId: userId,
                measurementType: MeasurementType.weight,
                date: {
                    gte: thirtyDaysAgo
                }
            },
            select: {
                value: true,
                unit: true,
                date: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        if (!data || data.length === 0) {
            return { success: true, weeklyAverage: null, monthlyAverage: null };
        }

        // Helper to convert to kg
        const toKg = (val: string | number | unknown, unit: string) => {
            const num = Number(val);
            return unit === 'kg' ? num : num * 0.45359237;
        };

        const logs = data.map(d => ({
            weight: Number(d.value),
            unit: d.unit,
            date: d.date
        }));

        // Weekly Average (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weeklyLogs = logs.filter(l => l.date >= sevenDaysAgo);

        let weeklyAverage = null;
        if (weeklyLogs.length > 0) {
            const sum = weeklyLogs.reduce((acc, l) => acc + toKg(l.weight, l.unit), 0);
            weeklyAverage = sum / weeklyLogs.length;
        }

        // Monthly Average
        const sumMonthly = logs.reduce((acc, l) => acc + toKg(l.weight, l.unit), 0);
        const monthlyAverage = sumMonthly / logs.length;

        return { success: true, weeklyAverage, monthlyAverage };

    } catch (error: any) {
        return { success: false, error: error.message, weeklyAverage: null, monthlyAverage: null };
    }
}
