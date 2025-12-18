<<<<<<< HEAD
'use client';

import { usePathname } from 'next/navigation';
import { memo, useMemo } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/water': 'Water Tracker',
  '/meals': 'Meals',
  '/weight': 'Weight Logs',
  '/profile': 'Profile',
};

export const TopBar = memo(function TopBar() {
  const pathname = usePathname();
  const title = useMemo(() => 
    pageTitles[pathname || '/dashboard'] || 'Fitness Tracker',
    [pathname]
  );

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-3 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Logo" className="h-7 w-7" />
        <h1 className="text-base font-bold text-foreground">{title}</h1>
      </div>
      
      {/* Theme Toggle for Mobile */}
      <div className="flex items-center">
        <ThemeToggle showLabel={false} />
      </div>
    </header>
  );
});
=======
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { memo, useMemo } from 'react';
import { Button } from '@heroui/react';
import { Info, ArrowLeft } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/water': 'Water Tracker',
  '/meals': 'Meals',
  '/weight': 'Weight Logs',
  '/profile': 'Profile',
  '/info': 'App Info',
};

export const TopBar = memo(function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = useMemo(() => 
    pageTitles[pathname || '/dashboard'] || 'Fitness Tracker',
    [pathname]
  );

  const isInfoPage = pathname === '/info';

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-3 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-2">
         
          <img src="/logo.png" alt="Logo" className="h-7 w-7" />
         
        <h1 className="text-base font-bold text-foreground">{title}</h1>
      </div>
      
      {/* Settings/Info Button for Mobile */}
      {isInfoPage ? <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>: (
        <div className="flex items-center">
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            onPress={() => router.push('/info')}
            aria-label="App info and settings"
          >
            <Info className="w-5 h-5" />
          </Button>
        </div>
      )}
    </header>
  );
});
>>>>>>> main
