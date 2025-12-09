/**
 * Research Scan API
 * POST /api/research/scan - Scan sources for trending stories
 *
 * Supports both explicit source list and DB-backed sources
 */
import { NextRequest, NextResponse } from 'next/server';
import type { ScanOptions, ScanResult, StoryResult } from '@/types/research';
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

export async function POST(request: NextRequest) {
  try {
    const body: ScanOptions = await request.json();
    const { sources, limit = 20, hoursBack = 24, minScore = 50 } = body;

    const allStories: StoryResult[] = [];
    const errors: string[] = [];

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
          stories = await scanner(limit, hoursBack, minScore);
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
                limit,
                dbSource.category
              );
              stories.push(...feedStories);
            }
          } else {
            console.log(`Source ${sourceSlug} not supported`);
          }
        }

        allStories.push(...stories);
        console.log(`[${sourceSlug}] Found ${stories.length} stories`);

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[${sourceSlug}] Scrape failed:`, message);
        errors.push(`${sourceSlug}: ${message}`);
      }
    }

    // Sort by engagement velocity
    allStories.sort((a, b) => b.engagementVelocity - a.engagementVelocity);

    const result: ScanResult = {
      stories: allStories.slice(0, limit * sourcesToScan.length),
      sources: sourcesToScan,
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
