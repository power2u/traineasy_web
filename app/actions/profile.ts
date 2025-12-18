<<<<<<< HEAD
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
  water_reminders_enabled: boolean;
  weight_reminders_enabled: boolean;
  meal_reminders_enabled: boolean;
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

    return { success: true };
  } catch (error: any) {
    console.error('[updateProfile] Exception:', error);
    return { success: false, error: error.message };
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
=======
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
  water_reminders_enabled: boolean;
  weight_reminders_enabled: boolean;
  meal_reminders_enabled: boolean;
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

    return { success: true };
  } catch (error: any) {
    console.error('[updateProfile] Exception:', error);
    return { success: false, error: error.message };
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
>>>>>>> main
