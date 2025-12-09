'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  PlusCircle,
  Search,
  MoreHorizontal,
  Radio,
  Database,
  Image,
  Send,
  MessageCircle,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';

// Primary nav items (always visible in bottom bar)
const primaryNavItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Articles', href: '/dashboard/articles', icon: FileText },
  { name: 'Create', href: '/dashboard/create', icon: PlusCircle },
  { name: 'Research', href: '/dashboard/research', icon: Search },
];

// Secondary nav items (shown in "More" menu)
const secondaryNavItems = [
  { name: 'Scanner', href: '/dashboard/scanner', icon: Radio },
  { name: 'Sources', href: '/dashboard/sources', icon: Database },
  { name: 'Graphics', href: '/dashboard/graphics', icon: Image },
  { name: 'Publish', href: '/dashboard/publish', icon: Send },
  { name: 'Engage', href: '/dashboard/engage', icon: MessageCircle },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// All nav items for active state checking
const allNavItems = [...primaryNavItems, ...secondaryNavItems];

export function MobileNav() {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Check if current page is in secondary nav
  const isSecondaryActive = secondaryNavItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
  );

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMoreMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-16 left-0 right-0 z-50 bg-background border-t rounded-t-2xl shadow-lg lg:hidden pb-safe"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    More Options
                  </h2>
                  <button
                    onClick={() => setMoreMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <ul className="grid grid-cols-3 gap-2" role="menu">
                  {secondaryNavItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' &&
                        pathname.startsWith(item.href + '/'));

                    return (
                      <li key={item.name} role="none">
                        <Link
                          href={item.href}
                          onClick={() => setMoreMenuOpen(false)}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-h-[72px]',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          )}
                          role="menuitem"
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <item.icon
                            className="h-6 w-6 mb-1"
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium">
                            {item.name}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t lg:hidden pb-safe"
        aria-label="Mobile navigation"
      >
        <ul className="flex items-center justify-around h-16">
          {primaryNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' &&
                pathname.startsWith(item.href + '/'));
            const isExactDashboard =
              item.href === '/dashboard' && pathname === '/dashboard';
            const active = isActive || isExactDashboard;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg transition-colors focus-ring',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 mb-1 transition-transform',
                      active && 'scale-110'
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-medium">{item.name}</span>

                  {/* Active indicator dot */}
                  {active && (
                    <motion.span
                      layoutId="mobile-nav-indicator"
                      className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              </li>
            );
          })}

          {/* More button */}
          <li>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={cn(
                'relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg transition-colors focus-ring',
                moreMenuOpen || isSecondaryActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              aria-label="More navigation options"
            >
              <MoreHorizontal
                className={cn(
                  'h-5 w-5 mb-1 transition-transform',
                  (moreMenuOpen || isSecondaryActive) && 'scale-110'
                )}
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium">More</span>

              {/* Active indicator when secondary page is active */}
              {isSecondaryActive && !moreMenuOpen && (
                <motion.span
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary"
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
