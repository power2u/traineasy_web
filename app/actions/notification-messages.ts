'use server';

import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from './admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

// Helper to map Prisma result to NotificationMessage interface
function mapNotificationMessage(msg: any): NotificationMessage {
  return {
    id: msg.id,
    notification_type: msg.notificationType,
    title: msg.title,
    message: msg.message,
    is_active: msg.isActive,
    schedule_time: msg.scheduleTime || undefined,
    repeat_pattern: msg.repeatPattern || undefined,
    is_enabled: msg.isEnabled,
    last_sent_at: msg.lastSentAt ? msg.lastSentAt.toISOString() : null,
    next_send_at: msg.nextSendAt ? msg.nextSendAt.toISOString() : null,
    created_by: msg.createdBy,
    created_at: msg.createdAt.toISOString(),
    updated_at: msg.updatedAt.toISOString(),
  };
}

// Get active message for a notification type (used by cron jobs)
export async function getActiveNotificationMessage(notificationType: string) {
  try {
    const data = await prisma.notificationMessage.findFirst({
      where: {
        notificationType: notificationType,
        isActive: true
      }
    });

    return {
      success: true,
      message: data ? mapNotificationMessage(data) : null,
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
    await requireSuperAdmin();

    const data = await prisma.notificationMessage.findMany({
      orderBy: [
        { notificationType: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return {
      success: true,
      messages: data.map(mapNotificationMessage),
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
    await requireSuperAdmin();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      throw new Error('Not authenticated');
    }
    const userId = (session.user as any).id;

    const data = await prisma.notificationMessage.create({
      data: {
        notificationType: notificationType,
        title,
        message,
        scheduleTime: scheduleTime || null,
        repeatPattern: repeatPattern || 'daily',
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        createdBy: userId,
        isActive: false,
      }
    });

    return {
      success: true,
      message: mapNotificationMessage(data),
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
    await requireSuperAdmin();

    const data = await prisma.notificationMessage.update({
      where: { id },
      data: {
        title,
        message
      }
    });

    return {
      success: true,
      message: mapNotificationMessage(data),
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
    await requireSuperAdmin();

    await prisma.$transaction([
      prisma.notificationMessage.updateMany({
        where: { notificationType: notificationType },
        data: { isActive: false }
      }),
      prisma.notificationMessage.update({
        where: { id },
        data: { isActive: true }
      })
    ]);

    const data = await prisma.notificationMessage.findUnique({
      where: { id }
    });

    if (!data) throw new Error("Message not found after activation");

    return {
      success: true,
      message: mapNotificationMessage(data),
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
    await requireSuperAdmin();

    const data = await prisma.notificationMessage.update({
      where: { id },
      data: { isActive: false }
    });

    return {
      success: true,
      message: mapNotificationMessage(data),
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
    await requireSuperAdmin();

    await prisma.notificationMessage.delete({
      where: { id }
    });

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