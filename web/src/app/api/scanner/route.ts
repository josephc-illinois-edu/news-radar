/**
 * Scanner API
 * GET /api/scanner - Get scanner dashboard data
 * POST /api/scanner - Run a scan with options
 */
import { NextRequest, NextResponse } from 'next/server';
import type { StoryResult } from '@/types/research';
import type {
  ScannerDashboard,
  ScanRequest,
  ScanResponse,
  TrendingTopic,
  SourceStat,
  TopicCandidate,
} from '@/types/scanner';
import { getEnabledSources, getSourceFeedUrls } from '@/lib/sources';
import type { NewsSource } from '@/types/sources';

// === Source Scanners (reused from research/scan) ===

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
      status: 'flagged' as const,
    };
  });
}

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
      status: 'flagged' as const,
    };
  });
}


// === RSS Parsing ===

function parseRSS(xml: string, limit: number): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const itemXml = match[1];
    const title = extractXmlContent(itemXml, 'title');
    const link = extractXmlContent(itemXml, 'link');
    const description = extractXmlContent(itemXml, 'description');
    const pubDate = extractXmlContent(itemXml, 'pubDate');

    items.push({
      title: cleanCDATA(title),
      link,
      description: cleanCDATA(description).replace(/<[^>]+>/g, '').slice(0, 300),
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
  }

  return items;
}

function extractXmlContent(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}><![CDATA[(.*?)]]></${tag}>`, 's');
  const simpleRegex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');

  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1];

  const simpleMatch = xml.match(simpleRegex);
  return simpleMatch ? simpleMatch[1] : '';
}

function cleanCDATA(text: string): string {
  return text.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function extractKeywords(title: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'it', 'its']);
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 8);
}

// === Topic Extraction ===

function extractTopics(stories: StoryResult[], totalSources: number = 3): TrendingTopic[] {
  const topicMap = new Map<string, TopicCandidate>();

  for (const story of stories) {
    // Extract from keywords
    for (const keyword of story.keywords) {
      const normalized = keyword.toLowerCase().trim();
      if (normalized.length < 3) continue;

      const existing = topicMap.get(normalized);
      if (existing) {
        existing.mentionCount++;
        existing.sourceIds.add(story.sourceId);
        existing.storyIds.push(story.id);
        existing.lastSeen = story.publishedAt;
        existing.avgVelocity = (existing.avgVelocity + story.engagementVelocity) / 2;
      } else {
        topicMap.set(normalized, {
          name: keyword,
          normalizedName: normalized,
          mentionCount: 1,
          sourceIds: new Set([story.sourceId]),
          storyIds: [story.id],
          firstSeen: story.publishedAt,
          lastSeen: story.publishedAt,
          avgVelocity: story.engagementVelocity,
        });
      }
    }
  }

  return Array.from(topicMap.values())
    .filter(t => t.mentionCount >= 2)
    .map(t => {
      const score = calculateTrendingScoreInternal(
        t.mentionCount,
        t.sourceIds.size,
        t.avgVelocity,
        totalSources,
        0 // AI score added later
      );

      return {
        id: `topic-${t.normalizedName}-${Date.now()}`,
        name: t.name,
        slug: t.normalizedName.replace(/\s+/g, '-'),
        frequency: t.mentionCount,
        sourceCount: t.sourceIds.size,
        firstSeen: t.firstSeen,
        lastSeen: t.lastSeen,
        trendScore: score.total,
        velocityScore: score.components.velocity,
        aiPredictionScore: 0,
        aiPredictionReason: undefined,
        relatedStories: t.storyIds,
        relatedKeywords: [],
        peakHour: undefined,
      };
    })
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 20);
}

function calculateTrendingScoreInternal(
  mentionCount: number,
  sourceCount: number,
  avgVelocity: number,
  totalSources: number,
  aiScore: number = 0
): { total: number; components: { frequency: number; sourceSpread: number; velocity: number; aiPrediction: number } } {
  const frequency = Math.min(25, (mentionCount / 10) * 25);
  const sourceSpread = (sourceCount / Math.max(totalSources, 1)) * 25;
  const velocity = Math.min(25, (avgVelocity / 500) * 25);
  const aiPrediction = Math.min(25, (aiScore / 100) * 25);

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

// === Scan Sources from DB ===

async function scanSourcesFromDB(request: ScanRequest): Promise<ScanResponse> {
  const { hoursBack = 24, limit = 20 } = request;

  // Get enabled sources from database
  const enabledSources = await getEnabledSources();

  const allStories: StoryResult[] = [];
  const sourceStats: SourceStat[] = [];
  const errors: string[] = [];

  // Scan each enabled source
  for (const source of enabledSources) {
    try {
      let stories: StoryResult[] = [];

      // Handle different source types
      if (source.source_type === 'api') {
        switch (source.slug) {
          case 'hackernews':
            stories = await scanHackerNews(limit, hoursBack);
            break;
          case 'lobsters':
            stories = await scanLobsters(limit);
            break;
          default:
            console.log(`API source ${source.slug} not implemented`);
        }
      } else if (source.source_type === 'rss') {
        const feedUrls = getSourceFeedUrls(source);
        for (const feedUrl of feedUrls) {
          const feedStories = await scanRSSFeedWithMeta(feedUrl, source.slug, source.name, limit);
          stories.push(...feedStories);
        }
      }

      allStories.push(...stories);

      sourceStats.push({
        sourceId: source.slug,
        sourceName: source.name,
        storiesFound: stories.length,
        avgEngagement: stories.reduce((sum, s) => sum + s.engagementVelocity, 0) / Math.max(stories.length, 1),
        lastSuccess: new Date().toISOString(),
        errorCount: 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${source.name}: ${message}`);

      sourceStats.push({
        sourceId: source.slug,
        sourceName: source.name,
        storiesFound: 0,
        avgEngagement: 0,
        lastError: message,
        errorCount: 1,
      });
    }
  }

  // Sort stories by engagement velocity
  allStories.sort((a, b) => b.engagementVelocity - a.engagementVelocity);

  // Extract trending topics
  const topics = extractTopics(allStories, enabledSources.length);

  return {
    stories: allStories,
    topics,
    sourceStats,
    scanTime: new Date().toISOString(),
    totalFound: allStories.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// RSS feed scanner with metadata
async function scanRSSFeedWithMeta(
  feedUrl: string,
  sourceId: string,
  sourceName: string,
  limit: number = 20
): Promise<StoryResult[]> {
  try {
    const response = await fetch(feedUrl);
    if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);

    const text = await response.text();
    const items = parseRSS(text, limit);

    return items.map((item, i) => ({
      id: `${sourceId}-${i}-${Date.now()}`,
      title: item.title,
      url: item.link,
      contentSnippet: item.description,
      publishedAt: item.pubDate,
      score: 0,
      commentCount: 0,
      engagementVelocity: 0,
      keywords: extractKeywords(item.title),
      topics: ['news'],
      sourceId,
      sourceName,
      detectedAt: new Date().toISOString(),
      status: 'flagged' as const,
    }));
  } catch (error) {
    console.error(`RSS scan failed for ${feedUrl}:`, error);
    return [];
  }
}

// === Demo Dashboard (uses enabled sources from DB) ===

async function generateDashboard(): Promise<ScannerDashboard> {
  const now = new Date();
  const enabledSources = await getEnabledSources();

  return {
    lastScanTime: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    totalStoriesScanned: 127,
    trendingTopics: [
      {
        id: 'topic-ai-demo',
        name: 'artificial intelligence',
        slug: 'artificial-intelligence',
        frequency: 23,
        sourceCount: 4,
        firstSeen: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        lastSeen: now.toISOString(),
        trendScore: 78,
        velocityScore: 18,
        aiPredictionScore: 22,
        aiPredictionReason: 'High cross-source coverage with accelerating engagement',
        relatedStories: ['hn-1', 'hn-2', 'lobsters-1'],
        relatedKeywords: ['machine learning', 'gpt', 'llm'],
        peakHour: 14,
      },
      {
        id: 'topic-climate-demo',
        name: 'climate change',
        slug: 'climate-change',
        frequency: 15,
        sourceCount: 3,
        firstSeen: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
        lastSeen: now.toISOString(),
        trendScore: 62,
        velocityScore: 14,
        aiPredictionScore: 18,
        aiPredictionReason: 'Recurring topic with policy implications',
        relatedStories: ['guardian-1', 'guardian-2'],
        relatedKeywords: ['environment', 'carbon', 'renewable'],
        peakHour: 10,
      },
    ],
    topStories: [
      {
        id: 'demo-hn-1',
        title: 'OpenAI Announces New Model with Improved Reasoning',
        url: 'https://example.com/openai-new-model',
        contentSnippet: 'OpenAI has released a new AI model that demonstrates significant improvements in logical reasoning...',
        publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        score: 856,
        commentCount: 423,
        engagementVelocity: 285,
        keywords: ['openai', 'artificial', 'intelligence', 'reasoning'],
        topics: ['technology'],
        sourceId: 'hackernews',
        sourceName: 'Hacker News',
        detectedAt: now.toISOString(),
        status: 'flagged',
      },
    ],
    // Generate stats from enabled sources
    sourceStats: enabledSources.map(source => ({
      sourceId: source.slug,
      sourceName: source.name,
      storiesFound: Math.floor(Math.random() * 50) + 10,
      avgEngagement: source.source_type === 'api' ? Math.random() * 100 : 0,
      lastSuccess: now.toISOString(),
      errorCount: 0,
    })),
    recentScans: [
      {
        id: 'scan-1',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        sourcesScanned: enabledSources.map(s => s.slug),
        storiesFound: 127,
        newTopics: 3,
        durationMs: 2340,
      },
    ],
  };
}

// === API Handlers ===

export async function GET() {
  try {
    const dashboard = await generateDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Scanner GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get scanner data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json();
    const result = await scanSourcesFromDB(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Scanner POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
