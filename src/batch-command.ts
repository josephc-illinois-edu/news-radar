#!/usr/bin/env node

/**
 * @fileoverview Batch command - Generate multiple articles at once
 * @description CLI command for batch article generation from multiple URLs
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import { createAIVoiceGenerator } from './generators/ai-voice.js';
import { createContentFetcher } from './utils/content-fetcher.js';
import { createDatabaseService } from './services/database.js';
import { createImageGenerator } from './services/image-generator.js';
import { generateVoiceInstructions, type VoiceProfile } from './utils/voice-analyzer.js';
import { getRandomAngles, buildVariationPrompt } from './utils/variation-generator.js';
import type { StoryResult, VoiceConfig } from './types.js';

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
  voice?: string;           // Voice profile name
  variations?: number;      // Number of variations per article
  yes?: boolean;            // Auto-confirm
  images?: boolean;         // Generate images
  imageStyle?: 'modern' | 'minimal' | 'bold' | 'gradient' | 'photo';
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
  imagePath?: string;
  variationCount?: number;
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

  // Load voice profile if specified
  let voiceProfile: VoiceProfile | null = null;
  let voiceInstructions: string | null = null;

  if (options.voice) {
    try {
      const voicePath = `voices/${options.voice}.json`;
      const voiceContent = await fs.readFile(voicePath, 'utf-8');
      voiceProfile = JSON.parse(voiceContent);
      voiceInstructions = generateVoiceInstructions(voiceProfile!);
      console.log(chalk.green(`✓ Loaded voice profile: ${voiceProfile!.name}\n`));
    } catch (error) {
      console.log(chalk.yellow(`⚠ Voice profile "${options.voice}" not found, using default\n`));
    }
  }

  // Show batch summary
  console.log(chalk.white(`📊 Batch Configuration:`));
  console.log(chalk.gray(`   URLs: ${urls.length}`));
  console.log(chalk.gray(`   Length: ${options.length}`));
  console.log(chalk.gray(`   Platform: ${options.platform}`));
  console.log(chalk.gray(`   Style: ${options.style}`));
  if (options.voice) {
    console.log(chalk.gray(`   Voice: ${options.voice}`));
  }
  if (options.variations && options.variations > 1) {
    console.log(chalk.gray(`   Variations: ${options.variations} per article`));
  }
  console.log(chalk.gray(`   Save to DB: ${options.save ? 'Yes' : 'No'}`));
  if (options.images) {
    console.log(chalk.gray(`   Images: Yes (${options.imageStyle || 'gradient'} style)`));
  }

  const variationMultiplier = options.variations && options.variations > 1 ? options.variations : 1;
  const baseCost = options.length === 'tweet' ? 0.01 :
    options.length === 'short' ? 0.02 :
    options.length === 'medium' ? 0.03 : 0.05;
  const imageCost = options.images ? 0.04 : 0;
  const estimatedCost = urls.length * (baseCost * variationMultiplier + imageCost);
  console.log(chalk.yellow(`   Estimated Cost: ~$${estimatedCost.toFixed(2)}\n`));

  // Confirm before proceeding (skip if --yes)
  if (!options.yes) {
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
  } else {
    console.log(chalk.gray('✓ Auto-confirmed with --yes flag\n'));
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
      const result = await generateSingleArticle(url, options, voiceInstructions);
      results.push(result);

      if (result.success) {
        console.log(chalk.green(`  ✓ Success: ${result.title}`));
        const details: string[] = [];
        if (result.articleId) details.push(`ID: ${result.articleId.slice(0, 8)}...`);
        if (result.wordCount) details.push(`${result.wordCount} words`);
        if (result.variationCount) details.push(`${result.variationCount} variations`);
        if (result.imagePath) details.push(`📷 ${result.imagePath.split('/').pop()}`);
        if (details.length > 0) {
          console.log(chalk.gray(`    ${details.join(' • ')}`));
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
  options: BatchOptions,
  voiceInstructions: string | null
): Promise<BatchResult> {
  try {
    // Create voice generator with optional voice profile
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
      voiceInstructions: voiceInstructions || undefined,
    };

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

    let articles: Array<{ article: any; variationIndex?: number }> = [];
    const variationCount = options.variations && options.variations > 1 ? Math.min(options.variations, 5) : 1;

    if (variationCount > 1) {
      // Generate multiple variations
      const angles = getRandomAngles(variationCount);
      for (let i = 0; i < variationCount; i++) {
        const angle = angles[i];
        const variationPrompt = buildVariationPrompt(angle, voiceInstructions || undefined);
        const varConfig = { ...config, voiceInstructions: variationPrompt };
        const generator = createAIVoiceGenerator(varConfig);
        const article = await generator.generate(mockStory, fetchedContent);
        articles.push({ article, variationIndex: i + 1 });
      }
    } else {
      // Single article
      const generator = createAIVoiceGenerator(config);
      const article = await generator.generate(mockStory, fetchedContent);
      articles.push({ article });
    }

    // Save articles to database and files
    let articleId: string | undefined;
    const outputDir = 'drafts';
    const timestamp = new Date().toISOString().split('T')[0];

    await fs.mkdir(outputDir, { recursive: true });

    for (const { article, variationIndex } of articles) {
      // Save to database if enabled
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
        if (!articleId) articleId = dbArticle.id; // Keep first article ID
      }

      // Save to file
      const slug = article.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40);
      const varSuffix = variationIndex ? `-v${variationIndex}` : '';
      const filename = `${timestamp}-${slug}${varSuffix}.md`;
      await fs.writeFile(`${outputDir}/${filename}`, article.content, 'utf-8');
    }

    // Generate image if enabled
    let imagePath: string | undefined;
    if (options.images) {
      try {
        const imageGenerator = createImageGenerator();
        const imageResult = await imageGenerator.generate({
          title: articles[0].article.title,
          excerpt: fetchedContent.excerpt || undefined,
          keywords,
          platform: options.platform as any,
          style: options.imageStyle || 'gradient',
        }, false); // Use placeholder by default in batch mode
        imagePath = imageResult.localPath;
      } catch (error) {
        // Don't fail the whole article if image generation fails
        console.warn(`  ⚠ Image generation failed: ${error instanceof Error ? error.message : error}`);
      }
    }

    const baseCost = options.length === 'tweet' ? 0.01 :
          options.length === 'short' ? 0.02 :
          options.length === 'medium' ? 0.03 : 0.05;

    return {
      url,
      success: true,
      articleId,
      title: articles[0].article.title,
      wordCount: articles.reduce((sum, a) => sum + (a.article.wordCount || 0), 0),
      cost: baseCost * variationCount + (options.images ? 0.04 : 0),
      imagePath,
      variationCount: variationCount > 1 ? variationCount : undefined,
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
  .option('--voice <name>', 'Use trained voice profile')
  .option('--variations <number>', 'Generate N variations per article (1-5)', '1')
  .option('--humor <number>', 'Humor level (0-10)', '4')
  .option('--urgency <number>', 'Urgency level (0-10)', '7')
  .option('--optimism <number>', 'Optimism level (0-10)', '6')
  .option('--criticism <number>', 'Criticism level (0-10)', '5')
  .option('--save', 'Save articles to database (enabled by default)', true)
  .option('--no-save', 'Skip saving to database')
  .option('-y, --yes', 'Auto-confirm prompts (skip interactive confirmation)')
  .option('--images', 'Generate social media images for each article')
  .option('--image-style <style>', 'Image style (modern, minimal, bold, gradient, photo)', 'gradient')
  .option('--delay <ms>', 'Delay between articles in milliseconds', '2000')
  .action(async (cmdOptions) => {
    const urls = cmdOptions.urls ? cmdOptions.urls.split(',').map((u: string) => u.trim()) : undefined;

    const options: BatchOptions = {
      urls,
      file: cmdOptions.file as string | undefined,
      length: (cmdOptions.length as BatchOptions['length']) || 'medium',
      platform: (cmdOptions.platform as BatchOptions['platform']) || 'newsletter',
      style: (cmdOptions.style as BatchOptions['style']) || 'conversational',
      voice: cmdOptions.voice as string | undefined,
      variations: parseInt(cmdOptions.variations as string, 10) || 1,
      humor: parseInt(cmdOptions.humor as string, 10),
      urgency: parseInt(cmdOptions.urgency as string, 10),
      optimism: parseInt(cmdOptions.optimism as string, 10),
      criticism: parseInt(cmdOptions.criticism as string, 10),
      save: cmdOptions.save !== false,
      yes: cmdOptions.yes as boolean || false,
      images: cmdOptions.images as boolean || false,
      imageStyle: (cmdOptions.imageStyle as BatchOptions['imageStyle']) || 'gradient',
      delay: parseInt(cmdOptions.delay as string, 10),
    };

    await executeBatch(options);
  });

// Parse and run
const program = new Command();
program.addCommand(batchCommand);
program.parse();
