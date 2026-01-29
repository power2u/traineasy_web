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
