/**
 * @fileoverview AP News scraper (NO API KEY REQUIRED)
 * @description Scrapes AP News using RSS feeds
 */

import Parser from 'rss-parser';
import type { StoryResult } from '../types.js';

interface APNewsRSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  categories?: string[];
}

interface APNewsScraperConfig {
  categories: string[];
  maxStoriesPerCategory: number;
}

export class APNewsScraper {
  private parser: Parser<unknown, APNewsRSSItem>;
  private config: APNewsScraperConfig;

  // AP News direct RSS was unreliable (rsshub.app), use Google News as proxy
  // Google News searches site:apnews.com and provides RSS feed of results
  private readonly feedUrls: Record<string, string> = {
    topnews: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en',
    politics: 'https://news.google.com/rss/search?q=site:apnews.com+politics&hl=en-US&gl=US&ceid=US:en',
    usnews: 'https://news.google.com/rss/search?q=site:apnews.com+us+news&hl=en-US&gl=US&ceid=US:en',
    world: 'https://news.google.com/rss/search?q=site:apnews.com+world&hl=en-US&gl=US&ceid=US:en',
    technology: 'https://news.google.com/rss/search?q=site:apnews.com+technology&hl=en-US&gl=US&ceid=US:en',
    health: 'https://news.google.com/rss/search?q=site:apnews.com+health&hl=en-US&gl=US&ceid=US:en',
  };

  constructor(config: Partial<APNewsScraperConfig> = {}) {
    this.parser = new Parser();
    this.config = {
      categories: config.categories ?? ['topnews', 'politics'],
      maxStoriesPerCategory: config.maxStoriesPerCategory ?? 15,
    };
  }

  private extractKeywords(title: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'says', 'after', 'over',
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
        console.warn(`[AP News] Unknown category: ${category}`);
        return [];
      }

      const feed = await this.parser.parseURL(feedUrl);
      const stories: StoryResult[] = [];

      for (const item of feed.items.slice(0, this.config.maxStoriesPerCategory)) {
        const rssItem = item as APNewsRSSItem;
        const publishedAt = new Date(rssItem.pubDate);
        const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        
        // Estimate engagement based on recency and category
        const baseScore = category === 'topnews' ? 200 : 100;
        const estimatedScore = Math.max(50, baseScore - Math.floor(ageHours * 10));
        const estimatedComments = Math.floor(Math.random() * 50) + 10;
        
        const velocity = (estimatedScore + estimatedComments * 2) / Math.max(ageHours, 0.1);

        stories.push({
          id: `apnews-${category}-${Date.now()}-${Math.random()}`,
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
          sourceId: 'apnews',
          sourceName: 'AP News',
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      return stories;

    } catch (error) {
      console.error(`[AP News] Failed to scrape ${category}:`, error);
      return [];
    }
  }

  public async scrape(): Promise<StoryResult[]> {
    console.log(`[AP News] Scraping ${this.config.categories.length} categories...`);
    
    const allStories: StoryResult[] = [];

    for (const category of this.config.categories) {
      const stories = await this.scrapeCategory(category);
      allStories.push(...stories);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[AP News] Found ${allStories.length} stories`);
    return allStories;
  }
}

export function createAPNewsScraper(config?: Partial<APNewsScraperConfig>): APNewsScraper {
  return new APNewsScraper(config);
}
