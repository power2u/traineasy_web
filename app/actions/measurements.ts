'use server';

import { createClient } from '@/lib/supabase/server';
import { MeasurementType, BodyMeasurement } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface MeasurementsData {
    measurements: BodyMeasurement[];
    preferences: {
        preferred_unit: 'kg' | 'lbs' | 'cm' | 'in';
    };
    stats: {
        weeklyAverage: number | null;
        monthlyAverage: number | null;
    };
    canLogToday: boolean;
}

async function checkAuth(userId: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).id !== userId) {
        throw new Error("Unauthorized");
    }
}

export async function getMeasurementsData(userId: string, type: MeasurementType, days: number = 90): Promise<MeasurementsData> {
    await checkAuth(userId);
    const supabase = await createClient();

    // 1. Fetch Preferences
    const { data: prefs } = await supabase
        .from('user_preferences')
        .select('preferred_unit')
        .eq('id', userId)
        .single();

    const preferredUnit = type === 'weight' ? (prefs?.preferred_unit || 'kg') : 'cm';

    // 2. Fetch Measurements
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: measurements } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .eq('measurement_type', type)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

    const measurementList = measurements || [];

    // 3. Calculate Stats
    const calculateAverage = (data: BodyMeasurement[], days: number) => {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);
        const thresholdStr = thresholdDate.toISOString().split('T')[0];

        const filtered = data.filter(m => m.date >= thresholdStr);
        if (filtered.length === 0) return null;

        const sum = filtered.reduce((acc, curr) => acc + curr.value, 0);
        return sum / filtered.length;
    };

    const weeklyAverage = calculateAverage(measurementList, 7);
    const monthlyAverage = calculateAverage(measurementList, 30);

    // 4. Can Log Today
    const today = new Date().toISOString().split('T')[0];
    const loggedToday = measurementList.some(m => m.date === today);

    return {
        measurements: measurementList,
        preferences: {
            preferred_unit: preferredUnit as 'kg' | 'lbs' | 'cm' | 'in'
        },
        stats: {
            weeklyAverage,
            monthlyAverage
        },
        canLogToday: !loggedToday
    };
}

export async function saveMeasurementAction(
    userId: string,
    type: MeasurementType,
    value: number,
    unit: string,
    notes?: string
) {
    await checkAuth(userId);
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
        .from('body_measurements')
        .upsert({
            user_id: userId,
            measurement_type: type,
            value,
            unit,
            date: today,
            notes,
        });

    if (error) throw error;

    revalidatePath('/measurements');
    return { success: true };
}

export async function deleteMeasurementAction(id: string, userId: string) {
    await checkAuth(userId);
    const supabase = await createClient();

    const { error } = await supabase
        .from('body_measurements')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/measurements');
    return { success: true };
}
