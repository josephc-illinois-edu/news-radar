/**
 * Publishing types
 */

export type PublishPlatform = 'facebook' | 'linkedin' | 'twitter' | 'medium' | 'wordpress' | 'ghost';
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
  facebook: {
    name: 'Facebook',
    icon: 'facebook',
    supportsImages: true,
    supportsScheduling: true,
    authType: 'oauth',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'linkedin',
    supportsImages: true,
    supportsScheduling: true,
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
  medium: {
    name: 'Medium',
    icon: 'medium',
    supportsImages: true,
    supportsScheduling: false,
    authType: 'api_key',
  },
  wordpress: {
    name: 'WordPress',
    icon: 'wordpress',
    supportsImages: true,
    supportsScheduling: true,
    authType: 'api_key',
  },
  ghost: {
    name: 'Ghost',
    icon: 'ghost',
    supportsImages: true,
    supportsScheduling: true,
    authType: 'api_key',
  },
};
