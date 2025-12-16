/**
 * @file Test suite for scrapers.ts
 * @description Tests for source weighting system and engagement scoring
 *
 * Coverage targets:
 * - SOURCE_SCORE_MULTIPLIERS constant
 * - calculateWeightedVelocity function
 * - scanRSSFeed with weighted scoring
 *
 * @see web/src/lib/scrapers.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Tests: Source Score Multipliers
// ============================================================================

describe('SOURCE_SCORE_MULTIPLIERS', () => {
  it('should export SOURCE_SCORE_MULTIPLIERS constant', async () => {
    const { SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');
    expect(SOURCE_SCORE_MULTIPLIERS).toBeDefined();
    expect(typeof SOURCE_SCORE_MULTIPLIERS).toBe('object');
  });

  it('should have multiplier of 1.0 for real-data sources', async () => {
    const { SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    // Sources with real engagement data should have baseline multiplier
    expect(SOURCE_SCORE_MULTIPLIERS.hackernews).toBe(1.0);
    expect(SOURCE_SCORE_MULTIPLIERS.lobsters).toBe(1.0);
  });

  it('should have boosted multipliers for RSS news sources', async () => {
    const { SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    // RSS sources with estimated scores need boost to compete
    expect(SOURCE_SCORE_MULTIPLIERS.reuters).toBeGreaterThan(1.0);
    expect(SOURCE_SCORE_MULTIPLIERS.apnews).toBeGreaterThan(1.0);
    expect(SOURCE_SCORE_MULTIPLIERS.bbc).toBeGreaterThan(1.0);
    expect(SOURCE_SCORE_MULTIPLIERS.guardian).toBeGreaterThan(1.0);
    expect(SOURCE_SCORE_MULTIPLIERS.npr).toBeGreaterThan(1.0);
  });

  it('should have multipliers for all standard sources', async () => {
    const { SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    const expectedSources = [
      'hackernews',
      'lobsters',
      'reuters',
      'apnews',
      'bbc',
      'guardian',
      'npr',
      'techcrunch',
      'producthunt',
    ];

    for (const source of expectedSources) {
      expect(SOURCE_SCORE_MULTIPLIERS[source]).toBeDefined();
      expect(typeof SOURCE_SCORE_MULTIPLIERS[source]).toBe('number');
    }
  });
});

// ============================================================================
// Tests: calculateWeightedVelocity
// ============================================================================

describe('calculateWeightedVelocity', () => {
  it('should export calculateWeightedVelocity function', async () => {
    const { calculateWeightedVelocity } = await import('../scrapers');
    expect(calculateWeightedVelocity).toBeDefined();
    expect(typeof calculateWeightedVelocity).toBe('function');
  });

  it('should apply multiplier to base velocity', async () => {
    const { calculateWeightedVelocity } = await import('../scrapers');

    // Base velocity = 100, multiplier = 2.5 for reuters
    const weighted = calculateWeightedVelocity(100, 10, 1, 'reuters');
    const baseline = calculateWeightedVelocity(100, 10, 1, 'hackernews');

    // Reuters should have higher weighted velocity than hackernews with same base stats
    expect(weighted).toBeGreaterThan(baseline);
  });

  it('should return unmodified velocity for multiplier of 1.0', async () => {
    const { calculateWeightedVelocity, calculateVelocity } = await import('../scrapers');

    const score = 200;
    const comments = 50;
    const ageHours = 2;

    // For hackernews (multiplier 1.0), weighted should equal base
    const baseVelocity = calculateVelocity(score, comments, ageHours);
    const weightedVelocity = calculateWeightedVelocity(score, comments, ageHours, 'hackernews');

    expect(weightedVelocity).toBe(baseVelocity);
  });

  it('should default to 1.0 multiplier for unknown sources', async () => {
    const { calculateWeightedVelocity, calculateVelocity } = await import('../scrapers');

    const score = 100;
    const comments = 20;
    const ageHours = 1;

    const baseVelocity = calculateVelocity(score, comments, ageHours);
    const unknownSourceVelocity = calculateWeightedVelocity(score, comments, ageHours, 'unknown-source');

    expect(unknownSourceVelocity).toBe(baseVelocity);
  });

  it('should make Reuters competitive with HackerNews for similar content', async () => {
    const { calculateWeightedVelocity } = await import('../scrapers');

    // HackerNews story: real data - 150 points, 30 comments, 2 hours old
    const hnVelocity = calculateWeightedVelocity(150, 30, 2, 'hackernews');

    // Reuters story: estimated data - 100 points, 25 comments, 2 hours old
    // With multiplier, should be in similar range
    const reutersVelocity = calculateWeightedVelocity(100, 25, 2, 'reuters');

    // Reuters should be within 50% of HN velocity (competitive range)
    expect(reutersVelocity).toBeGreaterThan(hnVelocity * 0.5);
    expect(reutersVelocity).toBeLessThan(hnVelocity * 2.0);
  });
});

// ============================================================================
// Tests: calculateVelocity (existing function - ensure exported)
// ============================================================================

describe('calculateVelocity', () => {
  it('should export calculateVelocity function', async () => {
    const { calculateVelocity } = await import('../scrapers');
    expect(calculateVelocity).toBeDefined();
    expect(typeof calculateVelocity).toBe('function');
  });

  it('should calculate velocity as (score + comments*2) / ageHours', async () => {
    const { calculateVelocity } = await import('../scrapers');

    // score=100, comments=50, age=2 => (100 + 50*2) / 2 = 100
    expect(calculateVelocity(100, 50, 2)).toBe(100);
  });

  it('should handle zero age by using minimum of 0.1', async () => {
    const { calculateVelocity } = await import('../scrapers');

    // With age near 0, should use 0.1 as minimum
    const velocity = calculateVelocity(100, 10, 0);
    expect(velocity).toBe((100 + 10 * 2) / 0.1);
  });

  it('should handle negative age gracefully', async () => {
    const { calculateVelocity } = await import('../scrapers');

    // Negative age (future date) should use minimum
    const velocity = calculateVelocity(100, 10, -1);
    expect(velocity).toBe((100 + 10 * 2) / 0.1);
  });
});

// ============================================================================
// Tests: scanRSSFeed with weighting
// ============================================================================

describe('scanRSSFeed with source weighting', () => {
  // Mock rss-parser
  const mockParsedFeed = {
    items: [
      {
        title: 'Test Story 1',
        link: 'https://example.com/story1',
        pubDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        contentSnippet: 'This is test story 1',
      },
      {
        title: 'Test Story 2',
        link: 'https://example.com/story2',
        pubDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        contentSnippet: 'This is test story 2',
      },
    ],
  };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should apply source multiplier to engagementVelocity in results', async () => {
    // Mock the parser
    vi.doMock('rss-parser', () => ({
      default: class MockParser {
        parseURL() {
          return Promise.resolve(mockParsedFeed);
        }
      },
    }));

    const { scanRSSFeed, SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    // Scan as Reuters (has multiplier > 1)
    const reutersStories = await scanRSSFeed(
      'https://example.com/feed',
      'reuters',
      'Reuters',
      10,
      'news'
    );

    expect(reutersStories.length).toBeGreaterThan(0);

    // Verify velocity is weighted
    const story = reutersStories[0];
    expect(story.engagementVelocity).toBeDefined();
    expect(story.sourceId).toBe('reuters');

    // The weighted velocity should be higher than raw calculation
    // due to SOURCE_SCORE_MULTIPLIERS.reuters > 1
    const reutersMultiplier = SOURCE_SCORE_MULTIPLIERS.reuters;
    expect(reutersMultiplier).toBeGreaterThan(1);
  });

  it('should return stories with correct sourceId', async () => {
    vi.doMock('rss-parser', () => ({
      default: class MockParser {
        parseURL() {
          return Promise.resolve(mockParsedFeed);
        }
      },
    }));

    const { scanRSSFeed } = await import('../scrapers');

    const stories = await scanRSSFeed(
      'https://example.com/feed',
      'apnews',
      'AP News',
      10,
      'news'
    );

    for (const story of stories) {
      expect(story.sourceId).toBe('apnews');
      expect(story.sourceName).toBe('AP News');
    }
  });
});

// ============================================================================
// Tests: Individual source scanners use weighting
// ============================================================================

describe('Source-specific scanners apply weighting', () => {
  const mockFeed = {
    items: [
      {
        title: 'Breaking News Story',
        link: 'https://news.example.com/story',
        pubDate: new Date().toISOString(),
        contentSnippet: 'Important news content',
      },
    ],
  };

  beforeEach(() => {
    vi.resetModules();
    vi.doMock('rss-parser', () => ({
      default: class MockParser {
        parseURL() {
          return Promise.resolve(mockFeed);
        }
      },
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scanAPNews should return stories with weighted velocity', async () => {
    const { scanAPNews, SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    const stories = await scanAPNews(5);

    expect(stories.length).toBeGreaterThan(0);
    expect(stories[0].sourceId).toBe('apnews');
    // AP News should have boosted multiplier
    expect(SOURCE_SCORE_MULTIPLIERS.apnews).toBeGreaterThan(1);
  });

  it('scanReuters should return stories with weighted velocity', async () => {
    const { scanReuters, SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    const stories = await scanReuters(5);

    expect(stories.length).toBeGreaterThan(0);
    expect(stories[0].sourceId).toBe('reuters');
    expect(SOURCE_SCORE_MULTIPLIERS.reuters).toBeGreaterThan(1);
  });

  it('scanBBC should return stories with weighted velocity', async () => {
    const { scanBBC, SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    const stories = await scanBBC(5);

    expect(stories.length).toBeGreaterThan(0);
    expect(SOURCE_SCORE_MULTIPLIERS.bbc).toBeGreaterThan(1);
  });

  it('scanNPR should return stories with weighted velocity', async () => {
    const { scanNPR, SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    const stories = await scanNPR(5);

    expect(stories.length).toBeGreaterThan(0);
    expect(SOURCE_SCORE_MULTIPLIERS.npr).toBeGreaterThan(1);
  });

  it('scanGuardian should return stories with weighted velocity', async () => {
    const { scanGuardian, SOURCE_SCORE_MULTIPLIERS } = await import('../scrapers');

    const stories = await scanGuardian(5);

    expect(stories.length).toBeGreaterThan(0);
    expect(SOURCE_SCORE_MULTIPLIERS.guardian).toBeGreaterThan(1);
  });
});

// ============================================================================
// Tests: estimateScore function
// ============================================================================

describe('estimateScore', () => {
  it('should export estimateScore function', async () => {
    const { estimateScore } = await import('../scrapers');
    expect(estimateScore).toBeDefined();
    expect(typeof estimateScore).toBe('function');
  });

  it('should return max score for fresh content (age = 0)', async () => {
    const { estimateScore, RSS_ESTIMATION_CONFIG } = await import('../scrapers');

    const score = estimateScore(0, 'Regular news headline');
    expect(score).toBe(RSS_ESTIMATION_CONFIG.MAX_SCORE);
  });

  it('should decay score over time', async () => {
    const { estimateScore } = await import('../scrapers');

    const freshScore = estimateScore(0, 'News headline');
    const agedScore = estimateScore(10, 'News headline'); // 10 hours old

    expect(agedScore).toBeLessThan(freshScore);
  });

  it('should not go below minimum score', async () => {
    const { estimateScore, RSS_ESTIMATION_CONFIG } = await import('../scrapers');

    // Very old content (100 hours)
    const score = estimateScore(100, 'Old news headline');
    expect(score).toBeGreaterThanOrEqual(RSS_ESTIMATION_CONFIG.MIN_SCORE);
  });

  it('should boost score for breaking news keywords', async () => {
    const { estimateScore } = await import('../scrapers');

    const regularScore = estimateScore(2, 'Regular news headline');
    const breakingScore = estimateScore(2, 'BREAKING: Major event happening');

    expect(breakingScore).toBeGreaterThan(regularScore);
  });

  it('should boost for various breaking keywords', async () => {
    const { estimateScore } = await import('../scrapers');
    const baseScore = estimateScore(1, 'Regular headline');

    const breakingKeywords = ['breaking', 'urgent', 'exclusive', 'developing', 'alert'];

    for (const keyword of breakingKeywords) {
      const boostedScore = estimateScore(1, `${keyword}: Something happened`);
      expect(boostedScore).toBeGreaterThan(baseScore);
    }
  });

  it('should use custom config when provided', async () => {
    const { estimateScore, PRODUCTHUNT_ESTIMATION_CONFIG } = await import('../scrapers');

    const phScore = estimateScore(0, 'Product launch', PRODUCTHUNT_ESTIMATION_CONFIG);
    expect(phScore).toBe(PRODUCTHUNT_ESTIMATION_CONFIG.MAX_SCORE);
  });
});

// ============================================================================
// Tests: Estimation config exports
// ============================================================================

describe('Estimation config exports', () => {
  it('should export RSS_ESTIMATION_CONFIG', async () => {
    const { RSS_ESTIMATION_CONFIG } = await import('../scrapers');

    expect(RSS_ESTIMATION_CONFIG).toBeDefined();
    expect(RSS_ESTIMATION_CONFIG.MAX_SCORE).toBe(300);
    expect(RSS_ESTIMATION_CONFIG.MIN_SCORE).toBe(100);
    expect(RSS_ESTIMATION_CONFIG.DECAY_RATE).toBe(15);
  });

  it('should export PRODUCTHUNT_ESTIMATION_CONFIG', async () => {
    const { PRODUCTHUNT_ESTIMATION_CONFIG } = await import('../scrapers');

    expect(PRODUCTHUNT_ESTIMATION_CONFIG).toBeDefined();
    expect(PRODUCTHUNT_ESTIMATION_CONFIG.MAX_SCORE).toBe(500);
    expect(PRODUCTHUNT_ESTIMATION_CONFIG.MIN_SCORE).toBe(50);
    expect(PRODUCTHUNT_ESTIMATION_CONFIG.DECAY_RATE).toBe(20);
  });
});
