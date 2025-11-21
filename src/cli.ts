#!/usr/bin/env node

/**
 * @fileoverview News Radar CLI
 * @description Command-line interface for scanning emerging news stories
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createHNScraper } from './scrapers/hackernews.js';
import { createLobstersScraper } from './scrapers/lobsters.js';
import { createAPNewsScraper } from './scrapers/apnews.js';
import { createReutersScraper } from './scrapers/reuters.js';
import { createBBCScraper } from './scrapers/bbc.js';
import { createGuardianScraper } from './scrapers/guardian.js';
import { createNPRScraper } from './scrapers/npr.js';
import { createTechCrunchScraper } from './scrapers/techcrunch.js';
import { createNewsDataScraper } from './scrapers/newsdata.js';
import type { StoryResult, ScanOptions, ScanSummary } from './types.js';

/**
 * Format story for terminal display
 * @param {StoryResult} story - Story to display
 * @param {number} index - Story index
 */
function displayStory(story: StoryResult, index: number): void {
  console.log('\n' + chalk.bold.cyan(`${index}. ${story.title}`));
  console.log(chalk.gray(`   ${story.url}`));
  console.log(
    chalk.yellow(`   ⚡ ${Math.round(story.engagementVelocity)} velocity`) +
    chalk.gray(' | ') +
    chalk.green(`▲ ${story.score} points`) +
    chalk.gray(' | ') +
    chalk.blue(`💬 ${story.commentCount} comments`)
  );
  console.log(chalk.gray(`   📍 ${story.sourceName} • ${story.publishedAt.toLocaleString()}`));
  
  if (story.keywords.length > 0) {
    console.log(chalk.magenta(`   🏷️  ${story.keywords.slice(0, 5).join(', ')}`));
  }

  if (story.media.length > 0) {
    story.media.forEach(media => {
      console.log(chalk.cyan(`   🖼️  ${media.altText}`));
      console.log(chalk.gray(`      Credit: ${media.author} via ${media.source}`));
    });
  }
}

/**
 * Display scan summary
 * @param {ScanSummary} summary - Scan summary
 */
function displaySummary(summary: ScanSummary): void {
  console.log('\n' + chalk.bold('─'.repeat(70)));
  console.log(chalk.bold.white('📊 SCAN SUMMARY'));
  console.log(chalk.bold('─'.repeat(70)));
  console.log(chalk.white(`Total Stories: ${summary.totalScanned}`));
  console.log(chalk.yellow(`Flagged: ${summary.storiesFlagged}`));
  console.log(chalk.red(`Anomalies: ${summary.anomaliesDetected}`));
  console.log(chalk.cyan(`Media Found: ${summary.mediaFound}`));
  console.log(chalk.gray(`Duration: ${(summary.durationMs / 1000).toFixed(1)}s`));
  
  console.log(chalk.white('\n📈 Source Breakdown:'));
  Object.entries(summary.sourceBreakdown).forEach(([source, count]) => {
    console.log(chalk.gray(`   ${source}: ${count} stories`));
  });
  
  if (summary.topKeywords.length > 0) {
    console.log(chalk.white('\n🔥 Top Keywords:'));
    console.log(chalk.magenta(`   ${summary.topKeywords.slice(0, 10).join(', ')}`));
  }
  
  console.log(chalk.bold('─'.repeat(70)) + '\n');
}

/**
 * Calculate top keywords
 * @param {StoryResult[]} stories - Stories
 * @param {number} topN - Number to return
 * @returns {string[]} Top keywords
 */
function getTopKeywords(stories: StoryResult[], topN: number = 10): string[] {
  const keywordCounts = new Map<string, number>();

  for (const story of stories) {
    for (const keyword of story.keywords) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1);
    }
  }

  return Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([keyword]) => keyword);
}

/**
 * Execute scan command
 * @param {ScanOptions} options - Scan options
 */
async function executeScan(options: ScanOptions): Promise<void> {
  const startTime = Date.now();
  
  console.log(chalk.bold.cyan('\n🔍 News Radar - Emerging Story Scanner\n'));
  console.log(chalk.gray(`Scanning last ${options.hours} hours...\n`));

  const spinner = ora('Initializing scrapers...').start();

  try {
    const allStories: StoryResult[] = [];
    const sources = options.sources ?? ['hackernews', 'newsdata'];

    // HackerNews
    if (sources.includes('hackernews')) {
      spinner.text = 'Scraping HackerNews...';
      const hnScraper = createHNScraper({
        hoursBack: options.hours,
        minPoints: options.minScore ?? 50,
        maxStories: 30,
      });
      const hnStories = await hnScraper.scrape();
      allStories.push(...hnStories);
      spinner.succeed(chalk.green(`✓ HackerNews: ${hnStories.length} stories`));
    }

    // Lobsters
    if (sources.includes('lobsters')) {
      spinner.start('Scraping Lobsters...');
      const lobstersScraper = createLobstersScraper({
        maxStories: 25,
        minScore: options.minScore ?? 10,
      });
      const lobstersStories = await lobstersScraper.scrape();
      allStories.push(...lobstersStories);
      spinner.succeed(chalk.green(`✓ Lobsters: ${lobstersStories.length} stories`));
    }

    // AP News
    if (sources.includes('apnews')) {
      spinner.start('Scraping AP News...');
      const apnewsScraper = createAPNewsScraper({
        categories: ['topnews', 'politics'],
        maxStoriesPerCategory: 15,
      });
      const apnewsStories = await apnewsScraper.scrape();
      allStories.push(...apnewsStories);
      spinner.succeed(chalk.green(`✓ AP News: ${apnewsStories.length} stories`));
    }

    // Reuters
    if (sources.includes('reuters')) {
      spinner.start('Scraping Reuters...');
      const reutersScraper = createReutersScraper({
        categories: ['world', 'politics'],
        maxStoriesPerCategory: 15,
      });
      const reutersStories = await reutersScraper.scrape();
      allStories.push(...reutersStories);
      spinner.succeed(chalk.green(`✓ Reuters: ${reutersStories.length} stories`));
    }

    // BBC
    if (sources.includes('bbc')) {
      spinner.start('Scraping BBC News...');
      const bbcScraper = createBBCScraper({
        categories: ['topstories', 'world', 'us'],
        maxStoriesPerCategory: 15,
      });
      const bbcStories = await bbcScraper.scrape();
      allStories.push(...bbcStories);
      spinner.succeed(chalk.green(`✓ BBC News: ${bbcStories.length} stories`));
    }

    // Guardian
    if (sources.includes('guardian')) {
      spinner.start('Scraping The Guardian...');
      const guardianScraper = createGuardianScraper({
        categories: ['world', 'us', 'politics'],
        maxStoriesPerCategory: 15,
      });
      const guardianStories = await guardianScraper.scrape();
      allStories.push(...guardianStories);
      spinner.succeed(chalk.green(`✓ The Guardian: ${guardianStories.length} stories`));
    }

    // NPR
    if (sources.includes('npr')) {
      spinner.start('Scraping NPR...');
      const nprScraper = createNPRScraper({
        categories: ['news', 'politics'],
        maxStoriesPerCategory: 15,
      });
      const nprStories = await nprScraper.scrape();
      allStories.push(...nprStories);
      spinner.succeed(chalk.green(`✓ NPR: ${nprStories.length} stories`));
    }

    // TechCrunch
    if (sources.includes('techcrunch')) {
      spinner.start('Scraping TechCrunch...');
      const techcrunchScraper = createTechCrunchScraper({
        maxStories: 20,
        minScore: options.minScore ?? 20,
      });
      const techcrunchStories = await techcrunchScraper.scrape();
      allStories.push(...techcrunchStories);
      spinner.succeed(chalk.green(`✓ TechCrunch: ${techcrunchStories.length} stories`));
    }

    // NewsData.io
    if (sources.includes('newsdata')) {
      const apiKey = process.env.NEWSDATA_API_KEY;
      if (!apiKey) {
        spinner.warn(chalk.yellow('⚠ NewsData.io: API key not found in .env file'));
      } else {
        spinner.start('Scraping NewsData.io...');
        try {
          const newsdataScraper = createNewsDataScraper({
            apiKey,
            categories: ['top', 'politics', 'technology', 'world'],
            countries: ['us'],
            languages: ['en'],
            maxResults: 30,
          });
          const newsdataStories = await newsdataScraper.scrape();
          allStories.push(...newsdataStories);
          spinner.succeed(chalk.green(`✓ NewsData.io: ${newsdataStories.length} stories`));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          spinner.fail(chalk.red(`✗ NewsData.io: ${message}`));
        }
      }
    }

    spinner.stop();

    // Filter by keywords if provided
    let filteredStories = allStories;
    if (options.keywords && options.keywords.length > 0) {
      const keywordSet = new Set(options.keywords.map(k => k.toLowerCase()));
      filteredStories = allStories.filter(story =>
        story.keywords.some(k => keywordSet.has(k.toLowerCase()))
      );
      console.log(chalk.yellow(`\n🔎 Filtered to ${filteredStories.length} stories matching keywords\n`));
    }

    // Sort by engagement velocity
    filteredStories.sort((a, b) => b.engagementVelocity - a.engagementVelocity);

    // Detect anomalies
    const hnScraper = createHNScraper();
    const anomalies = hnScraper.detectAnomalies(filteredStories);

    // Display top stories
    console.log(chalk.bold.white('\n📰 TOP STORIES BY ENGAGEMENT\n'));
    const topStories = filteredStories.slice(0, options.maxResults ?? 15);
    topStories.forEach((story, idx) => {
      displayStory(story, idx + 1);
    });

    // Display anomalies
    if (anomalies.length > 0) {
      console.log(chalk.bold.red('\n\n🚨 ANOMALOUS ENGAGEMENT DETECTED\n'));
      console.log(chalk.gray('These stories are gaining traction unusually fast:\n'));
      anomalies.slice(0, 5).forEach((story, idx) => {
        displayStory(story, idx + 1);
      });
    }

    // Calculate summary
    const sourceBreakdown: Record<string, number> = {};
    filteredStories.forEach(story => {
      sourceBreakdown[story.sourceName] = (sourceBreakdown[story.sourceName] ?? 0) + 1;
    });

    const mediaCount = filteredStories.reduce((sum, s) => sum + s.media.length, 0);

    const summary: ScanSummary = {
      totalScanned: allStories.length,
      storiesFlagged: filteredStories.length,
      anomaliesDetected: anomalies.length,
      sourceBreakdown,
      topKeywords: getTopKeywords(filteredStories),
      durationMs: Date.now() - startTime,
      mediaFound: mediaCount,
    };

    displaySummary(summary);

    console.log(chalk.green.bold('✨ Scan completed successfully!\n'));

  } catch (error) {
    spinner.fail(chalk.red('Scan failed'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ Error: ${message}\n`));
    process.exit(1);
  }
}

// Create CLI program
const program = new Command();

program
  .name('news-radar')
  .description('Detect emerging news stories before they go mainstream')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan news sources for emerging stories')
  .option('-h, --hours <number>', 'Hours to look back', '24')
  .option('-s, --sources <sources>', 'Comma-separated sources (hackernews,lobsters,apnews,reuters,bbc,guardian,npr,techcrunch,newsdata)', 'hackernews,newsdata')
  .option('-m, --min-score <number>', 'Minimum engagement score', '50')
  .option('-k, --keywords <keywords>', 'Filter by keywords (comma-separated)')
  .option('-n, --max-results <number>', 'Maximum results to display', '15')
  .option('--media', 'Include media attachments', false)
  .action(async (cmdOptions) => {
    const options: ScanOptions = {
      hours: parseInt(cmdOptions.hours as string, 10),
      sources: (cmdOptions.sources as string).split(',').map(s => s.trim()),
      minScore: cmdOptions.minScore ? parseInt(cmdOptions.minScore as string, 10) : undefined,
      keywords: cmdOptions.keywords ? (cmdOptions.keywords as string).split(',').map(k => k.trim()) : undefined,
      maxResults: cmdOptions.maxResults ? parseInt(cmdOptions.maxResults as string, 10) : undefined,
      includeMedia: cmdOptions.media as boolean,
    };

    await executeScan(options);
  });

program.parse();
