'use server';

import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from './admin';

// Interface for Package matching database return shape (snake_case)
export interface Package {
  id: string;
  name: string;
  price: number | null;
  duration_days: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapPackage(pkg: any): Package {
  return {
    id: pkg.id,
    name: pkg.name,
    price: pkg.price ? Number(pkg.price) : null,
    duration_days: pkg.durationDays,
    features: pkg.features,
    is_active: pkg.isActive,
    created_at: pkg.createdAt.toISOString(),
    updated_at: pkg.updatedAt.toISOString(),
  };
}

export async function listPackages() {
  try {
    await requireSuperAdmin();

    const data = await prisma.package.findMany({
      orderBy: { price: 'asc' }
    });

    return {
      success: true,
      packages: data.map(mapPackage),
    };
  } catch (error: any) {
    console.error('Error listing packages:', error);
    return {
      success: false,
      error: error.message || 'Failed to list packages',
      packages: [],
    };
  }
}

export async function createPackage(name: string, price: number, durationDays: number) {
  try {
    await requireSuperAdmin();

    const data = await prisma.package.create({
      data: {
        name,
        price,
        durationDays: durationDays,
        isActive: true,
        features: [], // Default empty array as per schema implied array type
      }
    });

    return {
      success: true,
      package: mapPackage(data),
      message: 'Package created successfully',
    };
  } catch (error: any) {
    console.error('Error creating package:', error);
    return {
      success: false,
      error: error.message || 'Failed to create package',
    };
  }
}

export async function togglePackageStatus(packageId: string, isActive: boolean) {
  try {
    await requireSuperAdmin();

    await prisma.package.update({
      where: { id: packageId },
      data: { isActive: isActive }
    });

    return {
      success: true,
      message: `Package ${isActive ? 'activated' : 'deactivated'} successfully`,
    };
  } catch (error: any) {
    console.error('Error toggling package status:', error);
    return {
      success: false,
      error: error.message || 'Failed to update package status',
    };
  }
}

export async function assignPackageToUser(userId: string, packageId: string) {
  try {
    await requireSuperAdmin();

    // Get package details
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      select: { durationDays: true }
    });

    if (!pkg) throw new Error("Package not found");

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    // Subtract 1 because if you start on day 1, a 30-day plan should end on day 30 (not day 31)
    endDate.setDate(endDate.getDate() + pkg.durationDays - 1);

    // Create user package assignment
    await prisma.userPackage.create({
      data: {
        userId: userId,
        packageId: packageId,
        startDate: startDate,
        endDate: endDate,
        isActive: true,
      }
    });

    return {
      success: true,
      message: 'Package assigned successfully',
    };
  } catch (error: any) {
    console.error('Error assigning package:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign package',
    };
  }
}
