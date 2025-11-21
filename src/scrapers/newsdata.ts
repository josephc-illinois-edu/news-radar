/**
 * @fileoverview NewsData.io scraper (API KEY REQUIRED)
 * @description Scrapes news from NewsData.io API
 * @see https://newsdata.io/documentation
 */

import type { StoryResult } from '../types.js';

interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  keywords: string[] | null;
  creator: string[] | null;
  video_url: string | null;
  description: string | null;
  content: string | null;
  pubDate: string;
  image_url: string | null;
  source_id: string;
  source_priority: number;
  country: string[];
  category: string[];
  language: string;
}

interface NewsDataResponse {
  status: string;
  totalResults: number;
  results: NewsDataArticle[];
  nextPage?: string;
}

interface NewsDataScraperConfig {
  apiKey: string;
  categories?: string[];
  countries?: string[];
  languages?: string[];
  maxResults?: number;
  priorityMin?: number;
}

export class NewsDataScraper {
  private config: Required<NewsDataScraperConfig>;
  private readonly baseUrl = 'https://newsdata.io/api/1/news';

  constructor(config: NewsDataScraperConfig) {
    if (!config.apiKey) {
      throw new Error('NewsData.io API key is required');
    }

    this.config = {
      apiKey: config.apiKey,
      categories: config.categories ?? ['top', 'politics', 'technology', 'world'],
      countries: config.countries ?? ['us'],
      languages: config.languages ?? ['en'],
      maxResults: config.maxResults ?? 50,
      priorityMin: config.priorityMin ?? 100000,
    };
  }

  private extractKeywords(title: string, apiKeywords: string[] | null): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
    ]);

    // Start with API-provided keywords
    const keywords = new Set<string>(apiKeywords ?? []);

    // Extract additional keywords from title
    const titleWords = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    titleWords.forEach(word => keywords.add(word));

    return Array.from(keywords).slice(0, 10);
  }

  private calculateEngagementMetrics(article: NewsDataArticle): {
    score: number;
    commentCount: number;
    velocity: number;
  } {
    const publishedAt = new Date(article.pubDate);
    const ageHours = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

    // Estimate engagement based on source priority and freshness
    const priorityScore = article.source_priority / 1000;
    const freshnessMultiplier = Math.max(0.5, 1 - (ageHours / 48));

    const estimatedScore = Math.floor(priorityScore * freshnessMultiplier * (Math.random() * 0.4 + 0.8));
    const estimatedComments = Math.floor(estimatedScore * 0.3 * (Math.random() * 0.5 + 0.75));

    const velocity = (estimatedScore + estimatedComments * 2) / Math.max(ageHours, 0.1);

    return {
      score: estimatedScore,
      commentCount: estimatedComments,
      velocity,
    };
  }

  private async fetchNews(category?: string): Promise<NewsDataArticle[]> {
    try {
      const params = new URLSearchParams({
        apikey: this.config.apiKey,
        language: this.config.languages.join(','),
        country: this.config.countries.join(','),
      });

      if (category) {
        params.append('category', category);
      }

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid NewsData.io API key');
        }
        throw new Error(`NewsData.io API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as NewsDataResponse;

      if (data.status !== 'success') {
        throw new Error('NewsData.io API returned non-success status');
      }

      return data.results ?? [];

    } catch (error) {
      if (error instanceof Error) {
        console.error(`[NewsData] Failed to fetch news:`, error.message);
      }
      return [];
    }
  }

  public async scrape(): Promise<StoryResult[]> {
    console.log(`[NewsData] Scraping ${this.config.categories.length} categories...`);

    const allStories: StoryResult[] = [];
    const seenArticleIds = new Set<string>();

    for (const category of this.config.categories) {
      const articles = await this.fetchNews(category);

      for (const article of articles) {
        // Skip duplicates
        if (seenArticleIds.has(article.article_id)) {
          continue;
        }
        seenArticleIds.add(article.article_id);

        // Filter by priority if specified
        if (article.source_priority < this.config.priorityMin) {
          continue;
        }

        const metrics = this.calculateEngagementMetrics(article);
        const publishedAt = new Date(article.pubDate);

        allStories.push({
          id: `newsdata-${article.article_id}`,
          title: article.title,
          url: article.link,
          contentSnippet: article.description ?? article.content?.slice(0, 200) ?? '',
          publishedAt,
          score: metrics.score,
          commentCount: metrics.commentCount,
          engagementVelocity: metrics.velocity,
          keywords: this.extractKeywords(article.title, article.keywords),
          topics: article.category ?? [category],
          media: article.image_url ? [{
            id: `newsdata-img-${article.article_id}`,
            type: 'image',
            url: article.image_url,
            altText: article.title,
            author: article.creator?.[0] ?? 'Unknown',
            source: article.source_id,
            sourceUrl: article.link,
            license: 'unknown',
          }] : [],
          sourceId: 'newsdata',
          sourceName: 'NewsData.io',
          detectedAt: new Date(),
          status: 'flagged',
        });

        // Limit results
        if (allStories.length >= this.config.maxResults) {
          break;
        }
      }

      if (allStories.length >= this.config.maxResults) {
        break;
      }

      // Rate limiting - wait 1 second between category requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[NewsData] Found ${allStories.length} stories`);
    return allStories;
  }
}

export function createNewsDataScraper(config: NewsDataScraperConfig): NewsDataScraper {
  return new NewsDataScraper(config);
}
