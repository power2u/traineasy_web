'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateLastActive } from "@/lib/utils/activity-tracker";

async function checkAuth(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).id !== userId) {
    throw new Error("Unauthorized");
  }
}

export async function getTodayMeals(userId: string) {
  try {
    await checkAuth(userId);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const data = await prisma.meal.findFirst({
      where: {
        userId: userId,
        date: startOfDay
      }
    });

    return {
      success: true,
      meals: data
        ? {
          id: data.id,
          date: data.date.toISOString().split('T')[0],
          breakfast_completed: data.breakfastCompleted,
          breakfast_time: data.breakfastTime?.toISOString() || null,
          snack1_completed: data.snack1Completed,
          snack1_time: data.snack1Time?.toISOString() || null,
          lunch_completed: data.lunchCompleted,
          lunch_time: data.lunchTime?.toISOString() || null,
          snack2_completed: data.snack2Completed,
          snack2_time: data.snack2Time?.toISOString() || null,
          dinner_completed: data.dinnerCompleted,
          dinner_time: data.dinnerTime?.toISOString() || null,
          notes: null,
        }
        : null,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleMeal(
  userId: string,
  mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner',
  completed: boolean
) {
  try {
    await checkAuth(userId);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Map mealType string to model fields
    const completedField = `${mealType}Completed`;
    const timeField = `${mealType}Time`;

    const updateData = {
      [completedField]: completed,
      [timeField]: completed ? new Date() : null,
      // updated_at is auto-handled by Prisma @updatedAt
    };

    const existing = await prisma.meal.findFirst({
      where: {
        userId: userId,
        date: startOfDay
      }
    });

    if (existing) {
      await prisma.meal.update({
        where: { id: existing.id },
        data: updateData
      });
    } else {
      await prisma.meal.create({
        data: {
          userId: userId,
          date: startOfDay,
          ...updateData
        }
      });
    }

    // Track activity
    await updateLastActive(userId);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMealReminders(userId: string) {
  try {
    await checkAuth(userId);

    const data = await prisma.mealReminder.findMany({
      where: { userId: userId },
      orderBy: { reminderTime: 'asc' }
    });

    return {
      success: true,
      reminders: (data || []).map((r: { id: any; mealType: any; reminderTime: any; isActive: any; }) => ({
        id: r.id,
        meal_type: r.mealType,
        reminder_time: r.reminderTime,
        is_active: r.isActive,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setMealReminder(
  userId: string,
  mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner',
  reminderTime: string
) {
  try {
    await checkAuth(userId);

    await prisma.mealReminder.upsert({
      where: {
        userId_mealType: {
          userId: userId,
          mealType: mealType
        }
      },
      create: {
        userId: userId,
        mealType: mealType,
        reminderTime: reminderTime,
        isActive: true
      },
      update: {
        reminderTime: reminderTime,
        isActive: true
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleReminderActive(reminderId: string, isActive: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }
    const userId = (session.user as any).id;

    // Use updateMany for security (ensure user owns the reminder)
    const result = await prisma.mealReminder.updateMany({
      where: {
        id: reminderId,
        userId: userId
      },
      data: {
        isActive: isActive
      }
    });

    if (result.count === 0) {
      throw new Error("Reminder not found or unauthorized");
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMealsHistory(userId: string, limit = 30) {
  try {
    await checkAuth(userId);

    const data = await prisma.meal.findMany({
      where: { userId: userId },
      orderBy: { date: 'desc' },
      take: limit
    });

    return {
      success: true,
      history: (data || []).map((m: { date: { toISOString: () => string; }; breakfastCompleted: any; snack1Completed: any; lunchCompleted: any; snack2Completed: any; dinnerCompleted: any; }) => ({
        date: m.date.toISOString().split('T')[0],
        breakfast_completed: m.breakfastCompleted,
        snack1_completed: m.snack1Completed,
        lunch_completed: m.lunchCompleted,
        snack2_completed: m.snack2Completed,
        dinner_completed: m.dinnerCompleted,
        total_completed:
          (m.breakfastCompleted ? 1 : 0) +
          (m.snack1Completed ? 1 : 0) +
          (m.lunchCompleted ? 1 : 0) +
          (m.snack2Completed ? 1 : 0) +
          (m.dinnerCompleted ? 1 : 0),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
