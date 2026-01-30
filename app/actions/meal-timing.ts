'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface MealTimes {
  breakfast_time: string;
  snack1_time: string;
  lunch_time: string;
  snack2_time: string;
  dinner_time: string;
  timezone: string;
  theme?: 'light' | 'dark' | 'system';
}

// Helper to convert HH:MM to HH:MM:SS
function convertToTimeFormat(time: string): string {
  if (time.split(':').length === 3) return time;
  return `${time}:00`;
}

async function checkAuth(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).id !== userId) {
    throw new Error("Unauthorized");
  }
}

export async function getMealTimes(userId: string) {
  try {
    await checkAuth(userId);

    const data = await prisma.userPreference.findUnique({
      where: { id: userId },
      select: {
        breakfastTime: true,
        snack1Time: true,
        lunchTime: true,
        snack2Time: true,
        dinnerTime: true,
        timezone: true
      }
    });

    if (!data) throw new Error("User preferences not found");

    // Map camelCase to snake_case
    const mealTimes = {
      breakfast_time: data.breakfastTime,
      snack1_time: data.snack1Time,
      lunch_time: data.lunchTime,
      snack2_time: data.snack2Time,
      dinner_time: data.dinnerTime,
      timezone: data.timezone
    };

    return { success: true, mealTimes };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setMealTimes(userId: string, mealTimes: MealTimes) {
  try {
    await checkAuth(userId);

    // Convert time format and include timezone and theme
    // Map snake_case to camelCase for Prisma
    const updateData = {
      breakfastTime: convertToTimeFormat(mealTimes.breakfast_time),
      snack1Time: convertToTimeFormat(mealTimes.snack1_time),
      lunchTime: convertToTimeFormat(mealTimes.lunch_time),
      snack2Time: convertToTimeFormat(mealTimes.snack2_time),
      dinnerTime: convertToTimeFormat(mealTimes.dinner_time),
      timezone: mealTimes.timezone,
      ...(mealTimes.theme && { theme: mealTimes.theme }),
      mealTimesConfigured: true,
    };

    // Use upsert to handle both insert (create) and update
    // But typically user preferences are created on signup.
    // So update is more appropriate, but upsert ensures robustness.
    // However, create usually requires email/fullname etc which we don't have here.
    // So we should use update. If user doesn't exist, it's an error state anyway.
    // original code used upsert on 'id'.
    // With Prisma, upsert requires 'create' data which effectively needs all required fields?
    // UserPreference has many required fields (email, role etc).
    // So we CANNOT use upsert unless we provide fallback for all required fields which we don't have.
    // We must use UPDATE. A user calling this MUST exist.

    await prisma.userPreference.update({
      where: { id: userId },
      data: updateData
    });

    return { success: true };
  } catch (error: any) {
    console.error('[setMealTimes] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function isMealTimesConfigured(userId: string) {
  try {
    await checkAuth(userId);

    const data = await prisma.userPreference.findUnique({
      where: { id: userId },
      select: { mealTimesConfigured: true }
    });

    return { success: true, configured: data?.mealTimesConfigured || false };
  } catch (error: any) {
    return { success: false, error: error.message, configured: false };
  }
}
