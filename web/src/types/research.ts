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
  keywords?: string[];          // Filter results by these keywords
  requireKeywordMatch?: boolean; // If true, only return articles matching keywords
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
  { id: 'producthunt', name: 'Product Hunt', icon: '🚀', category: 'tech' },
  { id: 'guardian', name: 'The Guardian', icon: '📰', category: 'news' },
  { id: 'bbc', name: 'BBC News', icon: '📺', category: 'news' },
  { id: 'reuters', name: 'Reuters', icon: '📡', category: 'news' },
  { id: 'apnews', name: 'AP News', icon: '📻', category: 'news' },
  { id: 'npr', name: 'NPR', icon: '🎙️', category: 'news' },
  { id: 'techcrunch', name: 'TechCrunch', icon: '💻', category: 'tech' },
] as const;

export type SourceId = typeof AVAILABLE_SOURCES[number]['id'];

// === Comparison Workspace Types ===

export interface ComparisonSession {
  id: string;
  userId?: string;
  articles: StoryResult[];
  notes: ComparisonNote[];
  aiAnalysis?: DiffAnalysis;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonNote {
  id: string;
  sessionId: string;
  articleId?: string;  // null = general note, set = article-specific
  content: string;
  highlightText?: string;
  position?: { x: number; y: number };
  createdAt: string;
}

export interface DiffAnalysis {
  id: string;
  sessionId: string;
  similarities: DiffPoint[];
  differences: DiffPoint[];
  keyThemes: string[];
  perspectiveAnalysis: PerspectiveInfo[];
  suggestedAngles: string[];
  createdAt: string;
}

export interface DiffPoint {
  type: 'fact' | 'claim' | 'quote' | 'statistic' | 'opinion';
  text: string;
  articles: string[];  // article IDs that contain this point
  confidence: number;  // 0-1 how confident AI is about this match
}

export interface PerspectiveInfo {
  articleId: string;
  perspective: string;  // e.g., "tech-optimistic", "skeptical", "neutral"
  tone: string;
  biasIndicators: string[];
}

export type ViewMode = 'side-by-side' | 'tabbed';

export interface ComparisonWorkspaceState {
  selectedArticles: StoryResult[];
  viewMode: ViewMode;
  notes: ComparisonNote[];
  aiAnalysis: DiffAnalysis | null;
  isAnalyzing: boolean;
}

// === Comparison API Types ===

export interface CompareRequest {
  articles: StoryResult[];
}

export interface CompareResponse {
  data: DiffAnalysis;
}

export interface AddNoteRequest {
  sessionId: string;
  articleId?: string;
  content: string;
  highlightText?: string;
}

export interface UpdateNoteRequest {
  noteId: string;
  content: string;
}
