/**
 * @fileoverview Content Fetcher - Extract article content from URLs
 * @description Fetches and parses article content for analysis
 */

import * as cheerio from 'cheerio';

/**
 * Fetched article content structure
 */
export interface FetchedContent {
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  publishedDate?: Date;
  facts: string[];
  quotes: string[];
  numbers: string[];
  url: string;
}

/**
 * Content Fetcher class
 */
export class ContentFetcher {
  /**
   * Fetch and parse article from URL
   */
  async fetch(url: string): Promise<FetchedContent> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseHTML(html, url);

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Content fetch failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse HTML content to extract article data
   */
  private parseHTML(html: string, url: string): FetchedContent {
    const $ = cheerio.load(html);

    // Extract title (try multiple selectors)
    const title = this.extractTitle($);

    // Extract main content
    const content = this.extractContent($);

    // Extract metadata
    const author = this.extractAuthor($);
    const publishedDate = this.extractPublishedDate($);

    // Analyze content
    const facts = this.extractFacts(content);
    const quotes = this.extractQuotes(content);
    const numbers = this.extractNumbers(content);

    // Create excerpt (first 200 chars of content)
    const excerpt = content.slice(0, 200).trim() + '...';

    return {
      title,
      content,
      excerpt,
      author,
      publishedDate,
      facts,
      quotes,
      numbers,
      url,
    };
  }

  /**
   * Extract title from HTML
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    // Try various title selectors
    const selectors = [
      'h1.article-title',
      'h1[class*="title"]',
      'h1[class*="headline"]',
      'article h1',
      'h1',
      'meta[property="og:title"]',
      'title',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = selector.startsWith('meta')
          ? element.attr('content')
          : element.text();

        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    }

    return 'Article Title Not Found';
  }

  /**
   * Extract main article content
   */
  private extractContent($: cheerio.CheerioAPI): string {
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, .ad, .advertisement').remove();

    // Try various content selectors
    const selectors = [
      'article',
      '[class*="article-body"]',
      '[class*="article-content"]',
      '[class*="post-content"]',
      '[class*="entry-content"]',
      'main',
      '[role="main"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.find('p').map((_, el) => $(el).text().trim()).get().join('\n\n');
        if (text.length > 200) {
          return text;
        }
      }
    }

    // Fallback: get all paragraphs
    const paragraphs = $('p').map((_, el) => $(el).text().trim()).get().filter(p => p.length > 50);
    return paragraphs.join('\n\n') || 'Content could not be extracted';
  }

  /**
   * Extract author from HTML
   */
  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[class*="author"] [class*="name"]',
      '[rel="author"]',
      '[class*="byline"]',
      'meta[name="author"]',
      'meta[property="article:author"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const text = selector.startsWith('meta')
          ? element.attr('content')
          : element.text();

        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    }

    return undefined;
  }

  /**
   * Extract published date from HTML
   */
  private extractPublishedDate($: cheerio.CheerioAPI): Date | undefined {
    const selectors = [
      'meta[property="article:published_time"]',
      'meta[name="publishdate"]',
      'time[datetime]',
      '[class*="publish-date"]',
      '[class*="date"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const dateStr = element.attr('content') || element.attr('datetime') || element.text();

        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Extract key facts from content (sentences with specific patterns)
   */
  private extractFacts(content: string): string[] {
    const facts: string[] = [];
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);

    // Look for sentences with numbers, percentages, or key phrases
    const factPatterns = [
      /\d+%/,  // Percentages
      /\$[\d,]+/,  // Dollar amounts
      /\d+\s+(million|billion|thousand)/i,  // Large numbers
      /(increased|decreased|rose|fell|grew|declined)\s+by/i,  // Change indicators
      /(reported|announced|stated|revealed|disclosed)/i,  // Announcement verbs
      /(according to|data shows|report finds)/i,  // Attribution
    ];

    for (const sentence of sentences) {
      if (factPatterns.some(pattern => pattern.test(sentence))) {
        facts.push(sentence.trim());
        if (facts.length >= 10) break;  // Limit to 10 facts
      }
    }

    return facts;
  }

  /**
   * Extract quotes from content
   */
  private extractQuotes(content: string): string[] {
    const quotes: string[] = [];

    // Match quoted text
    const quotePattern = /"([^"]{20,200})"/g;
    let match;

    while ((match = quotePattern.exec(content)) !== null) {
      quotes.push(match[1].trim());
      if (quotes.length >= 5) break;  // Limit to 5 quotes
    }

    return quotes;
  }

  /**
   * Extract numbers and statistics from content
   */
  private extractNumbers(content: string): string[] {
    const numbers: string[] = [];

    // Match various number patterns
    const patterns = [
      /\d+%/g,  // Percentages
      /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand))?/gi,  // Money
      /\d+(?:\.\d+)?(?:\s*(?:million|billion|thousand))/gi,  // Large numbers
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        numbers.push(...matches);
        if (numbers.length >= 15) break;  // Limit to 15 numbers
      }
    }

    // Deduplicate
    return [...new Set(numbers)].slice(0, 15);
  }
}

/**
 * Create a content fetcher instance
 */
export function createContentFetcher(): ContentFetcher {
  return new ContentFetcher();
}
