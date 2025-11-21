/**
 * @fileoverview Reuters scraper (NO API KEY REQUIRED)
 * @description Scrapes Reuters using RSS feeds
 */

import Parser from 'rss-parser';
import type { StoryResult } from '../types.js';

interface ReutersRSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  categories?: string[];
}

interface ReutersScraperConfig {
  categories: string[];
  maxStoriesPerCategory: number;
}

export class ReutersScraper {
  private parser: Parser<unknown, ReutersRSSItem>;
  private config: ReutersScraperConfig;

  // Reuters RSS feeds by category
  private readonly feedUrls: Record<string, string> = {
    world: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best',
    business: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
    technology: 'https://www.reutersagency.com/feed/?best-topics=tech&post_type=best',
    politics: 'https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best',
  };

  constructor(config: Partial<ReutersScraperConfig> = {}) {
    this.parser = new Parser();
    this.config = {
      categories: config.categories ?? ['world', 'politics'],
      maxStoriesPerCategory: config.maxStoriesPerCategory ?? 15,
    };
  }

  private extractKeywords(title: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'says', 'after',
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
        console.warn(`[Reuters] Unknown category: ${category}`);
        return [];
      }

      const feed = await this.parser.parseURL(feedUrl);
      const stories: StoryResult[] = [];

      for (const item of feed.items.slice(0, this.config.maxStoriesPerCategory)) {
        const rssItem = item as ReutersRSSItem;
        const publishedAt = new Date(rssItem.pubDate);
        const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        
        const estimatedScore = Math.max(100, 300 - Math.floor(ageHours * 15));
        const estimatedComments = Math.floor(Math.random() * 100) + 20;
        
        const velocity = (estimatedScore + estimatedComments * 2) / Math.max(ageHours, 0.1);

        stories.push({
          id: `reuters-${category}-${Date.now()}-${Math.random()}`,
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
          sourceId: 'reuters',
          sourceName: 'Reuters',
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      return stories;

    } catch (error) {
      console.error(`[Reuters] Failed to scrape ${category}:`, error);
      return [];
    }
  }

  public async scrape(): Promise<StoryResult[]> {
    console.log(`[Reuters] Scraping ${this.config.categories.length} categories...`);
    
    const allStories: StoryResult[] = [];

    for (const category of this.config.categories) {
      const stories = await this.scrapeCategory(category);
      allStories.push(...stories);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[Reuters] Found ${allStories.length} stories`);
    return allStories;
  }
}

export function createReutersScraper(config?: Partial<ReutersScraperConfig>): ReutersScraper {
  return new ReutersScraper(config);
}
