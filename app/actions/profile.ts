'use server';

import { createClient } from '@/lib/supabase/server';

// Combined user preferences and profile in one interface
// All data stored in user_preferences table linked to auth.users
export interface UserPreferences {
  id: string;
  // Personal Information
  full_name?: string;
  date_of_birth?: string;
  phone?: string;
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
  preferred_unit: 'kg' | 'lbs';
  height_cm?: number;
  goal_weight?: number;
  goal_weight_unit: 'kg' | 'lbs';
  // Water Intake Preferences
  daily_water_target: number;
  glass_size_ml: number;
  // Notification Preferences
  notifications_enabled: boolean;
  push_enabled?: boolean;
  email_enabled?: boolean;
  water_reminders_enabled: boolean;
  weight_reminders_enabled: boolean;
  meal_reminders_enabled: boolean;
  plan_reminders_enabled?: boolean;
  // Meal Timing Preferences
  breakfast_time?: string;
  snack1_time?: string;
  lunch_time?: string;
  snack2_time?: string;
  dinner_time?: string;
  meal_reminder_delay_minutes?: number;
  meal_times_configured?: boolean;
  // Water Reminder Preferences
  water_reminder_times?: string[];
  // Weight Reminder Preferences
  weight_reminder_day?: number;
  weight_reminder_time?: string;
  // Plan Reminder Preferences
  plan_end_reminder_days?: number;
  // System Preferences
  timezone?: string;
  // Display Preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
}

// Alias for backward compatibility
export type UserProfile = UserPreferences;

export interface UserPlan {
  id: string;
  user_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  plan_notes?: string;
  is_active: boolean;
  created_at: string;
}

// Get user preferences (includes profile data)
export async function getProfile(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      success: true,
      profile: data || null,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update user preferences (includes profile data)
export async function updateProfile(userId: string, profileData: Partial<UserProfile>) {
  try {
    const supabase = await createClient();

    console.log('[updateProfile] Updating for user:', userId);
    console.log('[updateProfile] Data:', profileData);

    // Check if preferences exist
    const { data: existing, error: checkError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('id', userId)
      .single();

    console.log('[updateProfile] Existing record:', existing);
    console.log('[updateProfile] Check error:', checkError);

    if (existing) {
      // Update existing preferences
      const { data: updated, error } = await supabase
        .from('user_preferences')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      console.log('[updateProfile] Update result:', updated);
      console.log('[updateProfile] Update error:', error);

      if (error) throw error;
    } else {
      // Insert new preferences
      const { data: inserted, error } = await supabase
        .from('user_preferences')
        .insert({
          id: userId,
          ...profileData,
        })
        .select()
        .single();

      console.log('[updateProfile] Insert result:', inserted);
      console.log('[updateProfile] Insert error:', error);

      if (error) throw error;
    }

    // Update cron jobs if notification preferences changed
    const notificationFields = ['notifications_enabled', 'meal_reminders_enabled', 'water_reminders_enabled', 'weight_reminders_enabled', 'breakfast_time', 'snack1_time', 'lunch_time', 'snack2_time', 'dinner_time'];
    const hasNotificationChanges = notificationFields.some(field => profileData.hasOwnProperty(field));
    
    if (hasNotificationChanges) {
      // Update cron jobs asynchronously (don't wait for it)
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

// Helper function to register/update cron jobs after preference changes
async function updateUserCronJobs(userId: string) {
  try {
    // Use the direct register endpoint to bypass daily limit for preference changes
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/register-user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Cron jobs updated after preference change:', result.message);
    } else {
      console.error('Failed to update cron jobs:', response.statusText);
    }
  } catch (error) {
    console.error('Error updating cron jobs:', error);
  }
}

export async function getUserPlans(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      plans: data || [],
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getActivePlan(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      success: true,
      plan: data || null,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createPlan(
  userId: string,
  planData: {
    plan_name: string;
    start_date: string;
    end_date: string;
    plan_notes?: string;
  }
) {
  try {
    const supabase = await createClient();

    // First, deactivate all existing active plans for this user
    const { error: deactivateError } = await supabase
      .from('user_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deactivateError) throw deactivateError;

    // Then create the new active plan
    const { error } = await supabase.from('user_plans').insert({
      user_id: userId,
      ...planData,
      is_active: true,
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePlan(planId: string, planData: Partial<UserPlan>) {
  try {
    const supabase = await createClient();

    // If we're activating this plan, first deactivate all other plans for this user
    if (planData.is_active === true) {
      // Get the user_id for this plan
      const { data: planInfo, error: planError } = await supabase
        .from('user_plans')
        .select('user_id')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Deactivate all other active plans for this user
      const { error: deactivateError } = await supabase
        .from('user_plans')
        .update({ is_active: false })
        .eq('user_id', planInfo.user_id)
        .eq('is_active', true)
        .neq('id', planId); // Don't deactivate the plan we're updating

      if (deactivateError) throw deactivateError;
    }

    // Now update the target plan
    const { error } = await supabase
      .from('user_plans')
      .update(planData)
      .eq('id', planId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deactivatePlan(planId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_plans')
      .update({ is_active: false })
      .eq('id', planId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// USER PREFERENCES ACTIONS
// ============================================

export async function getPreferences(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      success: true,
      preferences: data || null,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePreferences(
  userId: string,
  preferences: Partial<UserPreferences>
) {
  try {
    const supabase = await createClient();

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('id', userId)
      .single();

    if (existing) {
      // Update existing preferences
      const { error } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('id', userId);

      if (error) throw error;
    } else {
      // Insert new preferences
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          id: userId,
          ...preferences,
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// NOTIFICATION PREFERENCES ACTIONS
// ============================================

// Get user notification preferences
export async function getUserNotificationPreferences(userId?: string) {
  try {
    const supabase = await createClient();
    
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      targetUserId = user.id;
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Return with default values if no preferences exist
    const preferences = data || {
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
      daily_water_target: 2000,
      glass_size_ml: 250,
    };

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
    const supabase = await createClient();
    
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      targetUserId = user.id;
    }

    const result = await updatePreferences(targetUserId, preferences);
    
    if (result.success) {
      return { success: true, successMessage: 'Notification preferences updated successfully' };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
