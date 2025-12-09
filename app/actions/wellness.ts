'use server';

import { createClient } from '@/lib/supabase/server';

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

export async function getTodayWellnessCheckIn(userId: string) {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_wellness_checkin')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      success: true,
      checkIn: data || null,
    };
  } catch (error) {
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
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Check if today's record exists
    const { data: existing } = await supabase
      .from('daily_wellness_checkin')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('daily_wellness_checkin')
        .update(checkInData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new record
      const { error } = await supabase
        .from('daily_wellness_checkin')
        .insert({
          user_id: userId,
          date: today,
          ...checkInData,
        });

      if (error) throw error;
    }

    return {
      success: true,
      message: 'Wellness check-in saved successfully',
    };
  } catch (error) {
    console.error('Error saving wellness check-in:', error);
    return {
      success: false,
      error: 'Failed to save wellness check-in',
    };
  }
}

export async function getWellnessHistory(userId: string, limit = 7) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('daily_wellness_checkin')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      history: data || [],
    };
  } catch (error) {
    console.error('Error fetching wellness history:', error);
    return {
      success: false,
      error: 'Failed to fetch wellness history',
      history: [],
    };
  }
}
