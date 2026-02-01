'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveFCMToken(token: string) {
  try {
    console.log('🔄 saveFCMToken called with token:', token.substring(0, 20) + '...');
    
    const session = await getServerSession(authOptions);
    console.log('🔐 Session check:', !!session, !!session?.user);

    if (!session || !session.user) {
      console.error('❌ User not authenticated in saveFCMToken');
      throw new Error('User not authenticated');
    }

    const userId = (session.user as any).id;
    console.log('👤 User ID from session:', userId);

    // First check if user exists in database
    const userExists = await prisma.userPreference.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    console.log('🔍 User exists in database:', !!userExists);

    if (!userExists) {
      console.log(`❌ User ${userId} not found in database, skipping FCM token save`);
      return { success: false, error: 'User not found in database' };
    }

    // Check if token already exists for this user
    const existingToken = await prisma.fcmToken.findFirst({
      where: { userId, token }
    });

    console.log('🔍 Existing token found:', !!existingToken);

    if (existingToken) {
      // Update timestamp
      await prisma.fcmToken.update({
        where: { id: existingToken.id },
        data: { lastUsedAt: new Date() }
      });
      console.log('✅ FCM token updated');
      return { success: true, message: 'Token updated successfully' };
    } else {
      // Create new
      const newToken = await prisma.fcmToken.create({
        data: {
          userId,
          token,
          lastUsedAt: new Date()
        }
      });
      console.log('✅ FCM token saved successfully with ID:', newToken.id);
      return { success: true, message: 'Token saved successfully' };
    }

  } catch (error: any) {
    console.error('❌ Error in saveFCMToken:', error);
    return { success: false, error: error.message };
  }
}

export async function removeFCMToken(token: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      throw new Error('User not authenticated');
    }

    const userId = (session.user as any).id;

    await prisma.fcmToken.deleteMany({
      where: { userId, token }
    });

    console.log('✅ FCM token removed successfully');
    return { success: true, message: 'Token removed successfully' };

  } catch (error: any) {
    console.error('Error in removeFCMToken:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserPreferences() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      throw new Error('User not authenticated');
    }

    const userId = (session.user as any).id;

    const data = await prisma.userPreference.findUnique({
      where: { id: userId }
    });

    return { success: true, data };

  } catch (error: any) {
    console.error('Error in getUserPreferences:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserPreferences(preferences: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      throw new Error('User not authenticated');
    }

    const userId = (session.user as any).id;

    // Remove id from preferences to avoid update error
    const { id, ...dataToUpdate } = preferences;

    await prisma.userPreference.upsert({
      where: { id: userId },
      update: dataToUpdate,
      create: {
        id: userId,
        email: session.user.email!,
        ...dataToUpdate
      }
    });

    return { success: true, message: 'Preferences updated successfully' };

  } catch (error: any) {
    console.error('Error in updateUserPreferences:', error);
    return { success: false, error: error.message };
  }
}
