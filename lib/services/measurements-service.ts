import { createClient } from '@/lib/supabase/client';
import type { BodyMeasurement, MeasurementType } from '@/lib/types';

class MeasurementsService {
  private supabase = createClient();

  // Get measurements for a specific type
  async getMeasurements(
    userId: string,
    measurementType: MeasurementType,
    days: number = 90
  ): Promise<BodyMeasurement[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .eq('measurement_type', measurementType)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get all measurements for all types (for dashboard/overview)
  async getAllMeasurements(
    userId: string,
    days: number = 90
  ): Promise<BodyMeasurement[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Create or update a measurement
  async saveMeasurement(
    userId: string,
    measurementType: MeasurementType,
    value: number,
    unit: 'kg' | 'lbs' | 'cm' | 'in',
    date?: string,
    notes?: string
  ): Promise<BodyMeasurement> {
    const measurementDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('body_measurements')
      .upsert({
        user_id: userId,
        measurement_type: measurementType,
        value,
        unit,
        date: measurementDate,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a measurement
  async deleteMeasurement(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('body_measurements')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Check if user can log today
  async canLogToday(userId: string, measurementType: MeasurementType): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('body_measurements')
      .select('id')
      .eq('user_id', userId)
      .eq('measurement_type', measurementType)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;
    return !data;
  }

  // Get latest measurement
  async getLatestMeasurement(
    userId: string,
    measurementType: MeasurementType
  ): Promise<BodyMeasurement | null> {
    const { data, error } = await this.supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .eq('measurement_type', measurementType)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Get weekly average
  async getWeeklyAverage(
    userId: string,
    measurementType: MeasurementType
  ): Promise<number | null> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data, error } = await this.supabase
      .from('body_measurements')
      .select('value')
      .eq('user_id', userId)
      .eq('measurement_type', measurementType)
      .gte('date', weekAgo.toISOString().split('T')[0]);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const sum = data.reduce((acc: any, curr: { value: any; }) => acc + curr.value, 0);
    return sum / data.length;
  }

  // Get monthly average
  async getMonthlyAverage(
    userId: string,
    measurementType: MeasurementType
  ): Promise<number | null> {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .from('body_measurements')
      .select('value')
      .eq('user_id', userId)
      .eq('measurement_type', measurementType)
      .gte('date', monthAgo.toISOString().split('T')[0]);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const sum = data.reduce((acc: any, curr: { value: any; }) => acc + curr.value, 0);
    return sum / data.length;
  }
}

export const measurementsService = new MeasurementsService();
