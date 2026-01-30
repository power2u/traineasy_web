'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Combined user preferences and profile in one interface
export interface UserPreferences {
  id: string;
  // Personal Information
  fullName?: string;
  dateOfBirth?: Date;
  phone?: string;
  passwordChangeRequired?: boolean;
  // Medical Information
  bloodGroup?: string;
  allergies?: string;
  medicalNotes?: string;
  currentCondition?: string;
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  // Weight & Measurement Preferences
  preferredUnit: string; // 'kg' | 'lbs'
  heightCm?: number; // decimal in DB
  goalWeight?: number; // decimal in DB
  goalWeightUnit: string; // 'kg' | 'lbs'
  // Water Intake Preferences
  dailyWaterTarget: number;
  glassSizeMl: number;
  // Notification Preferences
  notificationsEnabled: boolean;
  waterRemindersEnabled: boolean;
  weightRemindersEnabled: boolean;
  mealRemindersEnabled: boolean;
  // Meal Timing Preferences
  breakfastTime?: string;
  snack1Time?: string;
  lunchTime?: string;
  snack2Time?: string;
  dinnerTime?: string;
  mealTimesConfigured?: boolean;
  // System Preferences
  timezone?: string;
  // Display Preferences
  theme: string; // 'light' | 'dark' | 'system'
  language: string;

  // JSON fields
  goalMeasurements?: any;
}

export type UserProfile = UserPreferences;

export interface UserPlan {
  id: string;
  userId: string;
  planName: string;
  startDate: Date;
  endDate: Date;
  planNotes?: string;
  isActive: boolean;
  createdAt: Date;
}

// Get user preferences (includes profile data)
export async function getProfile(userId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    const data = await prisma.userPreference.findUnique({
      where: { id: userId },
    });

    if (!data) {
      return { success: true, profile: null };
    }

    // Convert Decimals to numbers for frontend if needed, or keep as is.
    // Prisma returns Decimal objects. We might need to cast to number.
    const profile: UserPreferences = {
      ...data,
      fullName: data.fullName ?? undefined, // Handle nulls if necessary
      dateOfBirth: data.dateOfBirth ?? undefined,
      phone: data.phone ?? undefined,
      // Map Decimals to numbers
      heightCm: data.heightCm ? Number(data.heightCm) : undefined,
      goalWeight: data.goalWeight ? Number(data.goalWeight) : undefined,
      // Nullable strings
      bloodGroup: data.bloodGroup ?? undefined,
      allergies: data.allergies ?? undefined,
      medicalNotes: data.medicalNotes ?? undefined,
      currentCondition: data.currentCondition ?? undefined,
      emergencyContactName: data.emergencyContactName ?? undefined,
      emergencyContactPhone: data.emergencyContactPhone ?? undefined,
      emergencyContactRelationship: data.emergencyContactRelationship ?? undefined,
      breakfastTime: data.breakfastTime ?? undefined,
      snack1Time: data.snack1Time ?? undefined,
      lunchTime: data.lunchTime ?? undefined,
      snack2Time: data.snack2Time ?? undefined,
      dinnerTime: data.dinnerTime ?? undefined,
      timezone: data.timezone ?? undefined,
      passwordChangeRequired: data.passwordChangeRequired,
      mealTimesConfigured: data.mealTimesConfigured,
      goalMeasurements: data.goalMeasurements,
    };

    return {
      success: true,
      profile,
    };
  } catch (error: any) {
    console.error("getProfile error:", error);
    return { success: false, error: error.message };
  }
}

// Update user preferences (includes profile data)
export async function updateProfile(userId: string, profileData: Partial<UserPreferences>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).id !== userId) {
      return { success: false, error: "Unauthorized" };
    }

    console.log('[updateProfile] Updating for user:', userId);
    // console.log('[updateProfile] Data:', profileData);

    const dataToUpdate: any = { ...profileData };
    // Remove id if present to avoid update error
    delete dataToUpdate.id;

    // Fix fields that shouldn't be updated or need type conversion
    // e.g. converting string date to Date object if it comes as string? 
    // Usually server actions receive matching types if typed correctly.
    // But be careful with 'undefined' vs 'null'.

    await prisma.userPreference.upsert({
      where: { id: userId },
      update: dataToUpdate,
      create: {
        id: userId,
        email: session.user.email!, // Email is required for creation
        ...dataToUpdate
      }
    });

    // Update cron jobs if notification preferences changed
    const notificationFields = ['notificationsEnabled', 'mealRemindersEnabled', 'waterRemindersEnabled', 'weightRemindersEnabled', 'breakfastTime', 'snack1Time', 'lunchTime', 'snack2Time', 'dinnerTime'];
    const hasNotificationChanges = notificationFields.some(field => profileData.hasOwnProperty(field));

    if (hasNotificationChanges) {
      // Update cron jobs asynchronously
      updateUserCronJobs(userId).catch(error =>
        console.error('Failed to update cron jobs:', error)
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error('[updateProfile] Exception:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to register/update cron jobs
async function updateUserCronJobs(userId: string) {
  try {
    // This assumes the API route is also migrated or still works
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/register-user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      //   const result = await response.json();
      //   console.log('Cron jobs updated after preference change:', result.message);
    } else {
      console.error('Failed to update cron jobs:', response.statusText);
    }
  } catch (error) {
    console.error('Error updating cron jobs:', error);
  }
}

export async function getUserPlans(userId: string) {
  try {
    const data = await prisma.userPlan.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' }
    });

    return {
      success: true,
      plans: data,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getActivePlan(userId: string) {
  try {
    const data = await prisma.userPlan.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: { startDate: 'desc' }
    });

    return {
      success: true,
      plan: data,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPlan(
  userId: string,
  planData: {
    planName: string;
    startDate: Date;
    endDate: Date;
    planNotes?: string;
  }
) {
  try {
    // Transaction: Deactivate old active plans, then create new one
    await prisma.$transaction(async (tx: { userPlan: { updateMany: (arg0: { where: { userId: string; isActive: boolean; }; data: { isActive: boolean; }; }) => any; create: (arg0: { data: { isActive: boolean; planName: string; startDate: Date; endDate: Date; planNotes?: string; userId: string; }; }) => any; }; }) => {
      // Deactivate existing active plans
      await tx.userPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      });

      // Create new
      await tx.userPlan.create({
        data: {
          userId,
          ...planData,
          isActive: true
        }
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePlan(planId: string, planData: Partial<UserPlan>) {
  try {
    await prisma.$transaction(async (tx: { userPlan: { findUnique: (arg0: { where: { id: string; }; select: { userId: boolean; }; }) => any; updateMany: (arg0: { where: { userId: any; isActive: boolean; id: { not: string; }; }; data: { isActive: boolean; }; }) => any; update: (arg0: { where: { id: string; }; data: { planName?: string | undefined; startDate?: Date | undefined; endDate?: Date | undefined; planNotes?: string | undefined; isActive?: boolean | undefined; createdAt?: Date | undefined; }; }) => any; }; }) => {
      if (planData.isActive === true) {
        // Get userId first
        const plan = await tx.userPlan.findUnique({ where: { id: planId }, select: { userId: true } });
        if (!plan) throw new Error("Plan not found");

        // Deactivate others
        await tx.userPlan.updateMany({
          where: {
            userId: plan.userId,
            isActive: true,
            id: { not: planId }
          },
          data: { isActive: false }
        });
      }

      // Update target
      // Prisma types are strict, we need to ensure planData doesn't contain extra fields
      // But Partial<UserPlan> matches Prisma input mostly.
      // Except 'id' and 'userId' shouldn't be updated typically
      const { id, userId, ...data } = planData;

      await tx.userPlan.update({
        where: { id: planId },
        data: data
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deactivatePlan(planId: string) {
  try {
    await prisma.userPlan.update({
      where: { id: planId },
      data: { isActive: false }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// USER PREFERENCES ACTIONS (Legacy/Separate entry point)
// ============================================

export async function getPreferences(userId: string) {
  // Re-use getProfile as it fetches the same table
  const result = await getProfile(userId);
  if (!result.success) return result;

  return {
    success: true,
    preferences: result.profile
  };
}

export async function updatePreferences(
  userId: string,
  preferences: Partial<UserPreferences>
) {
  return updateProfile(userId, preferences);
}

// ============================================
// NOTIFICATION PREFERENCES ACTIONS
// ============================================

// Get user notification preferences
export async function getUserNotificationPreferences(userId?: string) {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) throw new Error('Not authenticated');
      targetUserId = session.user.id;
    }

    const res = await getProfile(targetUserId);
    if (!res.success) throw new Error(res.error);

    const data = res.profile;

    // Return with default values if no preferences exist
    const preferences: UserPreferences = data || {
      id: targetUserId,
      notificationsEnabled: true,
      // pushEnabled: true, // Removed as not in DB
      // emailEnabled: false, // Removed as not in DB
      mealRemindersEnabled: true,
      waterRemindersEnabled: true,
      weightRemindersEnabled: true,
      // planRemindersEnabled: true, // Removed as not in DB
      breakfastTime: '08:00',
      snack1Time: '10:30',
      lunchTime: '13:00',
      snack2Time: '16:00',
      dinnerTime: '19:00',
      // mealReminderDelayMinutes: 30, // Removed
      // waterReminderTimes: ['10:00', '15:00', '20:00'], // Removed
      // weightReminderDay: 1, // Monday
      // weightReminderTime: '09:00',
      // planEndReminderDays: 3,
      timezone: 'Asia/Kolkata',
      theme: 'system',
      language: 'en',
      preferredUnit: 'kg',
      goalWeightUnit: 'kg',
      dailyWaterTarget: 2000,
      glassSizeMl: 250,
    } as UserPreferences;

    return {
      success: true,
      preferences,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update user notification preferences
export async function updateUserNotificationPreferences(
  preferences: Partial<UserPreferences>,
  userId?: string
) {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) throw new Error('Not authenticated');
      targetUserId = session.user.id;
    }

    const result = await updateProfile(targetUserId, preferences);

    if (result.success) {
      return { success: true, successMessage: 'Notification preferences updated successfully' };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
