/**
 * Engagement management types
 */

import type { PublishPlatform } from './publish';

export type EngagementType = 'like' | 'comment' | 'share' | 'reply' | 'mention' | 'repost';
export type EngagementStatus = 'pending' | 'replied' | 'ignored' | 'flagged';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Engagement {
  id: string;
  platform: PublishPlatform;
  type: EngagementType;
  status: EngagementStatus;
  postId: string;
  postUrl?: string;

  // Author info
  authorId: string;
  authorName: string;
  authorUsername?: string;
  authorAvatar?: string;
  authorFollowers?: number;

  // Content
  content?: string;
  sentiment?: Sentiment;

  // Timestamps
  createdAt: string;
  respondedAt?: string;

  // Related
  articleId?: string;
  parentEngagementId?: string; // For nested replies
  replies?: Engagement[];
}

export interface EngagementStats {
  total: number;
  pending: number;
  replied: number;
  ignored: number;
  flagged: number;
  byPlatform: Record<PublishPlatform, number>;
  byType: Record<EngagementType, number>;
  bySentiment: Record<Sentiment, number>;
}

export interface EngagementFilters {
  platform?: PublishPlatform;
  type?: EngagementType;
  status?: EngagementStatus;
  sentiment?: Sentiment;
  articleId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ReplyAction {
  engagementId: string;
  content: string;
  scheduledAt?: string;
}

export interface BulkAction {
  engagementIds: string[];
  action: 'reply' | 'ignore' | 'flag' | 'unflag';
  content?: string; // For bulk reply with same content
}

export interface SuggestedReply {
  content: string;
  tone: 'professional' | 'friendly' | 'formal';
  confidence: number;
}

export const ENGAGEMENT_TYPES: Record<EngagementType, { name: string; icon: string }> = {
  like: { name: 'Like', icon: 'heart' },
  comment: { name: 'Comment', icon: 'message-circle' },
  share: { name: 'Share', icon: 'share-2' },
  reply: { name: 'Reply', icon: 'corner-up-left' },
  mention: { name: 'Mention', icon: 'at-sign' },
  repost: { name: 'Repost', icon: 'repeat' },
};

export const SENTIMENT_CONFIG: Record<Sentiment, { name: string; color: string }> = {
  positive: { name: 'Positive', color: 'green' },
  neutral: { name: 'Neutral', color: 'gray' },
  negative: { name: 'Negative', color: 'red' },
};

export const STATUS_CONFIG: Record<EngagementStatus, { name: string; color: string }> = {
  pending: { name: 'Pending', color: 'yellow' },
  replied: { name: 'Replied', color: 'green' },
  ignored: { name: 'Ignored', color: 'gray' },
  flagged: { name: 'Flagged', color: 'red' },
};
