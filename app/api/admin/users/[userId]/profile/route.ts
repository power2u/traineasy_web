import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const isSuperAdmin = session.user.role === 'super_admin';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await params;
    const profileData = await request.json();

    // Remove fields that shouldn't be updated
    const {
      id,
      email,
      created_at,
      last_sign_in_at,
      ...updateData
    } = profileData;

    console.log(`[Admin Profile Update] ${session.user.email} updating profile for user ${userId}`);

    // Convert snake_case to camelCase for Prisma
    const prismaUpdateData: any = {};
    Object.keys(updateData).forEach(key => {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      prismaUpdateData[camelKey] = updateData[key];
    });

    // Use upsert to handle both update and insert cases
    const updatedProfile = await prisma.userPreference.upsert({
      where: { id: userId },
      update: prismaUpdateData,
      create: {
        id: userId,
        email: email || `user_${userId}@temp.com`, // Fallback email
        ...prismaUpdateData
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}