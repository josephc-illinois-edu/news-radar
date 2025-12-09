'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  Radio,
  Search,
  PlusCircle,
  Image,
  Send,
  MessageCircle,
  BarChart3,
  Newspaper,
  Database,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Articles', href: '/dashboard/articles', icon: FileText },
  { name: 'Scanner', href: '/dashboard/scanner', icon: Radio },
  { name: 'Sources', href: '/dashboard/sources', icon: Database },
  { name: 'Research', href: '/dashboard/research', icon: Search },
  { name: 'Create', href: '/dashboard/create', icon: PlusCircle },
  { name: 'Graphics', href: '/dashboard/graphics', icon: Image },
  { name: 'Publish', href: '/dashboard/publish', icon: Send },
  { name: 'Engage', href: '/dashboard/engage', icon: MessageCircle },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Newspaper className="h-4 w-4 text-primary-foreground" />
          </div>
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            News Radar
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
              const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard';
              const active = isActive || isExactDashboard;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <span className="absolute -left-6 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <item.icon className={cn(
                      'h-5 w-5 shrink-0 transition-transform duration-200',
                      !active && 'group-hover:scale-110'
                    )} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">
            News Radar Studio v0.3
          </p>
        </div>
      </div>
    </div>
  );
}
