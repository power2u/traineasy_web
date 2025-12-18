'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function saveFCMToken(token: string) {
  try {
    // Get the current user using the regular client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Use admin client for database operations to bypass RLS
    const adminClient = createAdminClient();
    
    // Check if token already exists for this user
    const { data: existingToken } = await adminClient
      .from('fcm_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('token', token)
      .single();

    if (existingToken) {
      console.log('FCM token already exists for user');
      return { success: true, message: 'Token already registered' };
    }

    // Insert new token
    const { error: insertError } = await adminClient
      .from('fcm_tokens')
      .insert({
        user_id: user.id,
        token: token,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error saving FCM token:', insertError);
      throw insertError;
    }

    console.log('✅ FCM token saved successfully');
    return { success: true, message: 'Token saved successfully' };

  } catch (error: any) {
    console.error('Error in saveFCMToken:', error);
    return { success: false, error: error.message };
  }
}

export async function removeFCMToken(token: string) {
  try {
    // Get the current user using the regular client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Use admin client for database operations to bypass RLS
    const adminClient = createAdminClient();
    
    const { error } = await adminClient
      .from('fcm_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', token);

    if (error) {
      console.error('Error removing FCM token:', error);
      throw error;
    }

    console.log('✅ FCM token removed successfully');
    return { success: true, message: 'Token removed successfully' };

  } catch (error: any) {
    console.error('Error in removeFCMToken:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserPreferences() {
  try {
    // Get the current user using the regular client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Use admin client for database operations to bypass RLS
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('user_preferences')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user preferences:', error);
      throw error;
    }

    return { success: true, data };

  } catch (error: any) {
    console.error('Error in getUserPreferences:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserPreferences(preferences: any) {
  try {
    // Get the current user using the regular client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Use admin client for database operations to bypass RLS
    const adminClient = createAdminClient();
    
    // Check if row exists first
    const { data: existing } = await adminClient
      .from('user_preferences')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) {
      // Row exists, update it
      const { error } = await adminClient
        .from('user_preferences')
        .update(preferences)
        .eq('id', user.id);
      
      if (error) throw error;
    } else {
      // Row doesn't exist, insert it
      const { error } = await adminClient
        .from('user_preferences')
        .insert({
          id: user.id,
          ...preferences,
        });
      
      if (error) throw error;
    }

    return { success: true, message: 'Preferences updated successfully' };

  } catch (error: any) {
    console.error('Error in updateUserPreferences:', error);
    return { success: false, error: error.message };
  }
}