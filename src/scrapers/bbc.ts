/**
 * @fileoverview BBC News scraper (NO API KEY REQUIRED)
 * @description Scrapes BBC News using RSS feeds
 */

import Parser from 'rss-parser';
import type { StoryResult } from '../types.js';

interface BBCRSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
}

interface BBCScraperConfig {
  categories: string[];
  maxStoriesPerCategory: number;
}

export class BBCScraper {
  private parser: Parser<unknown, BBCRSSItem>;
  private config: BBCScraperConfig;

  private readonly feedUrls: Record<string, string> = {
    topstories: 'http://feeds.bbci.co.uk/news/rss.xml',
    world: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    us: 'http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
    uk: 'http://feeds.bbci.co.uk/news/uk/rss.xml',
    business: 'http://feeds.bbci.co.uk/news/business/rss.xml',
    politics: 'http://feeds.bbci.co.uk/news/politics/rss.xml',
    health: 'http://feeds.bbci.co.uk/news/health/rss.xml',
    technology: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
    science: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  };

  constructor(config: Partial<BBCScraperConfig> = {}) {
    this.parser = new Parser();
    this.config = {
      categories: config.categories ?? ['topstories', 'world', 'us'],
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
        console.warn(`[BBC] Unknown category: ${category}`);
        return [];
      }

      const feed = await this.parser.parseURL(feedUrl);
      const stories: StoryResult[] = [];

      for (const item of feed.items.slice(0, this.config.maxStoriesPerCategory)) {
        const rssItem = item as BBCRSSItem;
        const publishedAt = new Date(rssItem.pubDate);
        const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        
        const estimatedScore = Math.max(150, 400 - Math.floor(ageHours * 20));
        const estimatedComments = Math.floor(Math.random() * 150) + 30;
        
        const velocity = (estimatedScore + estimatedComments * 2) / Math.max(ageHours, 0.1);

        stories.push({
          id: `bbc-${category}-${Date.now()}-${Math.random()}`,
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
          sourceId: 'bbc',
          sourceName: 'BBC News',
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      return stories;

    } catch (error) {
      console.error(`[BBC] Failed to scrape ${category}:`, error);
      return [];
    }
  }

  public async scrape(): Promise<StoryResult[]> {
    console.log(`[BBC] Scraping ${this.config.categories.length} categories...`);
    
    const allStories: StoryResult[] = [];

    for (const category of this.config.categories) {
      const stories = await this.scrapeCategory(category);
      allStories.push(...stories);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[BBC] Found ${allStories.length} stories`);
    return allStories;
  }
}

export function createBBCScraper(config?: Partial<BBCScraperConfig>): BBCScraper {
  return new BBCScraper(config);
}
