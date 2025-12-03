/**
 * Research Scan API
 * POST /api/research/scan - Scan sources for trending stories
 *
 * Note: This is a simplified version that makes direct API calls.
 * For production, you'd want to call the CLI or shared service layer.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { ScanOptions, ScanResult, StoryResult } from '@/types/research';

// HackerNews Algolia API (no key required)
async function scanHackerNews(limit: number = 20, hoursBack: number = 24): Promise<StoryResult[]> {
  const now = Math.floor(Date.now() / 1000);
  const cutoffTime = now - (hoursBack * 60 * 60);

  const url = `https://hn.algolia.com/api/v1/search?` +
    `tags=story&` +
    `numericFilters=points>50,created_at_i>${cutoffTime}&` +
    `hitsPerPage=${limit}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('HN API failed');

  const data = await response.json();

  return data.hits.map((hit: any) => {
    const createdAt = new Date(hit.created_at_i * 1000);
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    const velocity = (hit.points + hit.num_comments * 2) / Math.max(ageHours, 0.1);

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
      status: 'flagged',
    };
  });
}

// Lobsters API (no key required)
async function scanLobsters(limit: number = 20): Promise<StoryResult[]> {
  const response = await fetch('https://lobste.rs/hottest.json');
  if (!response.ok) throw new Error('Lobsters API failed');

  const stories = await response.json();

  return stories.slice(0, limit).map((story: any) => {
    const createdAt = new Date(story.created_at);
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    const velocity = (story.score + story.comment_count * 2) / Math.max(ageHours, 0.1);

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
      status: 'flagged',
    };
  });
}

// Guardian RSS (simplified - no API key version)
async function scanGuardian(limit: number = 20): Promise<StoryResult[]> {
  // Use RSS feed as fallback (API key would be needed for full API)
  const response = await fetch('https://www.theguardian.com/world/rss');
  if (!response.ok) throw new Error('Guardian RSS failed');

  const text = await response.text();
  const items = parseRSS(text, limit);

  return items.map((item, i) => ({
    id: `guardian-${i}-${Date.now()}`,
    title: item.title,
    url: item.link,
    contentSnippet: item.description,
    publishedAt: item.pubDate,
    score: 0,
    commentCount: 0,
    engagementVelocity: 0,
    keywords: extractKeywords(item.title),
    topics: ['world', 'news'],
    sourceId: 'guardian',
    sourceName: 'The Guardian',
    detectedAt: new Date().toISOString(),
    status: 'flagged',
  }));
}

// Simple RSS parser
function parseRSS(xml: string, limit: number): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const itemXml = match[1];
    const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] || itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[1] || '';
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();

    items.push({
      title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
      link,
      description: description.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').slice(0, 200),
      pubDate: new Date(pubDate).toISOString(),
    });
  }

  return items;
}

function extractKeywords(title: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from']);
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanOptions = await request.json();
    const { sources = ['hackernews'], limit = 20, hoursBack = 24 } = body;

    const allStories: StoryResult[] = [];
    const errors: string[] = [];

    // Scan each selected source
    for (const source of sources) {
      try {
        let stories: StoryResult[] = [];

        switch (source) {
          case 'hackernews':
            stories = await scanHackerNews(limit, hoursBack);
            break;
          case 'lobsters':
            stories = await scanLobsters(limit);
            break;
          case 'guardian':
            stories = await scanGuardian(limit);
            break;
          // Add more sources as needed
          default:
            console.log(`Source ${source} not implemented yet`);
        }

        allStories.push(...stories);
      } catch (err) {
        errors.push(`${source}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Sort by engagement velocity
    allStories.sort((a, b) => b.engagementVelocity - a.engagementVelocity);

    const result: ScanResult = {
      stories: allStories.slice(0, limit * sources.length),
      sources,
      scanTime: new Date().toISOString(),
      totalFound: allStories.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
