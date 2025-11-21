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
    let savedArticleId: string | undefined;
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
        savedArticleId = dbArticle.id;
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
      preview: cmdOptions.preview as boolean || false,
      save: cmdOptions.save !== false, // Enabled by default unless --no-save is used
      output: cmdOptions.output as string | undefined,
      humor: parseInt(cmdOptions.humor as string, 10),
      urgency: parseInt(cmdOptions.urgency as string, 10),
      optimism: parseInt(cmdOptions.optimism as string, 10),
      criticism: parseInt(cmdOptions.criticism as string, 10),
    };

    await executeWrite(options);
  });

// Parse and run
const program = new Command();
program.addCommand(writeCommand);
program.parse();
