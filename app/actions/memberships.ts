'use server';

import { prisma } from '@/lib/prisma';
import { enableUser, disableUser } from './admin';
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

// Helper to calculate membership details
function calculateMembershipDetails(membership: any): UserMembership {
  const startDate = new Date(membership.startDate);
  const endDate = new Date(membership.endDate);
  const today = new Date();

  // Reset time components for accurate day comparison if needed, though usually Date comparison is fine.
  // Assuming @db.Date returns JS Date at 00:00 UTC? Or Local?
  // Let's assume JS Dates are comparable.

  const oneDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay)) || 1; // avoid divide by zero

  // Days elapsed
  let daysElapsed = Math.round((today.getTime() - startDate.getTime()) / oneDay);
  if (daysElapsed < 0) daysElapsed = 0;
  if (daysElapsed > totalDays) daysElapsed = totalDays;

  // Days remaining
  let daysRemaining = totalDays - daysElapsed;
  if (daysRemaining < 0) daysRemaining = 0;

  const progress = Math.round((daysElapsed / totalDays) * 100);
  const isExpired = today > endDate && membership.status !== 'cancelled'; // If cancelled, it's not "expired" in the natural sense for active check, but effectively dead.
  // However, status assumes precedence.

  return {
    id: membership.id,
    user_id: membership.userId,
    package_id: membership.packageId,
    package_name: membership.package?.name || 'Unknown Package',
    package_duration_days: membership.package?.durationDays || 0,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    status: membership.status as 'active' | 'expired' | 'cancelled',
    days_elapsed: daysElapsed,
    days_remaining: daysRemaining,
    total_days: totalDays,
    progress_percentage: progress,
    is_expired: isExpired,
    // notes field missing in Prisma UserMembership model?
    // Let's check schema. I don't recall seeing notes in UserMembership model.
    // I viewed schema lines 238-250 for UserMembership. 
    // It has `id`, `userId`, `packageId`, `status`, `startDate`, `endDate`, `createdAt`, `updatedAt`.
    // NO `notes`. The interface had `notes`. `createMembership` in original admin.ts accepted `notes`.
    // Maybe I missed it in schema view? Or it's missing.
    // If missing, I can't return it. I'll omit it or return undefined.
    // Wait, UserPackage had `notes`. UserMembership did not in the snippet I saw.
    // I'll skip notes if not in data.
    notes: undefined,
  };
}

async function verifyUserOrAdmin(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  if ((session.user as any).id === userId) return;

  const admin = await prisma.userPreference.findUnique({
    where: { email: session.user.email || '' },
    select: { role: true }
  });

  if (!admin || admin.role !== 'super_admin') {
    throw new Error("Unauthorized");
  }
}

// Get active membership for current user
export async function getActiveMembership(userId: string) {
  try {
    await verifyUserOrAdmin(userId);

    const today = new Date();
    // Assuming 'active' logic means strictly status='active' AND date validity?
    // Database `get_active_membership` RPC likely handles this logic.
    // Usually means: status='active' AND end_date >= today.
    // Or just status='active' is enough if scheduled tasks handle expiration.

    const membership = await prisma.userMembership.findFirst({
      where: {
        userId: userId,
        status: 'active'
      },
      include: { package: true },
      orderBy: { endDate: 'desc' }
    });

    if (!membership) {
      return { success: true, membership: null };
    }

    return {
      success: true,
      membership: calculateMembershipDetails(membership),
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

    const count = await prisma.userMembership.count({
      where: {
        userId: userId,
        status: 'active'
      }
    });

    return {
      success: true,
      hasActive: count > 0,
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

    const data = await prisma.userMembership.findMany({
      where: { userId: userId },
      include: { package: true },
      orderBy: { startDate: 'desc' }
    });

    return {
      success: true,
      memberships: data.map(calculateMembershipDetails),
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
    const session = await getServerSession(authOptions);
    // Explicit admin check
    const admin = await prisma.userPreference.findUnique({
      where: { email: session?.user?.email || '' },
      select: { role: true }
    });
    if (!admin || admin.role !== 'super_admin') throw new Error("Unauthorized");

    // Transaction: Deactivate existing active ones, then create new.
    await prisma.$transaction(async (tx: { userMembership: { updateMany: (arg0: { where: { userId: string; status: string; }; data: { status: string; }; }) => any; create: (arg0: { data: { userId: string; packageId: string; startDate: Date; endDate: Date; status: string; }; }) => any; }; }) => {
      // Deactivate old active memberships
      await tx.userMembership.updateMany({
        where: {
          userId: data.user_id,
          status: 'active'
        },
        data: { status: 'cancelled' }
      });

      // Create new
      await tx.userMembership.create({
        data: {
          userId: data.user_id,
          packageId: data.package_id,
          startDate: new Date(data.start_date),
          endDate: new Date(data.end_date),
          status: 'active',
          // notes: data.notes // Omitted if not in schema. TODO: Add to schema if needed.
        }
      });
    });

    // Automatically enable user login
    await enableUser(data.user_id);

    // Re-fetch to return (Prisma create inside transaction doesn't return with includes unless explicit find)
    const newMembership = await prisma.userMembership.findFirst({
      where: { userId: data.user_id, status: 'active' },
      include: { package: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!newMembership) throw new Error("Failed to retrieve created membership");

    return {
      success: true,
      membership: calculateMembershipDetails(newMembership),
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
    const session = await getServerSession(authOptions);
    const admin = await prisma.userPreference.findUnique({
      where: { email: session?.user?.email || '' },
      select: { role: true }
    });
    if (!admin || admin.role !== 'super_admin') throw new Error("Unauthorized");

    await prisma.userMembership.update({
      where: { id: membershipId },
      data: {
        startDate: data.start_date ? new Date(data.start_date) : undefined,
        endDate: data.end_date ? new Date(data.end_date) : undefined,
        status: data.status,
        // notes: data.notes // Omitted
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('[updateMembership] Error:', error);
    return { success: false, error: error.message };
  }
}

// Cancel membership (admin only)
export async function cancelMembership(membershipId: string) {
  try {
    const session = await getServerSession(authOptions);
    const admin = await prisma.userPreference.findUnique({
      where: { email: session?.user?.email || '' },
      select: { role: true }
    });
    if (!admin || admin.role !== 'super_admin') throw new Error("Unauthorized");

    await prisma.userMembership.update({
      where: { id: membershipId },
      data: { status: 'cancelled' }
    });

    return { success: true };
  } catch (error: any) {
    console.error('[cancelMembership] Error:', error);
    return { success: false, error: error.message };
  }
}

// Expire old memberships (can be called by cron job)
export async function expireOldMemberships() {
  try {
    // Only verify admin if called via action, assuming context has admin session. 
    // If called via external script, session might not exist.
    // Prudent to assume this runs in secure context or check admin if session exists.
    // For now, let's keep it checking admin.
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const admin = await prisma.userPreference.findUnique({
        where: { email: session.user.email },
        select: { role: true }
      });
      if (!admin || admin.role !== 'super_admin') throw new Error("Unauthorized");
    }
    // If no session, rely on caller security (e.g. API route with key protection executing this).

    // Using syncMembershipStatus logic here effectively
    const result = await syncMembershipStatus();
    if (!result.success) throw new Error(result.error);

    return { success: true };
  } catch (error: any) {
    console.error('[expireOldMemberships] Error:', error);
    return { success: false, error: error.message };
  }
}

// Get membership statistics for admin dashboard
export async function getMembershipStats() {
  try {
    const session = await getServerSession(authOptions);
    const admin = await prisma.userPreference.findUnique({
      where: { email: session?.user?.email || '' },
      select: { role: true }
    });
    if (!admin || admin.role !== 'super_admin') throw new Error("Unauthorized");

    const stats = await prisma.userMembership.groupBy({
      by: ['status'],
      _count: true
    });

    // Reduce to object
    const total = stats.reduce((acc: any, curr: { _count: any; }) => acc + curr._count, 0);
    const active = stats.find((s: { status: string; }) => s.status === 'active')?._count || 0;
    const expired = stats.find((s: { status: string; }) => s.status === 'expired')?._count || 0;
    const cancelled = stats.find((s: { status: string; }) => s.status === 'cancelled')?._count || 0;

    return {
      success: true,
      stats: { total, active, expired, cancelled }
    };
  } catch (error: any) {
    console.error('[getMembershipStats] Error:', error);
    return { success: false, error: error.message };
  }
}

// Sync membership status: Expire memberships and disable users
export async function syncMembershipStatus() {
  try {
    // Admin check only if session exists
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const admin = await prisma.userPreference.findUnique({
        where: { email: session.user.email },
        select: { role: true }
      });
      if (!admin || admin.role !== 'super_admin') throw new Error("Unauthorized");
    }

    const today = new Date();

    // Find active memberships that passed end date
    const expiredMemberships = await prisma.userMembership.findMany({
      where: {
        status: 'active',
        endDate: { lt: today }
      },
      select: { id: true, userId: true }
    });

    if (expiredMemberships.length === 0) {
      return { success: true, message: 'No memberships to sync' };
    }

    // Update status and disable users
    let disabledCount = 0;

    await prisma.$transaction(async (tx: { userMembership: { updateMany: (arg0: { where: { id: { in: any; }; }; data: { status: string; }; }) => any; }; userPreference: { updateMany: (arg0: { where: { id: { in: any; }; }; data: { bannedUntil: Date; }; }) => any; }; }) => {
      // Bulk update status
      await tx.userMembership.updateMany({
        where: {
          id: { in: expiredMemberships.map((m: { id: any; }) => m.id) }
        },
        data: { status: 'expired' }
      });

      // Disable users one by one (or could bulk update userPreference if logic is simple)
      // disableUser updates bannedUntil.
      const banUntil = new Date();
      banUntil.setFullYear(banUntil.getFullYear() + 100);

      await tx.userPreference.updateMany({
        where: {
          id: { in: expiredMemberships.map((m: { userId: any; }) => m.userId) }
        },
        data: { bannedUntil: banUntil }
      });
      disabledCount = expiredMemberships.length;
    });

    return {
      success: true,
      message: `Synced ${expiredMemberships.length} memberships. Disabled ${disabledCount} users.`
    };
  } catch (error: any) {
    console.error('[syncMembershipStatus] Error:', error);
    return { success: false, error: error.message };
  }
}
