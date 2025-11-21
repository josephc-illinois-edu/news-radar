#!/usr/bin/env node

/**
 * @fileoverview Batch command - Generate multiple articles at once
 * @description CLI command for batch article generation from multiple URLs
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { createAIVoiceGenerator } from './generators/ai-voice.js';
import { createContentFetcher } from './utils/content-fetcher.js';
import { createPlagiarismChecker } from './utils/plagiarism-checker.js';
import { createDatabaseService } from './services/database.js';
import type { StoryResult, VoiceConfig } from './types.js';
import type { FetchedContent } from './utils/content-fetcher.js';

/**
 * Batch command options
 */
interface BatchOptions {
  urls?: string[];
  file?: string;
  length: 'tweet' | 'short' | 'medium' | 'long';
  platform: 'facebook' | 'linkedin' | 'newsletter' | 'blog';
  style: 'conversational' | 'academic';
  humor?: number;
  urgency?: number;
  optimism?: number;
  criticism?: number;
  save?: boolean;
  delay?: number;
}

/**
 * Batch result tracking
 */
interface BatchResult {
  url: string;
  success: boolean;
  articleId?: string;
  title?: string;
  error?: string;
  wordCount?: number;
  cost?: number;
}

/**
 * Execute batch generation
 */
async function executeBatch(options: BatchOptions): Promise<void> {
  console.log(chalk.bold.cyan('\n📦 BATCH ARTICLE GENERATION\n'));

  // Get URLs from options or file
  let urls: string[] = [];

  if (options.file) {
    try {
      const fileContent = await fs.readFile(options.file, 'utf-8');
      urls = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.startsWith('http'));

      console.log(chalk.gray(`📄 Loaded ${urls.length} URLs from ${options.file}\n`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to read file: ${options.file}\n`));
      process.exit(1);
    }
  } else if (options.urls && options.urls.length > 0) {
    urls = options.urls;
  } else {
    console.error(chalk.red('❌ No URLs provided. Use --urls or --file\n'));
    console.log(chalk.gray('Examples:'));
    console.log(chalk.gray('  npm run batch -- --urls "url1,url2,url3"'));
    console.log(chalk.gray('  npm run batch -- --file urls.txt\n'));
    process.exit(1);
  }

  if (urls.length === 0) {
    console.error(chalk.red('❌ No valid URLs found\n'));
    process.exit(1);
  }

  // Show batch summary
  console.log(chalk.white(`📊 Batch Configuration:`));
  console.log(chalk.gray(`   URLs: ${urls.length}`));
  console.log(chalk.gray(`   Length: ${options.length}`));
  console.log(chalk.gray(`   Platform: ${options.platform}`));
  console.log(chalk.gray(`   Style: ${options.style}`));
  console.log(chalk.gray(`   Save to DB: ${options.save ? 'Yes' : 'No'}`));

  const estimatedCost = urls.length * (
    options.length === 'tweet' ? 0.01 :
    options.length === 'short' ? 0.02 :
    options.length === 'medium' ? 0.03 : 0.05
  );
  console.log(chalk.yellow(`   Estimated Cost: ~$${estimatedCost.toFixed(2)}\n`));

  // Confirm before proceeding
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(chalk.cyan(`🚀 Generate ${urls.length} articles? (y/n): `), resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log(chalk.yellow('\n✖ Batch generation cancelled\n'));
    process.exit(0);
  }

  console.log('');

  // Process each URL
  const results: BatchResult[] = [];
  const delay = options.delay || 2000; // Default 2 second delay between articles

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const progress = chalk.gray(`[${i + 1}/${urls.length}]`);

    console.log(chalk.bold.white(`${progress} Processing: ${url.slice(0, 60)}...`));

    try {
      const result = await generateSingleArticle(url, options);
      results.push(result);

      if (result.success) {
        console.log(chalk.green(`  ✓ Success: ${result.title}`));
        if (result.articleId) {
          console.log(chalk.gray(`    ID: ${result.articleId.slice(0, 8)}... • ${result.wordCount} words`));
        }
      } else {
        console.log(chalk.red(`  ✗ Failed: ${result.error}`));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        url,
        success: false,
        error: errorMessage,
      });
      console.log(chalk.red(`  ✗ Error: ${errorMessage}`));
    }

    // Add delay between requests (except for last one)
    if (i < urls.length - 1) {
      console.log(chalk.dim(`  ⏱️  Waiting ${delay / 1000}s...\n`));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Display summary
  console.log('\n' + chalk.bold.cyan('═'.repeat(70)));
  console.log(chalk.bold.white('  BATCH SUMMARY'));
  console.log(chalk.bold.cyan('═'.repeat(70)));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalWords = results.reduce((sum, r) => sum + (r.wordCount || 0), 0);

  console.log(chalk.green(`\n✓ Successful: ${successful}/${urls.length}`));
  if (failed > 0) {
    console.log(chalk.red(`✗ Failed: ${failed}/${urls.length}`));
  }
  console.log(chalk.white(`📝 Total Words: ${totalWords.toLocaleString()}`));
  console.log(chalk.yellow(`💰 Estimated Cost: ~$${estimatedCost.toFixed(2)}`));

  if (successful > 0) {
    console.log(chalk.cyan('\n📚 View Generated Articles:'));
    console.log(chalk.gray('  npm run articles list\n'));
  }

  if (failed > 0) {
    console.log(chalk.yellow('\n⚠️  Failed URLs:'));
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(chalk.gray(`  • ${r.url}`));
        console.log(chalk.dim(`    ${r.error}\n`));
      });
  }

  console.log(chalk.bold.cyan('═'.repeat(70)) + '\n');
}

/**
 * Generate a single article
 */
async function generateSingleArticle(
  url: string,
  options: BatchOptions
): Promise<BatchResult> {
  try {
    // Create voice generator
    const config: Partial<VoiceConfig> = {
      length: options.length,
      platform: options.platform,
      style: options.style,
      tone: {
        humor: options.humor ?? 4,
        urgency: options.urgency ?? 7,
        optimism: options.optimism ?? 6,
        criticism: options.criticism ?? 5,
      },
    };

    const generator = createAIVoiceGenerator(config);

    // Fetch content
    const fetcher = createContentFetcher();
    const fetchedContent = await fetcher.fetch(url);

    // Create mock story
    const keywords = extractKeywords(fetchedContent.title + ' ' + fetchedContent.content.slice(0, 500));
    const mockStory: StoryResult = {
      id: `story-${Date.now()}`,
      title: fetchedContent.title,
      url: fetchedContent.url,
      contentSnippet: fetchedContent.excerpt || '',
      publishedAt: fetchedContent.publishedDate || new Date(),
      score: 100,
      commentCount: 0,
      engagementVelocity: 0,
      keywords,
      topics: keywords.slice(0, 3),
      media: [],
      sourceId: 'batch',
      sourceName: fetchedContent.author || 'News Radar',
      detectedAt: new Date(),
      status: 'flagged',
    };

    // Generate article
    const article = await generator.generate(mockStory, fetchedContent);

    // Save to database if enabled
    let articleId: string | undefined;
    if (options.save) {
      const dbService = createDatabaseService();
      const dbArticle = await dbService.saveArticleWithSources(
        article,
        [fetchedContent],
        {
          length: options.length,
          platform: options.platform,
          style: options.style,
          tone: config.tone!,
        }
      );
      articleId = dbArticle.id;
    }

    // Save to file
    const outputDir = 'drafts';
    const timestamp = new Date().toISOString().split('T')[0];
    const slug = article.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40);
    const filename = `${timestamp}-${slug}.md`;

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(`${outputDir}/${filename}`, article.content, 'utf-8');

    return {
      url,
      success: true,
      articleId,
      title: article.title,
      wordCount: article.wordCount,
      cost: options.length === 'tweet' ? 0.01 :
            options.length === 'short' ? 0.02 :
            options.length === 'medium' ? 0.03 : 0.05,
    };

  } catch (error) {
    return {
      url,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);
}

// Create batch command
const batchCommand = new Command('batch')
  .description('Generate multiple articles at once')
  .option('--urls <urls>', 'Comma-separated list of URLs')
  .option('--file <path>', 'File containing URLs (one per line)')
  .option('-l, --length <length>', 'Article length (tweet, short, medium, long)', 'medium')
  .option('-p, --platform <platform>', 'Target platform (facebook, linkedin, newsletter, blog)', 'newsletter')
  .option('--style <style>', 'Writing style (conversational, academic)', 'conversational')
  .option('--humor <number>', 'Humor level (0-10)', '4')
  .option('--urgency <number>', 'Urgency level (0-10)', '7')
  .option('--optimism <number>', 'Optimism level (0-10)', '6')
  .option('--criticism <number>', 'Criticism level (0-10)', '5')
  .option('--save', 'Save articles to database (enabled by default)', true)
  .option('--no-save', 'Skip saving to database')
  .option('--delay <ms>', 'Delay between articles in milliseconds', '2000')
  .action(async (cmdOptions) => {
    const urls = cmdOptions.urls ? cmdOptions.urls.split(',').map((u: string) => u.trim()) : undefined;

    const options: BatchOptions = {
      urls,
      file: cmdOptions.file as string | undefined,
      length: (cmdOptions.length as BatchOptions['length']) || 'medium',
      platform: (cmdOptions.platform as BatchOptions['platform']) || 'newsletter',
      style: (cmdOptions.style as BatchOptions['style']) || 'conversational',
      humor: parseInt(cmdOptions.humor as string, 10),
      urgency: parseInt(cmdOptions.urgency as string, 10),
      optimism: parseInt(cmdOptions.optimism as string, 10),
      criticism: parseInt(cmdOptions.criticism as string, 10),
      save: cmdOptions.save !== false,
      delay: parseInt(cmdOptions.delay as string, 10),
    };

    await executeBatch(options);
  });

// Parse and run
const program = new Command();
program.addCommand(batchCommand);
program.parse();
