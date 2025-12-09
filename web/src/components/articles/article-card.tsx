'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Clock, User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export interface ArticleCardProps {
  id: string;
  title: string;
  excerpt?: string;
  category?: string;
  author?: string;
  publishedAt?: string;
  imageUrl?: string;
  wordCount?: number;
  variant?: 'hero' | 'standard' | 'compact';
  href?: string;
}

/**
 * Calculate reading time based on word count
 * Average reading speed: 200-250 words per minute
 */
export function calculateReadingTime(wordCount?: number): string {
  if (!wordCount || wordCount <= 0) return '1 min read';
  const minutes = Math.ceil(wordCount / 225);
  return `${minutes} min read`;
}

/**
 * Format date with relative times for recent articles
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
  }
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Hero Card - Featured article with full-width image
 */
function HeroCard({
  id,
  title,
  excerpt,
  category,
  author,
  publishedAt,
  imageUrl,
  wordCount,
  href,
}: ArticleCardProps) {
  const linkHref = href || `/dashboard/articles/${id}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-xl bg-card"
    >
      <Link
        href={linkHref}
        className="block focus-ring rounded-xl"
        aria-labelledby={`hero-title-${id}`}
      >
        {/* Image container with 16:9 aspect ratio */}
        <div className="relative aspect-video overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            {category && (
              <Badge
                variant="secondary"
                className="mb-3 bg-primary text-primary-foreground"
              >
                {category}
              </Badge>
            )}

            <h2
              id={`hero-title-${id}`}
              className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 line-clamp-3"
            >
              {title}
            </h2>

            {excerpt && (
              <p className="text-white/80 text-sm md:text-base line-clamp-2 mb-4 max-w-3xl">
                {excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
              {author && (
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>{author}</span>
                </span>
              )}
              {publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{calculateReadingTime(wordCount)}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

/**
 * Standard Card - Grid layout with 4:3 image
 */
function StandardCard({
  id,
  title,
  excerpt,
  category,
  author,
  publishedAt,
  imageUrl,
  wordCount,
  href,
}: ArticleCardProps) {
  const linkHref = href || `/dashboard/articles/${id}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group flex flex-col overflow-hidden rounded-lg bg-card border card-hover"
    >
      <Link
        href={linkHref}
        className="flex flex-col h-full focus-ring rounded-lg"
        aria-labelledby={`standard-title-${id}`}
      >
        {/* Image container with 4:3 aspect ratio */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
          )}

          {category && (
            <Badge
              variant="secondary"
              className="absolute top-3 left-3 bg-primary text-primary-foreground"
            >
              {category}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4">
          <h3
            id={`standard-title-${id}`}
            className="font-display text-lg md:text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors"
          >
            {title}
          </h3>

          {excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
              {excerpt}
            </p>
          )}

          <div className="flex items-center justify-between text-muted-foreground text-xs mt-auto">
            <div className="flex items-center gap-3">
              {author && <span>{author}</span>}
              {publishedAt && (
                <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
              )}
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {calculateReadingTime(wordCount)}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

/**
 * Compact Card - Horizontal layout for lists
 */
function CompactCard({
  id,
  title,
  category,
  publishedAt,
  imageUrl,
  wordCount,
  href,
}: ArticleCardProps) {
  const linkHref = href || `/dashboard/articles/${id}`;

  return (
    <motion.article
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Link
        href={linkHref}
        className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors focus-ring"
        aria-labelledby={`compact-title-${id}`}
      >
        {/* Square thumbnail */}
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {category && (
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            )}
          </div>

          <h4
            id={`compact-title-${id}`}
            className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors"
          >
            {title}
          </h4>

          <div className="flex items-center gap-3 mt-1 text-muted-foreground text-xs">
            {publishedAt && (
              <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {calculateReadingTime(wordCount)}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

/**
 * Main ArticleCard component - renders based on variant
 */
export function ArticleCard({ variant = 'standard', ...props }: ArticleCardProps) {
  switch (variant) {
    case 'hero':
      return <HeroCard {...props} />;
    case 'compact':
      return <CompactCard {...props} />;
    default:
      return <StandardCard {...props} />;
  }
}

/**
 * Skeleton loaders for each variant
 */
export function ArticleCardSkeleton({ variant = 'standard' }: { variant?: 'hero' | 'standard' | 'compact' }) {
  if (variant === 'hero') {
    return (
      <div className="relative overflow-hidden rounded-xl bg-card">
        <div className="relative aspect-video">
          <Skeleton className="absolute inset-0" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <Skeleton className="h-6 w-20 mb-3" />
            <Skeleton className="h-10 w-3/4 mb-3" />
            <Skeleton className="h-5 w-1/2 mb-4" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 p-3">
        <Skeleton className="h-16 w-16 rounded-md flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div className="overflow-hidden rounded-lg bg-card border">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
