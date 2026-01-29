'use server';

import { createClient } from '@/lib/supabase/server';
import { enableUser, disableUser, requireSuperAdmin } from './admin';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface UserMembership {
  id: string;
  user_id: string;
  package_id: string;
  package_name: string;
  package_duration_days: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  days_elapsed: number;
  days_remaining: number;
  total_days: number;
  progress_percentage: number;
  is_expired: boolean;
  notes?: string;
}

async function verifyUserOrAdmin(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  if ((session.user as any).id === userId) return; // Own data

  // Check if admin
  try {
    await requireSuperAdmin();
  } catch {
    throw new Error("Unauthorized");
  }
}

// Get active membership for current user
export async function getActiveMembership(userId: string) {
  try {
    await verifyUserOrAdmin(userId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc('get_active_membership', { p_user_id: userId })
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      success: true,
      membership: data as UserMembership | null,
    };
  } catch (error: any) {
    console.error('[getActiveMembership] Error:', error);
    return { success: false, error: error.message, membership: null };
  }
}

// Check if user has active membership
export async function hasActiveMembership(userId: string) {
  try {
    await verifyUserOrAdmin(userId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc('has_active_membership', { p_user_id: userId });

    if (error) throw error;

    return {
      success: true,
      hasActive: data as boolean,
    };
  } catch (error: any) {
    console.error('[hasActiveMembership] Error:', error);
    return { success: false, error: error.message, hasActive: false };
  }
}

// Get all memberships for a user (admin or own)
export async function getUserMemberships(userId: string) {
  try {
    await verifyUserOrAdmin(userId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_membership_details')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      memberships: data as UserMembership[],
    };
  } catch (error: any) {
    console.error('[getUserMemberships] Error:', error);
    return { success: false, error: error.message, memberships: [] };
  }
}

// Create new membership (admin only)
export async function createMembership(data: {
  user_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}) {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    // First, deactivate any existing active memberships (using function)
    try {
      await supabase.rpc('deactivate_user_memberships', { p_user_id: data.user_id });
    } catch (rpcError) {
      // Fallback: deactivate directly with SQL if function fails
      console.warn('RPC function failed, using direct SQL:', rpcError);
      await supabase
        .from('user_memberships')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', data.user_id)
        .eq('status', 'active');
    }

    // Create new membership
    const { data: membership, error } = await supabase
      .from('user_memberships')
      .insert({
        user_id: data.user_id,
        package_id: data.package_id,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'active',
        notes: data.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Automatically enable user login when membership is assigned
    await enableUser(data.user_id);

    return {
      success: true,
      membership,
    };
  } catch (error: any) {
    console.error('[createMembership] Error:', error);
    return { success: false, error: error.message };
  }
}

// Update membership (admin only)
export async function updateMembership(
  membershipId: string,
  data: {
    start_date?: string;
    end_date?: string;
    status?: 'active' | 'expired' | 'cancelled';
    notes?: string;
  }
) {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_memberships')
      .update(data)
      .eq('id', membershipId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[updateMembership] Error:', error);
    return { success: false, error: error.message };
  }
}

// Cancel membership (admin only)
export async function cancelMembership(membershipId: string) {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_memberships')
      .update({ status: 'cancelled' })
      .eq('id', membershipId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[cancelMembership] Error:', error);
    return { success: false, error: error.message };
  }
}

// Expire old memberships (can be called by cron job)
export async function expireOldMemberships() {
  try {
    // This action is likely called by an external cron service/Supabase Cron
    // If exposed as an API route, verify key.
    // If exposed as Server Action, it should probably be Admin Only or verifiable.
    // For now, assume Admin Only to prevent abuse.
    await requireSuperAdmin();

    const supabase = await createClient();

    const { error } = await supabase.rpc('expire_old_memberships');

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('[expireOldMemberships] Error:', error);
    return { success: false, error: error.message };
  }
}

// Get membership statistics for admin dashboard
export async function getMembershipStats() {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_memberships')
      .select('status');

    if (error) throw error;

    const stats = {
      total: data.length,
      active: data.filter(m => m.status === 'active').length,
      expired: data.filter(m => m.status === 'expired').length,
      cancelled: data.filter(m => m.status === 'cancelled').length,
    };

    return {
      success: true,
      stats,
    };
  } catch (error: any) {
    console.error('[getMembershipStats] Error:', error);
    return { success: false, error: error.message };
  }
}

// Sync membership status: Expire memberships and disable users
export async function syncMembershipStatus() {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Find all active memberships that should be expired
    const { data: expiredMemberships, error: fetchError } = await supabase
      .from('user_memberships')
      .select('id, user_id')
      .eq('status', 'active')
      .lt('end_date', today);

    if (fetchError) throw fetchError;

    if (!expiredMemberships || expiredMemberships.length === 0) {
      return { success: true, message: 'No memberships to sync' };
    }

    // 2. Update status to expired
    const { error: updateError } = await supabase
      .from('user_memberships')
      .update({ status: 'expired' })
      .in('id', expiredMemberships.map(m => m.id));

    if (updateError) throw updateError;

    // 3. Disable login for these users
    let disabledCount = 0;
    for (const m of expiredMemberships) {
      try {
        const result = await disableUser(m.user_id);
        if (result.success) disabledCount++;
      } catch (e) {
        console.error(`Failed to disable user ${m.user_id}:`, e);
      }
    }

    return {
      success: true,
      message: `Synced ${expiredMemberships.length} memberships. Disabled ${disabledCount} users.`
    };
  } catch (error: any) {
    console.error('[syncMembershipStatus] Error:', error);
    return { success: false, error: error.message };
  }
}
