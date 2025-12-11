'use client';

import { Badge } from '@/components/ui/badge';
import { FileText, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { DBArticle, DBPublishedPost } from '@/types/database';

interface SubstackStatusBadgeProps {
  article: DBArticle;
  publishedPosts?: DBPublishedPost[];
}

type SubstackStatus = 'draft' | 'not-on-substack' | 'needs-sync' | 'synced' | 'failed';

function getSubstackStatus(article: DBArticle, publishedPosts?: DBPublishedPost[]): SubstackStatus {
  // Not published anywhere yet (local draft)
  if (article.status === 'draft') {
    return 'draft';
  }

  // Find any Substack post for this article
  const substackPost = publishedPosts?.find((p) => p.platform === 'substack');

  // No Substack record at all - never published to Substack
  if (!substackPost) {
    return 'not-on-substack';
  }

  // Check if failed
  if (substackPost.status === 'failed') {
    return 'failed';
  }

  // Check if pending/scheduled (not yet published)
  if (substackPost.status !== 'published') {
    return 'not-on-substack';
  }

  // Has been published to Substack - check if article was updated since
  // Use published_at for initial publish, updated_at for subsequent syncs
  const lastSyncTime = substackPost.updated_at || substackPost.published_at;

  if (!lastSyncTime) {
    return 'synced'; // No timestamp to compare, assume synced
  }

  const articleUpdated = new Date(article.updated_at);
  const lastSynced = new Date(lastSyncTime);

  // Add 5 second buffer to avoid false positives from near-simultaneous updates
  if (articleUpdated.getTime() > lastSynced.getTime() + 5000) {
    return 'needs-sync';
  }

  return 'synced';
}

export function SubstackStatusBadge({ article, publishedPosts }: SubstackStatusBadgeProps) {
  const status = getSubstackStatus(article, publishedPosts);

  switch (status) {
    case 'draft':
      return (
        <Badge variant="outline" className="text-gray-500 gap-1">
          <FileText className="w-3 h-3" aria-hidden="true" />
          <span>Draft</span>
        </Badge>
      );

    case 'not-on-substack':
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-300 gap-1">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          <span>Not on Substack</span>
        </Badge>
      );

    case 'needs-sync':
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1">
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          <span>Needs Sync</span>
        </Badge>
      );

    case 'synced':
      return (
        <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          <span>Synced</span>
        </Badge>
      );

    case 'failed':
      return (
        <Badge variant="outline" className="text-red-600 border-red-300 gap-1">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          <span>Failed</span>
        </Badge>
      );

    default:
      return null;
  }
}

// Compact version for mobile
export function SubstackStatusIcon({ article, publishedPosts }: SubstackStatusBadgeProps) {
  const status = getSubstackStatus(article, publishedPosts);

  const iconProps = { className: 'w-4 h-4', 'aria-hidden': true as const };

  switch (status) {
    case 'draft':
      return <FileText {...iconProps} className="w-4 h-4 text-gray-400" />;
    case 'not-on-substack':
      return <AlertCircle {...iconProps} className="w-4 h-4 text-yellow-500" />;
    case 'needs-sync':
      return <RefreshCw {...iconProps} className="w-4 h-4 text-orange-500" />;
    case 'synced':
      return <CheckCircle2 {...iconProps} className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <AlertCircle {...iconProps} className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
}
