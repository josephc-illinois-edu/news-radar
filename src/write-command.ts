#!/usr/bin/env node

/**
 * @fileoverview Write command - Generate articles from stories
 * @description CLI command to generate articles in Joseph's voice
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
import { generateVoiceInstructions, type VoiceProfile } from './utils/voice-analyzer.js';
import { getRandomAngles, buildVariationPrompt, createVariationMetadata, type VariationAngle } from './utils/variation-generator.js';
import prompts from 'prompts';
import type { StoryResult, VoiceConfig } from './types.js';
import type { FetchedContent } from './utils/content-fetcher.js';

/**
 * Write command options
 */
interface WriteOptions {
  story?: string;
  url?: string | string[];
  length: 'tweet' | 'short' | 'medium' | 'long';
  platform: 'facebook' | 'linkedin' | 'newsletter' | 'blog';
  style: 'conversational' | 'academic';
  output?: string;
  humor?: number;
  urgency?: number;
  optimism?: number;
  criticism?: number;
  preview?: boolean;
  save?: boolean;
  voice?: string;
  variations?: number;
}

/**
 * Generate multiple article variations
 */
async function generateVariations(
  count: number,
  baseOptions: WriteOptions,
  mockStory: StoryResult,
  combinedContent: FetchedContent | undefined,
  _voiceProfile: VoiceProfile | null,
  voiceInstructions: string | null
): Promise<Array<{ article: any; angle: VariationAngle; metadata: any }>> {
  const spinner = ora(`Generating ${count} variations with different angles...`).start();

  try {
    // Get random angles for variations
    const angles = getRandomAngles(count);
    const variations: Array<{ article: any; angle: VariationAngle; metadata: any }> = [];

    // Generate each variation
    for (let i = 0; i < count; i++) {
      const angle = angles[i];
      spinner.text = `Generating variation ${i + 1}/${count}: ${angle.name}...`;

      // Build variation-specific prompt
      const variationPrompt = buildVariationPrompt(angle, voiceInstructions || undefined);

      // Create config for this variation
      const config: Partial<VoiceConfig> = {
        length: baseOptions.length,
        platform: baseOptions.platform,
        style: baseOptions.style,
        tone: {
          humor: baseOptions.humor ?? 4,
          urgency: baseOptions.urgency ?? 7,
          optimism: baseOptions.optimism ?? 6,
          criticism: baseOptions.criticism ?? 5,
        },
        voiceInstructions: variationPrompt,
      };

      const generator = createAIVoiceGenerator(config);
      const article = await generator.generate(mockStory, combinedContent);

      // Create metadata
      const metadata = createVariationMetadata(i + 1, count, angle);

      variations.push({ article, angle, metadata });
    }

    spinner.succeed(chalk.green(`✨ Generated ${count} variations successfully!`));
    return variations;
  } catch (error) {
    spinner.fail(chalk.red('Failed to generate variations'));
    throw error;
  }
}

/**
 * Display comparison table of variations
 */
function displayVariationComparison(variations: Array<{ article: any; angle: VariationAngle; metadata: any }>) {
  console.log('\n' + chalk.bold.cyan('═'.repeat(80)));
  console.log(chalk.bold.white('  VARIATION COMPARISON'));
  console.log(chalk.bold.cyan('═'.repeat(80)));

  variations.forEach(({ article, angle }, index) => {
    console.log(chalk.bold.yellow(`\n[${index + 1}] ${angle.name.toUpperCase()}`));
    console.log(chalk.dim(angle.description));
    console.log(chalk.white(`\nTitle: ${article.title}`));

    // Calculate word count and reading time
    const words = article.content.split(/\s+/).length;
    const readingTime = Math.ceil(words / 200);
    console.log(chalk.dim(`Words: ${words} | Reading time: ${readingTime} min`));

    // Show first 200 characters of content
    const preview = article.content.substring(0, 200).replace(/\n/g, ' ');
    console.log(chalk.gray(`\nPreview: ${preview}...`));
    console.log(chalk.cyan('─'.repeat(80)));
  });

  console.log('\n');
}

/**
 * Let user select which variation(s) to save
 */
async function selectVariations(count: number): Promise<number[]> {
  const choices = [];
  for (let i = 0; i < count; i++) {
    choices.push({ title: `Variation ${i + 1}`, value: i });
  }

  const response = await prompts({
    type: 'multiselect',
    name: 'selected',
    message: 'Select which variation(s) to save (Space to select, Enter to confirm):',
    choices,
    min: 1,
  });

  if (!response.selected || response.selected.length === 0) {
    throw new Error('No variations selected');
  }

  return response.selected;
}

/**
 * Extract keywords from story title
 */
function extractKeywordsFromTitle(title: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'our'
  ]);

  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Execute write command
 */
async function executeWrite(options: WriteOptions): Promise<void> {
  const spinner = ora('Initializing voice generator...').start();

  try {
    // Create AI voice generator with tone settings
    // Load voice profile if specified
    let voiceProfile: VoiceProfile | null = null;
    let voiceInstructions: string | null = null;

    if (options.voice) {
      try {
        const voicePath = `voices/${options.voice}.json`;
        const voiceContent = await fs.readFile(voicePath, 'utf-8');
        voiceProfile = JSON.parse(voiceContent);
        voiceInstructions = generateVoiceInstructions(voiceProfile!);
        spinner.succeed(chalk.green(`Loaded voice profile: ${voiceProfile!.name}`));
        console.log(chalk.dim(`Voice: ${voiceInstructions.slice(0, 150)}...`));
        spinner.start('Initializing AI generator...');
      } catch (error) {
        spinner.fail(chalk.red(`Voice profile "${options.voice}" not found`));
        console.log(chalk.gray('\nTip: Use "npm run voice list" to see available voices\n'));
        process.exit(1);
      }
    }

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

    spinner.text = 'Initializing AI generator...';

    let generator;
    try {
      generator = createAIVoiceGenerator(config);
      spinner.succeed(chalk.green('AI generator ready!'));
    } catch (error) {
      spinner.fail(chalk.red('AI generator initialization failed'));
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red(`\n❌ ${message}\n`));
      process.exit(1);
    }

    spinner.start('Analyzing story...');

    spinner.text = 'Analyzing story...';

    if (!options.story && !options.url) {
      spinner.fail(chalk.red('Please provide --story or --url'));
      console.log(chalk.yellow('\nExamples:'));
      console.log(chalk.gray('  npm run write -- --story "AI Model Breakthrough"'));
      console.log(chalk.gray('  npm run write -- --url "https://example.com/article"'));
      console.log(chalk.gray('  npm run write -- --url "https://source1.com" --url "https://source2.com" --url "https://source3.com"'));
      process.exit(1);
    }

    // Fetch content from URL(s) if provided
    let fetchedContents: FetchedContent[] = [];
    if (options.url) {
      const urls = Array.isArray(options.url) ? options.url : [options.url];
      spinner.text = `Fetching content from ${urls.length} source${urls.length > 1 ? 's' : ''}...`;

      const fetcher = createContentFetcher();
      const fetchPromises = urls.map(async (url) => {
        try {
          return await fetcher.fetch(url);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.log(chalk.yellow(`\n⚠ Could not fetch ${url}: ${message}`));
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      fetchedContents = results.filter((r): r is FetchedContent => r !== null);

      if (fetchedContents.length > 0) {
        spinner.succeed(chalk.green(`✓ Fetched content from ${fetchedContents.length} source${fetchedContents.length > 1 ? 's' : ''}!`));
        spinner.start('Analyzing content...');
      } else {
        spinner.warn(chalk.yellow('Could not fetch any content. Continuing with title only...'));
        spinner.start('Analyzing story...');
      }
    }

    // Combine all fetched contents into a single merged content
    const combinedContent = fetchedContents.length > 0 ? {
      title: fetchedContents[0].title,
      content: fetchedContents.map(fc => fc.content).join('\n\n'),
      excerpt: fetchedContents[0].excerpt,
      author: fetchedContents.map(fc => fc.author).filter(Boolean).join(', '),
      publishedDate: fetchedContents[0].publishedDate,
      facts: [...new Set(fetchedContents.flatMap(fc => fc.facts))],
      quotes: [...new Set(fetchedContents.flatMap(fc => fc.quotes))],
      numbers: [...new Set(fetchedContents.flatMap(fc => fc.numbers))],
      url: fetchedContents[0].url,
      sources: fetchedContents, // Keep all sources for citations
    } : undefined;

    // Validate content quality - fail if insufficient
    if (combinedContent) {
      const contentQuality = {
        facts: combinedContent.facts.length,
        quotes: combinedContent.quotes.length,
        numbers: combinedContent.numbers.length,
        wordCount: combinedContent.content.split(/\s+/).length,
      };

      const hasMinimumContent =
        contentQuality.facts >= 3 ||
        contentQuality.quotes >= 2 ||
        contentQuality.wordCount >= 300;

      if (!hasMinimumContent) {
        spinner.fail(chalk.red('Insufficient content extracted from sources'));
        console.log(chalk.yellow('\n⚠ Content Quality Check Failed:'));
        console.log(chalk.gray(`  Facts extracted: ${contentQuality.facts} (need 3+)`));
        console.log(chalk.gray(`  Quotes extracted: ${contentQuality.quotes} (need 2+)`));
        console.log(chalk.gray(`  Words extracted: ${contentQuality.wordCount} (need 300+)`));
        console.log(chalk.yellow('\nThis usually means the source is paywalled or blocking scrapers.'));
        console.log(chalk.cyan('\n💡 Try these alternatives:'));
        console.log(chalk.gray('  1. Use --preview flag first to check content extraction'));
        console.log(chalk.gray('  2. Try different news sources (avoid paywalled sites)'));
        console.log(chalk.gray('  3. Search for the topic and use multiple sources:\n'));
        console.log(chalk.white('     npm run write -- --url "source1.com" --url "source2.com" --url "source3.com"\n'));
        process.exit(1);
      }

      // Show content quality for user confidence
      console.log(chalk.green(`\n✓ Content quality check passed:`));
      console.log(chalk.gray(`  ${contentQuality.facts} facts, ${contentQuality.quotes} quotes, ${contentQuality.wordCount} words`));
    } else if (options.url) {
      // URL provided but no content fetched - hard fail
      spinner.fail(chalk.red('Failed to fetch content from all sources'));
      console.log(chalk.yellow('\n⚠ All source URLs failed to load.'));
      console.log(chalk.gray('\nPossible causes:'));
      console.log(chalk.gray('  • Sites are paywalled or require login'));
      console.log(chalk.gray('  • Sites are blocking automated access'));
      console.log(chalk.gray('  • URLs are incorrect or broken'));
      console.log(chalk.cyan('\n💡 Suggestions:'));
      console.log(chalk.gray('  1. Verify URLs work in your browser'));
      console.log(chalk.gray('  2. Try news aggregator sites (often more accessible)'));
      console.log(chalk.gray('  3. Use --preview to diagnose fetch issues\n'));
      process.exit(1);
    }

    // Create story from fetched content or user input
    const storyTitle = combinedContent?.title || options.story || 'Emerging Story';
    const keywords = combinedContent
      ? [...extractKeywordsFromTitle(storyTitle), ...extractKeywordsFromTitle(combinedContent.content.slice(0, 500))]
      : extractKeywordsFromTitle(storyTitle);
    
    // Add context-specific keywords based on title content
    if (storyTitle.toLowerCase().includes('trump') || storyTitle.toLowerCase().includes('president')) {
      keywords.push('politics', 'leadership', 'government');
    }
    if (storyTitle.toLowerCase().includes('health')) {
      keywords.push('healthcare', 'policy');
    }
    if (storyTitle.toLowerCase().includes('melting') || storyTitle.toLowerCase().includes('decline')) {
      keywords.push('crisis', 'decline', 'accountability');
    }

    const primaryUrl = Array.isArray(options.url) ? options.url[0] : options.url;

    const mockStory: StoryResult = {
      id: `story-${Date.now()}`,
      title: storyTitle,
      url: combinedContent?.url || primaryUrl || `https://example.com/${storyTitle.toLowerCase().replace(/\s+/g, '-')}`,
      contentSnippet: combinedContent?.excerpt || `Analysis of "${storyTitle}" and its implications.`,
      publishedAt: combinedContent?.publishedDate || new Date(Date.now() - 3 * 60 * 60 * 1000),
      score: 450,
      commentCount: 89,
      engagementVelocity: 156,
      keywords: [...new Set(keywords)].slice(0, 10),
      topics: keywords.length > 0 ? [keywords[0]] : ['news'],
      media: [],
      sourceId: 'news-radar',
      sourceName: combinedContent?.author || 'News Radar',
      detectedAt: new Date(),
      status: 'flagged',
    };

    // Preview mode - show content and ask for confirmation
    if (options.preview && combinedContent) {
      console.log('\n' + chalk.bold.cyan('═'.repeat(70)));
      console.log(chalk.bold.white('  CONTENT PREVIEW (No API credits used yet)'));
      console.log(chalk.bold.cyan('═'.repeat(70)));

      if (fetchedContents.length > 1) {
        console.log(chalk.white(`\nSources Fetched: ${fetchedContents.length}`));
        fetchedContents.forEach((fc, i) => {
          console.log(chalk.gray(`  ${i + 1}. ${fc.url}`));
        });
      } else {
        console.log(chalk.white(`\nSource: ${combinedContent.url}`));
      }

      console.log(chalk.white(`\nTitle: ${storyTitle}`));
      if (combinedContent.author) {
        console.log(chalk.white(`Author: ${combinedContent.author}`));
      }
      if (combinedContent.publishedDate) {
        console.log(chalk.white(`Published: ${combinedContent.publishedDate.toLocaleDateString()}`));
      }

      console.log(chalk.bold.cyan('\n  EXTRACTED CONTENT'));
      console.log(chalk.white(`Facts: ${combinedContent.facts.length}`));
      if (combinedContent.facts.length > 0) {
        console.log(chalk.gray('\nTop Facts:'));
        combinedContent.facts.slice(0, 5).forEach((fact, i) => {
          console.log(chalk.gray(`  ${i + 1}. ${fact}`));
        });
      }

      console.log(chalk.white(`\nQuotes: ${combinedContent.quotes.length}`));
      if (combinedContent.quotes.length > 0) {
        console.log(chalk.gray('\nTop Quotes:'));
        combinedContent.quotes.slice(0, 3).forEach((quote, i) => {
          console.log(chalk.gray(`  ${i + 1}. "${quote}"`));
        });
      }

      console.log(chalk.white(`\nNumbers/Stats: ${combinedContent.numbers.length}`));
      if (combinedContent.numbers.length > 0) {
        console.log(chalk.gray(`  ${combinedContent.numbers.slice(0, 10).join(', ')}`));
      }

      const estimatedCost = options.length === 'tweet' ? 0.01
        : options.length === 'short' ? 0.02
        : options.length === 'medium' ? 0.03
        : 0.05;

      console.log(chalk.bold.cyan('\n  GENERATION SETTINGS'));
      console.log(chalk.white(`Length: ${options.length} (~${options.length === 'tweet' ? '280 chars' : options.length === 'short' ? '200-400 words' : options.length === 'medium' ? '500-800 words' : '1000-1500 words'})`));
      console.log(chalk.white(`Platform: ${options.platform}`));
      console.log(chalk.white(`Style: ${options.style}`));
      console.log(chalk.yellow(`\nEstimated API Cost: ~$${estimatedCost.toFixed(2)}`));

      console.log(chalk.bold.cyan('═'.repeat(70)));

      // Ask for confirmation
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(chalk.cyan('\n💰 Generate article using API credits? (y/n): '), resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log(chalk.yellow('\n✖ Article generation cancelled. No credits used.\n'));
        process.exit(0);
      }

      console.log('');
      spinner.start('User confirmed. Generating article...');
    }

    // Check if generating multiple variations
    const variationCount = Math.min(Math.max(parseInt(String(options.variations || 1)), 1), 5);

    if (variationCount > 1) {
      // Generate multiple variations
      console.log(chalk.bold.cyan(`\n📝 Generating ${variationCount} variations with different angles...\n`));

      const variations = await generateVariations(
        variationCount,
        options,
        mockStory,
        combinedContent,
        voiceProfile,
        voiceInstructions
      );

      // Display comparison
      displayVariationComparison(variations);

      // Let user select which to save
      const selectedIndices = await selectVariations(variationCount);

      // Process each selected variation
      for (const index of selectedIndices) {
        const { article, angle } = variations[index];

        console.log(chalk.bold.cyan(`\n📄 Processing variation ${index + 1}: ${angle.name}`));

        // Run plagiarism check
        if (combinedContent) {
          const plagiarismSpinner = ora('Running plagiarism check...').start();
          const plagiarismChecker = createPlagiarismChecker();
          const plagiarismResult = plagiarismChecker.check(article.content, combinedContent.content);
          plagiarismSpinner.succeed(chalk.green('Plagiarism check completed!'));
          console.log(chalk.cyan(plagiarismChecker.generateReport(plagiarismResult)));
        }

        // Save to database if enabled
        if (options.save) {
          const saveSpinner = ora('Saving to database...').start();
          try {
            const dbService = createDatabaseService();
            const dbArticle = await dbService.saveArticleWithSources(
              article,
              fetchedContents,
              {
                length: options.length,
                platform: options.platform,
                style: options.style,
                tone: {
                  humor: options.humor ?? 4,
                  urgency: options.urgency ?? 7,
                  optimism: options.optimism ?? 6,
                  criticism: options.criticism ?? 5,
                },
              }
            );
            saveSpinner.succeed(chalk.green(`✓ Saved to database (ID: ${dbArticle.id})`));
          } catch (error) {
            saveSpinner.warn(chalk.yellow('Could not save to database'));
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.log(chalk.yellow(`⚠ ${message}`));
          }
        }

        // Save to file
        const filename = `${article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}-v${index + 1}.md`;
        const filepath = `drafts/${new Date().toISOString().split('T')[0]}-${filename}`;
        await fs.writeFile(filepath, article.content);
        console.log(chalk.green(`✓ Saved to: ${filepath}`));
      }

      console.log(chalk.green(`\n✨ ${selectedIndices.length} variation(s) saved successfully!\n`));
      return;
    }

    // Single article generation (original flow)
    spinner.text = `Generating article with AI in your ${options.style} voice...`;
    if (fetchedContents.length > 1) {
      console.log(chalk.gray(`\n(Synthesizing insights from ${fetchedContents.length} sources...)\n`));
    } else {
      console.log(chalk.gray('\n(This may take 10-30 seconds depending on article length...)\n'));
    }

    const article = await generator.generate(mockStory, combinedContent);

    spinner.succeed(chalk.green(`✨ AI article generated in ${options.style} style!`));

    // Run plagiarism check if we have source content
    if (combinedContent) {
      spinner.start('Running plagiarism check against all sources...');
      const plagiarismChecker = createPlagiarismChecker();
      const plagiarismResult = plagiarismChecker.check(article.content, combinedContent.content);
      spinner.succeed(chalk.green('Plagiarism check completed!'));

      // Display plagiarism report
      console.log(chalk.cyan(plagiarismChecker.generateReport(plagiarismResult)));
    }

    // Save to database if enabled
    if (options.save) {
      spinner.start('Saving article to database...');
      try {
        const dbService = createDatabaseService();
        const dbArticle = await dbService.saveArticleWithSources(
          article,
          fetchedContents,
          {
            length: options.length,
            platform: options.platform,
            style: options.style,
            tone: {
              humor: options.humor ?? 4,
              urgency: options.urgency ?? 7,
              optimism: options.optimism ?? 6,
              criticism: options.criticism ?? 5,
            },
          }
        );
        spinner.succeed(chalk.green(`✓ Saved to database (ID: ${dbArticle.id})`));
      } catch (error) {
        spinner.warn(chalk.yellow('Could not save to database'));
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.log(chalk.yellow(`⚠ ${message}`));
        console.log(chalk.gray('(Article will still be saved to file)\n'));
      }
    }

    // Display article
    console.log('\n' + chalk.bold.cyan('═'.repeat(70)));
    console.log(chalk.bold.white(`  GENERATED ARTICLE (${options.style.toUpperCase()})`));
    console.log(chalk.bold.cyan('═'.repeat(70)) + '\n');

    console.log(article.content);

    console.log('\n' + chalk.bold.cyan('═'.repeat(70)));
    console.log(chalk.bold.white('  ARTICLE STATS'));
    console.log(chalk.bold.cyan('═'.repeat(70)));
    console.log(chalk.white(`Story: ${storyTitle}`));
    console.log(chalk.white(`Style: ${options.style}`));
    console.log(chalk.white(`Keywords: ${[...new Set(keywords)].slice(0, 8).join(', ')}`));
    console.log(chalk.white(`Word Count: ${article.wordCount}`));
    console.log(chalk.white(`Reading Time: ${article.readingTimeMinutes} minutes`));
    console.log(chalk.white(`Platform: ${article.platform}`));
    console.log(chalk.white(`Hashtags: ${article.suggestedHashtags.join(' ')}`));

    if (combinedContent) {
      console.log(chalk.bold.cyan('\n  SOURCE ANALYSIS'));
      if (fetchedContents.length > 1) {
        console.log(chalk.white(`Sources Analyzed: ${fetchedContents.length}`));
      }
      console.log(chalk.white(`Facts Extracted: ${combinedContent.facts.length}`));
      console.log(chalk.white(`Quotes Found: ${combinedContent.quotes.length}`));
      console.log(chalk.white(`Numbers/Stats: ${combinedContent.numbers.length}`));
      if (combinedContent.author) {
        console.log(chalk.white(`Author${fetchedContents.length > 1 ? 's' : ''}: ${combinedContent.author}`));
      }
      if (combinedContent.publishedDate) {
        console.log(chalk.white(`Published: ${combinedContent.publishedDate.toLocaleDateString()}`));
      }
    }

    console.log(chalk.bold.cyan('═'.repeat(70)) + '\n');

    // Save to file
    const outputDir = 'drafts';
    const timestamp = new Date().toISOString().split('T')[0];
    const slug = storyTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40);
    const stylePrefix = options.style === 'academic' ? 'academic-' : '';
    const filename = `${timestamp}-${stylePrefix}${slug}.md`;
    const outputPath = options.output || `${outputDir}/${filename}`;

    try {
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(outputPath, article.content, 'utf-8');
      console.log(chalk.green(`✓ Saved to: ${outputPath}\n`));
    } catch (error) {
      console.log(chalk.yellow(`⚠ Could not save file: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
    }

    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.gray('  1. Review and edit the draft'));
    console.log(chalk.gray('  2. Add your personal take and anecdotes'));
    console.log(chalk.gray('  3. Adjust tone if needed'));
    console.log(chalk.gray('  4. Publish to your platform\n'));

    if (options.style === 'conversational') {
      console.log(chalk.yellow('💡 Tip: Try --style academic for college-level writing\n'));
    } else {
      console.log(chalk.yellow('💡 Tip: Try without --style for conversational writing\n'));
    }

  } catch (error) {
    spinner.fail(chalk.red('Generation failed'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ Error: ${message}\n`));
    process.exit(1);
  }
}

// Create write command
const writeCommand = new Command('write')
  .description('Generate article in your voice from a story')
  .option('-s, --story <title>', 'Story title to write about')
  .option('-u, --url <url...>', 'Story URL(s) - can specify multiple times for multi-source analysis')
  .option('-l, --length <length>', 'Article length (tweet, short, medium, long)', 'medium')
  .option('-p, --platform <platform>', 'Target platform (facebook, linkedin, newsletter, blog)', 'newsletter')
  .option('--style <style>', 'Writing style (conversational, academic)', 'conversational')
  .option('--voice <name>', 'Use trained voice profile (see: npm run voice list)')
  .option('--variations <number>', 'Generate N variations with different angles (2-5)', '1')
  .option('--preview', 'Preview extracted content and confirm before using API credits')
  .option('--save', 'Save article to Supabase database (enabled by default)', true)
  .option('--no-save', 'Skip saving to database')
  .option('-o, --output <path>', 'Output file path')
  .option('--humor <number>', 'Humor level (0-10)', '4')
  .option('--urgency <number>', 'Urgency level (0-10)', '7')
  .option('--optimism <number>', 'Optimism level (0-10)', '6')
  .option('--criticism <number>', 'Criticism level (0-10)', '5')
  .action(async (cmdOptions) => {
    const options: WriteOptions = {
      story: cmdOptions.story as string | undefined,
      url: cmdOptions.url as string | string[] | undefined,
      length: (cmdOptions.length as WriteOptions['length']) || 'medium',
      platform: (cmdOptions.platform as WriteOptions['platform']) || 'newsletter',
      style: (cmdOptions.style as WriteOptions['style']) || 'conversational',
      voice: cmdOptions.voice as string | undefined,
      preview: cmdOptions.preview as boolean || false,
      save: cmdOptions.save !== false, // Enabled by default unless --no-save is used
      output: cmdOptions.output as string | undefined,
      humor: parseInt(cmdOptions.humor as string, 10),
      urgency: parseInt(cmdOptions.urgency as string, 10),
      optimism: parseInt(cmdOptions.optimism as string, 10),
      criticism: parseInt(cmdOptions.criticism as string, 10),
      variations: parseInt(cmdOptions.variations as string, 10),
    };

    await executeWrite(options);
  });

// Parse and run
const program = new Command();
program.addCommand(writeCommand);
program.parse();
