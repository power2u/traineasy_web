'use client';

import { AuthProvider } from '@/lib/contexts/auth-context';
import { ThemeProvider } from '@/lib/contexts/theme-context';
import { TimezoneUpdater } from '@/components/auth/timezone-updater';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance per request to avoid sharing state
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AuthProvider>
          <ThemeProvider>
            <TimezoneUpdater />
            {children}
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </AuthProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
