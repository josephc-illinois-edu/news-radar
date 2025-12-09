'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getArticleGradient } from '@/lib/articles/demo-data';
import { FileText } from 'lucide-react';

interface ArticleThumbnailProps {
  /** Image URL - if undefined/null, shows gradient fallback */
  src?: string | null;
  /** Alt text for accessibility */
  alt: string;
  /** Slug used to generate consistent gradient fallback */
  slug: string;
  /** Aspect ratio class (e.g., 'aspect-video', 'aspect-[4/3]') */
  aspectRatio?: string;
  /** Additional classes */
  className?: string;
  /** Image sizes for responsive loading */
  sizes?: string;
  /** Priority loading for above-fold images */
  priority?: boolean;
  /** Show category badge overlay */
  category?: string;
  /** Show icon in fallback gradient */
  showFallbackIcon?: boolean;
}

/**
 * Reusable article thumbnail component with gradient fallback
 * Handles missing images gracefully with deterministic gradients
 */
export function ArticleThumbnail({
  src,
  alt,
  slug,
  aspectRatio = 'aspect-video',
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  category,
  showFallbackIcon = true,
}: ArticleThumbnailProps) {
  const hasImage = Boolean(src);
  const gradient = getArticleGradient(slug);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatio,
        className
      )}
      style={!hasImage ? { background: gradient } : undefined}
    >
      {hasImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes={sizes}
          priority={priority}
        />
      ) : (
        /* Fallback gradient with optional icon */
        showFallbackIcon && (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText
              className="h-12 w-12 text-white/20"
              aria-hidden="true"
            />
          </div>
        )
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      {/* Category badge */}
      {category && (
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
            {category}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for article thumbnail
 */
export function ArticleThumbnailSkeleton({
  aspectRatio = 'aspect-video',
  className,
}: {
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted animate-pulse',
        aspectRatio,
        className
      )}
    />
  );
}
