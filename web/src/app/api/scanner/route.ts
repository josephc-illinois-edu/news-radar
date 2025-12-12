/**
 * Scanner API
 * GET /api/scanner - Get scanner dashboard data (performs initial scan or returns cached)
 * POST /api/scanner - Run a scan with custom options
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
import {
  scanHackerNews,
  scanLobsters,
  scanAPNews,
  scanReuters,
  scanBBC,
  scanGuardian,
  scanNPR,
  scanTechCrunch,
  scanRSSFeed,
} from '@/lib/scrapers';
import { getEnabledSources, getSourceFeedUrls } from '@/lib/sources';

// === Scanner Map (shared pattern with research/scan) ===

const SCANNER_MAP: Record<string, (limit: number, hoursBack?: number, minScore?: number) => Promise<StoryResult[]>> = {
  hackernews: scanHackerNews,
  lobsters: scanLobsters,
  apnews: scanAPNews,
  reuters: scanReuters,
  bbc: scanBBC,
  guardian: scanGuardian,
  npr: scanNPR,
  techcrunch: scanTechCrunch,
};

// === Topic Extraction ===

function extractTopics(stories: StoryResult[], totalSources: number = 3): TrendingTopic[] {
  const topicMap = new Map<string, TopicCandidate>();

  for (const story of stories) {
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
      const score = calculateTrendingScore(
        t.mentionCount,
        t.sourceIds.size,
        t.avgVelocity,
        totalSources
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

function calculateTrendingScore(
  mentionCount: number,
  sourceCount: number,
  avgVelocity: number,
  totalSources: number
): { total: number; components: { frequency: number; sourceSpread: number; velocity: number; aiPrediction: number } } {
  const frequency = Math.min(25, (mentionCount / 10) * 25);
  const sourceSpread = (sourceCount / Math.max(totalSources, 1)) * 25;
  const velocity = Math.min(25, (avgVelocity / 500) * 25);
  const aiPrediction = 0;

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

// === Unified Scan Function ===

async function scanSources(request: ScanRequest): Promise<ScanResponse> {
  const { sources, hoursBack = 24, limit = 20 } = request;

  // Get enabled sources from DB if not specified
  let sourcesToScan = sources;
  if (!sourcesToScan || sourcesToScan.length === 0) {
    const enabledSources = await getEnabledSources();
    sourcesToScan = enabledSources.map(s => s.slug);
  }

  // Get DB sources for RSS feed URLs
  const dbSources = await getEnabledSources();
  const dbSourceMap = new Map(dbSources.map(s => [s.slug, s]));

  const allStories: StoryResult[] = [];
  const sourceStats: SourceStat[] = [];
  const errors: string[] = [];

  // Scan each source
  for (const sourceSlug of sourcesToScan) {
    try {
      let stories: StoryResult[] = [];

      // Check for dedicated scanner
      const scanner = SCANNER_MAP[sourceSlug];
      if (scanner) {
        stories = await scanner(limit, hoursBack);
      } else {
        // Try RSS scanner with DB config
        const dbSource = dbSourceMap.get(sourceSlug);
        if (dbSource && dbSource.source_type === 'rss') {
          const feedUrls = getSourceFeedUrls(dbSource);
          for (const feedUrl of feedUrls) {
            const feedStories = await scanRSSFeed(
              feedUrl,
              dbSource.slug,
              dbSource.name,
              limit,
              dbSource.category
            );
            stories.push(...feedStories);
          }
        } else {
          console.log(`[Scanner] Source ${sourceSlug} not supported`);
        }
      }

      allStories.push(...stories);

      const dbSource = dbSourceMap.get(sourceSlug);
      sourceStats.push({
        sourceId: sourceSlug,
        sourceName: dbSource?.name || sourceSlug,
        storiesFound: stories.length,
        avgEngagement: stories.length > 0
          ? stories.reduce((sum, s) => sum + s.engagementVelocity, 0) / stories.length
          : 0,
        lastSuccess: new Date().toISOString(),
        errorCount: 0,
      });

      console.log(`[Scanner] ${sourceSlug}: ${stories.length} stories`);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Scanner] ${sourceSlug} failed:`, message);
      errors.push(`${sourceSlug}: ${message}`);

      const dbSource = dbSourceMap.get(sourceSlug);
      sourceStats.push({
        sourceId: sourceSlug,
        sourceName: dbSource?.name || sourceSlug,
        storiesFound: 0,
        avgEngagement: 0,
        lastError: message,
        errorCount: 1,
      });
    }
  }

  // Sort by engagement velocity
  allStories.sort((a, b) => b.engagementVelocity - a.engagementVelocity);

  // Extract trending topics
  const topics = extractTopics(allStories, sourcesToScan.length);

  return {
    stories: allStories,
    topics,
    sourceStats,
    scanTime: new Date().toISOString(),
    totalFound: allStories.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// === In-memory cache for scan results ===

let cachedScanResult: ScanResponse | null = null;
let lastScanTime: string | null = null;

// === Dashboard Generation ===

async function generateDashboard(): Promise<ScannerDashboard> {
  // If we have cached scan results, use them
  if (cachedScanResult && lastScanTime) {
    return {
      lastScanTime,
      totalStoriesScanned: cachedScanResult.totalFound,
      trendingTopics: cachedScanResult.topics,
      topStories: cachedScanResult.stories.slice(0, 20),
      sourceStats: cachedScanResult.sourceStats,
      recentScans: [
        {
          id: `scan-${Date.now()}`,
          timestamp: lastScanTime,
          sourcesScanned: cachedScanResult.sourceStats.map(s => s.sourceId),
          storiesFound: cachedScanResult.totalFound,
          newTopics: cachedScanResult.topics.length,
          durationMs: 0,
        },
      ],
    };
  }

  // No cached results - perform initial scan
  console.log('[Scanner] No cached results, performing initial scan...');
  const initialScan = await scanSources({ hoursBack: 24, limit: 20 });
  cachedScanResult = initialScan;
  lastScanTime = initialScan.scanTime;

  return {
    lastScanTime: initialScan.scanTime,
    totalStoriesScanned: initialScan.totalFound,
    trendingTopics: initialScan.topics,
    topStories: initialScan.stories.slice(0, 20),
    sourceStats: initialScan.sourceStats,
    recentScans: [
      {
        id: `scan-${Date.now()}`,
        timestamp: initialScan.scanTime,
        sourcesScanned: initialScan.sourceStats.map(s => s.sourceId),
        storiesFound: initialScan.totalFound,
        newTopics: initialScan.topics.length,
        durationMs: 0,
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
    console.log('[Scanner] POST scan with config:', body);

    const result = await scanSources(body);

    // Update cache with new scan results
    cachedScanResult = result;
    lastScanTime = result.scanTime;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Scanner POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
