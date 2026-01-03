import { createClient } from '@/lib/supabase/client';

/**
 * Check which authentication provider a user signed up with
 * This helps provide better error messages
 */
export async function checkUserAuthProvider(email: string): Promise<{
  exists: boolean;
  provider: 'email' | 'google' | 'phone' | 'unknown';
}> {
  try {
    const supabase = createClient();

    // Try to sign in with a dummy password to check if user exists
    // This will fail but give us information about the user
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy-password-for-check',
    });

    if (error) {
      // If error mentions OAuth, user likely signed up with Google
      if (error.message.includes('oauth') || error.message.includes('OAuth')) {
        return { exists: true, provider: 'google' };
      }

      // If error is about invalid credentials, user exists with email/password
      if (error.message.includes('Invalid login credentials')) {
        return { exists: true, provider: 'email' };
      }

      // User doesn't exist
      return { exists: false, provider: 'unknown' };
    }

    return { exists: true, provider: 'email' };
  } catch (err) {
    return { exists: false, provider: 'unknown' };
  }
}

/**
 * Get user-friendly error message based on auth error
 */
export function getAuthErrorMessage(error: any): string {
  const message = error?.message || '';

  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Please verify your email address. Check your inbox for the confirmation link.';
  }

  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'This email is already registered. Please sign in instead.';
  }

  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }

  if (message.includes('Unable to validate email')) {
    return 'Please enter a valid email address.';
  }

  if (message.includes('oauth')) {
    return 'This account was created with Google. Google sign-in is currently disabled. Please reset your password to access your account via email.';
  }

  // Return original message if no specific match
  return message || 'Authentication failed. Please try again.';
}
