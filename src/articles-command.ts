#!/usr/bin/env node

/**
 * @fileoverview Articles command - Manage saved articles
 * @description CLI commands for listing, viewing, and managing articles
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createDatabaseService } from './services/database.js';
import type { DBArticle } from './services/database.js';

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get status badge with color
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case 'published':
      return chalk.green('●') + chalk.gray(' Published');
    case 'draft':
      return chalk.yellow('●') + chalk.gray(' Draft');
    case 'archived':
      return chalk.gray('● Archived');
    default:
      return chalk.gray(`● ${status}`);
  }
}

/**
 * List articles command
 */
async function listArticles(options: {
  status?: 'draft' | 'published' | 'archived';
  limit?: number;
  tag?: string;
}): Promise<void> {
  const spinner = ora('Loading articles from database...').start();

  try {
    const dbService = createDatabaseService();
    let articles;
    let tagName;

    // Filter by tag if specified
    if (options.tag) {
      const tag = await dbService.getTag(options.tag);
      if (!tag) {
        spinner.fail(chalk.red(`Tag "${options.tag}" not found`));
        console.log(chalk.gray('\nTip: Use "npm run tags list" to see all tags\n'));
        process.exit(1);
      }
      tagName = tag.name;
      articles = await dbService.getArticlesByTag(tag.id, {
        status: options.status,
        limit: options.limit || 20,
      });
    } else {
      articles = await dbService.listArticles({
        status: options.status,
        limit: options.limit || 20,
      });
    }

    spinner.stop();

    if (articles.length === 0) {
      console.log(chalk.yellow('\n📭 No articles found.'));
      if (options.tag || options.status) {
        console.log(chalk.gray('\nTry removing filters or generate more articles\n'));
      } else {
        console.log(chalk.gray('\nGenerate your first article with:'));
        console.log(chalk.cyan('  npm run write -- --url [url] --preview\n'));
      }
      return;
    }

    console.log(chalk.bold.cyan(`\n📚 Articles (${articles.length})`));
    const filters = [];
    if (options.status) filters.push(`status: ${options.status}`);
    if (tagName) filters.push(`tag: ${tagName}`);
    if (filters.length > 0) {
      console.log(chalk.gray(`Filtered by: ${filters.join(', ')}\n`));
    } else {
      console.log('');
    }

    // Get tags for all articles
    const articlesWithTags = await Promise.all(
      articles.map(async (article) => {
        const tags = await dbService.getArticleTags(article.id);
        return { article, tags };
      })
    );

    articlesWithTags.forEach(({ article, tags }, index) => {
      const num = chalk.gray(`${index + 1}.`);
      const status = getStatusBadge(article.status);
      const title = chalk.white.bold(article.title);
      const meta = chalk.gray(
        `${article.word_count || 0} words • ${article.platform || 'general'} • ${formatDate(article.created_at)}`
      );
      const id = chalk.dim(`ID: ${article.id.slice(0, 8)}...`);

      console.log(`${num} ${status}`);
      console.log(`   ${title}`);
      console.log(`   ${meta}`);

      // Show tags if any
      if (tags.length > 0) {
        const tagBadges = tags.map((tag) => {
          const badge = chalk.hex(tag.color || '#3b82f6')('●');
          return `${badge} ${tag.name}`;
        }).join('  ');
        console.log(chalk.gray(`   Tags: ${tagBadges}`));
      }

      console.log(`   ${id}\n`);
    });

    console.log(chalk.gray('Commands:'));
    console.log(chalk.gray(`  npm run articles view <id>     View article details`));
    console.log(chalk.gray(`  npm run articles publish <id>  Publish a draft`));
    console.log(chalk.gray(`  npm run articles list --status draft  Filter by status`));
    console.log(chalk.gray(`  npm run articles list --tag <tag>     Filter by tag\n`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to load articles'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ Error: ${message}\n`));
    process.exit(1);
  }
}

/**
 * View article command
 */
async function viewArticle(id: string): Promise<void> {
  const spinner = ora('Loading article...').start();

  try {
    const dbService = createDatabaseService();
    const article = await dbService.getArticle(id);

    if (!article) {
      spinner.fail(chalk.red('Article not found'));
      console.log(chalk.yellow(`\n❌ No article found with ID: ${id}\n`));
      console.log(chalk.gray('Tip: Use "npm run articles list" to see all articles\n'));
      process.exit(1);
    }

    spinner.stop();

    // Display article details
    console.log('\n' + chalk.bold.cyan('═'.repeat(70)));
    console.log(chalk.bold.white(`  ARTICLE DETAILS`));
    console.log(chalk.bold.cyan('═'.repeat(70)));

    console.log(chalk.white.bold(`\n${article.title}\n`));
    console.log(chalk.gray('─'.repeat(70)));

    console.log(chalk.cyan('\n  METADATA'));
    console.log(chalk.white(`  Status: ${article.status}`));
    console.log(chalk.white(`  Word Count: ${article.word_count || 0}`));
    console.log(chalk.white(`  Reading Time: ${article.reading_time_minutes || 0} minutes`));
    console.log(chalk.white(`  Platform: ${article.platform || 'general'}`));
    console.log(chalk.white(`  Style: ${article.style || 'N/A'}`));
    console.log(chalk.white(`  Created: ${new Date(article.created_at).toLocaleString()}`));

    if (article.published_at) {
      console.log(chalk.white(`  Published: ${new Date(article.published_at).toLocaleString()}`));
    }

    console.log(chalk.cyan('\n  TONE SETTINGS'));
    console.log(chalk.white(`  Humor: ${article.tone_humor || 'N/A'}/10`));
    console.log(chalk.white(`  Urgency: ${article.tone_urgency || 'N/A'}/10`));
    console.log(chalk.white(`  Optimism: ${article.tone_optimism || 'N/A'}/10`));
    console.log(chalk.white(`  Criticism: ${article.tone_criticism || 'N/A'}/10`));

    if (article.keywords && article.keywords.length > 0) {
      console.log(chalk.cyan('\n  KEYWORDS'));
      console.log(chalk.gray(`  ${article.keywords.slice(0, 8).join(', ')}`));
    }

    if (article.hashtags && article.hashtags.length > 0) {
      console.log(chalk.cyan('\n  HASHTAGS'));
      console.log(chalk.gray(`  ${article.hashtags.join(' ')}`));
    }

    console.log(chalk.cyan('\n  ENGAGEMENT'));
    console.log(chalk.white(`  Views: ${article.view_count || 0}`));

    // Get sources
    const sources = await dbService.getArticleSources(id);
    if (sources.length > 0) {
      console.log(chalk.cyan('\n  SOURCES'));
      sources.forEach((source, i) => {
        console.log(chalk.white(`  ${i + 1}. ${source.title || source.url}`));
        if (source.similarity_score !== null && source.similarity_score !== undefined) {
          console.log(
            chalk.gray(`     Similarity: ${source.similarity_score}% ${source.similarity_score < 15 ? '✅' : '⚠️'}`)
          );
        }
      });
    }

    // Get revisions
    const revisions = await dbService.getArticleRevisions(id);
    if (revisions.length > 0) {
      console.log(chalk.cyan('\n  REVISIONS'));
      console.log(chalk.white(`  Total versions: ${revisions.length}`));
      console.log(chalk.gray(`  Latest: Version ${revisions[0].version_number}`));
    }

    console.log(chalk.bold.cyan('\n' + '═'.repeat(70)));
    console.log(chalk.gray('\nCommands:'));
    console.log(chalk.gray(`  npm run articles publish ${id}  Publish this article`));
    console.log(chalk.gray(`  npm run articles list           Back to list\n`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to load article'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ Error: ${message}\n`));
    process.exit(1);
  }
}

/**
 * Publish article command
 */
async function publishArticle(id: string): Promise<void> {
  const spinner = ora('Publishing article...').start();

  try {
    const dbService = createDatabaseService();
    const article = await dbService.publishArticle(id);

    spinner.succeed(chalk.green('✓ Article published!'));

    console.log(chalk.white(`\nTitle: ${article.title}`));
    console.log(chalk.green(`Status: Published`));
    console.log(chalk.gray(`Published at: ${new Date(article.published_at!).toLocaleString()}\n`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to publish article'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ Error: ${message}\n`));
    process.exit(1);
  }
}

/**
 * Archive article command
 */
async function archiveArticle(id: string): Promise<void> {
  const spinner = ora('Archiving article...').start();

  try {
    const dbService = createDatabaseService();
    await dbService.archiveArticle(id);

    spinner.succeed(chalk.green('✓ Article archived!'));
    console.log(chalk.gray('Use --status archived to view archived articles\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to archive article'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ Error: ${message}\n`));
    process.exit(1);
  }
}

/**
 * Delete article command
 */
async function deleteArticle(id: string, options: { force?: boolean }): Promise<void> {
  if (!options.force) {
    console.log(chalk.yellow('\n⚠️  This will permanently delete the article and all related data.'));
    console.log(chalk.gray('Add --force to confirm deletion\n'));
    process.exit(1);
  }

  const spinner = ora('Deleting article...').start();

  try {
    const dbService = createDatabaseService();
    await dbService.deleteArticle(id);

    spinner.succeed(chalk.green('✓ Article deleted permanently'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to delete article'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ Error: ${message}\n`));
    process.exit(1);
  }
}

// Create articles command with subcommands
const articlesCommand = new Command('articles')
  .description('Manage saved articles')
  .addCommand(
    new Command('list')
      .description('List all articles')
      .option('--status <status>', 'Filter by status (draft, published, archived)')
      .option('--tag <tag>', 'Filter by tag (name or slug)')
      .option('--limit <number>', 'Maximum number of articles to show', '20')
      .action(async (options) => {
        await listArticles({
          status: options.status as 'draft' | 'published' | 'archived' | undefined,
          tag: options.tag as string | undefined,
          limit: parseInt(options.limit, 10),
        });
      })
  )
  .addCommand(
    new Command('view')
      .description('View article details')
      .argument('<id>', 'Article ID')
      .action(async (id: string) => {
        await viewArticle(id);
      })
  )
  .addCommand(
    new Command('publish')
      .description('Publish a draft article')
      .argument('<id>', 'Article ID')
      .action(async (id: string) => {
        await publishArticle(id);
      })
  )
  .addCommand(
    new Command('archive')
      .description('Archive an article')
      .argument('<id>', 'Article ID')
      .action(async (id: string) => {
        await archiveArticle(id);
      })
  )
  .addCommand(
    new Command('delete')
      .description('Delete an article permanently')
      .argument('<id>', 'Article ID')
      .option('--force', 'Confirm deletion')
      .action(async (id: string, options) => {
        await deleteArticle(id, options);
      })
  );

// Default action: list articles
articlesCommand.action(async () => {
  await listArticles({ limit: 20 });
});

// Parse and run
const program = new Command();
program.addCommand(articlesCommand);
program.parse();
