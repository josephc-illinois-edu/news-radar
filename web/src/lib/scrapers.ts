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

function calculateVelocity(score: number, comments: number, ageHours: number): number {
  return (score + comments * 2) / Math.max(ageHours, 0.1);
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
    const velocity = calculateVelocity(hit.points, hit.num_comments, ageHours);

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
    const velocity = calculateVelocity(story.score, story.comment_count, ageHours);

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

    for (const item of feed.items.slice(0, limit)) {
      const rssItem = item as RSSItem;
      const publishedAt = new Date(rssItem.pubDate || Date.now());
      const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

      // Estimate engagement for RSS sources (no real metrics available)
      const estimatedScore = Math.max(100, 300 - Math.floor(ageHours * 15));
      const estimatedComments = Math.floor(Math.random() * 80) + 20;
      const velocity = calculateVelocity(estimatedScore, estimatedComments, ageHours);

      stories.push({
        id: `${sourceId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: rssItem.title,
        url: rssItem.link,
        contentSnippet: rssItem.contentSnippet || '',
        publishedAt: publishedAt.toISOString(),
        score: estimatedScore,
        commentCount: estimatedComments,
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
