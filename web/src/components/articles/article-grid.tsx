'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LayoutGrid, List, Newspaper, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ArticleCard,
  ArticleCardSkeleton,
  type ArticleCardProps,
} from './article-card';

export type LayoutMode = 'magazine' | 'grid' | 'list';

interface ArticleGridProps {
  articles: ArticleCardProps[];
  layout?: LayoutMode;
  showLayoutToggle?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Layout toggle component with accessible buttons
 */
function LayoutToggle({
  layout,
  onChange,
}: {
  layout: LayoutMode;
  onChange: (layout: LayoutMode) => void;
}) {
  const layouts: { value: LayoutMode; icon: typeof LayoutGrid; label: string }[] = [
    { value: 'magazine', icon: Newspaper, label: 'Magazine layout' },
    { value: 'grid', icon: LayoutGrid, label: 'Grid layout' },
    { value: 'list', icon: List, label: 'List layout' },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 bg-muted rounded-lg"
      role="group"
      aria-label="Article layout options"
    >
      {layouts.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={layout === value ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onChange(value)}
          aria-pressed={layout === value}
          aria-label={label}
          className={cn(
            'h-8 w-8 p-0 touch-target',
            layout === value && 'bg-background shadow-sm'
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="rounded-full bg-muted p-6 mb-4">
        <FileText className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">No articles yet</h3>
      <p className="text-muted-foreground max-w-sm">{message}</p>
    </motion.div>
  );
}

/**
 * Loading skeleton grid
 */
function LoadingGrid({ layout }: { layout: LayoutMode }) {
  if (layout === 'magazine') {
    return (
      <div className="space-y-6">
        <ArticleCardSkeleton variant="hero" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ArticleCardSkeleton key={i} variant="standard" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <ArticleCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <ArticleCardSkeleton key={i} variant="compact" />
        ))}
      </div>
    );
  }

  // Grid layout
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ArticleCardSkeleton key={i} variant="standard" />
      ))}
    </div>
  );
}

/**
 * Stagger animation variants
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Magazine layout - Hero + Grid + List
 */
function MagazineLayout({ articles }: { articles: ArticleCardProps[] }) {
  const [hero, ...rest] = articles;
  const gridArticles = rest.slice(0, 4);
  const listArticles = rest.slice(4);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Hero article */}
      {hero && (
        <motion.div variants={itemVariants}>
          <ArticleCard {...hero} variant="hero" />
        </motion.div>
      )}

      {/* 2x2 Grid of standard cards */}
      {gridArticles.length > 0 && (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {gridArticles.map((article) => (
            <motion.div key={article.id} variants={itemVariants}>
              <ArticleCard {...article} variant="standard" />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Compact list for remaining articles */}
      {listArticles.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold mb-4 editorial-divider pb-2">
            More Stories
          </h3>
          <motion.div
            variants={containerVariants}
            className="divide-y divide-border"
          >
            {listArticles.map((article) => (
              <motion.div key={article.id} variants={itemVariants}>
                <ArticleCard {...article} variant="compact" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Grid layout - Uniform standard cards
 */
function GridLayout({ articles }: { articles: ArticleCardProps[] }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {articles.map((article) => (
        <motion.div key={article.id} variants={itemVariants}>
          <ArticleCard {...article} variant="standard" />
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * List layout - All compact cards
 */
function ListLayout({ articles }: { articles: ArticleCardProps[] }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="divide-y divide-border"
    >
      {articles.map((article) => (
        <motion.div key={article.id} variants={itemVariants}>
          <ArticleCard {...article} variant="compact" />
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Main ArticleGrid component
 */
export function ArticleGrid({
  articles,
  layout: initialLayout = 'magazine',
  showLayoutToggle = true,
  isLoading = false,
  emptyMessage = "Start creating content to see your articles here.",
  className,
}: ArticleGridProps) {
  const [layout, setLayout] = useState<LayoutMode>(initialLayout);

  if (isLoading) {
    return (
      <div className={className}>
        {showLayoutToggle && (
          <div className="flex justify-end mb-6">
            <LayoutToggle layout={layout} onChange={setLayout} />
          </div>
        )}
        <LoadingGrid layout={layout} />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={className}>
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className={className}>
      {showLayoutToggle && (
        <div className="flex justify-end mb-6">
          <LayoutToggle layout={layout} onChange={setLayout} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={layout}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {layout === 'magazine' && <MagazineLayout articles={articles} />}
          {layout === 'grid' && <GridLayout articles={articles} />}
          {layout === 'list' && <ListLayout articles={articles} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export { LayoutToggle };
