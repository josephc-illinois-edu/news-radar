/**
 * @fileoverview Reddit scraper with API and RSS support
 * @description Uses Reddit API when credentials available, falls back to RSS
 */

import Parser from 'rss-parser';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import type { StoryResult, MediaAttachment } from '../types.js';

// Load environment variables
config();

/**
 * Reddit RSS parser with custom fields
 */
interface RedditRSSItem {
  title: string;
  link: string;
  pubDate: string;
  creator: string;
  content: string;
  contentSnippet: string;
  'media:thumbnail'?: {
    $: {
      url: string;
    };
  };
}

/**
 * Reddit API post data structure
 */
interface RedditAPIPost {
  data: {
    title: string;
    name: string;
    permalink: string;
    url: string;
    score: number;
    num_comments: number;
    created_utc: number;
    author: string;
    subreddit: string;
    selftext: string;
    thumbnail?: string;
    preview?: {
      images: Array<{
        source: {
          url: string;
          width: number;
          height: number;
        };
      }>;
    };
  };
}

/**
 * Reddit API authentication response
 */
interface RedditAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Configuration for Reddit scraper
 */
interface RedditScraperConfig {
  subreddits: string[];
  maxPostsPerSubreddit: number;
  minScore: number;
}

/**
 * Reddit scraper class with API and RSS support
 */
export class RedditScraper {
  private parser: Parser<unknown, RedditRSSItem>;
  private config: RedditScraperConfig;
  private useAPI: boolean;
  private accessToken?: string;
  private tokenExpiry?: number;

  /**
   * Initialize Reddit scraper
   * @param {Partial<RedditScraperConfig>} config - Optional configuration
   */
  constructor(config: Partial<RedditScraperConfig> = {}) {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:thumbnail', 'media:thumbnail'],
        ],
      },
    });

    this.config = {
      subreddits: config.subreddits ?? ['worldnews', 'technology', 'science'],
      maxPostsPerSubreddit: config.maxPostsPerSubreddit ?? 25,
      minScore: config.minScore ?? 50,
    };

    // Check if API credentials are available
    this.useAPI = !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);

    if (this.useAPI) {
      console.log('[Reddit] API credentials found - using official API');
    } else {
      console.log('[Reddit] No API credentials - using RSS feeds');
    }
  }

  /**
   * Extract score from Reddit post title
   * Reddit RSS includes score in title like: "Title here (123 points)"
   * @param {string} title - Post title from RSS
   * @returns {number} Extracted score or 0
   */
  private extractScore(title: string): number {
    const scoreMatch = title.match(/\((\d+)\s+points?\)/);
    return scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  }

  /**
   * Extract comment count from content snippet
   * @param {string} content - RSS content
   * @returns {number} Number of comments
   */
  private extractCommentCount(content: string): number {
    const commentMatch = content.match(/(\d+)\s+comments?/i);
    return commentMatch ? parseInt(commentMatch[1], 10) : 0;
  }

  /**
   * Clean Reddit post title (remove score suffix)
   * @param {string} title - Raw title from RSS
   * @returns {string} Cleaned title
   */
  private cleanTitle(title: string): string {
    return title.replace(/\s*\(\d+\s+points?\)$/, '').trim();
  }

  /**
   * Extract media from Reddit post
   * @param {RedditRSSItem} item - RSS item
   * @param {string} subreddit - Subreddit name
   * @returns {MediaAttachment[]} Media attachments
   */
  private extractMedia(item: RedditRSSItem, subreddit: string): MediaAttachment[] {
    const media: MediaAttachment[] = [];

    // Check for thumbnail
    const thumbnail = item['media:thumbnail'];
    if (thumbnail && thumbnail.$.url) {
      const thumbnailUrl = thumbnail.$.url;
      
      // Only include actual images (not default Reddit icons)
      if (!thumbnailUrl.includes('default') && !thumbnailUrl.includes('self')) {
        media.push({
          id: `reddit-thumb-${Date.now()}`,
          type: 'image',
          url: thumbnailUrl,
          altText: `Thumbnail for: ${this.cleanTitle(item.title)}`,
          author: item.creator,
          source: `r/${subreddit}`,
          sourceUrl: `https://reddit.com/r/${subreddit}`,
          license: 'unknown',
        });
      }
    }

    return media;
  }

  /**
   * Calculate engagement velocity
   * @param {number} score - Post score
   * @param {number} comments - Comment count
   * @param {Date} publishedAt - Publication date
   * @returns {number} Engagement velocity (per hour)
   */
  private calculateVelocity(
    score: number,
    comments: number,
    publishedAt: Date
  ): number {
    const now = Date.now();
    const ageMs = now - publishedAt.getTime();
    const ageHours = Math.max(ageMs / (1000 * 60 * 60), 0.1);
    
    const totalEngagement = score + (comments * 2);
    return totalEngagement / ageHours;
  }

  /**
   * Extract keywords from title
   * @param {string} title - Post title
   * @returns {string[]} Keywords
   */
  private extractKeywords(title: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'says', 'after', 'before',
    ]);

    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    return [...new Set(words)];
  }

  /**
   * Authenticate with Reddit API
   * @returns {Promise<string>} Access token
   */
  private async authenticate(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = process.env.REDDIT_CLIENT_ID!;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET!;
    const userAgent = process.env.REDDIT_USER_AGENT || 'news-radar:v0.1.0';

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Reddit auth failed: ${response.statusText}`);
    }

    const data = await response.json() as RedditAuthResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return this.accessToken;
  }

  /**
   * Extract media from Reddit API post
   * @param {RedditAPIPost} post - API post data
   * @returns {MediaAttachment[]} Media attachments
   */
  private extractMediaFromAPI(post: RedditAPIPost): MediaAttachment[] {
    const media: MediaAttachment[] = [];
    const postData = post.data;

    // Check for preview images (higher quality than thumbnails)
    if (postData.preview?.images?.[0]?.source) {
      const imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, '&');

      media.push({
        id: `reddit-api-img-${postData.name}`,
        type: 'image',
        url: imageUrl,
        altText: `Image for: ${postData.title}`,
        author: postData.author,
        source: `r/${postData.subreddit}`,
        sourceUrl: `https://reddit.com/r/${postData.subreddit}`,
        license: 'unknown',
      });
    }
    // Fallback to thumbnail if no preview
    else if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
      if (!postData.thumbnail.includes('default') && !postData.thumbnail.includes('self')) {
        media.push({
          id: `reddit-api-thumb-${postData.name}`,
          type: 'image',
          url: postData.thumbnail,
          altText: `Thumbnail for: ${postData.title}`,
          author: postData.author,
          source: `r/${postData.subreddit}`,
          sourceUrl: `https://reddit.com/r/${postData.subreddit}`,
          license: 'unknown',
        });
      }
    }

    return media;
  }

  /**
   * Scrape a single subreddit using Reddit API
   * @param {string} subreddit - Subreddit name
   * @returns {Promise<StoryResult[]>} Scraped stories
   */
  private async scrapeSubredditAPI(subreddit: string): Promise<StoryResult[]> {
    try {
      const token = await this.authenticate();
      const userAgent = process.env.REDDIT_USER_AGENT || 'news-radar:v0.1.0';

      const response = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/hot?limit=${this.config.maxPostsPerSubreddit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': userAgent,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Reddit API request failed: ${response.statusText}`);
      }

      const data = await response.json() as { data: { children: RedditAPIPost[] } };
      const stories: StoryResult[] = [];

      for (const post of data.data.children) {
        const postData = post.data;

        // Filter by minimum score
        if (postData.score < this.config.minScore) continue;

        const publishedAt = new Date(postData.created_utc * 1000);
        const velocity = this.calculateVelocity(
          postData.score,
          postData.num_comments,
          publishedAt
        );

        stories.push({
          id: `reddit-api-${postData.name}`,
          title: postData.title,
          url: `https://reddit.com${postData.permalink}`,
          contentSnippet: postData.selftext.substring(0, 200) || '',
          publishedAt,
          score: postData.score,
          commentCount: postData.num_comments,
          engagementVelocity: velocity,
          keywords: this.extractKeywords(postData.title),
          topics: [postData.subreddit],
          media: this.extractMediaFromAPI(post),
          sourceId: 'reddit',
          sourceName: `Reddit - r/${postData.subreddit}`,
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      return stories;

    } catch (error) {
      console.error(`[Reddit API] Failed to scrape r/${subreddit}:`, error);
      console.log('[Reddit] Falling back to RSS...');
      return this.scrapeSubredditRSS(subreddit);
    }
  }

  /**
   * Scrape a single subreddit using RSS (renamed from scrapeSubreddit)
   * @param {string} subreddit - Subreddit name
   * @returns {Promise<StoryResult[]>} Scraped stories
   */
  private async scrapeSubredditRSS(subreddit: string): Promise<StoryResult[]> {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/hot/.rss?limit=${this.config.maxPostsPerSubreddit}`;
      const feed = await this.parser.parseURL(url);
      
      const stories: StoryResult[] = [];

      for (const item of feed.items) {
        const rssFeedItem = item as RedditRSSItem;
        const score = this.extractScore(rssFeedItem.title);
        
        // Filter by minimum score
        if (score < this.config.minScore) continue;

        const cleanTitle = this.cleanTitle(rssFeedItem.title);
        const commentCount = this.extractCommentCount(rssFeedItem.contentSnippet || '');
        const publishedAt = new Date(rssFeedItem.pubDate);
        const velocity = this.calculateVelocity(score, commentCount, publishedAt);

        stories.push({
          id: `reddit-${subreddit}-${Date.now()}-${Math.random()}`,
          title: cleanTitle,
          url: rssFeedItem.link,
          contentSnippet: rssFeedItem.contentSnippet || '',
          publishedAt,
          score,
          commentCount,
          engagementVelocity: velocity,
          keywords: this.extractKeywords(cleanTitle),
          topics: [subreddit],
          media: this.extractMedia(rssFeedItem, subreddit),
          sourceId: 'reddit',
          sourceName: `Reddit - r/${subreddit}`,
          detectedAt: new Date(),
          status: 'flagged',
        });
      }

      return stories;

    } catch (error) {
      console.error(`Failed to scrape r/${subreddit}:`, error);
      return [];
    }
  }

  /**
   * Scrape all configured subreddits
   * @returns {Promise<StoryResult[]>} All scraped stories
   */
  public async scrape(): Promise<StoryResult[]> {
    console.log(`Scraping ${this.config.subreddits.length} subreddits...`);

    const allStories: StoryResult[] = [];

    for (const subreddit of this.config.subreddits) {
      // Use API if credentials available, otherwise use RSS
      const stories = this.useAPI
        ? await this.scrapeSubredditAPI(subreddit)
        : await this.scrapeSubredditRSS(subreddit);

      allStories.push(...stories);

      // Rate limiting: 1 request per second for RSS, 2 seconds for API (stricter)
      const delay = this.useAPI ? 2000 : 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return allStories;
  }

  /**
   * Find stories with anomalous engagement
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

    const anomalies = stories.filter(s => s.engagementVelocity > anomalyThreshold);
    
    // Mark as potentially breaking
    anomalies.forEach(story => {
      story.status = 'reviewing';
    });

    return anomalies;
  }
}

/**
 * Factory function for creating Reddit scraper
 * @param {Partial<RedditScraperConfig>} config - Optional configuration
 * @returns {RedditScraper} Configured scraper instance
 */
export function createRedditScraper(
  config?: Partial<RedditScraperConfig>
): RedditScraper {
  return new RedditScraper(config);
}
