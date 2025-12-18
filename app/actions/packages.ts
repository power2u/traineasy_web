<<<<<<< HEAD
'use server';

import { createClient } from '@/lib/supabase/server';

export async function listPackages() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      packages: data,
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
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('packages')
      .insert({
        name,
        price,
        duration_days: durationDays,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      package: data,
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
    const supabase = await createClient();

    const { error } = await supabase
      .from('packages')
      .update({ is_active: isActive })
      .eq('id', packageId);

    if (error) throw error;

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
    const supabase = await createClient();

    // Get package details
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('duration_days')
      .eq('id', packageId)
      .single();

    if (pkgError) throw pkgError;

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    // Subtract 1 because if you start on day 1, a 30-day plan should end on day 30 (not day 31)
    endDate.setDate(endDate.getDate() + pkg.duration_days - 1);

    // Create user package assignment
    const { error } = await supabase
      .from('user_packages')
      .insert({
        user_id: userId,
        package_id: packageId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true,
      });

    if (error) throw error;

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
=======
'use server';

import { createClient } from '@/lib/supabase/server';

export async function listPackages() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      packages: data,
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
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('packages')
      .insert({
        name,
        price,
        duration_days: durationDays,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      package: data,
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
    const supabase = await createClient();

    const { error } = await supabase
      .from('packages')
      .update({ is_active: isActive })
      .eq('id', packageId);

    if (error) throw error;

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
    const supabase = await createClient();

    // Get package details
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select('duration_days')
      .eq('id', packageId)
      .single();

    if (pkgError) throw pkgError;

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    // Subtract 1 because if you start on day 1, a 30-day plan should end on day 30 (not day 31)
    endDate.setDate(endDate.getDate() + pkg.duration_days - 1);

    // Create user package assignment
    const { error } = await supabase
      .from('user_packages')
      .insert({
        user_id: userId,
        package_id: packageId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true,
      });

    if (error) throw error;

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
>>>>>>> main
