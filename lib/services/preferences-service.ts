import { createClient } from '@/lib/supabase/client';

// Combined user preferences and profile
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
  // Meal Timing Preferences
  breakfast_time?: string;
  snack1_time?: string;
  lunch_time?: string;
  snack2_time?: string;
  dinner_time?: string;
  meal_times_configured: boolean;
  // Display Preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export class PreferencesService {
  private supabase = createClient();

  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    console.log('[PreferencesService] Updating preferences for user:', userId);
    console.log('[PreferencesService] Preferences to update:', preferences);
    
    // Check if row exists first
    const { data: existing, error: selectError } = await this.supabase
      .from('user_preferences')
      .select('id')
      .eq('id', userId)
      .single();

    console.log('[PreferencesService] Existing row:', existing);
    console.log('[PreferencesService] Select error:', selectError);

    if (existing) {
      // Row exists, update it
      console.log('[PreferencesService] Row exists, updating...');
      const { error, data } = await this.supabase
        .from('user_preferences')
        .update(preferences)
        .eq('id', userId)
        .select();

      console.log('[PreferencesService] Update result:', data);
      console.log('[PreferencesService] Update error:', error);
      
      if (error) throw error;
    } else {
      // Row doesn't exist, insert it
      console.log('[PreferencesService] Row does not exist, inserting...');
      const { error, data } = await this.supabase
        .from('user_preferences')
        .insert({
          id: userId,
          ...preferences,
        })
        .select();

      console.log('[PreferencesService] Insert result:', data);
      console.log('[PreferencesService] Insert error:', error);
      
      if (error) throw error;
    }
  }

  async getPreferredUnit(userId: string): Promise<'kg' | 'lbs'> {
    const prefs = await this.getPreferences(userId);
    return prefs?.preferred_unit || 'kg';
  }

  async setPreferredUnit(userId: string, unit: 'kg' | 'lbs'): Promise<void> {
    await this.updatePreferences(userId, { preferred_unit: unit });
  }

  async getGoalWeight(userId: string): Promise<{ weight: number; unit: 'kg' | 'lbs' } | null> {
    const prefs = await this.getPreferences(userId);
    if (!prefs?.goal_weight) return null;
    
    return {
      weight: prefs.goal_weight,
      unit: prefs.goal_weight_unit,
    };
  }

  async setGoalWeight(
    userId: string,
    weight: number,
    unit: 'kg' | 'lbs'
  ): Promise<void> {
    await this.updatePreferences(userId, {
      goal_weight: weight,
      goal_weight_unit: unit,
    });
  }

  async getHeight(userId: string): Promise<number | null> {
    const prefs = await this.getPreferences(userId);
    return prefs?.height_cm || null;
  }

  async setHeight(userId: string, heightCm: number): Promise<void> {
    await this.updatePreferences(userId, { height_cm: heightCm });
  }

  async getWaterTarget(userId: string): Promise<{ target: number; glassSize: number }> {
    const prefs = await this.getPreferences(userId);
    return {
      target: prefs?.daily_water_target || 8,
      glassSize: prefs?.glass_size_ml || 250,
    };
  }

  async setWaterTarget(
    userId: string,
    target: number,
    glassSize: number
  ): Promise<void> {
    await this.updatePreferences(userId, {
      daily_water_target: target,
      glass_size_ml: glassSize,
    });
  }

  async getMealTimes(userId: string): Promise<{
    breakfast_time: string;
    snack1_time: string;
    lunch_time: string;
    snack2_time: string;
    dinner_time: string;
  } | null> {
    const prefs = await this.getPreferences(userId);
    if (!prefs?.breakfast_time) return null;
    
    return {
      breakfast_time: prefs.breakfast_time,
      snack1_time: prefs.snack1_time || '10:30:00',
      lunch_time: prefs.lunch_time || '13:00:00',
      snack2_time: prefs.snack2_time || '16:00:00',
      dinner_time: prefs.dinner_time || '19:00:00',
    };
  }

  async setMealTimes(
    userId: string,
    mealTimes: {
      breakfast_time: string;
      snack1_time: string;
      lunch_time: string;
      snack2_time: string;
      dinner_time: string;
    }
  ): Promise<void> {
    // Convert HH:MM to HH:MM:SS format for PostgreSQL TIME type
    const convertToTimeFormat = (time: string): string => {
      // If already in HH:MM:SS format, return as is
      if (time.split(':').length === 3) {
        return time;
      }
      // Add :00 seconds if only HH:MM
      return `${time}:00`;
    };

    await this.updatePreferences(userId, {
      breakfast_time: convertToTimeFormat(mealTimes.breakfast_time),
      snack1_time: convertToTimeFormat(mealTimes.snack1_time),
      lunch_time: convertToTimeFormat(mealTimes.lunch_time),
      snack2_time: convertToTimeFormat(mealTimes.snack2_time),
      dinner_time: convertToTimeFormat(mealTimes.dinner_time),
      meal_times_configured: true,
    });
  }

  async isMealTimesConfigured(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs?.meal_times_configured || false;
  }
}

export const preferencesService = new PreferencesService();
