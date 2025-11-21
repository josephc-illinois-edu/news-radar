/**
 * @fileoverview The Guardian scraper (NO API KEY REQUIRED)
 * @description Scrapes The Guardian using RSS feeds
 */

import Parser from 'rss-parser';
import type { StoryResult } from '../types.js';

interface GuardianRSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
}

interface GuardianScraperConfig {
  categories: string[];
  maxStoriesPerCategory: number;
}

export class GuardianScraper {
  private parser: Parser<unknown, GuardianRSSItem>;
  private config: GuardianScraperConfig;

  private readonly feedUrls: Record<string, string> = {
    world: 'https://www.theguardian.com/world/rss',
    us: 'https://www.theguardian.com/us-news/rss',
    uk: 'https://www.theguardian.com/uk-news/rss',
    politics: 'https://www.theguardian.com/politics/rss',
    business: 'https://www.theguardian.com/business/rss',
    technology: 'https://www.theguardian.com/technology/rss',
    science: 'https://www.theguardian.com/science/rss',
    environment: 'https://www.theguardian.com/environment/rss',
  };

  constructor(config: Partial<GuardianScraperConfig> = {}) {
    this.parser = new Parser();
    this.config = {
      categories: config.categories ?? ['world', 'us', 'politics'],
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
        console.warn(`[Guardian] Unknown category: ${category}`);
        return [];
      }

      const feed = await this.parser.parseURL(feedUrl);
      const stories: StoryResult[] = [];

      for (const item of feed.items.slice(0, this.config.maxStoriesPerCategory)) {
        const rssItem = item as GuardianRSSItem;
        const publishedAt = new Date(rssItem.pubDate);
        const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        
        const estimatedScore = Math.max(150, 500 - Math.floor(ageHours * 25));
        const estimatedComments = Math.floor(Math.random() * 200) + 40;
        
        const velocity = (estimatedScore + estimatedComments * 2) / Math.max(ageHours, 0.1);

        stories.push({
          id: `guardian-${category}-${Date.now()}-${Math.random()}`,
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
          sourceId: 'guardian',
          sourceName: 'The Guardian',
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      return stories;

    } catch (error) {
      console.error(`[Guardian] Failed to scrape ${category}:`, error);
      return [];
    }
  }

  public async scrape(): Promise<StoryResult[]> {
    console.log(`[Guardian] Scraping ${this.config.categories.length} categories...`);
    
    const allStories: StoryResult[] = [];

    for (const category of this.config.categories) {
      const stories = await this.scrapeCategory(category);
      allStories.push(...stories);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[Guardian] Found ${allStories.length} stories`);
    return allStories;
  }
}

export function createGuardianScraper(config?: Partial<GuardianScraperConfig>): GuardianScraper {
  return new GuardianScraper(config);
}
