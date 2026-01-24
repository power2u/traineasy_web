'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useMemo } from 'react';
import { Home, Droplet, Utensils, Ruler, User, Settings } from 'lucide-react';
import { useAuthUser } from '@/lib/contexts/auth-context';

const baseNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/water', label: 'Water', icon: Droplet },
  { href: '/meals', label: 'Meals', icon: Utensils },
  { href: '/measurements', label: 'Body', icon: Ruler },
  { href: '/profile', label: 'Profile', icon: User },
];

const adminNavItem = { href: '/admin', label: 'Admin', icon: Settings };

const NavItem = memo(function NavItem({
  href,
  label,
  icon: Icon,
  isActive
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] transition-colors ${isActive
          ? 'text-primary'
          : 'text-muted-foreground active:text-foreground'
        }`}
    >
      <Icon className="h-6 w-6" />
      <span className="font-medium">{label}</span>
    </Link>
  );
});

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
  const user = useAuthUser();

  // Check if user is super admin
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const role = (user as any).role || user.raw_app_meta_data?.role || user.raw_user_meta_data?.role;
    return role === 'super_admin';
  }, [user]);

  // Build navigation items based on user role
  const navItems = useMemo(() => {
    return isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;
  }, [isAdmin]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href || (item.href === '/admin' && pathname.startsWith('/admin'))}
          />
        ))}
      </div>
    </nav>
  );
});
