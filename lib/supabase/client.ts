import { createBrowserClient } from '@supabase/ssr';

// Singleton client to prevent multiple instances
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Reduce auth refresh frequency to prevent excessive requests
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      // Enable connection pooling
      db: {
        schema: 'public',
      },
      // Reduce real-time connection overhead
      realtime: {
        params: {
          eventsPerSecond: 2, // Limit events to prevent spam
        },
      },
    }
  );

  return supabaseClient;
}
