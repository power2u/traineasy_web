import { createClient } from '@/lib/supabase/client';
import type { WeightLog } from '@/lib/types';

export class WeightService {
  private supabase = createClient();

  async getTodayLog(userId: string): Promise<WeightLog | null> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error('Error fetching today log:', error);
      return null;
    }

    return data ? this.mapToWeightLog(data) : null;
  }

  async canLogToday(userId: string): Promise<boolean> {
    try {
      const todayLog = await this.getTodayLog(userId);
      return todayLog === null;
    } catch (error) {
      console.error('Error checking if can log today:', error);
      // If there's an error, assume they can log (fail open)
      return true;
    }
  }

  async createLog(
    userId: string,
    weight: number,
    unit: 'kg' | 'lbs',
    notes?: string
  ): Promise<WeightLog> {
    const canLog = await this.canLogToday(userId);
    if (!canLog) {
      throw new Error('You have already logged your weight today. Try again tomorrow!');
    }

    const { data, error } = await this.supabase
      .from('weight_logs')
      .insert({
        user_id: userId,
        weight,
        unit,
        date: new Date().toISOString().split('T')[0],
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToWeightLog(data);
  }

  async getLogs(userId: string, limit = 30): Promise<WeightLog[]> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.map(this.mapToWeightLog);
  }

  async deleteLog(logId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('weight_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getLatestLog(userId: string): Promise<WeightLog | null> {
    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest log:', error);
      return null;
    }

    return data ? this.mapToWeightLog(data) : null;
  }

  async getWeightChange(userId: string): Promise<{ change: number; percentage: number } | null> {
    const logs = await this.getLogs(userId, 2);
    
    if (logs.length < 2) return null;

    const latest = logs[0].weight;
    const previous = logs[1].weight;
    const change = latest - previous;
    const percentage = (change / previous) * 100;

    return { change, percentage };
  }

  async getStatistics(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('weight_statistics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async getWeeklyAverage(userId: string): Promise<number | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('weight, unit')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Convert all weights to kg for accurate averaging
    const weightsKg = data.map(log => {
      const weight = parseFloat(log.weight);
      return log.unit === 'kg' ? weight : weight * 0.45359237;
    });
    
    const sum = weightsKg.reduce((acc, w) => acc + w, 0);
    return sum / weightsKg.length;
  }

  async getMonthlyAverage(userId: string): Promise<number | null> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .from('weight_logs')
      .select('weight, unit')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Convert all weights to kg for accurate averaging
    const weightsKg = data.map(log => {
      const weight = parseFloat(log.weight);
      return log.unit === 'kg' ? weight : weight * 0.45359237;
    });
    
    const sum = weightsKg.reduce((acc, w) => acc + w, 0);
    return sum / weightsKg.length;
  }

  calculateBMI(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  calculateProgressPercentage(currentWeight: number, startWeight: number, goalWeight: number): number {
    if (startWeight === goalWeight) return 100;
    const totalToLose = startWeight - goalWeight;
    const lostSoFar = startWeight - currentWeight;
    return Math.min(100, Math.max(0, (lostSoFar / totalToLose) * 100));
  }

  convertWeight(weight: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs'): number {
    if (fromUnit === toUnit) return weight;
    if (fromUnit === 'kg' && toUnit === 'lbs') return weight * 2.20462;
    return weight / 2.20462;
  }

  private mapToWeightLog(data: any): WeightLog {
    return {
      id: data.id,
      userId: data.user_id,
      weight: parseFloat(data.weight),
      unit: data.unit,
      date: new Date(data.date),
      notes: data.notes,
      createdAt: new Date(data.created_at),
    };
  }
}

export const weightService = new WeightService();
