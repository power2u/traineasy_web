'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface WeightLog {
    id: string;
    userId: string;
    weight: number;
    unit: 'kg' | 'lbs';
    date: Date;
    notes?: string;
    createdAt: Date;
}

export async function getWeightLogs(userId: string, limit = 30) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('body_measurements')
            .select('*')
            .eq('user_id', userId)
            .eq('measurement_type', 'weight')
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return {
            success: true,
            logs: (data || []).map((data: any) => ({
                id: data.id,
                userId: data.user_id,
                weight: parseFloat(data.value || data.weight),
                unit: data.unit,
                date: new Date(data.date),
                notes: data.notes,
                createdAt: new Date(data.created_at),
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getLatestWeightLog(userId: string) {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('body_measurements')
            .select('*')
            .eq('user_id', userId)
            .eq('measurement_type', 'weight')
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        return {
            success: true,
            log: data ? {
                id: data.id,
                userId: data.user_id,
                weight: parseFloat(data.value || data.weight),
                unit: data.unit,
                date: new Date(data.date),
                notes: data.notes,
                createdAt: new Date(data.created_at),
            } : null
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function checkCanLogToday(userId: string) {
    try {
        const supabase = await createClient();
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('body_measurements')
            .select('id')
            .eq('user_id', userId)
            .eq('measurement_type', 'weight')
            .eq('date', today)
            .maybeSingle();

        if (error) throw error;

        return { success: true, canLog: !data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createWeightLog(
    userId: string,
    weight: number,
    unit: 'kg' | 'lbs',
    notes?: string
) {
    try {
        const canLogResult = await checkCanLogToday(userId);
        if (canLogResult.success && !canLogResult.canLog) {
            return { success: false, error: 'You have already logged your weight today.' };
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('body_measurements')
            .insert({
                user_id: userId,
                measurement_type: 'weight',
                value: weight,
                unit,
                date: new Date().toISOString().split('T')[0],
                notes,
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard');
        revalidatePath('/weight');

        return {
            success: true,
            log: {
                id: data.id,
                userId: data.user_id,
                weight: parseFloat(data.value || data.weight),
                unit: data.unit,
                date: new Date(data.date),
                notes: data.notes,
                createdAt: new Date(data.created_at),
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteWeightLog(logId: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('body_measurements')
            .delete()
            .eq('id', logId)
            .eq('measurement_type', 'weight');

        if (error) throw error;

        revalidatePath('/dashboard');
        revalidatePath('/weight');

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getWeightStatistics(userId: string) {
    try {
        const supabase = await createClient();

        // Fetch last 30 days for stats calculation
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
            .from('body_measurements')
            .select('value, unit, date')
            .eq('user_id', userId)
            .eq('measurement_type', 'weight')
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('date', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            return { success: true, weeklyAverage: null, monthlyAverage: null };
        }

        // Helper to convert to kg
        const toKg = (val: string | number, unit: string) => {
            const num = typeof val === 'string' ? parseFloat(val) : val;
            return unit === 'kg' ? num : num * 0.45359237;
        };

        const logs = data.map((d: any) => ({
            weight: parseFloat(d.value),
            unit: d.unit,
            date: new Date(d.date)
        }));

        // Weekly Average (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weeklyLogs = logs.filter((l: any) => l.date >= sevenDaysAgo);

        let weeklyAverage = null;
        if (weeklyLogs.length > 0) {
            const sum = weeklyLogs.reduce((acc: number, l: any) => acc + toKg(l.weight, l.unit), 0);
            weeklyAverage = sum / weeklyLogs.length;
        }

        // Monthly Average
        const sumMonthly = logs.reduce((acc: number, l: any) => acc + toKg(l.weight, l.unit), 0);
        const monthlyAverage = sumMonthly / logs.length;

        return { success: true, weeklyAverage, monthlyAverage };

    } catch (error: any) {
        return { success: false, error: error.message, weeklyAverage: null, monthlyAverage: null };
    }
}
