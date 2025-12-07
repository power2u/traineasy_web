'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@heroui/react';
import { memo, useMemo } from 'react';
import { LayoutDashboard, Droplet, Utensils, Ruler, User, Wrench } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/water', label: 'Water', icon: Droplet },
  { href: '/meals', label: 'Meals', icon: Utensils },
  { href: '/measurements', label: 'Body Measurements', icon: Ruler },
  { href: '/profile', label: 'Profile', icon: User },
];

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
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
});

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  // Check if user is super admin - memoized
  const isSuperAdmin = useMemo(() => 
    user?.raw_app_meta_data?.role === 'super_admin' || 
    user?.raw_user_meta_data?.role === 'super_admin',
    [user]
  );

  const allNavItems = useMemo(() => 
    isSuperAdmin 
      ? [...navItems, { href: '/admin', label: 'Admin', icon: Wrench }]
      : navItems,
    [isSuperAdmin]
  );

  const displayName = useMemo(() => 
    user?.displayName || user?.email?.split('@')[0],
    [user]
  );

  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">Fitness Tracker</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {allNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-4">
        <div className="mb-3 rounded-lg bg-secondary p-3">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
        </div>
        
        {/* Theme Toggle */}
        <div className="mb-3">
          <ThemeToggle />
        </div>
        
        <Button
          variant="danger-soft"
          className="w-full"
          onClick={signOut}
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
});
