/**
 * RSS-based news scrapers for the web app
 * Uses rss-parser to fetch and parse RSS feeds
 */
import Parser from 'rss-parser';
import type { StoryResult } from '@/types/research';

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
}

const parser = new Parser();

// === Source Score Multipliers ===
// Normalizes engagement scores across sources with different data availability
// Sources with real engagement data (hackernews, lobsters) use 1.0 baseline
// RSS sources with estimated scores get boosted to compete fairly
export const SOURCE_SCORE_MULTIPLIERS: Record<string, number> = {
  hackernews: 1.0,    // Real data - baseline
  lobsters: 1.0,      // Real data - baseline
  reuters: 2.5,       // RSS estimated - boosted
  apnews: 2.5,        // RSS estimated - boosted
  bbc: 2.0,           // RSS estimated - boosted
  guardian: 2.0,      // RSS estimated - boosted
  npr: 2.0,           // RSS estimated - boosted
  techcrunch: 1.5,    // RSS estimated - moderate boost
  producthunt: 1.5,   // RSS estimated - moderate boost
};

// === Score Estimation Config ===
// Configuration for estimating engagement on RSS sources without real metrics
export const RSS_ESTIMATION_CONFIG = {
  MAX_SCORE: 300,      // Maximum estimated score for fresh content
  MIN_SCORE: 100,      // Minimum score floor
  DECAY_RATE: 15,      // Points lost per hour of age
} as const;

export const PRODUCTHUNT_ESTIMATION_CONFIG = {
  MAX_SCORE: 500,      // Higher max for Product Hunt (new launches get visibility)
  MIN_SCORE: 50,       // Lower floor acceptable
  DECAY_RATE: 20,      // Faster decay (products get stale quicker)
} as const;

// Keywords that indicate breaking/urgent news (boost engagement estimate)
const BREAKING_NEWS_KEYWORDS = [
  'breaking', 'urgent', 'exclusive', 'developing', 'just in',
  'update', 'alert', 'confirmed', 'official',
];

/**
 * Check if title contains breaking news indicators
 * Returns multiplier (1.0 = normal, 1.3 = breaking)
 */
function getBreakingNewsBoost(title: string): number {
  const titleLower = title.toLowerCase();
  const isBreaking = BREAKING_NEWS_KEYWORDS.some(keyword => titleLower.includes(keyword));
  return isBreaking ? 1.3 : 1.0;
}

/**
 * Estimate engagement score for RSS content
 * Uses age-based decay with breaking news boost
 */
export function estimateScore(
  ageHours: number,
  title: string,
  config: { MAX_SCORE: number; MIN_SCORE: number; DECAY_RATE: number } = RSS_ESTIMATION_CONFIG
): number {
  const breakingBoost = getBreakingNewsBoost(title);
  const decayedScore = config.MAX_SCORE - Math.floor(ageHours * config.DECAY_RATE);
  return Math.floor(Math.max(config.MIN_SCORE, decayedScore) * breakingBoost);
}

/**
 * Simple hash function for deterministic pseudo-random values
 * Used to generate consistent estimated comments based on story URL/title
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Estimate comment count deterministically based on story identifier
 * Uses hash to ensure same story always gets same estimate
 */
function estimateComments(identifier: string, range: number = 80, min: number = 20): number {
  const hash = simpleHash(identifier);
  return (hash % range) + min;
}

function extractKeywords(title: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'says', 'after', 'over',
  ]);

  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5);
}

/**
 * Calculate base engagement velocity
 * Formula: (score + comments*2) / ageHours
 * Uses minimum age of 0.1 hours to prevent division issues
 */
export function calculateVelocity(score: number, comments: number, ageHours: number): number {
  return (score + comments * 2) / Math.max(ageHours, 0.1);
}

/**
 * Calculate weighted engagement velocity with source multiplier
 * Normalizes scores across sources with different data availability
 *
 * @param score - Engagement score (real or estimated)
 * @param comments - Comment count (real or estimated)
 * @param ageHours - Age of story in hours
 * @param sourceId - Source identifier for multiplier lookup
 * @returns Weighted velocity value
 */
export function calculateWeightedVelocity(
  score: number,
  comments: number,
  ageHours: number,
  sourceId: string
): number {
  const baseVelocity = calculateVelocity(score, comments, ageHours);
  const multiplier = SOURCE_SCORE_MULTIPLIERS[sourceId] ?? 1.0;
  return baseVelocity * multiplier;
}

// === HackerNews (Algolia API) ===
export async function scanHackerNews(limit: number = 20, hoursBack: number = 24, minPoints: number = 50): Promise<StoryResult[]> {
  const now = Math.floor(Date.now() / 1000);
  const cutoffTime = now - (hoursBack * 60 * 60);

  const url = `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=points>${minPoints},created_at_i>${cutoffTime}&hitsPerPage=${limit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('HN API failed');

  const data = await response.json();

  return data.hits.map((hit: { objectID: string; title: string; url?: string; points: number; num_comments: number; created_at_i: number; story_text?: string }) => {
    const createdAt = new Date(hit.created_at_i * 1000);
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    const velocity = calculateWeightedVelocity(hit.points, hit.num_comments, ageHours, 'hackernews');

    return {
      id: `hn-${hit.objectID}`,
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      contentSnippet: hit.story_text || '',
      publishedAt: createdAt.toISOString(),
      score: hit.points,
      commentCount: hit.num_comments,
      engagementVelocity: velocity,
      keywords: extractKeywords(hit.title),
      topics: ['technology'],
      sourceId: 'hackernews',
      sourceName: 'HackerNews',
      detectedAt: new Date().toISOString(),
      status: 'flagged' as const,
    };
  });
}

// === Lobsters (JSON API) ===
export async function scanLobsters(limit: number = 20): Promise<StoryResult[]> {
  const response = await fetch('https://lobste.rs/hottest.json');
  if (!response.ok) throw new Error('Lobsters API failed');

  const stories = await response.json();

  return stories.slice(0, limit).map((story: { short_id: string; title: string; url?: string; short_id_url: string; description?: string; created_at: string; score: number; comment_count: number; tags?: string[] }) => {
    const createdAt = new Date(story.created_at);
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    const velocity = calculateWeightedVelocity(story.score, story.comment_count, ageHours, 'lobsters');

    return {
      id: `lobsters-${story.short_id}`,
      title: story.title,
      url: story.url || story.short_id_url,
      contentSnippet: story.description || '',
      publishedAt: createdAt.toISOString(),
      score: story.score,
      commentCount: story.comment_count,
      engagementVelocity: velocity,
      keywords: story.tags || [],
      topics: ['technology'],
      sourceId: 'lobsters',
      sourceName: 'Lobsters',
      detectedAt: new Date().toISOString(),
      status: 'flagged' as const,
    };
  });
}

// === RSS Feed Scanner (generic) ===
export async function scanRSSFeed(
  feedUrl: string,
  sourceId: string,
  sourceName: string,
  limit: number,
  topic: string
): Promise<StoryResult[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const stories: StoryResult[] = [];
    const timestamp = Date.now();

    const items = feed.items.slice(0, limit);
    for (let index = 0; index < items.length; index++) {
      const rssItem = items[index] as RSSItem;
      const publishedAt = new Date(rssItem.pubDate || Date.now());
      const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

      // Estimate engagement for RSS sources (no real metrics available)
      // Uses config constants, breaking news boost, and deterministic comments
      const score = estimateScore(ageHours, rssItem.title, RSS_ESTIMATION_CONFIG);
      const comments = estimateComments(rssItem.link || rssItem.title);
      // Use weighted velocity to normalize scores across sources
      const velocity = calculateWeightedVelocity(score, comments, ageHours, sourceId);

      stories.push({
        // Include index to prevent ID collisions in tight loops
        id: `${sourceId}-${timestamp}-${index}`,
        title: rssItem.title,
        url: rssItem.link,
        contentSnippet: rssItem.contentSnippet || '',
        publishedAt: publishedAt.toISOString(),
        score,
        commentCount: comments,
        engagementVelocity: velocity,
        keywords: extractKeywords(rssItem.title),
        topics: [topic],
        sourceId,
        sourceName,
        detectedAt: new Date().toISOString(),
        status: 'flagged' as const,
      });
    }

    return stories;
  } catch (error) {
    console.error(`[${sourceName}] RSS fetch failed:`, error);
    return [];
  }
}

// === AP News (using Google News RSS - AP removed direct RSS) ===
export async function scanAPNews(limit: number = 20): Promise<StoryResult[]> {
  const feedUrl = 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en';
  return scanRSSFeed(feedUrl, 'apnews', 'AP News', limit, 'news');
}

// === Reuters (using Google News RSS as proxy - Reuters removed direct RSS) ===
export async function scanReuters(limit: number = 20): Promise<StoryResult[]> {
  // Reuters discontinued their public RSS feeds, use Google News search instead
  const feedUrl = 'https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en';
  return scanRSSFeed(feedUrl, 'reuters', 'Reuters', limit, 'news');
}

// === BBC News ===
const BBC_FEEDS: Record<string, string> = {
  topstories: 'http://feeds.bbci.co.uk/news/rss.xml',
  world: 'http://feeds.bbci.co.uk/news/world/rss.xml',
  us: 'http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
};

export async function scanBBC(limit: number = 20): Promise<StoryResult[]> {
  const allStories: StoryResult[] = [];
  const perCategory = Math.ceil(limit / 2);

  for (const [topic, feedUrl] of Object.entries(BBC_FEEDS).slice(0, 2)) {
    const stories = await scanRSSFeed(feedUrl, 'bbc', 'BBC News', perCategory, topic);
    allStories.push(...stories);
    await new Promise(r => setTimeout(r, 500));
  }

  return allStories;
}

// === NPR ===
const NPR_FEEDS: Record<string, string> = {
  news: 'https://feeds.npr.org/1001/rss.xml',
  politics: 'https://feeds.npr.org/1014/rss.xml',
  usnews: 'https://feeds.npr.org/1003/rss.xml',
};

export async function scanNPR(limit: number = 20): Promise<StoryResult[]> {
  const allStories: StoryResult[] = [];
  const perCategory = Math.ceil(limit / 2);

  for (const [topic, feedUrl] of Object.entries(NPR_FEEDS).slice(0, 2)) {
    const stories = await scanRSSFeed(feedUrl, 'npr', 'NPR', perCategory, topic);
    allStories.push(...stories);
    await new Promise(r => setTimeout(r, 500));
  }

  return allStories;
}

// === The Guardian ===
export async function scanGuardian(limit: number = 20): Promise<StoryResult[]> {
  return scanRSSFeed('https://www.theguardian.com/world/rss', 'guardian', 'The Guardian', limit, 'world');
}

// === TechCrunch ===
export async function scanTechCrunch(limit: number = 20): Promise<StoryResult[]> {
  return scanRSSFeed('https://techcrunch.com/feed/', 'techcrunch', 'TechCrunch', limit, 'technology');
}

// === Product Hunt ===
/**
 * Scans Product Hunt for trending products using their public RSS feed.
 * Product Hunt's API requires OAuth, so we use the public RSS feed instead.
 *
 * @param limit - Maximum number of stories to return (default: 20)
 * @returns Promise<StoryResult[]> - Array of Product Hunt posts mapped to StoryResult format
 *
 * @example
 * const products = await scanProductHunt(10);
 * console.log(products[0].title); // "Cool New App - The best thing since sliced bread"
 */
export async function scanProductHunt(limit: number = 20): Promise<StoryResult[]> {
  // Product Hunt RSS feed for today's products
  const feedUrl = 'https://www.producthunt.com/feed';

  try {
    const feed = await parser.parseURL(feedUrl);
    const stories: StoryResult[] = [];
    const timestamp = Date.now();

    const items = feed.items.slice(0, limit);
    for (let index = 0; index < items.length; index++) {
      const rssItem = items[index] as RSSItem;
      const publishedAt = new Date(rssItem.pubDate || Date.now());
      const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

      // Product Hunt uses different estimation config (higher scores, faster decay)
      // Uses config constants, breaking news boost, and deterministic comments
      const score = estimateScore(ageHours, rssItem.title, PRODUCTHUNT_ESTIMATION_CONFIG);
      const comments = estimateComments(rssItem.link || rssItem.title, 50, 10);
      // Use weighted velocity to normalize scores across sources
      const velocity = calculateWeightedVelocity(score, comments, ageHours, 'producthunt');

      stories.push({
        // Include index to prevent ID collisions in tight loops
        id: `producthunt-${timestamp}-${index}`,
        title: rssItem.title,
        url: rssItem.link,
        contentSnippet: rssItem.contentSnippet || '',
        publishedAt: publishedAt.toISOString(),
        score,
        commentCount: comments,
        engagementVelocity: velocity,
        keywords: extractKeywords(rssItem.title),
        topics: ['products', 'startups', 'technology'],
        sourceId: 'producthunt',
        sourceName: 'Product Hunt',
        detectedAt: new Date().toISOString(),
        status: 'flagged' as const,
      });
    }

    return stories;
  } catch (error) {
    console.error('[Product Hunt] RSS fetch failed:', error);
    return [];
  }
}
