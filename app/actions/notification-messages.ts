'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface NotificationMessage {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_active: boolean;
  schedule_time?: string | null;
  repeat_pattern?: string;
  is_enabled?: boolean;
  last_sent_at?: string | null;
  next_send_at?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}



// Get active message for a notification type (used by cron jobs)
export async function getActiveNotificationMessage(notificationType: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('notification_messages')
      .select('*')
      .eq('notification_type', notificationType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active notification message:', error);
      throw error;
    }

    return {
      success: true,
      message: data as NotificationMessage | null,
    };
  } catch (error: any) {
    console.error('Error fetching active notification message:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch active notification message',
      message: null,
    };
  }
}

// Admin: Get all notification messages
export async function getAllNotificationMessages() {
  try {
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('notification_messages')
      .select('*')
      .order('notification_type', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      messages: data as NotificationMessage[],
    };
  } catch (error: any) {
    console.error('Error fetching notification messages:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch notification messages',
      messages: [],
    };
  }
}

// Admin: Create notification message
export async function createNotificationMessage(
  notificationType: string,
  title: string,
  message: string,
  scheduleTime?: string,
  repeatPattern?: string,
  isEnabled?: boolean
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('notification_messages')
      .insert({
        notification_type: notificationType,
        title,
        message,
        schedule_time: scheduleTime || null,
        repeat_pattern: repeatPattern || 'daily',
        is_enabled: isEnabled !== undefined ? isEnabled : true,
        created_by: user.id,
        is_active: false,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: data as NotificationMessage,
      successMessage: 'Notification message created successfully',
    };
  } catch (error: any) {
    console.error('Error creating notification message:', error);
    return {
      success: false,
      error: error.message || 'Failed to create notification message',
    };
  }
}

// Admin: Update notification message
export async function updateNotificationMessage(
  id: string,
  title: string,
  message: string
) {
  try {
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('notification_messages')
      .update({
        title,
        message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: data as NotificationMessage,
      successMessage: 'Notification message updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating notification message:', error);
    return {
      success: false,
      error: error.message || 'Failed to update notification message',
    };
  }
}

// Admin: Activate notification message (deactivates others of same type)
export async function activateNotificationMessage(id: string, notificationType: string) {
  try {
    const adminClient = createAdminClient();
    
    // First, deactivate all messages of the same type
    await adminClient
      .from('notification_messages')
      .update({ is_active: false })
      .eq('notification_type', notificationType);

    // Then activate the selected one
    const { data, error } = await adminClient
      .from('notification_messages')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: data as NotificationMessage,
      successMessage: 'Notification message activated successfully',
    };
  } catch (error: any) {
    console.error('Error activating notification message:', error);
    return {
      success: false,
      error: error.message || 'Failed to activate notification message',
    };
  }
}

// Admin: Deactivate notification message
export async function deactivateNotificationMessage(id: string) {
  try {
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('notification_messages')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: data as NotificationMessage,
      successMessage: 'Notification message deactivated successfully',
    };
  } catch (error: any) {
    console.error('Error deactivating notification message:', error);
    return {
      success: false,
      error: error.message || 'Failed to deactivate notification message',
    };
  }
}

// Admin: Delete notification message
export async function deleteNotificationMessage(id: string) {
  try {
    const adminClient = createAdminClient();
    
    const { error } = await adminClient
      .from('notification_messages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return {
      success: true,
      successMessage: 'Notification message deleted successfully',
    };
  } catch (error: any) {
    console.error('Error deleting notification message:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete notification message',
    };
  }
}