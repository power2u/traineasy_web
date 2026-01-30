'use client';

import { useState, useEffect } from 'react';
import { Wrench, Info } from "lucide-react";

export function MaintenanceBanner() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;
    if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== 'true') return null;

    return (
        <div className="sticky top-0 z-[60] w-full bg-blue-600/95 backdrop-blur-md border-b border-blue-500/50 px-4 py-2 shadow-lg animate-in slide-in-from-top duration-500">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-full">
                        <Wrench className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-white font-semibold text-sm">Stability Testing</span>
                        <span className="text-blue-100 text-xs sm:text-sm">
                            We're concluding maintenance. App is online, but some features might be intermittent.
                        </span>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    <Info className="w-3.5 h-3.5 text-blue-200" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-100">
                        Final Phase
                    </span>
                </div>
            </div>
        </div>
    );
}
