'use server';

import { createAdminClient } from '@/lib/supabase/server';

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

    // Get the user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const existingUser = users.find(u => u.email === email);

    if (!existingUser) {
      return {
        success: false,
        error: `User with email ${email} not found. Please sign up first.`,
      };
    }

    // Update user metadata to add super_admin role
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      existingUser.id,
      {
        app_metadata: {
          ...existingUser.app_metadata,
          role: 'super_admin',
        },
        user_metadata: {
          ...existingUser.user_metadata,
          role: 'super_admin',
        },
      }
    );

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    return {
      success: true,
      user: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        role: updatedUser.user.app_metadata?.role,
        full_name: updatedUser.user.user_metadata?.full_name,
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
    const adminClient = createAdminClient();

    // Create user with admin API
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
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role,
        full_name: data.user.user_metadata?.full_name,
      },
      message: `Successfully created user ${email}!`,
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
    const adminClient = createAdminClient();

    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
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
    const adminClient = createAdminClient();

    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    return {
      success: true,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.app_metadata?.role || 'user',
        full_name: u.user_metadata?.full_name || u.user_metadata?.name,
        provider: u.app_metadata?.provider,
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
    const adminClient = createAdminClient();

    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    return {
      success: true,
      users: users.map(u => {
        const bannedUntil = (u as any).banned_until;
        return {
          id: u.id,
          email: u.email || '',
          display_name: u.user_metadata?.display_name || u.user_metadata?.full_name || '',
          role: u.app_metadata?.role || u.user_metadata?.role || 'user',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned_until: bannedUntil,
          is_banned: bannedUntil ? new Date(bannedUntil) > new Date() : false,
          email_confirmed_at: u.email_confirmed_at,
          provider: u.app_metadata?.provider || 'email',
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
    const adminClient = createAdminClient();

    // Get the user first
    const { data: { user }, error: getUserError } = await adminClient.auth.admin.getUserById(userId);

    if (getUserError || !user) {
      throw new Error(`Failed to get user: ${getUserError?.message || 'User not found'}`);
    }

    // Update user metadata to add super_admin role
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          ...user.app_metadata,
          role: 'super_admin',
        },
        user_metadata: {
          ...user.user_metadata,
          role: 'super_admin',
        },
      }
    );

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
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
    const adminClient = createAdminClient();

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
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
