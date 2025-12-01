#!/usr/bin/env node

/**
 * @fileoverview Image command - Generate social media graphics
 * @description CLI command for generating images for articles
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createImageGenerator, type ImageOptions, type GenerateMode } from './services/image-generator.js';
import { createDatabaseService } from './services/database.js';

/**
 * Image command options
 */
interface ImageCommandOptions {
  title?: string;
  articleId?: string;
  platform: 'facebook' | 'linkedin' | 'twitter' | 'instagram' | 'blog';
  style: 'modern' | 'minimal' | 'bold' | 'gradient' | 'photo';
  dalle?: boolean;
  free?: boolean;
  placeholder?: boolean;
  output?: string;
}

/**
 * Execute image generation
 */
async function executeImage(options: ImageCommandOptions): Promise<void> {
  const spinner = ora('Initializing image generator...').start();

  try {
    const generator = createImageGenerator();

    // Determine generation mode
    let mode: GenerateMode = 'free'; // Default to free AI
    if (options.placeholder) {
      mode = 'placeholder';
    } else if (options.dalle) {
      mode = 'dalle';
    } else if (options.free) {
      mode = 'free';
    }

    // Check if DALL-E is available when requested
    const canUseDallE = generator.isDallEAvailable();
    if (mode === 'dalle' && !canUseDallE) {
      spinner.warn(chalk.yellow('DALL-E requested but OPENAI_API_KEY not set. Using free AI (Pollinations).'));
      mode = 'free';
    }

    const modeLabels: Record<GenerateMode, string> = {
      dalle: 'DALL-E 3 (premium)',
      free: 'Pollinations.ai (free)',
      placeholder: 'SVG placeholder (instant)',
    };
    spinner.succeed(chalk.green(`Image generator ready! Mode: ${modeLabels[mode]}`));

    // Get title from options or article
    let title = options.title;
    let excerpt: string | undefined;
    let keywords: string[] | undefined;

    if (options.articleId) {
      spinner.start('Loading article from database...');
      const dbService = createDatabaseService();
      const article = await dbService.getArticle(options.articleId);

      if (!article) {
        spinner.fail(chalk.red('Article not found'));
        process.exit(1);
      }

      title = article.title;
      excerpt = article.excerpt || undefined;
      keywords = article.keywords || undefined;
      spinner.succeed(chalk.green(`Loaded: ${title}`));
    }

    if (!title) {
      spinner.fail(chalk.red('No title provided. Use --title or --article-id'));
      console.log(chalk.gray('\nExamples:'));
      console.log(chalk.gray('  npm run image -- --title "Your Article Title"'));
      console.log(chalk.gray('  npm run image -- --article-id abc123'));
      process.exit(1);
    }

    // Generate image
    const spinnerMessages: Record<GenerateMode, string> = {
      dalle: 'Generating AI image with DALL-E 3...',
      free: 'Generating AI image with Pollinations.ai (free)...',
      placeholder: 'Generating placeholder image...',
    };
    spinner.start(spinnerMessages[mode]);

    const imageOptions: ImageOptions = {
      title,
      excerpt,
      keywords,
      platform: options.platform,
      style: options.style,
    };

    const result = await generator.generate(imageOptions, mode);

    spinner.succeed(chalk.green('Image generated!'));

    // Display results
    console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
    console.log(chalk.bold.white('  GENERATED IMAGE'));
    console.log(chalk.bold.cyan('═'.repeat(60)));

    console.log(chalk.white(`\nTitle: ${title}`));
    console.log(chalk.white(`Platform: ${result.platform}`));
    console.log(chalk.white(`Dimensions: ${result.width}x${result.height}`));
    console.log(chalk.white(`Style: ${result.style}`));

    if (result.localPath) {
      console.log(chalk.green(`\n✓ Saved to: ${result.localPath}`));
    }

    if (result.url) {
      console.log(chalk.cyan(`\n🔗 URL: ${result.url}`));
      console.log(chalk.dim('(URL expires in 1 hour)'));
    }

    console.log(chalk.gray(`\nPrompt used:\n${result.prompt.slice(0, 200)}...`));

    console.log(chalk.bold.cyan('═'.repeat(60)) + '\n');

    // Cost info based on generation mode
    if (result.source === 'dalle') {
      const isSquare = options.platform === 'instagram';
      const cost = isSquare ? '$0.04' : '$0.08';
      console.log(chalk.yellow(`💰 DALL-E 3 cost: ~${cost} per image\n`));
    } else if (result.source === 'pollinations') {
      console.log(chalk.green('✨ Generated for FREE with Pollinations.ai\n'));
    } else {
      console.log(chalk.gray('📝 SVG placeholder - no API cost\n'));
    }

  } catch (error) {
    spinner.fail(chalk.red('Image generation failed'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

/**
 * Generate images for multiple platforms
 */
async function executeMultiPlatform(title: string, platforms: string[], style: string, mode: GenerateMode): Promise<void> {
  const modeLabels: Record<GenerateMode, string> = {
    dalle: 'DALL-E 3 (premium)',
    free: 'Pollinations.ai (free)',
    placeholder: 'SVG placeholder',
  };
  console.log(chalk.bold.cyan('\n📸 MULTI-PLATFORM IMAGE GENERATION'));
  console.log(chalk.gray(`Mode: ${modeLabels[mode]}\n`));

  const generator = createImageGenerator();
  const results: Array<{ platform: string; path?: string; source?: string; error?: string }> = [];

  for (const platform of platforms) {
    const spinner = ora(`Generating ${platform} image...`).start();

    try {
      const result = await generator.generate(
        {
          title,
          platform: platform as ImageOptions['platform'],
          style: style as ImageOptions['style'],
        },
        mode
      );

      results.push({ platform, path: result.localPath, source: result.source });
      spinner.succeed(chalk.green(`${platform}: ${result.localPath}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({ platform, error: message });
      spinner.fail(chalk.red(`${platform}: ${message}`));
    }

    // Small delay between API calls (except placeholder)
    if (mode !== 'placeholder' && platforms.indexOf(platform) < platforms.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
  console.log(chalk.bold.white('  SUMMARY'));
  console.log(chalk.bold.cyan('═'.repeat(60)));

  const successful = results.filter(r => r.path).length;
  console.log(chalk.green(`\n✓ Generated: ${successful}/${platforms.length} images`));

  if (successful > 0) {
    console.log(chalk.gray('\nFiles created:'));
    results.filter(r => r.path).forEach(r => {
      console.log(chalk.gray(`  • ${r.path}`));
    });
  }

  console.log('');
}

// Create image command
const imageCommand = new Command('generate')
  .description('Generate social media graphics for articles')
  .option('-t, --title <title>', 'Article title to generate image for')
  .option('-a, --article-id <id>', 'Load title from saved article')
  .option('-p, --platform <platform>', 'Target platform (facebook, linkedin, twitter, instagram, blog)', 'facebook')
  .option('-s, --style <style>', 'Visual style (modern, minimal, bold, gradient, photo)', 'gradient')
  .option('--dalle', 'Use DALL-E 3 (premium, ~$0.04-0.08/image)')
  .option('--free', 'Use Pollinations.ai (free AI, default)')
  .option('--placeholder', 'Use SVG placeholder (instant, no API)')
  .option('-o, --output <path>', 'Custom output path')
  .action(async (cmdOptions) => {
    const options: ImageCommandOptions = {
      title: cmdOptions.title as string | undefined,
      articleId: cmdOptions.articleId as string | undefined,
      platform: (cmdOptions.platform as ImageCommandOptions['platform']) || 'facebook',
      style: (cmdOptions.style as ImageCommandOptions['style']) || 'gradient',
      dalle: cmdOptions.dalle as boolean | undefined,
      free: cmdOptions.free as boolean | undefined,
      placeholder: cmdOptions.placeholder as boolean | undefined,
      output: cmdOptions.output as string | undefined,
    };

    await executeImage(options);
  });

// Multi-platform subcommand
const multiCommand = new Command('multi')
  .description('Generate images for multiple platforms at once')
  .requiredOption('-t, --title <title>', 'Article title')
  .option('-p, --platforms <platforms>', 'Comma-separated platforms', 'facebook,linkedin,twitter')
  .option('-s, --style <style>', 'Visual style', 'gradient')
  .option('--dalle', 'Use DALL-E 3 (premium)')
  .option('--free', 'Use Pollinations.ai (free, default)')
  .option('--placeholder', 'Use SVG placeholder')
  .action(async (cmdOptions) => {
    const platforms = (cmdOptions.platforms as string).split(',').map(p => p.trim());

    // Determine mode
    let mode: GenerateMode = 'free';
    if (cmdOptions.placeholder) mode = 'placeholder';
    else if (cmdOptions.dalle) mode = 'dalle';

    await executeMultiPlatform(
      cmdOptions.title as string,
      platforms,
      cmdOptions.style as string || 'gradient',
      mode
    );
  });

// Parse and run
const program = new Command('image')
  .description('Generate social media graphics');

program.addCommand(imageCommand);
program.addCommand(multiCommand);

// Default action shows help
program.action(() => {
  program.help();
});

program.parse();
