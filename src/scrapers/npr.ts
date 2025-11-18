/**
 * @fileoverview NPR scraper (NO API KEY REQUIRED)
 * @description Scrapes NPR using RSS feeds
 */

import Parser from 'rss-parser';
import type { StoryResult } from '../types.js';

interface NPRRSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
}

interface NPRScraperConfig {
  categories: string[];
  maxStoriesPerCategory: number;
}

export class NPRScraper {
  private parser: Parser<unknown, NPRRSSItem>;
  private config: NPRScraperConfig;

  private readonly feedUrls: Record<string, string> = {
    news: 'https://feeds.npr.org/1001/rss.xml',
    politics: 'https://feeds.npr.org/1014/rss.xml',
    business: 'https://feeds.npr.org/1006/rss.xml',
    technology: 'https://feeds.npr.org/1019/rss.xml',
    health: 'https://feeds.npr.org/1128/rss.xml',
    science: 'https://feeds.npr.org/1007/rss.xml',
    usnews: 'https://feeds.npr.org/1003/rss.xml',
  };

  constructor(config: Partial<NPRScraperConfig> = {}) {
    this.parser = new Parser();
    this.config = {
      categories: config.categories ?? ['news', 'politics'],
      maxStoriesPerCategory: config.maxStoriesPerCategory ?? 15,
    };
  }

  private extractKeywords(title: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from',
    ]);

    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    return [...new Set(words)];
  }

  private async scrapeCategory(category: string): Promise<StoryResult[]> {
    try {
      const feedUrl = this.feedUrls[category];
      if (!feedUrl) {
        console.warn(`[NPR] Unknown category: ${category}`);
        return [];
      }

      const feed = await this.parser.parseURL(feedUrl);
      const stories: StoryResult[] = [];

      for (const item of feed.items.slice(0, this.config.maxStoriesPerCategory)) {
        const rssItem = item as NPRRSSItem;
        const publishedAt = new Date(rssItem.pubDate);
        const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

        const estimatedScore = Math.max(100, 400 - Math.floor(ageHours * 20));
        const estimatedComments = Math.floor(Math.random() * 120) + 25;

        const velocity = (estimatedScore + estimatedComments * 2) / Math.max(ageHours, 0.1);

        stories.push({
          id: `npr-${category}-${Date.now()}-${Math.random()}`,
          title: rssItem.title,
          url: rssItem.link,
          contentSnippet: rssItem.contentSnippet || '',
          publishedAt,
          score: estimatedScore,
          commentCount: estimatedComments,
          engagementVelocity: velocity,
          keywords: this.extractKeywords(rssItem.title),
          topics: [category],
          media: [],
          sourceId: 'npr',
          sourceName: 'NPR',
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      return stories;

    } catch (error) {
      console.error(`[NPR] Failed to scrape ${category}:`, error);
      return [];
    }
  }

  public async scrape(): Promise<StoryResult[]> {
    console.log(`[NPR] Scraping ${this.config.categories.length} categories...`);

    const allStories: StoryResult[] = [];

    for (const category of this.config.categories) {
      const stories = await this.scrapeCategory(category);
      allStories.push(...stories);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[NPR] Found ${allStories.length} stories`);
    return allStories;
  }
}

export function createNPRScraper(config?: Partial<NPRScraperConfig>): NPRScraper {
  return new NPRScraper(config);
}
