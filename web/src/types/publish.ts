/**
 * Publishing types
 */

// Currently only substack is implemented, but types support future platforms
export type PublishPlatform = 'substack' | 'linkedin' | 'twitter' | 'facebook' | 'medium';
export type PublishStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface PlatformConnection {
  id: string;
  platform: PublishPlatform;
  name: string;
  username?: string;
  connected: boolean;
  connectedAt?: string;
  expiresAt?: string;
}

export interface PublishRequest {
  articleId: string;
  platforms: PublishPlatform[];
  scheduledAt?: string; // ISO date string for scheduled publishing
  customContent?: Record<PublishPlatform, string>; // Platform-specific content overrides
  imageUrl?: string;
}

export interface PublishResult {
  platform: PublishPlatform;
  status: PublishStatus;
  url?: string;
  postId?: string;
  error?: string;
  publishedAt?: string;
}

export interface PublishedPost {
  id: string;
  articleId: string;
  platform: PublishPlatform;
  status: PublishStatus;
  url?: string;
  postId?: string;
  scheduledAt?: string;
  publishedAt?: string;
  error?: string;
  engagement?: PostEngagement;
}

export interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
  clicks?: number;
  impressions?: number;
  lastUpdated: string;
}

export const PLATFORM_INFO: Record<PublishPlatform, {
  name: string;
  icon: string;
  maxLength?: number;
  supportsImages: boolean;
  supportsScheduling: boolean;
  authType: 'oauth' | 'api_key' | 'webhook';
}> = {
  substack: {
    name: 'Substack',
    icon: 'mail',
    supportsImages: true,
    supportsScheduling: true,
    authType: 'api_key', // Uses browser automation with email/password credentials
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'linkedin',
    maxLength: 3000,
    supportsImages: true,
    supportsScheduling: false,
    authType: 'oauth',
  },
  twitter: {
    name: 'Twitter/X',
    icon: 'twitter',
    maxLength: 280,
    supportsImages: true,
    supportsScheduling: true,
    authType: 'oauth',
  },
  facebook: {
    name: 'Facebook',
    icon: 'facebook',
    maxLength: 63206,
    supportsImages: true,
    supportsScheduling: true,
    authType: 'oauth',
  },
  medium: {
    name: 'Medium',
    icon: 'book-open',
    supportsImages: true,
    supportsScheduling: false,
    authType: 'api_key',
  },
};
