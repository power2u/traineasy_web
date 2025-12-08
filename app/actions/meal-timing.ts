'use server';

import { createClient } from '@/lib/supabase/server';

export interface MealTimes {
  breakfast_time: string;
  snack1_time: string;
  lunch_time: string;
  snack2_time: string;
  dinner_time: string;
}

// Helper to convert HH:MM to HH:MM:SS
function convertToTimeFormat(time: string): string {
  if (time.split(':').length === 3) return time;
  return `${time}:00`;
}

export async function getMealTimes(userId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('breakfast_time, snack1_time, lunch_time, snack2_time, dinner_time')
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    return { success: true, mealTimes: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setMealTimes(userId: string, mealTimes: MealTimes) {
  try {
    const supabase = await createClient();
    
    // Convert time format
    const formattedTimes = {
      breakfast_time: convertToTimeFormat(mealTimes.breakfast_time),
      snack1_time: convertToTimeFormat(mealTimes.snack1_time),
      lunch_time: convertToTimeFormat(mealTimes.lunch_time),
      snack2_time: convertToTimeFormat(mealTimes.snack2_time),
      dinner_time: convertToTimeFormat(mealTimes.dinner_time),
      meal_times_configured: true,
    };

    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          id: userId,
          ...formattedTimes,
        },
        {
          onConflict: 'id',
        }
      );

    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error('[setMealTimes] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function isMealTimesConfigured(userId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_preferences')
      .select('meal_times_configured')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return { success: true, configured: data?.meal_times_configured || false };
  } catch (error: any) {
    return { success: false, error: error.message, configured: false };
  }
}
