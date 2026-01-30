'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface WellnessCheckIn {
  id?: string;
  user_id: string;
  date: string;
  overall_feeling?: number;
  feeling_bloated: boolean;
  feeling_low_energy: boolean;
  feeling_hungry: boolean;
  feeling_nauseous: boolean;
  feeling_headache: boolean;
  feeling_cramps: boolean;
  feeling_energized: boolean;
  feeling_satisfied: boolean;
  feeling_strong: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper to map Prisma result to WellnessCheckIn
function mapWellness(data: any): WellnessCheckIn {
  return {
    id: data.id,
    user_id: data.userId,
    date: data.date.toISOString().split('T')[0], // YYYY-MM-DD
    overall_feeling: data.overallFeeling !== null ? data.overallFeeling : undefined,
    feeling_bloated: data.feelingBloated,
    feeling_low_energy: data.feelingLowEnergy,
    feeling_hungry: data.feelingHungry,
    feeling_nauseous: data.feelingNauseous,
    feeling_headache: data.feelingHeadache,
    feeling_cramps: data.feelingCramps,
    feeling_energized: data.feelingEnergized,
    feeling_satisfied: data.feelingSatisfied,
    feeling_strong: data.feelingStrong,
    notes: data.notes || undefined,
    created_at: data.createdAt.toISOString(),
    updated_at: data.createdAt.toISOString(), // Mapping create to update if update missing
  };
}

async function checkAuth(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).id !== userId) {
    throw new Error("Unauthorized");
  }
}

export async function getTodayWellnessCheckIn(userId: string) {
  try {
    await checkAuth(userId);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const data = await prisma.dailyWellnessCheckin.findFirst({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    return {
      success: true,
      checkIn: data ? mapWellness(data) : null,
    };
  } catch (error: any) {
    console.error('Error fetching wellness check-in:', error);
    return {
      success: false,
      error: 'Failed to fetch wellness check-in',
      checkIn: null,
    };
  }
}

export async function saveWellnessCheckIn(
  userId: string,
  checkInData: Partial<WellnessCheckIn>
) {
  try {
    await checkAuth(userId);

    // Normalize date to today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Prepare update data: map snake_case input to camelCase
    const inputData: any = {};
    if (checkInData.overall_feeling !== undefined) inputData.overallFeeling = checkInData.overall_feeling;
    if (checkInData.feeling_bloated !== undefined) inputData.feelingBloated = checkInData.feeling_bloated;
    if (checkInData.feeling_low_energy !== undefined) inputData.feelingLowEnergy = checkInData.feeling_low_energy;
    if (checkInData.feeling_hungry !== undefined) inputData.feelingHungry = checkInData.feeling_hungry;
    if (checkInData.feeling_nauseous !== undefined) inputData.feelingNauseous = checkInData.feeling_nauseous;
    if (checkInData.feeling_headache !== undefined) inputData.feelingHeadache = checkInData.feeling_headache;
    if (checkInData.feeling_cramps !== undefined) inputData.feelingCramps = checkInData.feeling_cramps;
    if (checkInData.feeling_energized !== undefined) inputData.feelingEnergized = checkInData.feeling_energized;
    if (checkInData.feeling_satisfied !== undefined) inputData.feelingSatisfied = checkInData.feeling_satisfied;
    if (checkInData.feeling_strong !== undefined) inputData.feelingStrong = checkInData.feeling_strong;
    if (checkInData.notes !== undefined) inputData.notes = checkInData.notes;

    // Check if exists
    const existing = await prisma.dailyWellnessCheckin.findFirst({
      where: {
        userId: userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existing) {
      await prisma.dailyWellnessCheckin.update({
        where: { id: existing.id },
        data: inputData
      });
    } else {
      // For create, we need mandatory fields.
      // Boolean fields have default false in schema, so they are optional if undefined.
      // userId and date are required.
      await prisma.dailyWellnessCheckin.create({
        data: {
          userId: userId,
          date: startOfDay,
          ...inputData,
          // Ensure defaults for bools if inputData doesn't have them
          // But partial update is unsafe for create if crucial fields missing?
          // Interface says booleans are required in WellnessCheckIn (non-optional keys), but checkInData is Partial<WellnessCheckIn>.
          // If create, we assume defaults false.
        }
      });
    }

    return {
      success: true,
      message: 'Wellness check-in saved successfully',
    };
  } catch (error: any) {
    console.error('Error saving wellness check-in:', error);
    return {
      success: false,
      error: 'Failed to save wellness check-in',
    };
  }
}

export async function getWellnessHistory(userId: string, limit = 7) {
  try {
    await checkAuth(userId);

    // Fetch recent checkins
    const data = await prisma.dailyWellnessCheckin.findMany({
      where: { userId: userId },
      orderBy: { date: 'desc' },
      take: limit
    });

    return {
      success: true,
      history: data.map(mapWellness),
    };
  } catch (error: any) {
    console.error('Error fetching wellness history:', error);
    return {
      success: false,
      error: 'Failed to fetch wellness history',
      history: [],
    };
  }
}
