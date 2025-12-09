'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Navigation sections with grouped items
const navigationSections = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Discover',
    items: [
      { name: 'Scanner', href: '/dashboard/scanner', icon: Radio },
      { name: 'Sources', href: '/dashboard/sources', icon: Database },
      { name: 'Research', href: '/dashboard/research', icon: Search },
    ],
  },
  {
    title: 'Create',
    items: [
      { name: 'Articles', href: '/dashboard/articles', icon: FileText },
      { name: 'New Article', href: '/dashboard/create', icon: PlusCircle },
      { name: 'Graphics', href: '/dashboard/graphics', icon: Image },
    ],
  },
  {
    title: 'Publish',
    items: [
      { name: 'Distribute', href: '/dashboard/publish', icon: Send },
      { name: 'Engage', href: '/dashboard/engage', icon: MessageCircle },
    ],
  },
];

// Flatten for easy lookup
const allNavItems = navigationSections.flatMap((section) => section.items);

function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only show theme after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // Use consistent aria-label during SSR
  const ariaLabel = mounted
    ? `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`
    : 'Toggle theme';

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-10 w-10 p-0"
            aria-label={ariaLabel}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Toggle theme</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start gap-3 h-10"
      aria-label={ariaLabel}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span>Toggle theme</span>
    </Button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col border-r bg-sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div
            className={cn(
              'flex h-16 shrink-0 items-center border-b px-4',
              collapsed ? 'justify-center' : 'gap-3'
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Newspaper
                className="h-5 w-5 text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <Link
                    href="/dashboard"
                    className="font-display text-lg font-bold tracking-tight whitespace-nowrap"
                  >
                    News Radar
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4" aria-label="Main navigation">
            {navigationSections.map((section) => (
              <div key={section.title} className="mb-6">
                {/* Section header */}
                <AnimatePresence>
                  {!collapsed && (
                    <motion.h3
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {section.title}
                    </motion.h3>
                  )}
                </AnimatePresence>

                <ul role="list" className="space-y-1 px-2">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' &&
                        pathname.startsWith(item.href + '/'));
                    const isExactDashboard =
                      item.href === '/dashboard' && pathname === '/dashboard';
                    const active = isActive || isExactDashboard;

                    const linkContent = (
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center rounded-lg transition-all duration-200 focus-ring',
                          collapsed
                            ? 'h-10 w-10 justify-center mx-auto'
                            : 'gap-3 px-3 py-2.5',
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        {/* Active indicator bar */}
                        {active && !collapsed && (
                          <motion.span
                            layoutId="sidebar-active-indicator"
                            className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        )}

                        <item.icon
                          className={cn(
                            'h-5 w-5 shrink-0 transition-transform duration-200',
                            !active && 'group-hover:scale-110'
                          )}
                          aria-hidden="true"
                        />

                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.15 }}
                              className="text-sm font-medium whitespace-nowrap overflow-hidden"
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    );

                    return (
                      <li key={item.name}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8}>
                              {item.name}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          linkContent
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t p-4 space-y-2">
            <ThemeToggle collapsed={collapsed} />

            {/* Collapse toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                'h-10 transition-all',
                collapsed ? 'w-10 p-0 mx-auto' : 'w-full justify-start gap-3'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </Button>

            {/* Version */}
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground text-center pt-2"
                >
                  News Radar Studio v0.3
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

// Export collapsed width for layout calculations
export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
