/**
 * Research/Scan types for the web app
 */

export interface StoryResult {
  id: string;
  title: string;
  url: string;
  contentSnippet: string;
  publishedAt: string;
  score: number;
  commentCount: number;
  engagementVelocity: number;
  keywords: string[];
  topics: string[];
  sourceId: string;
  sourceName: string;
  detectedAt: string;
  status: 'flagged' | 'reviewed' | 'dismissed';
}

export interface ScanOptions {
  sources: string[];
  limit?: number;
  hoursBack?: number;
  minScore?: number;
}

export interface ScanResult {
  stories: StoryResult[];
  sources: string[];
  scanTime: string;
  totalFound: number;
}

export const AVAILABLE_SOURCES = [
  { id: 'hackernews', name: 'HackerNews', icon: 'Y', category: 'tech' },
  { id: 'lobsters', name: 'Lobsters', icon: '🦞', category: 'tech' },
  { id: 'guardian', name: 'The Guardian', icon: '📰', category: 'news' },
  { id: 'bbc', name: 'BBC News', icon: '📺', category: 'news' },
  { id: 'reuters', name: 'Reuters', icon: '📡', category: 'news' },
  { id: 'apnews', name: 'AP News', icon: '📻', category: 'news' },
  { id: 'npr', name: 'NPR', icon: '🎙️', category: 'news' },
  { id: 'techcrunch', name: 'TechCrunch', icon: '💻', category: 'tech' },
] as const;

export type SourceId = typeof AVAILABLE_SOURCES[number]['id'];
