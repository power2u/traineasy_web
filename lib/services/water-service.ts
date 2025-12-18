<<<<<<< HEAD
import { createClient } from '@/utils/supabase/server';

export interface WaterIntakeEntry {
  id: string;
  userId: string;
  timestamp: Date;
  amount: number; // in ml
  createdAt: Date;
}

export class WaterService {
  /**
   * Get today's water intake entries for a user
   */
  static async getTodayEntries(userId: string): Promise<WaterIntakeEntry[]> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', `${today}T00:00:00`)
      .lt('timestamp', `${today}T23:59:59`)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (data || []).map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      timestamp: new Date(entry.timestamp),
      amount: entry.amount,
      createdAt: new Date(entry.created_at),
    }));
  }

  /**
   * Get all water intake entries for a user
   */
  static async getAllEntries(userId: string, limit = 50): Promise<WaterIntakeEntry[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      timestamp: new Date(entry.timestamp),
      amount: entry.amount,
      createdAt: new Date(entry.created_at),
    }));
  }

  /**
   * Add a water intake entry
   */
  static async addEntry(userId: string, amount: number = 250): Promise<WaterIntakeEntry> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('water_intake')
      .insert({
        user_id: userId,
        amount,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      timestamp: new Date(data.timestamp),
      amount: data.amount,
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * Delete a water intake entry
   */
  static async deleteEntry(entryId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('water_intake')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  }

  /**
   * Get today's water count (number of glasses)
   */
  static async getTodayCount(userId: string): Promise<number> {
    const entries = await this.getTodayEntries(userId);
    return entries.length;
  }

  /**
   * Get today's total water amount in ml
   */
  static async getTodayTotal(userId: string): Promise<number> {
    const entries = await this.getTodayEntries(userId);
    return entries.reduce((sum, entry) => sum + entry.amount, 0);
  }
}
=======
import { createClient } from '@/utils/supabase/server';

export interface WaterIntakeEntry {
  id: string;
  userId: string;
  timestamp: Date;
  amount: number; // in ml
  createdAt: Date;
}

export class WaterService {
  /**
   * Get today's water intake entries for a user
   */
  static async getTodayEntries(userId: string): Promise<WaterIntakeEntry[]> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', `${today}T00:00:00`)
      .lt('timestamp', `${today}T23:59:59`)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (data || []).map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      timestamp: new Date(entry.timestamp),
      amount: entry.amount,
      createdAt: new Date(entry.created_at),
    }));
  }

  /**
   * Get all water intake entries for a user
   */
  static async getAllEntries(userId: string, limit = 50): Promise<WaterIntakeEntry[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      timestamp: new Date(entry.timestamp),
      amount: entry.amount,
      createdAt: new Date(entry.created_at),
    }));
  }

  /**
   * Add a water intake entry
   */
  static async addEntry(userId: string, amount: number = 250): Promise<WaterIntakeEntry> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('water_intake')
      .insert({
        user_id: userId,
        amount,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      timestamp: new Date(data.timestamp),
      amount: data.amount,
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * Delete a water intake entry
   */
  static async deleteEntry(entryId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('water_intake')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  }

  /**
   * Get today's water count (number of glasses)
   */
  static async getTodayCount(userId: string): Promise<number> {
    const entries = await this.getTodayEntries(userId);
    return entries.length;
  }

  /**
   * Get today's total water amount in ml
   */
  static async getTodayTotal(userId: string): Promise<number> {
    const entries = await this.getTodayEntries(userId);
    return entries.reduce((sum, entry) => sum + entry.amount, 0);
  }
}
>>>>>>> main
