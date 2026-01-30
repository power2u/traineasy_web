'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateLastActive } from "@/lib/utils/activity-tracker";

export interface WaterIntakeEntry {
  id: string;
  userId: string;
  timestamp: Date;
  glassCount: number;
  createdAt: Date;
}

async function checkAuth(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).id !== userId) {
    throw new Error("Unauthorized");
  }
}

export async function getTodayWaterEntries(userId: string) {
  try {
    await checkAuth(userId);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const data = await prisma.waterIntake.findMany({
      where: {
        userId: userId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    return {
      success: true,
      entries: data.map(entry => ({
        id: entry.id,
        userId: entry.userId,
        timestamp: entry.timestamp.toISOString(),
        glassCount: entry.glassCount,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllWaterEntries(userId: string, limit = 50) {
  try {
    await checkAuth(userId);

    const data = await prisma.waterIntake.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    return {
      success: true,
      entries: data.map(entry => ({
        id: entry.id,
        userId: entry.userId,
        timestamp: entry.timestamp.toISOString(),
        glassCount: entry.glassCount,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addWaterEntry(userId: string, glassCount: number = 1) {
  try {
    await checkAuth(userId);

    const data = await prisma.waterIntake.create({
      data: {
        userId: userId,
        glassCount: glassCount,
        timestamp: new Date(),
      }
    });

    // Track activity
    await updateLastActive(userId);

    return {
      success: true,
      entry: {
        id: data.id,
        userId: data.userId,
        timestamp: data.timestamp.toISOString(),
        glassCount: data.glassCount,
        createdAt: data.createdAt.toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteWaterEntry(entryId: string) {
  try {
    // Verify ownership
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }
    const userId = (session.user as any).id;

    await prisma.waterIntake.deleteMany({
      where: {
        id: entryId,
        userId: userId // SECURITY: Ensure ownership
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTodayWaterCount(userId: string) {
  try {
    // Check auth implicitly by calling getTodayWaterEntries which checks it
    const result = await getTodayWaterEntries(userId);
    if (!result.success) throw new Error(result.error);
    return { success: true, count: result.entries?.length || 0 };
  } catch (error: any) {
    return { success: false, error: error.message, count: 0 };
  }
}

export async function getTodayWaterTotal(userId: string) {
  try {
    // Check auth implicitly by calling getTodayWaterEntries which checks it
    const result = await getTodayWaterEntries(userId);
    if (!result.success) throw new Error(result.error);
    const totalGlasses = (result.entries || []).reduce((sum, entry) => sum + entry.glassCount, 0);
    const totalMl = totalGlasses * 250; // Each glass is 250ml
    return { success: true, total: totalMl, totalGlasses };
  } catch (error: any) {
    return { success: false, error: error.message, total: 0, totalGlasses: 0 };
  }
}

export async function getWaterTarget(userId: string) {
  try {
    await checkAuth(userId);

    const data = await prisma.userPreference.findUnique({
      where: { id: userId },
      select: { dailyWaterTarget: true }
    });

    if (!data) {
      console.warn(`[getWaterTarget] User not found: ${userId}`);
      return { success: true, target: 14 }; // Default fallback
    }

    // Default to 8 if not set (db default is 2000ml, converted to ~8 glasses)
    return { success: true, target: Math.round(data.dailyWaterTarget / 250) || 8 };
  } catch (error: any) {
    return { success: false, error: error.message, target: 14 };
  }
}

export async function updateWaterTarget(userId: string, targetGlasses: number) {
  try {
    await checkAuth(userId);

    // Convert glasses to ml (250ml per glass)
    const targetMl = targetGlasses * 250;

    await prisma.userPreference.update({
      where: { id: userId },
      data: { dailyWaterTarget: targetMl }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
