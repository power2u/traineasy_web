import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Re-export createAdminClient as `createClient` for backward compatibility
// This ensures that all server-side operations use the Service Role (Admin) client
// and bypass RLS, as per our new security architecture.
export async function createClient() {
  return createAdminClient();
}

/**
 * Admin client with service role key - bypasses RLS
 * Use this for admin operations that require elevated permissions
 */
export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
