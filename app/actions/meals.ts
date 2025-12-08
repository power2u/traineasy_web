'use server';

import { createClient } from '@/lib/supabase/server';

export async function getTodayMeals(userId: string) {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is ok
      throw error;
    }

    return {
      success: true,
      meals: data
        ? {
            id: data.id,
            date: data.date,
            breakfast_completed: data.breakfast_completed,
            breakfast_time: data.breakfast_time,
            snack1_completed: data.snack1_completed,
            snack1_time: data.snack1_time,
            lunch_completed: data.lunch_completed,
            lunch_time: data.lunch_time,
            snack2_completed: data.snack2_completed,
            snack2_time: data.snack2_time,
            dinner_completed: data.dinner_completed,
            dinner_time: data.dinner_time,
            notes: data.notes,
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
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Check if today's record exists
    const { data: existing } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    const updateData = {
      [`${mealType}_completed`]: completed,
      [`${mealType}_time`]: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('meals')
        .update(updateData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new record
      const { error } = await supabase.from('meals').insert({
        user_id: userId,
        date: today,
        ...updateData,
      });

      if (error) throw error;
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMealReminders(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('meal_reminders')
      .select('*')
      .eq('user_id', userId)
      .order('reminder_time', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      reminders: (data || []).map((r) => ({
        id: r.id,
        meal_type: r.meal_type,
        reminder_time: r.reminder_time,
        is_active: r.is_active,
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
    const supabase = await createClient();

    // Upsert (insert or update)
    const { error } = await supabase.from('meal_reminders').upsert(
      {
        user_id: userId,
        meal_type: mealType,
        reminder_time: reminderTime,
        is_active: true,
      },
      {
        onConflict: 'user_id,meal_type',
      }
    );

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleReminderActive(reminderId: string, isActive: boolean) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('meal_reminders')
      .update({ is_active: isActive })
      .eq('id', reminderId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMealsHistory(userId: string, limit = 30) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      history: (data || []).map((m) => ({
        date: m.date,
        breakfast_completed: m.breakfast_completed,
        snack1_completed: m.snack1_completed,
        lunch_completed: m.lunch_completed,
        snack2_completed: m.snack2_completed,
        dinner_completed: m.dinner_completed,
        total_completed:
          (m.breakfast_completed ? 1 : 0) +
          (m.snack1_completed ? 1 : 0) +
          (m.lunch_completed ? 1 : 0) +
          (m.snack2_completed ? 1 : 0) +
          (m.dinner_completed ? 1 : 0),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
