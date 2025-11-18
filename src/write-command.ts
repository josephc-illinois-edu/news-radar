#!/usr/bin/env node

/**
 * @fileoverview Write command - Generate articles from stories
 * @description CLI command to generate articles in Joe's voice
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { createVoiceGenerator } from './generators/voice.js';
import type { StoryResult, VoiceConfig } from './types.js';

/**
 * Write command options
 */
interface WriteOptions {
  story?: string;
  url?: string;
  length: 'tweet' | 'short' | 'medium' | 'long';
  platform: 'facebook' | 'linkedin' | 'newsletter' | 'blog';
  style: 'conversational' | 'academic';
  output?: string;
  humor?: number;
  urgency?: number;
  optimism?: number;
  criticism?: number;
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
    // Create voice generator with tone settings
    const config: Partial<VoiceConfig> = {
      length: options.length,
      platform: options.platform,
      tone: {
        humor: options.humor ?? 4,
        urgency: options.urgency ?? 7,
        optimism: options.optimism ?? 6,
        criticism: options.criticism ?? 5,
      },
    };

    const generator = createVoiceGenerator(config);

    spinner.text = 'Analyzing story...';
    
    if (!options.story && !options.url) {
      spinner.fail(chalk.red('Please provide --story or --url'));
      console.log(chalk.yellow('\nExamples:'));
      console.log(chalk.gray('  npm run write -- --story "AI Model Breakthrough"'));
      console.log(chalk.gray('  npm run write -- --url "https://example.com/article"'));
      process.exit(1);
    }

    // Create story from user input
    const storyTitle = options.story || 'Emerging Story';
    const keywords = extractKeywordsFromTitle(storyTitle);
    
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

    // Build detailed content snippet based on story keywords
    let contentSnippet = `Analysis of "${storyTitle}" and its implications for American democracy and leadership.`;

    // Add specific context for Epstein-related stories
    if (storyTitle.toLowerCase().includes('epstein')) {
      contentSnippet = `The House of Representatives voted overwhelmingly to release Department of Justice files related to Jeffrey Epstein's criminal case. ` +
        `The vote came after Trump and Republican leadership dropped their previous resistance to disclosure. ` +
        `These files are expected to contain documentation of Epstein's connections to powerful figures in politics and business, ` +
        `including details that have been sealed for years. The sudden reversal by Republicans who had blocked release ` +
        `suggests the political cost of continued obstruction outweighed the risks of disclosure. ` +
        `Survivors of Epstein's trafficking operation have been demanding transparency for years, arguing that the public deserves ` +
        `to know which officials and executives were aware of or complicit in his crimes. The vote represents a significant shift ` +
        `in the long battle for accountability in one of the most high-profile criminal cases in recent history.`;
    }

    const mockStory: StoryResult = {
      id: `story-${Date.now()}`,
      title: storyTitle,
      url: options.url || `https://example.com/${storyTitle.toLowerCase().replace(/\s+/g, '-')}`,
      contentSnippet,
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      score: 450,
      commentCount: 89,
      engagementVelocity: 156,
      keywords: keywords.length > 0 ? keywords : ['politics', 'current-events', 'analysis'],
      topics: keywords.length > 0 ? [keywords[0]] : ['politics'],
      media: [],
      sourceId: 'news-radar',
      sourceName: 'News Radar',
      detectedAt: new Date(),
      status: 'flagged',
    };

    spinner.text = `Generating article in your ${options.style} voice...`;
    const article = generator.generate(mockStory);

    spinner.succeed(chalk.green(`Article generated in ${options.style} style!`));

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
    console.log(chalk.white(`Keywords: ${keywords.join(', ')}`));
    console.log(chalk.white(`Word Count: ${article.wordCount}`));
    console.log(chalk.white(`Reading Time: ${article.readingTimeMinutes} minutes`));
    console.log(chalk.white(`Platform: ${article.platform}`));
    console.log(chalk.white(`Hashtags: ${article.suggestedHashtags.join(' ')}`));
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
  .option('-u, --url <url>', 'Story URL')
  .option('-l, --length <length>', 'Article length (tweet, short, medium, long)', 'medium')
  .option('-p, --platform <platform>', 'Target platform (facebook, linkedin, newsletter, blog)', 'newsletter')
  .option('--style <style>', 'Writing style (conversational, academic)', 'conversational')
  .option('-o, --output <path>', 'Output file path')
  .option('--humor <number>', 'Humor level (0-10)', '4')
  .option('--urgency <number>', 'Urgency level (0-10)', '7')
  .option('--optimism <number>', 'Optimism level (0-10)', '6')
  .option('--criticism <number>', 'Criticism level (0-10)', '5')
  .action(async (cmdOptions) => {
    const options: WriteOptions = {
      story: cmdOptions.story as string | undefined,
      url: cmdOptions.url as string | undefined,
      length: (cmdOptions.length as WriteOptions['length']) || 'medium',
      platform: (cmdOptions.platform as WriteOptions['platform']) || 'newsletter',
      style: (cmdOptions.style as WriteOptions['style']) || 'conversational',
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
