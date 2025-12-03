/**
 * Analytics types
 */

import type { PublishPlatform } from './publish';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';
export type MetricType = 'views' | 'engagement' | 'clicks' | 'shares';

export interface AnalyticsOverview {
  totalArticles: number;
  totalPublished: number;
  totalViews: number;
  totalEngagements: number;
  avgReadTime: number;
  topPlatform: PublishPlatform;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface PlatformMetrics {
  platform: PublishPlatform;
  posts: number;
  views: number;
  engagements: number;
  clicks: number;
  shares: number;
  engagementRate: number;
}

export interface ArticlePerformance {
  id: string;
  title: string;
  publishedAt: string;
  platform: PublishPlatform;
  views: number;
  engagements: number;
  clicks: number;
  shares: number;
  engagementRate: number;
}

export interface ContentAnalytics {
  byLength: Array<{ length: string; count: number; avgEngagement: number }>;
  byStyle: Array<{ style: string; count: number; avgEngagement: number }>;
  byTone: Array<{ tone: string; count: number; avgEngagement: number }>;
  bestPublishTime: Array<{ hour: number; avgEngagement: number }>;
}

export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  timeSeries: {
    views: TimeSeriesDataPoint[];
    engagements: TimeSeriesDataPoint[];
    articles: TimeSeriesDataPoint[];
  };
  platformMetrics: PlatformMetrics[];
  topArticles: ArticlePerformance[];
  contentAnalytics: ContentAnalytics;
}

export interface AnalyticsFilters {
  timeRange: TimeRange;
  platform?: PublishPlatform;
  articleId?: string;
}

export const TIME_RANGES: Record<TimeRange, { name: string; days: number }> = {
  '7d': { name: 'Last 7 days', days: 7 },
  '30d': { name: 'Last 30 days', days: 30 },
  '90d': { name: 'Last 90 days', days: 90 },
  '1y': { name: 'Last year', days: 365 },
  'all': { name: 'All time', days: -1 },
};
