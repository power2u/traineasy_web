'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

// Get active banner for users
export async function getActiveBanner() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('motivation_banners')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active banner:', error);
      throw error;
    }

    console.log('Active banner data:', data);

    // Check if banner is expired
    if (data && data.expires_at) {
      const expiryDate = new Date(data.expires_at);
      if (expiryDate < new Date()) {
        console.log('Banner is expired');
        return {
          success: true,
          banner: null,
        };
      }
    }

    return {
      success: true,
      banner: data as MotivationBanner | null,
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
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('motivation_banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      banners: data as MotivationBanner[],
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('motivation_banners')
      .insert({
        title,
        message,
        expires_at: expiresAt,
        created_by: user.id,
        is_active: false,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      banner: data as MotivationBanner,
      message: 'Banner created successfully',
    };
  } catch (error: any) {
    console.error('Error creating banner:', error);
    return {
      success: false,
      error: error.message || 'Failed to create banner',
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
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('motivation_banners')
      .update({
        title,
        message,
        expires_at: expiresAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      banner: data as MotivationBanner,
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
    const adminClient = createAdminClient();
    
    // First, deactivate all banners
    await adminClient
      .from('motivation_banners')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    // Then activate the selected one
    const { data, error } = await adminClient
      .from('motivation_banners')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      banner: data as MotivationBanner,
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
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('motivation_banners')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      banner: data as MotivationBanner,
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
    const adminClient = createAdminClient();
    
    const { error } = await adminClient
      .from('motivation_banners')
      .delete()
      .eq('id', id);

    if (error) throw error;

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
