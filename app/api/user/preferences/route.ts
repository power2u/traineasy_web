import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/preferences - Get current user's preferences
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // Get user preferences
    const preferences = await prisma.userPreference.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        notifications_enabled: true,
        meal_reminders_enabled: true,
        breakfast_time: true,
        snack1_time: true,
        lunch_time: true,
        snack2_time: true,
        dinner_time: true,
        water_reminders_enabled: true,
        weight_reminders_enabled: true,
        daily_water_target: true,
        glass_size_ml: true,
        preferred_unit: true,
        theme: true,
        language: true,
      }
    });

    if (!preferences) {
      return NextResponse.json(
        { error: 'User preferences not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}