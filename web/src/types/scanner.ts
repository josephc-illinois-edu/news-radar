/**
 * Scanner and Trending Analysis types
 */

import type { StoryResult } from './research';

// === RSS Feed Management ===

export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  enabled: boolean;
  lastScanned?: string;
  errorCount: number;
  userId?: string;
  createdAt: string;
}

export type FeedCategory = 'tech' | 'news' | 'business' | 'science' | 'custom';

// === Trending Topics ===

export interface TrendingTopic {
  id: string;
  name: string;
  slug: string;
  frequency: number;
  sourceCount: number;
  firstSeen: string;
  lastSeen: string;
  trendScore: number;
  velocityScore: number;
  aiPredictionScore: number;
  aiPredictionReason?: string;
  relatedStories: string[];
  relatedKeywords: string[];
  peakHour?: number;
}

export interface TrendingScore {
  total: number;
  components: {
    frequency: number;      // 0-25 points
    sourceSpread: number;   // 0-25 points
    velocity: number;       // 0-25 points
    aiPrediction: number;   // 0-25 points
  };
}

export interface TopicCandidate {
  name: string;
  normalizedName: string;
  mentionCount: number;
  sourceIds: Set<string>;
  storyIds: string[];
  firstSeen: string;
  lastSeen: string;
  avgVelocity: number;
}

// === Scanner Configuration ===

export interface ScannerConfig {
  sources: string[];
  customFeeds: string[];
  scanInterval: number;
  hoursBack: number;
  minEngagementScore: number;
  enableAIPrediction: boolean;
  maxStoriesPerSource: number;
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  sources: ['hackernews', 'lobsters', 'guardian'],
  customFeeds: [],
  scanInterval: 30,
  hoursBack: 24,
  minEngagementScore: 10,
  enableAIPrediction: true,
  maxStoriesPerSource: 20,
};

// === Scanner Dashboard ===

export interface ScannerDashboard {
  lastScanTime: string;
  totalStoriesScanned: number;
  trendingTopics: TrendingTopic[];
  topStories: StoryResult[];
  sourceStats: SourceStat[];
  recentScans: ScanHistory[];
}

export interface SourceStat {
  sourceId: string;
  sourceName: string;
  storiesFound: number;
  avgEngagement: number;
  lastSuccess?: string;
  lastError?: string;
  errorCount: number;
}

export interface ScanHistory {
  id: string;
  timestamp: string;
  sourcesScanned: string[];
  storiesFound: number;
  newTopics: number;
  durationMs: number;
  errors?: string[];
}

// === AI Prediction ===

export interface AITrendPrediction {
  topicId: string;
  score: number;
  confidence: number;
  reason: string;
  timeframe: string;
  suggestedAngles: string[];
}

export interface PredictRequest {
  topics: TrendingTopic[];
  stories: StoryResult[];
}

export interface PredictResponse {
  predictions: AITrendPrediction[];
  source: 'ai' | 'fallback';
}

// === API Request/Response Types ===

export interface ScanRequest {
  sources?: string[];
  customFeeds?: string[];
  hoursBack?: number;
  limit?: number;
}

export interface ScanResponse {
  stories: StoryResult[];
  topics: TrendingTopic[];
  sourceStats: SourceStat[];
  scanTime: string;
  totalFound: number;
  errors?: string[];
}

export interface AddFeedRequest {
  name: string;
  url: string;
  category: FeedCategory;
}

export interface ValidateFeedResponse {
  valid: boolean;
  title?: string;
  itemCount?: number;
  error?: string;
}

// NOTE: RSS presets have been consolidated into SOURCE_LIBRARY in src/types/sources.ts
// Use getSourcesByTier('quality') or getSourcesByCategory() to access them

// === Trending Score Calculation ===

export const TRENDING_WEIGHTS = {
  frequency: 25,
  sourceSpread: 25,
  velocity: 25,
  aiPrediction: 25,
} as const;

export function calculateTrendingScore(
  mentionCount: number,
  sourceCount: number,
  avgVelocity: number,
  totalSources: number,
  aiScore: number = 0
): TrendingScore {
  // Frequency: more mentions = higher score (cap at 25)
  const frequency = Math.min(TRENDING_WEIGHTS.frequency, (mentionCount / 10) * TRENDING_WEIGHTS.frequency);

  // Source spread: coverage across sources (cap at 25)
  const sourceSpread = (sourceCount / Math.max(totalSources, 1)) * TRENDING_WEIGHTS.sourceSpread;

  // Velocity: engagement growth rate (normalize to 0-25, assuming max ~500)
  const velocity = Math.min(TRENDING_WEIGHTS.velocity, (avgVelocity / 500) * TRENDING_WEIGHTS.velocity);

  // AI prediction: passed in from prediction endpoint
  const aiPrediction = Math.min(TRENDING_WEIGHTS.aiPrediction, (aiScore / 100) * TRENDING_WEIGHTS.aiPrediction);

  return {
    total: Math.round(frequency + sourceSpread + velocity + aiPrediction),
    components: {
      frequency: Math.round(frequency),
      sourceSpread: Math.round(sourceSpread),
      velocity: Math.round(velocity),
      aiPrediction: Math.round(aiPrediction),
    },
  };
}
