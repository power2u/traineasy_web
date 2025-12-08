'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo } from 'react';
import { Home, Droplet, Utensils, Ruler, User } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/water', label: 'Water', icon: Droplet },
  { href: '/meals', label: 'Meals', icon: Utensils },
  { href: '/measurements', label: 'Body', icon: Ruler },
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
      className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] transition-colors ${
        isActive
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href}
          />
        ))}
      </div>
    </nav>
  );
});
