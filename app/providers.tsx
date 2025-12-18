<<<<<<< HEAD
'use client';

import { AuthProvider } from '@/lib/contexts/auth-context';
import { ThemeProvider } from '@/lib/contexts/theme-context';
import { OneSignalProvider } from '@/lib/onesignal/provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

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
      <OneSignalProvider>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </AuthProvider>
      </OneSignalProvider>
    </QueryClientProvider>
  );
}
=======
'use client';

import { AuthProvider } from '@/lib/contexts/auth-context';
import { ThemeProvider } from '@/lib/contexts/theme-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { FCMForegroundHandler } from '@/components/notifications/fcm-foreground-handler';

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
      <AuthProvider>
        <ThemeProvider>
          <FCMForegroundHandler />
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
>>>>>>> main
