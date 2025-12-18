<<<<<<< HEAD
'use server';

import { createClient } from '@/lib/supabase/server';

export interface WaterIntakeEntry {
  id: string;
  userId: string;
  timestamp: Date;
  glassCount: number;
  createdAt: Date;
}

export async function getTodayWaterEntries(userId: string) {
  try {
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

    return {
      success: true,
      entries: (data || []).map(entry => ({
        id: entry.id,
        userId: entry.user_id,
        timestamp: new Date(entry.timestamp).toISOString(),
        glassCount: entry.glass_count || 1,
        createdAt: new Date(entry.created_at).toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllWaterEntries(userId: string, limit = 50) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      entries: (data || []).map(entry => ({
        id: entry.id,
        userId: entry.user_id,
        timestamp: new Date(entry.timestamp).toISOString(),
        glassCount: entry.glass_count || 1,
        createdAt: new Date(entry.created_at).toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addWaterEntry(userId: string, glassCount: number = 1) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('water_intake')
      .insert({
        user_id: userId,
        glass_count: glassCount,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      entry: {
        id: data.id,
        userId: data.user_id,
        timestamp: new Date(data.timestamp).toISOString(),
        glassCount: data.glass_count || 1,
        createdAt: new Date(data.created_at).toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteWaterEntry(entryId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('water_intake')
      .delete()
      .eq('id', entryId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTodayWaterCount(userId: string) {
  try {
    const result = await getTodayWaterEntries(userId);
    if (!result.success) throw new Error(result.error);
    return { success: true, count: result.entries?.length || 0 };
  } catch (error: any) {
    return { success: false, error: error.message, count: 0 };
  }
}

export async function getTodayWaterTotal(userId: string) {
  try {
    const result = await getTodayWaterEntries(userId);
    if (!result.success) throw new Error(result.error);
    const totalGlasses = (result.entries || []).reduce((sum, entry) => sum + entry.glassCount, 0);
    const totalMl = totalGlasses * 250; // Each glass is 250ml
    return { success: true, total: totalMl, totalGlasses };
  } catch (error: any) {
    return { success: false, error: error.message, total: 0, totalGlasses: 0 };
  }
}

export async function getWaterTarget(userId: string) {
  try {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error('User not found');
    }

    const target = user.user_metadata?.water_target_glasses || 14; // Default 3.5L (14 glasses)

    return { success: true, target };
  } catch (error: any) {
    return { success: false, error: error.message, target: 14 };
  }
}

export async function updateWaterTarget(userId: string, targetGlasses: number) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      data: {
        water_target_glasses: targetGlasses,
      },
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
=======
'use server';

import { createClient } from '@/lib/supabase/server';

export interface WaterIntakeEntry {
  id: string;
  userId: string;
  timestamp: Date;
  glassCount: number;
  createdAt: Date;
}

export async function getTodayWaterEntries(userId: string) {
  try {
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

    return {
      success: true,
      entries: (data || []).map(entry => ({
        id: entry.id,
        userId: entry.user_id,
        timestamp: new Date(entry.timestamp).toISOString(),
        glassCount: entry.glass_count || 1,
        createdAt: new Date(entry.created_at).toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllWaterEntries(userId: string, limit = 50) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      success: true,
      entries: (data || []).map(entry => ({
        id: entry.id,
        userId: entry.user_id,
        timestamp: new Date(entry.timestamp).toISOString(),
        glassCount: entry.glass_count || 1,
        createdAt: new Date(entry.created_at).toISOString(),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addWaterEntry(userId: string, glassCount: number = 1) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('water_intake')
      .insert({
        user_id: userId,
        glass_count: glassCount,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      entry: {
        id: data.id,
        userId: data.user_id,
        timestamp: new Date(data.timestamp).toISOString(),
        glassCount: data.glass_count || 1,
        createdAt: new Date(data.created_at).toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteWaterEntry(entryId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('water_intake')
      .delete()
      .eq('id', entryId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTodayWaterCount(userId: string) {
  try {
    const result = await getTodayWaterEntries(userId);
    if (!result.success) throw new Error(result.error);
    return { success: true, count: result.entries?.length || 0 };
  } catch (error: any) {
    return { success: false, error: error.message, count: 0 };
  }
}

export async function getTodayWaterTotal(userId: string) {
  try {
    const result = await getTodayWaterEntries(userId);
    if (!result.success) throw new Error(result.error);
    const totalGlasses = (result.entries || []).reduce((sum, entry) => sum + entry.glassCount, 0);
    const totalMl = totalGlasses * 250; // Each glass is 250ml
    return { success: true, total: totalMl, totalGlasses };
  } catch (error: any) {
    return { success: false, error: error.message, total: 0, totalGlasses: 0 };
  }
}

export async function getWaterTarget(userId: string) {
  try {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error('User not found');
    }

    const target = user.user_metadata?.water_target_glasses || 14; // Default 3.5L (14 glasses)

    return { success: true, target };
  } catch (error: any) {
    return { success: false, error: error.message, target: 14 };
  }
}

export async function updateWaterTarget(userId: string, targetGlasses: number) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      data: {
        water_target_glasses: targetGlasses,
      },
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
>>>>>>> main
