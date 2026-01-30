'use server';

import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from './admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface MotivationBanner {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to map Prisma result to MotivationBanner interface
function mapBanner(banner: any): MotivationBanner {
  return {
    id: banner.id,
    title: banner.title,
    message: banner.message,
    is_active: banner.isActive,
    expires_at: banner.expiresAt ? banner.expiresAt.toISOString() : null,
    created_by: banner.createdBy,
    created_at: banner.createdAt.toISOString(),
    updated_at: banner.updatedAt.toISOString(),
  };
}

// Get active banner for users
export async function getActiveBanner() {
  try {
    const data = await prisma.motivationBanner.findFirst({
      where: { isActive: true }
    });

    // Check if banner is expired
    if (data && data.expiresAt) {
      if (data.expiresAt < new Date()) {
        console.log('Banner is expired');
        return {
          success: true,
          banner: null,
        };
      }
    }

    return {
      success: true,
      banner: data ? mapBanner(data) : null,
    };
  } catch (error: any) {
    console.error('Error fetching active banner:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch active banner',
      banner: null,
    };
  }
}

// Admin: Get all banners
export async function getAllBanners() {
  try {
    await requireSuperAdmin();

    const data = await prisma.motivationBanner.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      banners: data.map(mapBanner),
    };
  } catch (error: any) {
    console.error('Error fetching banners:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch banners',
      banners: [],
    };
  }
}

// Admin: Create banner
export async function createBanner(
  title: string,
  message: string,
  expiresAt: string | null
) {
  try {
    await requireSuperAdmin();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      throw new Error('Not authenticated');
    }

    // We need user ID. Session user contains it.
    // However, typings might need assertion if not fully propagated.
    const userId = (session.user as any).id;
    // Or fetch from DB if needed, but session usually has it.

    const data = await prisma.motivationBanner.create({
      data: {
        title,
        message,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId,
        isActive: false,
      }
    });

    return {
      success: true,
      banner: mapBanner(data),
      message: 'Banner created successfully',
    };
  } catch (error: any) {
    console.error('Error creating banner:', error);
    return {
      success: false,
      error: error.message || 'Failed to create banner',
      // Return type expects banner is optional? Original code returned banner on success.
    };
  }
}

// Admin: Update banner
export async function updateBanner(
  id: string,
  title: string,
  message: string,
  expiresAt: string | null
) {
  try {
    await requireSuperAdmin();

    const data = await prisma.motivationBanner.update({
      where: { id },
      data: {
        title,
        message,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });

    return {
      success: true,
      banner: mapBanner(data),
      message: 'Banner updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating banner:', error);
    return {
      success: false,
      error: error.message || 'Failed to update banner',
    };
  }
}

// Admin: Activate banner (deactivates all others)
export async function activateBanner(id: string) {
  try {
    await requireSuperAdmin();

    // Transaction to ensure atomicity
    await prisma.$transaction([
      prisma.motivationBanner.updateMany({
        data: { isActive: false }
      }),
      prisma.motivationBanner.update({
        where: { id },
        data: { isActive: true }
      })
    ]);

    // Fetch updated banner
    const data = await prisma.motivationBanner.findUnique({
      where: { id }
    });

    if (!data) throw new Error("Banner not found after activation");

    return {
      success: true,
      banner: mapBanner(data),
      message: 'Banner activated successfully',
    };
  } catch (error: any) {
    console.error('Error activating banner:', error);
    return {
      success: false,
      error: error.message || 'Failed to activate banner',
    };
  }
}

// Admin: Deactivate banner
export async function deactivateBanner(id: string) {
  try {
    await requireSuperAdmin();

    const data = await prisma.motivationBanner.update({
      where: { id },
      data: { isActive: false }
    });

    return {
      success: true,
      banner: mapBanner(data),
      message: 'Banner deactivated successfully',
    };
  } catch (error: any) {
    console.error('Error deactivating banner:', error);
    return {
      success: false,
      error: error.message || 'Failed to deactivate banner',
    };
  }
}

// Admin: Delete banner
export async function deleteBanner(id: string) {
  try {
    await requireSuperAdmin();

    await prisma.motivationBanner.delete({
      where: { id }
    });

    return {
      success: true,
      message: 'Banner deleted successfully',
    };
  } catch (error: any) {
    console.error('Error deleting banner:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete banner',
    };
  }
}
