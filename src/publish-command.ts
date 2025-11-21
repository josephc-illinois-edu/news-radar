#!/usr/bin/env node
// ============================================================================
// Publish Command - Publish articles to social platforms
// ============================================================================

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { createClient } from '@supabase/supabase-js';
import { getConfigManager } from './utils/config-manager.js';
import { PublisherFactory } from './publishers/publisher-factory.js';
import { Platform, Article } from './types/publisher.js';

const program = new Command();

// Initialize Supabase client lazily
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================================================
// Configure Platform Credentials
// ============================================================================

async function configureCommand(platform: Platform) {
  console.log(chalk.bold.cyan(`\n🔐 CONFIGURE ${platform.toUpperCase()}\n`));

  const config = await getConfigManager();

  if (platform === 'facebook') {
    const answers = await prompts([
      {
        type: 'password',
        name: 'accessToken',
        message: 'Facebook Access Token:',
        validate: value => value.length > 0 || 'Access token is required',
      },
      {
        type: 'text',
        name: 'pageId',
        message: 'Facebook Page ID (optional, leave empty for profile):',
      },
    ]);

    if (!answers.accessToken) {
      console.log(chalk.red('\n✖ Configuration cancelled\n'));
      return;
    }

    config.setCredentials('facebook', {
      accessToken: answers.accessToken,
      pageId: answers.pageId || undefined,
    });

    await config.save();

    console.log(chalk.green('\n✓ Facebook configured successfully!'));
    console.log(chalk.dim('\nYour credentials are stored in .publisher-config.json (gitignored)\n'));
  } else if (platform === 'linkedin') {
    console.log(chalk.yellow('\nTo get LinkedIn credentials:'));
    console.log('1. Create a LinkedIn App: https://www.linkedin.com/developers/apps');
    console.log('2. Add OAuth 2.0 scopes: w_member_social, r_liteprofile');
    console.log('3. Get your Access Token and Member URN\n');

    const answers = await prompts([
      {
        type: 'password',
        name: 'accessToken',
        message: 'LinkedIn Access Token:',
        validate: value => value.length > 0 || 'Access token is required',
      },
      {
        type: 'text',
        name: 'authorUrn',
        message: 'LinkedIn Author URN (format: urn:li:person:XXXXXXXXXX):',
        validate: value => value.startsWith('urn:li:person:') || 'Must start with urn:li:person:',
      },
    ]);

    if (!answers.accessToken || !answers.authorUrn) {
      console.log(chalk.red('\n✖ Configuration cancelled\n'));
      return;
    }

    config.setCredentials('linkedin', {
      accessToken: answers.accessToken,
      authorUrn: answers.authorUrn,
    });

    await config.save();

    console.log(chalk.green('\n✓ LinkedIn configured successfully!'));
    console.log(chalk.dim('\nYour credentials are stored in .publisher-config.json (gitignored)\n'));
  } else {
    console.log(chalk.red(`\n✖ Platform ${platform} configuration not yet implemented\n`));
  }
}

// ============================================================================
// List Configured Platforms
// ============================================================================

async function listCommand() {
  console.log(chalk.bold.cyan('\n📋 CONFIGURED PLATFORMS\n'));

  const config = await getConfigManager();
  const platforms = config.getConfiguredPlatforms();

  if (platforms.length === 0) {
    console.log(chalk.yellow('No platforms configured yet.\n'));
    console.log(chalk.dim('Run: npm run publish config <platform>\n'));
    return;
  }

  const allCreds = config.getAllCredentials(true);

  platforms.forEach(platform => {
    console.log(chalk.green(`✓ ${platform}`));
    const creds = allCreds[platform];
    if (creds) {
      Object.entries(creds).forEach(([key, value]) => {
        console.log(chalk.dim(`  ${key}: ${value}`));
      });
    }
    console.log();
  });
}

// ============================================================================
// Publish Article
// ============================================================================

async function publishCommand(articleId: string, options: any) {
  const spinner = ora('Loading article...').start();

  try {
    const supabase = getSupabaseClient();

    // Fetch article from database
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (error || !article) {
      spinner.fail(chalk.red('Article not found'));
      console.log(chalk.dim(`\nArticle ID: ${articleId}\n`));
      return;
    }

    spinner.succeed(chalk.green('Article loaded'));
    console.log(chalk.bold(`\n📰 "${article.title}"`));
    console.log(chalk.dim(`ID: ${article.id}\n`));

    // Get platforms to publish to
    let platforms: Platform[] = [];
    if (options.platforms) {
      platforms = options.platforms.split(',').map((p: string) => p.trim() as Platform);
    } else {
      // Prompt user to select platforms
      const config = await getConfigManager();
      const configuredPlatforms = config.getConfiguredPlatforms();

      if (configuredPlatforms.length === 0) {
        console.log(chalk.red('No platforms configured.\n'));
        console.log(chalk.dim('Run: npm run publish config <platform>\n'));
        return;
      }

      const answer = await prompts({
        type: 'multiselect',
        name: 'platforms',
        message: 'Select platforms to publish to:',
        choices: configuredPlatforms.map(p => ({ title: p, value: p })),
        min: 1,
      });

      if (!answer.platforms || answer.platforms.length === 0) {
        console.log(chalk.red('\n✖ No platforms selected\n'));
        return;
      }

      platforms = answer.platforms;
    }

    // Handle scheduling
    let scheduledFor: Date | undefined;
    if (options.schedule) {
      scheduledFor = new Date(options.schedule);
      if (isNaN(scheduledFor.getTime())) {
        console.log(chalk.red('\n✖ Invalid schedule date format\n'));
        console.log(chalk.dim('Use ISO format: 2025-11-22T14:00:00\n'));
        return;
      }
    }

    // Publish to each platform
    console.log(chalk.bold.cyan(`\n📤 PUBLISHING TO ${platforms.length} PLATFORM(S)\n`));

    for (const platform of platforms) {
      const platformSpinner = ora(`Publishing to ${platform}...`).start();

      try {
        const publisher = PublisherFactory.create(platform);
        const articleData: Article = {
          id: article.id,
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          tags: article.tags || [],
          source_urls: article.source_urls || [],
          created_at: article.created_at,
          metadata: article.metadata,
        };

        let result;
        if (scheduledFor) {
          result = await publisher.schedule(articleData, scheduledFor);
        } else {
          result = await publisher.publish(articleData);
        }

        if (result.success) {
          platformSpinner.succeed(chalk.green(`Published to ${platform}`));
          if (result.postUrl) {
            console.log(chalk.dim(`  URL: ${result.postUrl}`));
          }
          if (result.scheduledFor) {
            console.log(chalk.dim(`  Scheduled for: ${result.scheduledFor.toLocaleString()}`));
          }
        } else {
          platformSpinner.fail(chalk.red(`Failed to publish to ${platform}`));
          console.log(chalk.dim(`  Error: ${result.error}`));
        }
      } catch (error) {
        platformSpinner.fail(chalk.red(`Error publishing to ${platform}`));
        console.log(chalk.dim(`  ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
      console.log();
    }

    console.log(chalk.green('✨ Publishing complete!\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to publish'));
    console.log(chalk.dim(`\n${error instanceof Error ? error.message : 'Unknown error'}\n`));
  }
}

// ============================================================================
// Main Program
// ============================================================================

program
  .name('publish')
  .description('Publish articles to social media platforms')
  .version('1.0.0');

program
  .command('config <platform>')
  .description('Configure platform credentials (facebook, linkedin, medium, wordpress)')
  .action(configureCommand);

program
  .command('list')
  .description('List configured platforms')
  .action(listCommand);

program
  .command('publish <article-id>')
  .description('Publish an article to social platforms')
  .option('-p, --platforms <platforms>', 'Comma-separated list of platforms (facebook,linkedin)')
  .option('-s, --schedule <datetime>', 'Schedule post for specific date/time (ISO format)')
  .action(publishCommand);

program.parse();
