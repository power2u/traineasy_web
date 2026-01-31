'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminTabs() {
    const pathname = usePathname();

    const tabs = [
        { href: '/admin/users', label: 'Users', icon: '👥' },
        { href: '/admin/memberships', label: 'Memberships', icon: '🎫' },
        { href: '/admin/packages', label: 'Packages', icon: '📦' },
        { href: '/admin/banners', label: 'Banners', icon: '✨' },
        { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
        { href: '/admin/bot-detection', label: 'Bot Detection', icon: '🤖' },
        { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <div className="mb-4 border-b border-gray-800 -mx-3 px-3 md:mx-0 md:px-0">
            <div className="flex gap-1 overflow-x-auto md:gap-4">
                {tabs.map((tab) => {
                    const isActive = pathname?.startsWith(tab.href);
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap text-sm md:text-base md:px-4 ${isActive
                                    ? 'border-blue-500 text-blue-500 font-medium'
                                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                }`}
                        >
                            <span className="text-base md:text-lg">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
