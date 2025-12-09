/**
 * News Sources Management Types
 */

export type SourceCategory = 'tech' | 'news' | 'business' | 'science' | 'custom';
export type SourceType = 'api' | 'rss' | 'scraper';

export interface NewsSource {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  category: SourceCategory;
  source_type: SourceType;
  config: SourceConfig;
  is_system: boolean;
  is_enabled: boolean;
  last_scanned_at: string | null;
  last_error: string | null;
  error_count: number;
  stories_found: number;
  avg_engagement: number;
  created_at: string;
  updated_at: string;
}

// Config types for different source types
export interface APISourceConfig {
  endpoint: 'algolia' | 'json';
  baseUrl: string;
}

export interface RSSSourceConfig {
  url?: string;
  urls?: string[];
  proxy?: 'google-news';
}

export interface ScraperSourceConfig {
  urls: string[];
  selectors: Record<string, string>;
}

export type SourceConfig = APISourceConfig | RSSSourceConfig | ScraperSourceConfig | Record<string, unknown>;

// API request/response types
export interface CreateSourceRequest {
  name: string;
  slug?: string;
  icon?: string;
  category: SourceCategory;
  source_type: SourceType;
  config: SourceConfig;
}

export interface UpdateSourceRequest {
  name?: string;
  icon?: string;
  category?: SourceCategory;
  config?: SourceConfig;
  is_enabled?: boolean;
}

export interface SourcesResponse {
  sources: NewsSource[];
  system: NewsSource[];
  custom: NewsSource[];
}

export interface SourceResponse {
  source: NewsSource;
}

// Demo/fallback data for when Supabase is not configured
export const DEFAULT_SOURCES: NewsSource[] = [
  {
    id: 'demo-hn',
    slug: 'hackernews',
    name: 'Hacker News',
    icon: '🟠',
    category: 'tech',
    source_type: 'api',
    config: { endpoint: 'algolia', baseUrl: 'https://hn.algolia.com/api/v1' },
    is_system: true,
    is_enabled: true,
    last_scanned_at: null,
    last_error: null,
    error_count: 0,
    stories_found: 0,
    avg_engagement: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-lobsters',
    slug: 'lobsters',
    name: 'Lobsters',
    icon: '🦞',
    category: 'tech',
    source_type: 'api',
    config: { endpoint: 'json', baseUrl: 'https://lobste.rs' },
    is_system: true,
    is_enabled: true,
    last_scanned_at: null,
    last_error: null,
    error_count: 0,
    stories_found: 0,
    avg_engagement: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-guardian',
    slug: 'guardian',
    name: 'The Guardian',
    icon: '📰',
    category: 'news',
    source_type: 'rss',
    config: { url: 'https://www.theguardian.com/world/rss' },
    is_system: true,
    is_enabled: true,
    last_scanned_at: null,
    last_error: null,
    error_count: 0,
    stories_found: 0,
    avg_engagement: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-bbc',
    slug: 'bbc',
    name: 'BBC News',
    icon: '📺',
    category: 'news',
    source_type: 'rss',
    config: { urls: ['https://feeds.bbci.co.uk/news/rss.xml'] },
    is_system: true,
    is_enabled: false,
    last_scanned_at: null,
    last_error: null,
    error_count: 0,
    stories_found: 0,
    avg_engagement: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-techcrunch',
    slug: 'techcrunch',
    name: 'TechCrunch',
    icon: '💻',
    category: 'tech',
    source_type: 'rss',
    config: { url: 'https://techcrunch.com/feed/' },
    is_system: true,
    is_enabled: false,
    last_scanned_at: null,
    last_error: null,
    error_count: 0,
    stories_found: 0,
    avg_engagement: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// RSS preset suggestions for adding new feeds
export const RSS_PRESETS = [
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'tech' as const, icon: '🔬' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech' as const, icon: '⚡' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech' as const, icon: '🔌' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'tech' as const, icon: '🎓' },
  { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/', category: 'news' as const, icon: '📡' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'news' as const, icon: '🎙️' },
] as const;
