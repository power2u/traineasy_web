'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email/smtp';
import { render } from '@react-email/render';
import { WelcomeEmail } from '@/lib/email/templates/welcome-user';
import { calculateMembershipDetails } from '@/lib/utils/membership-calculations';

/**
 * Helper to ensure the caller is a super admin
 */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error('Unauthorized: Please sign in');
  }

  const user = await prisma.userPreference.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  });

  if (!user || user.role !== 'super_admin') {
    throw new Error('Unauthorized: Insufficient permissions');
  }
}

/**
 * DEVELOPMENT ONLY: Create or update a super admin user
 */
export async function createSuperAdmin(email: string) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This action is only available in development mode');
  }

  try {
    const user = await prisma.userPreference.findUnique({
      where: { email }
    });

    if (!user) {
      return {
        success: false,
        error: `User with email ${email} not found in preferences. Please create user first.`,
      };
    }

    const updatedUser = await prisma.userPreference.update({
      where: { id: user.id },
      data: { role: 'super_admin' }
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        full_name: updatedUser.fullName,
      },
      message: `Successfully updated ${email} to super_admin!`,
    };
  } catch (error: any) {
    console.error('Error creating super admin:', error);
    return {
      success: false,
      error: error.message || 'Failed to create super admin',
    };
  }
}

/**
 * Create a new user (admin only)
 */
export async function createUser(email: string, password: string, displayName: string, role: string = 'user') {
  try {
    await requireSuperAdmin();

    // 1. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Create entry in user_preferences
    const session = await getServerSession(authOptions);
    let createdById = null;

    if (session?.user?.email) {
      const creator = await prisma.userPreference.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });
      if (creator) createdById = creator.id;
    }

    // Check if user already exists
    const existing = await prisma.userPreference.findUnique({
      where: { email }
    });

    if (existing) {
      throw new Error("User with this email already exists");
    }

    const newUser = await prisma.userPreference.create({
      data: {
        email: email,
        fullName: displayName,
        role: role,
        passwordHash: hashedPassword,
        passwordChangeRequired: false,
        createdBy: createdById,
        // Default values for other fields logic
        notificationsEnabled: true,
        mealRemindersEnabled: true,
        theme: 'system',
        language: 'en'
      }
    });

    // 3. Send Welcome Email (Fire and forget to prevent blocking UI)
    const sendWelcomeEmail = async () => {
      try {
        // Determine base URL for email images - prioritize public URL
        let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        // Handle Vercel deployments where NEXTAUTH_URL might not be set in preview
        if (process.env.VERCEL_URL) {
          baseUrl = `https://${process.env.VERCEL_URL}`;
        }

        // Remove trailing slash if present to avoid double slashes with image paths
        baseUrl = baseUrl.replace(/\/$/, '');

        const loginUrl = `${baseUrl}/auth/login`;

        const emailHtml = await render(
          WelcomeEmail({
            userEmail: email,
            userName: displayName,
            password: password,
            loginUrl,
            baseUrl,
            supportEmail: process.env.SMTP_FROM || 'support@traineasy.com',
          })
        );

        const emailResult = await sendEmail({
          to: email,
          subject: 'Welcome to TrainEasy! 🚀',
          html: emailHtml,
          text: `Welcome to TrainEasy! Your account has been created.\n\nLogin Email: ${email}\nPassword: ${password}\n\nLogin here: ${loginUrl}`,
        });

        if (emailResult.success) {
          console.log(`[createUser] Welcome email sent to ${email}`);
        } else {
          console.warn(`[createUser] Failed to send welcome email: ${emailResult.error}`);
        }
      } catch (emailError) {
        console.error('[createUser] Error sending welcome email:', emailError);
      }
    };

    // Execute without await
    sendWelcomeEmail();

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        full_name: newUser.fullName,
      },
      message: `Successfully created user ${email} and sent welcome email!`,
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error.message || 'Failed to create user',
    };
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string) {
  try {
    await requireSuperAdmin();

    await prisma.userPreference.delete({
      where: { id: userId }
    });

    return {
      success: true,
      message: `Successfully deleted user!`,
    };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete user',
    };
  }
}

/**
 * DEVELOPMENT ONLY: List all users (for debugging)
 */
export async function listAllUsers() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This action is only available in development mode');
  }

  try {
    await requireSuperAdmin();

    const users = await prisma.userPreference.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        full_name: u.fullName,
        provider: 'email',
        created_at: u.createdAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error('Error listing users:', error);
    return {
      success: false,
      error: error.message || 'Failed to list users',
    };
  }
}

/**
 * List users with detailed information
 */
export async function listUsers() {
  try {
    await requireSuperAdmin();

    const users = await prisma.userPreference.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        userMemberships: {
          where: { status: 'active' },
          orderBy: { endDate: 'desc' },
          take: 1,
          include: { package: true }
        }
      }
    });

    return {
      success: true,
      users: users.map(u => {
        const activeMembership = u.userMemberships[0] ? calculateMembershipDetails(u.userMemberships[0]) : null;

        return {
          id: u.id,
          email: u.email || '',
          display_name: u.fullName || '',
          role: u.role,
          created_at: u.createdAt.toISOString(),
          last_sign_in_at: u.lastSignInAt ? u.lastSignInAt.toISOString() : null,
          banned_until: u.bannedUntil ? u.bannedUntil.toISOString() : null,
          is_banned: !!(u.bannedUntil && u.bannedUntil > new Date()),
          email_confirmed_at: u.createdAt.toISOString(),
          provider: 'email',
          activeMembership: activeMembership,
        };
      }),
    };
  } catch (error: any) {
    console.error('Error listing users:', error);
    return {
      success: false,
      error: error.message || 'Failed to list users',
    };
  }
}

/**
 * Promote a user to super admin
 */
export async function promoteToSuperAdmin(userId: string) {
  try {
    await requireSuperAdmin();

    await prisma.userPreference.update({
      where: { id: userId },
      data: { role: 'super_admin' }
    });

    return {
      success: true,
      message: `Successfully promoted user to super_admin!`,
    };
  } catch (error: any) {
    console.error('Error promoting user:', error);
    return {
      success: false,
      error: error.message || 'Failed to promote user',
    };
  }
}

/**
 * Disable user login (ban user)
 */
export async function disableUser(userId: string) {
  try {
    await requireSuperAdmin();

    const banUntil = new Date();
    banUntil.setFullYear(banUntil.getFullYear() + 100);

    await prisma.userPreference.update({
      where: { id: userId },
      data: { bannedUntil: banUntil }
    });

    return {
      success: true,
      message: 'User login disabled successfully',
    };
  } catch (error: any) {
    console.error('Error disabling user:', error);
    return {
      success: false,
      error: error.message || 'Failed to disable user',
    };
  }
}

/**
 * Enable user login (unban user)
 */
export async function enableUser(userId: string) {
  try {
    await requireSuperAdmin();

    await prisma.userPreference.update({
      where: { id: userId },
      data: { bannedUntil: null }
    });

    return {
      success: true,
      message: 'User login enabled successfully',
    };
  } catch (error: any) {
    console.error('Error enabling user:', error);
    return {
      success: false,
      error: error.message || 'Failed to enable user',
    };
  }
}

/**
 * Reset user password
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    await requireSuperAdmin();

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.userPreference.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        passwordChangeRequired: false
      }
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return {
      success: false,
      error: error.message || 'Failed to reset password',
    };
  }
}
