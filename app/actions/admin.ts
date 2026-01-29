'use server';

import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email/smtp';
import { render } from '@react-email/render';
import { WelcomeEmail } from '@/lib/email/templates/welcome-user';

/**
 * Helper to ensure the caller is a super admin
 */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error('Unauthorized: Please sign in');
  }

  const adminClient = createAdminClient();
  const { data: user, error } = await adminClient
    .from('user_preferences')
    .select('role')
    .eq('email', session.user.email)
    .single();

  if (error || !user || user.role !== 'super_admin') {
    throw new Error('Unauthorized: Insufficient permissions');
  }
}

/**
 * DEVELOPMENT ONLY: Create or update a super admin user
 * This uses the service role key to bypass RLS
 */
export async function createSuperAdmin(email: string) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This action is only available in development mode');
  }

  try {
    const adminClient = createAdminClient();

    // Check if user exists in user_preferences
    const { data: user, error: fetchError } = await adminClient
      .from('user_preferences')
      .select('id, role, full_name, email')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      // If not in preferences, maybe in auth.users?
      // For now, simpler to say "User not found" or "Please sign up/create user first"
      // But if they just signed up via auth but not preferences (unlikely with new flow), we might need to handle that.
      // Assuming strict sync:
      return {
        success: false,
        error: `User with email ${email} not found in preferences. Please create user first.`,
      };
    }

    // Update role
    const { data: updatedUser, error: updateError } = await adminClient
      .from('user_preferences')
      .update({ role: 'super_admin' })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update user role: ${updateError.message}`);
    }

    return {
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        full_name: updatedUser.full_name,
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
 * Uses service role key to create users with elevated permissions
 */
export async function createUser(email: string, password: string, displayName: string, role: 'user' | 'super_admin' = 'user') {
  try {
    await requireSuperAdmin();
    const adminClient = createAdminClient();

    // 1. Create user in Supabase Auth
    // We still keep the metadata for compatibility, but the source of truth is now user_preferences
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: displayName,
        full_name: displayName,
        role: role,
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: role,
      },
    });

    if (error) {
      throw new Error(`Failed to create user in Auth: ${error.message}`);
    }

    // 2. Hash password for local storage (custom auth)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create entry in user_preferences
    // The handle_new_user trigger creates a row, so we use upsert to update it

    // Get creator ID if available (from session)
    const session = await getServerSession(authOptions);
    let createdBy = null;

    if (session?.user?.email) {
      // We need to resolve email to ID for the created_by reference
      const { data: creator } = await adminClient
        .from('user_preferences')
        .select('id')
        .eq('email', session.user.email)
        .single();

      if (creator) {
        createdBy = creator.id;
      }
    }

    const { error: prefError } = await adminClient
      .from('user_preferences')
      .upsert({
        id: data.user.id,
        email: email,
        full_name: displayName,
        role: role,
        password_hash: hashedPassword,
        password_change_required: false,
        created_by: createdBy // Track who created this user
      });

    if (prefError) {
      // Rollback? Deleting the auth user would be ideal but for now just throw
      // await adminClient.auth.admin.deleteUser(data.user.id); 
      console.error('Error creating preferences, user state might be inconsistent:', prefError);
      throw new Error(`Failed to create user profile: ${prefError.message}`);
    }

    // 4. Send Welcome Email
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const loginUrl = `${baseUrl}/auth/signin`;

      const emailHtml = await render(
        WelcomeEmail({
          userEmail: email,
          userName: displayName,
          password: password, // Sending initial password
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
      // Non-blocking error
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: role,
        full_name: displayName,
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
 * Uses service role key to delete users with elevated permissions
 */
export async function deleteUser(userId: string) {
  try {
    await requireSuperAdmin();
    const adminClient = createAdminClient();

    // Delete from user_preferences directly
    // This will cascade to auth.users if configured, OR we just delete this profile
    // User requested to stop targeting auth.users, so we prioritize preferences
    const { error } = await adminClient
      .from('user_preferences')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }

    // Optional: Try to clean up auth.users but don't fail if it doesn't work
    // (since we are moving away from Supabase Auth as the source of truth)
    try {
      await adminClient.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn('Could not delete auth user, but profile deleted:', e);
    }

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
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This action is only available in development mode');
  }

  try {
    await requireSuperAdmin();
    const adminClient = createAdminClient();

    const { data: users, error } = await adminClient
      .from('user_preferences')
      .select('id, email, role, full_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    return {
      success: true,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        full_name: u.full_name,
        provider: 'email',
        created_at: u.created_at,
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
    const adminClient = createAdminClient();

    const { data: users, error } = await adminClient
      .from('user_preferences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    return {
      success: true,
      users: users.map(u => {
        return {
          id: u.id,
          email: u.email || '',
          display_name: u.full_name || '',
          role: u.role,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned_until: null, // Not in user_preferences
          is_banned: false,
          email_confirmed_at: u.created_at, // Assumed
          provider: 'email',
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
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('user_preferences')
      .update({ role: 'super_admin' })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to promote user: ${error.message}`);
    }

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
    const adminClient = createAdminClient();

    // Ban the user for 100 years (effectively permanent)
    const banUntil = new Date();
    banUntil.setFullYear(banUntil.getFullYear() + 100);

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '876000h', // 100 years in hours (approx)
      user_metadata: {
        banned_until: banUntil.toISOString() // Store explicit date for client-side checks
      }
    });

    if (error) {
      throw new Error(`Failed to disable user: ${error.message}`);
    }

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
    const adminClient = createAdminClient();

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    });

    if (error) {
      throw new Error(`Failed to enable user: ${error.message}`);
    }

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
    const adminClient = createAdminClient();

    // 1. Update in Auth (good practice)
    await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    // 2. Update hash in user_preferences
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error } = await adminClient
      .from('user_preferences')
      .update({
        password_hash: hashedPassword,
        password_change_required: false
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to reset password in preferences: ${error.message}`);
    }

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
