/**
 * Research Scan API
 * POST /api/research/scan - Scan sources for trending stories
 *
 * Supports:
 * - Explicit source list or DB-backed sources
 * - Keyword filtering for related article discovery
 * - Time-based filtering with fallback suggestions
 */
import { NextRequest, NextResponse } from 'next/server';
import type { ScanResult, StoryResult } from '@/types/research';
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

// Extended scan options with keyword support
interface ExtendedScanOptions {
  sources?: string[];
  limit?: number;
  hoursBack?: number;
  minScore?: number;
  keywords?: string[];        // Filter results by these keywords
  requireKeywordMatch?: boolean; // If true, only return articles matching keywords
}

// Map of source slugs to scanner functions
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

// Check if a story matches any of the keywords
function storyMatchesKeywords(story: StoryResult, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return true;

  const normalizedKeywords = keywords.map(k => k.toLowerCase());
  const titleLower = story.title.toLowerCase();
  const snippetLower = (story.contentSnippet || '').toLowerCase();
  const storyKeywords = story.keywords.map(k => k.toLowerCase());

  // Check if any keyword matches title, snippet, or extracted keywords
  return normalizedKeywords.some(keyword =>
    titleLower.includes(keyword) ||
    snippetLower.includes(keyword) ||
    storyKeywords.some(sk => sk.includes(keyword) || keyword.includes(sk))
  );
}

// Calculate relevance score for sorting
function calculateRelevanceScore(story: StoryResult, keywords: string[]): number {
  if (!keywords || keywords.length === 0) return story.engagementVelocity;

  const normalizedKeywords = keywords.map(k => k.toLowerCase());
  const titleLower = story.title.toLowerCase();
  const storyKeywords = story.keywords.map(k => k.toLowerCase());

  let relevance = 0;

  for (const keyword of normalizedKeywords) {
    // Title match is most valuable
    if (titleLower.includes(keyword)) relevance += 10;
    // Keyword match is good
    if (storyKeywords.some(sk => sk.includes(keyword))) relevance += 5;
  }

  // Combine relevance with engagement velocity
  return relevance * 100 + story.engagementVelocity;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendedScanOptions = await request.json();
    const {
      sources,
      limit = 20,
      hoursBack = 24,
      minScore = 50,
      keywords = [],
      requireKeywordMatch = false,
    } = body;

    const allStories: StoryResult[] = [];
    const errors: string[] = [];
    const sourceResults: Record<string, { found: number; matched: number }> = {};

    // If sources not specified, use enabled sources from DB
    let sourcesToScan = sources;
    if (!sourcesToScan || sourcesToScan.length === 0) {
      const enabledSources = await getEnabledSources();
      sourcesToScan = enabledSources.map(s => s.slug);
    }

    // Get DB sources for RSS feed URLs
    const dbSources = await getEnabledSources();
    const dbSourceMap = new Map(dbSources.map(s => [s.slug, s]));

    // Scan each selected source
    for (const sourceSlug of sourcesToScan) {
      try {
        let stories: StoryResult[] = [];

        // Check if we have a dedicated scanner
        const scanner = SCANNER_MAP[sourceSlug];
        if (scanner) {
          stories = await scanner(limit * 2, hoursBack, minScore); // Fetch more to filter
        } else {
          // Try to use RSS scanner with DB config
          const dbSource = dbSourceMap.get(sourceSlug);
          if (dbSource && dbSource.source_type === 'rss') {
            const feedUrls = getSourceFeedUrls(dbSource);
            for (const feedUrl of feedUrls) {
              const feedStories = await scanRSSFeed(
                feedUrl,
                dbSource.slug,
                dbSource.name,
                limit * 2,
                dbSource.category
              );
              stories.push(...feedStories);
            }
          } else {
            console.log(`Source ${sourceSlug} not supported`);
          }
        }

        // Track source results before filtering
        const foundCount = stories.length;

        // Filter by keywords if provided and required
        if (keywords.length > 0 && requireKeywordMatch) {
          stories = stories.filter(s => storyMatchesKeywords(s, keywords));
        }

        sourceResults[sourceSlug] = {
          found: foundCount,
          matched: stories.length,
        };

        allStories.push(...stories);
        console.log(`[${sourceSlug}] Found ${foundCount}, matched ${stories.length} stories`);

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[${sourceSlug}] Scrape failed:`, message);
        errors.push(`${sourceSlug}: ${message}`);
      }
    }

    // Sort by relevance (keyword matches) then engagement
    if (keywords.length > 0) {
      allStories.sort((a, b) =>
        calculateRelevanceScore(b, keywords) - calculateRelevanceScore(a, keywords)
      );
    } else {
      allStories.sort((a, b) => b.engagementVelocity - a.engagementVelocity);
    }

    // Check if we found related articles
    const hasRelatedArticles = keywords.length === 0 ||
      allStories.some(s => storyMatchesKeywords(s, keywords));

    // Find sources that might have related content (had matches)
    const sourcesWithMatches = Object.entries(sourceResults)
      .filter(([_, r]) => r.matched > 0)
      .map(([slug]) => slug);

    // Suggest other sources if current ones had no matches
    const allSourceSlugs = Object.keys(SCANNER_MAP);
    const suggestedSources = keywords.length > 0 && !hasRelatedArticles
      ? allSourceSlugs.filter(s => !sourcesToScan?.includes(s))
      : [];

    const result: ScanResult & {
      sourceResults?: Record<string, { found: number; matched: number }>;
      suggestedSources?: string[];
      keywords?: string[];
    } = {
      stories: allStories.slice(0, limit * sourcesToScan.length),
      sources: sourcesToScan,
      scanTime: new Date().toISOString(),
      totalFound: allStories.length,
      sourceResults,
      suggestedSources,
      keywords,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
