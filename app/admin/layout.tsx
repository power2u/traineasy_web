'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@heroui/react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
      } else {
        const role = user.raw_app_meta_data?.role || user.raw_user_meta_data?.role;
        const isSuperAdmin = role === 'super_admin';
        setIsAdmin(isSuperAdmin);
        
        if (!isSuperAdmin) {
          router.push('/dashboard');
        }
      }
      setChecking(false);
    }
  }, [user, loading, router]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const tabs = [
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/memberships', label: 'Memberships', icon: '🎫' },
    { href: '/admin/packages', label: 'Packages', icon: '📦' },
    { href: '/admin/banners', label: 'Banners', icon: '✨' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl font-bold md:text-3xl">Admin Panel</h1>
        <p className="text-xs text-default-500 mt-0.5 md:text-base md:mt-2">
          Manage users and system settings
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-4 border-b border-gray-800 -mx-3 px-3 md:mx-0 md:px-0">
        <div className="flex gap-1 overflow-x-auto md:gap-4">
          {tabs.map((tab) => {
            const isActive = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap text-sm md:text-base md:px-4 ${
                  isActive
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

      {/* Page Content */}
      {children}
    </>
  );
}
