/**
 * News Sources Management Types
 */

export type SourceCategory = 'tech' | 'news' | 'business' | 'science' | 'custom';
export type SourceType = 'api' | 'rss' | 'scraper';
export type SourceTier = 'premium' | 'quality' | 'community';

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

// === Source Library ===
// Curated collection of news sources organized by quality tier

export interface SourcePreset {
  slug: string;
  name: string;
  icon: string;
  category: SourceCategory;
  source_type: SourceType;
  config: SourceConfig;
  tier: SourceTier;
  description: string;
  tags: string[];
}

export const SOURCE_LIBRARY: SourcePreset[] = [
  // === PREMIUM TIER (real-time engagement data) ===
  {
    slug: 'hackernews',
    name: 'Hacker News',
    icon: '🟠',
    category: 'tech',
    source_type: 'api',
    config: { endpoint: 'algolia', baseUrl: 'https://hn.algolia.com/api/v1' },
    tier: 'premium',
    description: 'Tech community with real engagement metrics',
    tags: ['startups', 'programming', 'tech-news'],
  },
  {
    slug: 'lobsters',
    name: 'Lobsters',
    icon: '🦞',
    category: 'tech',
    source_type: 'api',
    config: { endpoint: 'json', baseUrl: 'https://lobste.rs' },
    tier: 'premium',
    description: 'Curated tech community, high signal-to-noise',
    tags: ['programming', 'systems', 'security'],
  },

  // === QUALITY TIER (reliable RSS feeds) ===
  // News
  {
    slug: 'guardian',
    name: 'The Guardian',
    icon: '📰',
    category: 'news',
    source_type: 'rss',
    config: { url: 'https://www.theguardian.com/world/rss' },
    tier: 'quality',
    description: 'International news coverage',
    tags: ['world-news', 'politics', 'environment'],
  },
  {
    slug: 'bbc',
    name: 'BBC News',
    icon: '📺',
    category: 'news',
    source_type: 'rss',
    config: { urls: ['https://feeds.bbci.co.uk/news/rss.xml', 'https://feeds.bbci.co.uk/news/world/rss.xml'] },
    tier: 'quality',
    description: 'British Broadcasting Corporation world news',
    tags: ['world-news', 'uk', 'international'],
  },
  {
    slug: 'npr',
    name: 'NPR News',
    icon: '🎙️',
    category: 'news',
    source_type: 'rss',
    config: { urls: ['https://feeds.npr.org/1001/rss.xml'] },
    tier: 'quality',
    description: 'National Public Radio news',
    tags: ['us-news', 'politics', 'culture'],
  },
  {
    slug: 'reuters',
    name: 'Reuters',
    icon: '📡',
    category: 'news',
    source_type: 'rss',
    config: { url: 'https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en', proxy: 'google-news' },
    tier: 'quality',
    description: 'International wire service (via Google News)',
    tags: ['world-news', 'business', 'finance'],
  },
  {
    slug: 'apnews',
    name: 'AP News',
    icon: '🗞️',
    category: 'news',
    source_type: 'rss',
    config: { url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en', proxy: 'google-news' },
    tier: 'quality',
    description: 'Associated Press (via Google News)',
    tags: ['breaking-news', 'us-news', 'world'],
  },

  // Tech
  {
    slug: 'techcrunch',
    name: 'TechCrunch',
    icon: '💻',
    category: 'tech',
    source_type: 'rss',
    config: { url: 'https://techcrunch.com/feed/' },
    tier: 'quality',
    description: 'Startup and tech industry news',
    tags: ['startups', 'venture-capital', 'tech-business'],
  },
  {
    slug: 'arstechnica',
    name: 'Ars Technica',
    icon: '🔬',
    category: 'tech',
    source_type: 'rss',
    config: { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
    tier: 'quality',
    description: 'In-depth tech analysis and reviews',
    tags: ['technology', 'science', 'gaming'],
  },
  {
    slug: 'theverge',
    name: 'The Verge',
    icon: '⚡',
    category: 'tech',
    source_type: 'rss',
    config: { url: 'https://www.theverge.com/rss/index.xml' },
    tier: 'quality',
    description: 'Tech, science, art, and culture',
    tags: ['consumer-tech', 'gadgets', 'culture'],
  },
  {
    slug: 'wired',
    name: 'Wired',
    icon: '🔌',
    category: 'tech',
    source_type: 'rss',
    config: { url: 'https://www.wired.com/feed/rss' },
    tier: 'quality',
    description: 'Technology and its impact on culture',
    tags: ['technology', 'culture', 'science'],
  },

  // Science
  {
    slug: 'mit-tech-review',
    name: 'MIT Tech Review',
    icon: '🎓',
    category: 'science',
    source_type: 'rss',
    config: { url: 'https://www.technologyreview.com/feed/' },
    tier: 'quality',
    description: 'Emerging technology from MIT',
    tags: ['research', 'ai', 'biotech'],
  },
  {
    slug: 'nature',
    name: 'Nature News',
    icon: '🧬',
    category: 'science',
    source_type: 'rss',
    config: { url: 'https://www.nature.com/nature.rss' },
    tier: 'quality',
    description: 'Scientific research and discoveries',
    tags: ['science', 'research', 'academic'],
  },
  {
    slug: 'science-daily',
    name: 'Science Daily',
    icon: '🔭',
    category: 'science',
    source_type: 'rss',
    config: { url: 'https://www.sciencedaily.com/rss/all.xml' },
    tier: 'quality',
    description: 'Breaking science news',
    tags: ['science', 'research', 'discoveries'],
  },

  // Business
  {
    slug: 'economist',
    name: 'The Economist',
    icon: '📊',
    category: 'business',
    source_type: 'rss',
    config: { url: 'https://www.economist.com/rss/the-economist-explains.xml' },
    tier: 'quality',
    description: 'Global economics and politics',
    tags: ['economics', 'politics', 'analysis'],
  },
  {
    slug: 'bloomberg',
    name: 'Bloomberg',
    icon: '💹',
    category: 'business',
    source_type: 'rss',
    config: { url: 'https://news.google.com/rss/search?q=site:bloomberg.com&hl=en-US&gl=US&ceid=US:en', proxy: 'google-news' },
    tier: 'quality',
    description: 'Business and financial news (via Google News)',
    tags: ['finance', 'markets', 'business'],
  },
  {
    slug: 'ft',
    name: 'Financial Times',
    icon: '📈',
    category: 'business',
    source_type: 'rss',
    config: { url: 'https://news.google.com/rss/search?q=site:ft.com&hl=en-US&gl=US&ceid=US:en', proxy: 'google-news' },
    tier: 'quality',
    description: 'Financial news and analysis (via Google News)',
    tags: ['finance', 'markets', 'international'],
  },
];

// === Helper Functions ===

/** Get sources by quality tier */
export function getSourcesByTier(tier: SourceTier): SourcePreset[] {
  return SOURCE_LIBRARY.filter(s => s.tier === tier);
}

/** Get sources by category */
export function getSourcesByCategory(category: SourceCategory): SourcePreset[] {
  return SOURCE_LIBRARY.filter(s => s.category === category);
}

/** Search sources by tag */
export function searchSourcesByTag(tag: string): SourcePreset[] {
  return SOURCE_LIBRARY.filter(s => s.tags.includes(tag));
}

/** Get all unique tags from source library */
export function getAllSourceTags(): string[] {
  const tags = new Set<string>();
  SOURCE_LIBRARY.forEach(s => s.tags.forEach(t => tags.add(t)));
  return Array.from(tags).sort();
}

/** Find a source preset by slug */
export function findSourceBySlug(slug: string): SourcePreset | undefined {
  return SOURCE_LIBRARY.find(s => s.slug === slug);
}

/** Convert a SourcePreset to a NewsSource (for enabling) */
export function presetToNewsSource(preset: SourcePreset, enabled: boolean = true): NewsSource {
  return {
    id: `lib-${preset.slug}`,
    slug: preset.slug,
    name: preset.name,
    icon: preset.icon,
    category: preset.category,
    source_type: preset.source_type,
    config: preset.config,
    is_system: preset.tier === 'premium',
    is_enabled: enabled,
    last_scanned_at: null,
    last_error: null,
    error_count: 0,
    stories_found: 0,
    avg_engagement: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
