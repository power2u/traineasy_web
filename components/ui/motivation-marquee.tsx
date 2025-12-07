'use client';

import { useEffect, useState } from 'react';
import { getActiveBanner, type MotivationBanner } from '@/app/actions/banners';
import { Sparkles } from 'lucide-react';

export function MotivationMarquee() {
  const [banner, setBanner] = useState<MotivationBanner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('MotivationMarquee mounted');
    loadBanner();
    
    // Refresh every 5 minutes to check for new banners
    const interval = setInterval(loadBanner, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadBanner = async () => {
    console.log('Loading banner...');
    try {
      const result = await getActiveBanner();
      console.log('Banner result:', result);
      
      if (result.success && result.banner) {
        setBanner(result.banner);
        setError(null);
        console.log('✅ Banner set:', result.banner);
      } else {
        setBanner(null);
        setError(result.error || null);
        console.log('❌ No banner or error:', result.error);
      }
    } catch (err: any) {
      console.error('❌ Exception loading banner:', err);
      setError(err.message);
      setBanner(null);
    } finally {
      setIsLoading(false);
    }
  };

  console.log('Render state:', { isLoading, hasBanner: !!banner, error });

  if (isLoading) {
    console.log('Still loading...');
    return null;
  }

  if (error) {
    console.error('Banner error:', error);
  }

  if (!banner) {
    console.log('No banner to display');
    return null;
  }

  console.log('Rendering banner:', banner.title);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-purple-600/20 to-primary/20 border-y border-primary/30">
      <div className="flex items-center gap-2 py-2.5 px-3">
        <Sparkles className="h-4 w-4 text-warning flex-shrink-0 animate-pulse" />
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap">
            <span className="text-sm font-bold italic text-foreground">
              {banner.message}
            </span>
            {/* Duplicate for seamless loop */}
            <span className="mx-12 text-muted-foreground">•</span>
            <span className="text-sm font-bold italic text-foreground">
              {banner.message}
            </span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-marquee {
          display: inline-block;
          animation: marquee 5s linear infinite;
        }
        
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
