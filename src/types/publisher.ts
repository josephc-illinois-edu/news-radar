// ============================================================================
// Publisher Types - Platform publishing interfaces
// ============================================================================

export type Platform = 'facebook' | 'linkedin' | 'medium' | 'wordpress' | 'substack';

export interface PublishConfig {
  platform: Platform;
  articleId: string;
  scheduledFor?: Date;
  options?: PlatformSpecificOptions;
}

export interface PlatformSpecificOptions {
  // Facebook
  facebookPageId?: string;
  facebookTargetType?: 'page' | 'profile';

  // LinkedIn
  linkedinVisibility?: 'PUBLIC' | 'CONNECTIONS';
  linkedinAuthorUrn?: string;

  // Medium
  mediumPublishStatus?: 'public' | 'draft' | 'unlisted';
  mediumTags?: string[];

  // WordPress
  wordpressStatus?: 'publish' | 'draft' | 'private';
  wordpressCategories?: number[];
  wordpressTags?: string[];

  // Substack
  substackPublicationUrl?: string;
  substackAudience?: 'everyone' | 'paid' | 'founding';
  substackSendEmail?: boolean;
}

export interface PublishResult {
  success: boolean;
  platform: Platform;
  postId?: string;
  postUrl?: string;
  error?: string;
  scheduledFor?: Date;
}

export interface PlatformCredentials {
  facebook?: {
    accessToken: string;
    pageId?: string;
  };
  linkedin?: {
    accessToken: string;
    authorUrn?: string;
  };
  medium?: {
    integrationToken: string;
    authorId?: string;
  };
  wordpress?: {
    siteUrl: string;
    username: string;
    applicationPassword: string;
  };
  substack?: {
    email: string;
    password: string;
    publicationUrl: string;
  };
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  source_urls?: string[];
  created_at: string;
  metadata?: Record<string, any>;
}

// Base publisher interface that all platforms must implement
export interface Publisher {
  platform: Platform;
  isConfigured(): boolean;
  publish(article: Article, options?: PlatformSpecificOptions): Promise<PublishResult>;
  schedule(article: Article, scheduledFor: Date, options?: PlatformSpecificOptions): Promise<PublishResult>;
  update(postId: string, article: Article, options?: PlatformSpecificOptions): Promise<PublishResult>;
  delete(postId: string): Promise<PublishResult>;
  validateCredentials(): Promise<boolean>;
}
