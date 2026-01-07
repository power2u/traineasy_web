'use client';

import { usePathname, useRouter } from 'next/navigation';
import { memo, useMemo, useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { Info, ArrowLeft } from 'lucide-react';
import { getActiveBanner } from '@/app/actions/banners';

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
  const [hasBanner, setHasBanner] = useState(false);
  
  const title = useMemo(() => 
    pageTitles[pathname || '/dashboard'] || 'Fitness Tracker',
    [pathname]
  );

  const isInfoPage = pathname === '/info';

  // Check if banner is active to conditionally apply safe area padding
  useEffect(() => {
    const checkBanner = async () => {
      try {
        const result = await getActiveBanner();
        setHasBanner(result.success && !!result.banner);
      } catch {
        setHasBanner(false);
      }
    };
    
    checkBanner();
    
    // Check every 5 minutes to sync with banner updates
    const interval = setInterval(checkBanner, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header 
      className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-3 md:hidden" 
      style={{ paddingTop: hasBanner ? '0' : 'env(safe-area-inset-top)' }}
    >
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
