/**
 * URL Security Utilities
 * Prevents open redirect attacks by validating URLs
 */

/**
 * Validates if a URL is safe for redirection
 * Only allows same-origin URLs to prevent open redirect attacks
 */
export function isValidRedirectUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    // Handle relative URLs
    if (url.startsWith('/')) {
      // Ensure it doesn't start with // (protocol-relative URL)
      return !url.startsWith('//');
    }
    
    // For absolute URLs, check if they're same-origin
    const parsed = new URL(url);
    const currentOrigin = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    return parsed.origin === currentOrigin;
  } catch {
    return false;
  }
}

/**
 * Safely redirects to a URL after validation
 * Falls back to default URL if validation fails
 */
export function safeRedirect(url: string, fallbackUrl: string = '/dashboard'): string {
  return isValidRedirectUrl(url) ? url : fallbackUrl;
}

/**
 * List of allowed redirect paths for additional security
 */
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/profile',
  '/meals',
  '/water',
  '/weight',
  '/measurements',
  '/auth/login',
  '/auth/signup',
  '/membership-expired'
];

/**
 * Validates if a path is in the allowed list
 */
export function isAllowedPath(path: string): boolean {
  return ALLOWED_REDIRECT_PATHS.includes(path);
}

/**
 * Extra secure redirect validation using allowlist
 */
export function safeRedirectStrict(url: string, fallbackUrl: string = '/dashboard'): string {
  if (!isValidRedirectUrl(url)) return fallbackUrl;
  
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : process.env.NEXTAUTH_URL);
    return isAllowedPath(parsed.pathname) ? url : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}