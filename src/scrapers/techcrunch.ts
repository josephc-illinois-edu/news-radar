/**
 * @fileoverview TechCrunch scraper (NO API KEY REQUIRED)
 * @description Scrapes TechCrunch using RSS feeds
 */

import Parser from 'rss-parser';
import type { StoryResult, MediaAttachment } from '../types.js';

interface TechCrunchRSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  content: string;
  enclosure?: {
    url: string;
    type: string;
  };
}

interface TechCrunchScraperConfig {
  maxStories: number;
  minScore: number;
}

export class TechCrunchScraper {
  private parser: Parser<unknown, TechCrunchRSSItem>;
  private config: TechCrunchScraperConfig;

  constructor(config: Partial<TechCrunchScraperConfig> = {}) {
    this.parser = new Parser({
      customFields: {
        item: ['enclosure'],
      },
    });
    this.config = {
      maxStories: config.maxStories ?? 20,
      minScore: config.minScore ?? 20,
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

  private extractMedia(item: TechCrunchRSSItem): MediaAttachment[] {
    const media: MediaAttachment[] = [];

    if (item.enclosure && item.enclosure.type.startsWith('image/')) {
      media.push({
        id: `tc-image-${Date.now()}`,
        type: 'image',
        url: item.enclosure.url,
        altText: `Featured image for: ${item.title}`,
        author: 'TechCrunch',
        source: 'TechCrunch',
        sourceUrl: 'https://techcrunch.com',
        license: 'fair-use',
      });
    }

    return media;
  }

  public async scrape(): Promise<StoryResult[]> {
    try {
      console.log('[TechCrunch] Fetching stories...');
      
      const feed = await this.parser.parseURL('https://techcrunch.com/feed/');
      const stories: StoryResult[] = [];

      for (const item of feed.items.slice(0, this.config.maxStories)) {
        const rssItem = item as TechCrunchRSSItem;
        const publishedAt = new Date(rssItem.pubDate);
        const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
        
        const estimatedScore = Math.max(50, 300 - Math.floor(ageHours * 15));
        const estimatedComments = Math.floor(Math.random() * 80) + 15;
        
        if (estimatedScore < this.config.minScore) continue;

        const velocity = (estimatedScore + estimatedComments * 2) / Math.max(ageHours, 0.1);

        stories.push({
          id: `techcrunch-${Date.now()}-${Math.random()}`,
          title: rssItem.title,
          url: rssItem.link,
          contentSnippet: rssItem.contentSnippet || '',
          publishedAt,
          score: estimatedScore,
          commentCount: estimatedComments,
          engagementVelocity: velocity,
          keywords: this.extractKeywords(rssItem.title),
          topics: ['technology', 'startups'],
          media: this.extractMedia(rssItem),
          sourceId: 'techcrunch',
          sourceName: 'TechCrunch',
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      console.log(`[TechCrunch] Found ${stories.length} stories`);
      return stories;

    } catch (error) {
      console.error('[TechCrunch] Scraping failed:', error);
      return [];
    }
  }
}

export function createTechCrunchScraper(config?: Partial<TechCrunchScraperConfig>): TechCrunchScraper {
  return new TechCrunchScraper(config);
}
