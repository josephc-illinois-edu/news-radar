/**
 * @fileoverview Core type definitions for News Radar
 * @description Strict TypeScript types - NO 'any' types allowed
 */

/**
 * Source types for content retrieval
 */
export type SourceType = 'rss' | 'scraper' | 'api';

/**
 * Media types supported by the system
 */
export type MediaType = 'image' | 'video' | 'audio' | 'graph' | 'chart';

/**
 * Story curation status
 */
export type StoryStatus = 'flagged' | 'reviewing' | 'saved' | 'dismissed';

/**
 * License types for media attribution
 */
export type LicenseType = 
  | 'CC0' 
  | 'CC-BY' 
  | 'CC-BY-SA' 
  | 'CC-BY-ND' 
  | 'CC-BY-NC' 
  | 'CC-BY-NC-SA' 
  | 'CC-BY-NC-ND'
  | 'fair-use'
  | 'public-domain'
  | 'unknown';

/**
 * News source configuration
 */
export interface NewsSource {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  enabled: boolean;
  scanFrequencyMinutes: number;
}

/**
 * Media attachment with proper attribution
 */
export interface MediaAttachment {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  altText: string;
  caption?: string;
  
  // Attribution (required for fair use)
  author: string;
  authorUrl?: string;
  source: string;
  sourceUrl: string;
  license: LicenseType;
  licenseUrl?: string;
  
  // Metadata
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Scraped story result
 */
export interface StoryResult {
  id: string;
  title: string;
  url: string;
  contentSnippet: string;
  publishedAt: Date;
  
  // Engagement metrics
  score: number;
  commentCount: number;
  engagementVelocity: number;
  
  // Content analysis
  keywords: string[];
  topics: string[];
  
  // Media
  media: MediaAttachment[];
  
  // Source tracking
  sourceId: string;
  sourceName: string;
  
  // Metadata
  detectedAt: Date;
  status: StoryStatus;
}

/**
 * Scan configuration options
 */
export interface ScanOptions {
  sources?: string[];
  hours: number;
  minScore?: number;
  keywords?: string[];
  includeMedia?: boolean;
  maxResults?: number;
}

/**
 * Scan summary statistics
 */
export interface ScanSummary {
  totalScanned: number;
  storiesFlagged: number;
  anomaliesDetected: number;
  sourceBreakdown: Record<string, number>;
  topKeywords: string[];
  durationMs: number;
  mediaFound: number;
}

/**
 * Engagement velocity calculation result
 */
export interface VelocityMetrics {
  scorePerHour: number;
  commentsPerHour: number;
  totalEngagement: number;
  ageInHours: number;
  isAnomalous: boolean;
}

/**
 * YouTube video structure (from RSS)
 */
export interface YouTubeVideo {
  title: string;
  videoId: string;
  url: string;
  channelName: string;
  channelId: string;
  publishedAt: Date;
  thumbnailUrl: string;
  description: string;
}

/**
 * Unsplash photo structure (for free images)
 */
export interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
  description: string | null;
  alt_description: string | null;
}

/**
 * CLI display formatting options
 */
export interface DisplayOptions {
  showMedia: boolean;
  showEngagement: boolean;
  showKeywords: boolean;
  compact: boolean;
  maxStories: number;
}

/**
 * Error response structure
 */
export interface ScanError {
  source: string;
  message: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * Attribution text generator result
 */
export interface AttributionText {
  short: string;  // "Photo by John Doe on Unsplash"
  full: string;   // Full citation with links
  html: string;   // HTML formatted attribution
}

/**
 * Voice generator configuration
 */
export interface VoiceConfig {
  length: 'tweet' | 'short' | 'medium' | 'long';
  platform: 'facebook' | 'linkedin' | 'newsletter' | 'blog';
  style?: 'conversational' | 'academic';
  angle?: string;
  tone: {
    humor: number;
    urgency: number;
    optimism: number;
    criticism: number;
  };
  voiceInstructions?: string;
}

/**
 * Generated article structure
 */
export interface GeneratedArticle {
  title: string;
  content: string;
  wordCount: number;
  readingTimeMinutes: number;
  citations: string[];
  suggestedHashtags: string[];
  platform: string;
}