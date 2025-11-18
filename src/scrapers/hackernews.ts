/**
 * @fileoverview HackerNews scraper using Algolia API (NO API KEY)
 * @description Fast scraping using HN's public Algolia search API
 */

import type { StoryResult } from '../types.js';

/**
 * HN Algolia API response structure
 */
interface HNAlgoliaHit {
  objectID: string;
  title: string;
  url: string | null;
  author: string;
  points: number;
  num_comments: number;
  created_at_i: number;
  story_text: string | null;
  _tags: string[];
}

/**
 * HN Algolia search response
 */
interface HNAlgoliaResponse {
  hits: HNAlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
}

/**
 * Configuration for HackerNews scraper
 */
interface HNScraperConfig {
  maxStories: number;
  minPoints: number;
  hoursBack: number;
}

/**
 * HackerNews scraper using Algolia API
 */
export class HackerNewsScraper {
  private readonly algoliaUrl = 'https://hn.algolia.com/api/v1';
  private config: HNScraperConfig;

  /**
   * Initialize HN scraper
   * @param {Partial<HNScraperConfig>} config - Optional configuration
   */
  constructor(config: Partial<HNScraperConfig> = {}) {
    this.config = {
      maxStories: config.maxStories ?? 30,
      minPoints: config.minPoints ?? 50,
      hoursBack: config.hoursBack ?? 24,
    };
  }

  /**
   * Calculate engagement velocity
   * @param {number} points - Story points
   * @param {number} comments - Comment count
   * @param {number} ageHours - Story age in hours
   * @returns {number} Engagement velocity
   */
  private calculateVelocity(
    points: number,
    comments: number,
    ageHours: number
  ): number {
    const safeAge = Math.max(ageHours, 0.1);
    const totalEngagement = points + (comments * 2);
    return totalEngagement / safeAge;
  }

  /**
   * Extract keywords from title
   * @param {string} title - Story title
   * @returns {string[]} Keywords
   */
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

  /**
   * Scrape HackerNews using Algolia API
   * @returns {Promise<StoryResult[]>} Scraped stories
   */
  public async scrape(): Promise<StoryResult[]> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const cutoffTime = now - (this.config.hoursBack * 60 * 60);

      // Search for recent stories with minimum points
      const url = `${this.algoliaUrl}/search?` +
        `tags=story&` +
        `numericFilters=points>${this.config.minPoints},created_at_i>${cutoffTime}&` +
        `hitsPerPage=${this.config.maxStories}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HN Algolia API returned ${response.status}`);
      }

      const data = await response.json() as HNAlgoliaResponse;
      const stories: StoryResult[] = [];

      for (const hit of data.hits) {
        // Skip Ask HN and Show HN stories without URLs
        if ((hit.title.startsWith('Ask HN:') || hit.title.startsWith('Show HN:')) && !hit.url) {
          continue;
        }

        const createdAt = new Date(hit.created_at_i * 1000);
        const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        const velocity = this.calculateVelocity(hit.points, hit.num_comments, ageHours);

        stories.push({
          id: `hn-${hit.objectID}`,
          title: hit.title,
          url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
          contentSnippet: hit.story_text ?? '',
          publishedAt: createdAt,
          score: hit.points,
          commentCount: hit.num_comments,
          engagementVelocity: velocity,
          keywords: this.extractKeywords(hit.title),
          topics: ['technology', 'startups'],
          media: [], // HN doesn't have built-in media
          sourceId: 'hackernews',
          sourceName: 'HackerNews',
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      console.log(`[HN] Found ${stories.length} stories`);
      return stories;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`HN scraping failed: ${message}`);
    }
  }

  /**
   * Detect anomalous stories
   * @param {StoryResult[]} stories - All stories
   * @param {number} threshold - Standard deviations above mean
   * @returns {StoryResult[]} Anomalous stories
   */
  public detectAnomalies(stories: StoryResult[], threshold: number = 2): StoryResult[] {
    if (stories.length < 3) return stories;

    const velocities = stories.map(s => s.engagementVelocity);
    const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    
    const variance = velocities.reduce((sum, v) => {
      return sum + Math.pow(v - mean, 2);
    }, 0) / velocities.length;
    
    const stdDev = Math.sqrt(variance);
    const anomalyThreshold = mean + (stdDev * threshold);

    return stories.filter(s => s.engagementVelocity > anomalyThreshold);
  }
}

/**
 * Factory function
 * @param {Partial<HNScraperConfig>} config - Configuration
 * @returns {HackerNewsScraper} Scraper instance
 */
export function createHNScraper(config?: Partial<HNScraperConfig>): HackerNewsScraper {
  return new HackerNewsScraper(config);
}
