'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Combined user preferences and profile in one interface
export interface UserPreferences {
  id: string;
  // Personal Information
  full_name?: string;
  date_of_birth?: Date;
  phone?: string;
  password_change_required?: boolean;
  // Medical Information
  blood_group?: string;
  allergies?: string;
  medical_notes?: string;
  current_condition?: string;
  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  // Weight & Measurement Preferences
  preferred_unit: string; // 'kg' | 'lbs'
  height_cm?: number; // float in DB
  goal_weight?: number; // float in DB
  goal_weight_unit: string; // 'kg' | 'lbs'
  // Water Intake Preferences
  daily_water_target: number;
  glass_size_ml: number;
  // Notification Preferences
  notifications_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  water_reminders_enabled: boolean;
  weight_reminders_enabled: boolean;
  meal_reminders_enabled: boolean;
  plan_reminders_enabled: boolean;
  // Meal Timing Preferences
  breakfast_time?: string;
  snack1_time?: string;
  lunch_time?: string;
  snack2_time?: string;
  dinner_time?: string;
  meal_times_configured?: boolean;
  meal_reminder_delay_minutes?: number;
  // Extra notification fields
  water_reminder_times?: string[];
  weight_reminder_day?: number;
  weight_reminder_time?: string;
  plan_end_reminder_days?: number;
  // System Preferences
  timezone?: string;
  // Display Preferences
  theme: string; // 'light' | 'dark' | 'system'
  language: string;

  // JSON fields
  goal_measurements?: any;
}

export type UserProfile = UserPreferences;

export interface UserPlan {
  id: string;
  userId: string;
  planName: string;
  startDate: Date;
  endDate: Date;
  planNotes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

    // Map Prisma camelCase to snake_case for UI
    const profile: UserPreferences = {
      id: data.id,
      full_name: data.fullName ?? undefined,
      date_of_birth: data.dateOfBirth ?? undefined,
      phone: data.phone ?? undefined,
      password_change_required: data.passwordChangeRequired,
      blood_group: data.bloodGroup ?? undefined,
      allergies: data.allergies ?? undefined,
      medical_notes: data.medicalNotes ?? undefined,
      current_condition: data.currentCondition ?? undefined,
      emergency_contact_name: data.emergencyContactName ?? undefined,
      emergency_contact_phone: data.emergencyContactPhone ?? undefined,
      emergency_contact_relationship: data.emergencyContactRelationship ?? undefined,
      preferred_unit: data.preferredUnit,
      height_cm: data.heightCm ? Number(data.heightCm) : undefined,
      goal_weight: data.goalWeight ? Number(data.goalWeight) : undefined,
      goal_weight_unit: data.goalWeightUnit,
      daily_water_target: data.dailyWaterTarget,
      glass_size_ml: data.glassSizeMl,
      notifications_enabled: data.notificationsEnabled,
      push_enabled: data.pushEnabled,
      email_enabled: data.emailEnabled,
      water_reminders_enabled: data.waterRemindersEnabled,
      weight_reminders_enabled: data.weightRemindersEnabled,
      meal_reminders_enabled: data.mealRemindersEnabled,
      plan_reminders_enabled: data.planRemindersEnabled,
      breakfast_time: data.breakfastTime ?? undefined,
      snack1_time: data.snack1Time ?? undefined,
      lunch_time: data.lunchTime ?? undefined,
      snack2_time: data.snack2Time ?? undefined,
      dinner_time: data.dinnerTime ?? undefined,
      meal_times_configured: data.mealTimesConfigured,
      meal_reminder_delay_minutes: data.mealReminderDelayMinutes,
      water_reminder_times: data.waterReminderTimes,
      weight_reminder_day: data.weightReminderDay,
      weight_reminder_time: data.weightReminderTime,
      plan_end_reminder_days: data.planEndReminderDays,
      timezone: data.timezone ?? undefined,
      theme: data.theme,
      language: data.language,
      goal_measurements: data.goalMeasurements,
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

    // Map snake_case from UI back to camelCase for Prisma
    const dataToUpdate: any = {};
    if (profileData.full_name !== undefined) dataToUpdate.fullName = profileData.full_name;
    if (profileData.date_of_birth !== undefined) dataToUpdate.dateOfBirth = profileData.date_of_birth;
    if (profileData.phone !== undefined) dataToUpdate.phone = profileData.phone;
    if (profileData.password_change_required !== undefined) dataToUpdate.passwordChangeRequired = profileData.password_change_required;
    if (profileData.blood_group !== undefined) dataToUpdate.bloodGroup = profileData.blood_group;
    if (profileData.allergies !== undefined) dataToUpdate.allergies = profileData.allergies;
    if (profileData.medical_notes !== undefined) dataToUpdate.medicalNotes = profileData.medical_notes;
    if (profileData.current_condition !== undefined) dataToUpdate.currentCondition = profileData.current_condition;
    if (profileData.emergency_contact_name !== undefined) dataToUpdate.emergencyContactName = profileData.emergency_contact_name;
    if (profileData.emergency_contact_phone !== undefined) dataToUpdate.emergencyContactPhone = profileData.emergency_contact_phone;
    if (profileData.emergency_contact_relationship !== undefined) dataToUpdate.emergencyContactRelationship = profileData.emergency_contact_relationship;
    if (profileData.preferred_unit !== undefined) dataToUpdate.preferredUnit = profileData.preferred_unit;
    if (profileData.height_cm !== undefined) dataToUpdate.heightCm = profileData.height_cm;
    if (profileData.goal_weight !== undefined) dataToUpdate.goalWeight = profileData.goal_weight;
    if (profileData.goal_weight_unit !== undefined) dataToUpdate.goalWeightUnit = profileData.goal_weight_unit;
    if (profileData.daily_water_target !== undefined) dataToUpdate.dailyWaterTarget = profileData.daily_water_target;
    if (profileData.glass_size_ml !== undefined) dataToUpdate.glassSizeMl = profileData.glass_size_ml;
    if (profileData.notifications_enabled !== undefined) dataToUpdate.notificationsEnabled = profileData.notifications_enabled;
    if (profileData.push_enabled !== undefined) dataToUpdate.pushEnabled = profileData.push_enabled;
    if (profileData.email_enabled !== undefined) dataToUpdate.emailEnabled = profileData.email_enabled;
    if (profileData.water_reminders_enabled !== undefined) dataToUpdate.waterRemindersEnabled = profileData.water_reminders_enabled;
    if (profileData.weight_reminders_enabled !== undefined) dataToUpdate.weightRemindersEnabled = profileData.weight_reminders_enabled;
    if (profileData.meal_reminders_enabled !== undefined) dataToUpdate.mealRemindersEnabled = profileData.meal_reminders_enabled;
    if (profileData.plan_reminders_enabled !== undefined) dataToUpdate.planRemindersEnabled = profileData.plan_reminders_enabled;
    if (profileData.breakfast_time !== undefined) dataToUpdate.breakfastTime = profileData.breakfast_time;
    if (profileData.snack1_time !== undefined) dataToUpdate.snack1Time = profileData.snack1_time;
    if (profileData.lunch_time !== undefined) dataToUpdate.lunchTime = profileData.lunch_time;
    if (profileData.snack2_time !== undefined) dataToUpdate.snack2Time = profileData.snack2_time;
    if (profileData.dinner_time !== undefined) dataToUpdate.dinnerTime = profileData.dinner_time;
    if (profileData.meal_times_configured !== undefined) dataToUpdate.mealTimesConfigured = profileData.meal_times_configured;
    if (profileData.meal_reminder_delay_minutes !== undefined) dataToUpdate.mealReminderDelayMinutes = profileData.meal_reminder_delay_minutes;
    if (profileData.water_reminder_times !== undefined) dataToUpdate.waterReminderTimes = profileData.water_reminder_times;
    if (profileData.weight_reminder_day !== undefined) dataToUpdate.weightReminderDay = profileData.weight_reminder_day;
    if (profileData.weight_reminder_time !== undefined) dataToUpdate.weightReminderTime = profileData.weight_reminder_time;
    if (profileData.plan_end_reminder_days !== undefined) dataToUpdate.planEndReminderDays = profileData.plan_end_reminder_days;
    if (profileData.timezone !== undefined) dataToUpdate.timezone = profileData.timezone;
    if (profileData.theme !== undefined) dataToUpdate.theme = profileData.theme;
    if (profileData.language !== undefined) dataToUpdate.language = profileData.language;
    if (profileData.goal_measurements !== undefined) dataToUpdate.goalMeasurements = profileData.goal_measurements;

    await prisma.userPreference.upsert({
      where: { id: userId },
      update: dataToUpdate,
      create: {
        id: userId,
        email: session.user.email!,
        fullName: session.user.name || 'User',
        passwordHash: '', // Required by schema but session doesn't have it here
        ...dataToUpdate
      }
    });

    // Update cron jobs if notification preferences changed
    const notificationFields = ['notifications_enabled', 'meal_reminders_enabled', 'water_reminders_enabled', 'weight_reminders_enabled', 'breakfast_time', 'snack1_time', 'lunch_time', 'snack2_time', 'dinner_time'];
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/cron/register-user`, {
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
    await prisma.$transaction(async (tx) => {
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
    await prisma.$transaction(async (tx) => {
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
      notifications_enabled: true,
      push_enabled: true,
      email_enabled: false,
      meal_reminders_enabled: true,
      water_reminders_enabled: true,
      weight_reminders_enabled: true,
      plan_reminders_enabled: true,
      breakfast_time: '08:00',
      snack1_time: '10:30',
      lunch_time: '13:00',
      snack2_time: '16:00',
      dinner_time: '19:00',
      meal_reminder_delay_minutes: 30,
      water_reminder_times: ['10:00', '15:00', '20:00'],
      weight_reminder_day: 1, // Monday
      weight_reminder_time: '09:00',
      plan_end_reminder_days: 3,
      timezone: 'Asia/Kolkata',
      theme: 'system',
      language: 'en',
      preferred_unit: 'kg',
      goal_weight_unit: 'kg',
      daily_water_target: 8,
      glass_size_ml: 250,
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
