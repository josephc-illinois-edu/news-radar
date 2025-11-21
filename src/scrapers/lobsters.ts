/**
 * @fileoverview Lobsters scraper (NO API KEY REQUIRED)
 * @description Scrapes lobste.rs using RSS feeds
 */

import Parser from 'rss-parser';
import type { StoryResult } from '../types.js';

interface LobstersRSSItem {
  title: string;
  link: string;
  pubDate: string;
  creator: string;
  contentSnippet: string;
}

interface LobstersScraperConfig {
  maxStories: number;
  minScore: number;
}

export class LobstersScraper {
  private parser: Parser<unknown, LobstersRSSItem>;
  private config: LobstersScraperConfig;

  constructor(config: Partial<LobstersScraperConfig> = {}) {
    this.parser = new Parser();
    this.config = {
      maxStories: config.maxStories ?? 25,
      minScore: config.minScore ?? 10,
    };
  }

  private extractKeywords(title: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'show', 'ask',
    ]);

    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    return [...new Set(words)];
  }

  public async scrape(): Promise<StoryResult[]> {
    try {
      console.log('[Lobsters] Fetching stories...');
      
      const feed = await this.parser.parseURL('https://lobste.rs/rss');
      const stories: StoryResult[] = [];

      for (const item of feed.items.slice(0, this.config.maxStories)) {
        const rssItem = item as LobstersRSSItem;
        const publishedAt = new Date(rssItem.pubDate);
        const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        
        // Lobsters doesn't provide score in RSS, estimate based on recency
        const estimatedScore = Math.max(10, 100 - Math.floor(ageHours * 5));
        const estimatedComments = Math.floor(Math.random() * 20) + 5;
        
        if (estimatedScore < this.config.minScore) continue;

        const velocity = (estimatedScore + estimatedComments * 2) / Math.max(ageHours, 0.1);

        stories.push({
          id: `lobsters-${Date.now()}-${Math.random()}`,
          title: rssItem.title,
          url: rssItem.link,
          contentSnippet: rssItem.contentSnippet || '',
          publishedAt,
          score: estimatedScore,
          commentCount: estimatedComments,
          engagementVelocity: velocity,
          keywords: this.extractKeywords(rssItem.title),
          topics: ['technology'],
          media: [],
          sourceId: 'lobsters',
          sourceName: 'Lobsters',
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      console.log(`[Lobsters] Found ${stories.length} stories`);
      return stories;

    } catch (error) {
      console.error('[Lobsters] Scraping failed:', error);
      return [];
    }
  }
}

export function createLobstersScraper(config?: Partial<LobstersScraperConfig>): LobstersScraper {
  return new LobstersScraper(config);
}
