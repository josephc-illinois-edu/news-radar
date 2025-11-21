#!/usr/bin/env node

/**
 * @fileoverview Tags command - Manage article tags
 * @description CLI command for creating and managing tags for article organization
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createDatabaseService } from './services/database.js';
import type { DBTag } from './services/database.js';

/**
 * List all tags with usage counts
 */
async function listTags(): Promise<void> {
  console.log(chalk.bold.cyan('\n📋 TAGS\n'));

  const spinner = ora('Loading tags...').start();

  try {
    const dbService = createDatabaseService();
    const tags = await dbService.listTags();

    if (tags.length === 0) {
      spinner.info(chalk.yellow('No tags found'));
      console.log(chalk.gray('\nCreate a tag:'));
      console.log(chalk.gray('  npm run tags create <name> [description]\n'));
      return;
    }

    spinner.stop();

    // Get usage counts for all tags
    const tagsWithCounts = await Promise.all(
      tags.map(async (tag) => {
        const count = await dbService.getTagUsageCount(tag.id);
        return { ...tag, count };
      })
    );

    // Sort by usage count (descending)
    tagsWithCounts.sort((a, b) => b.count - a.count);

    console.log(chalk.white(`Total: ${tags.length} tags\n`));

    tagsWithCounts.forEach((tag, index) => {
      const num = chalk.gray(`${index + 1}.`);
      const color = tag.color || '#3b82f6';
      const badge = chalk.hex(color)('●');
      const name = chalk.white.bold(tag.name);
      const count = chalk.gray(`(${tag.count} article${tag.count !== 1 ? 's' : ''})`);
      const id = chalk.dim(`ID: ${tag.id.slice(0, 8)}...`);

      console.log(`${num} ${badge} ${name} ${count}`);

      if (tag.description) {
        console.log(chalk.gray(`   ${tag.description}`));
      }

      console.log(`   ${id}\n`);
    });

    console.log(chalk.gray('Commands:'));
    console.log(chalk.gray('  npm run tags create <name>          Create new tag'));
    console.log(chalk.gray('  npm run tags add <article-id> <tag> Add tag to article'));
    console.log(chalk.gray('  npm run tags remove <article-id> <tag> Remove tag from article'));
    console.log(chalk.gray('  npm run articles list --tag <tag>  List articles by tag\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to list tags'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

/**
 * Create a new tag
 */
async function createTag(
  name: string,
  description?: string,
  color?: string
): Promise<void> {
  console.log(chalk.bold.cyan('\n🏷️  CREATE TAG\n'));

  const spinner = ora(`Creating tag "${name}"...`).start();

  try {
    const dbService = createDatabaseService();
    const tag = await dbService.createTag({
      name,
      description,
      color: color || '#3b82f6',
    });

    spinner.succeed(chalk.green(`Created tag: ${tag.name}`));

    console.log('');
    console.log(chalk.white.bold('Tag Details:'));
    console.log(chalk.gray(`  Name: ${tag.name}`));
    console.log(chalk.gray(`  Slug: ${tag.slug}`));
    console.log(chalk.gray(`  Color: ${tag.color}`));
    if (tag.description) {
      console.log(chalk.gray(`  Description: ${tag.description}`));
    }
    console.log(chalk.gray(`  ID: ${tag.id}\n`));

    console.log(chalk.cyan('Add to articles:'));
    console.log(chalk.gray(`  npm run tags add <article-id> ${tag.slug}\n`));

  } catch (error) {
    spinner.fail(chalk.red('Failed to create tag'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

/**
 * Add tag to article
 */
async function addTagToArticle(articleId: string, tagIdOrSlug: string): Promise<void> {
  console.log(chalk.bold.cyan('\n🏷️  ADD TAG TO ARTICLE\n'));

  const spinner = ora('Adding tag...').start();

  try {
    const dbService = createDatabaseService();

    // Get article
    const article = await dbService.getArticle(articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    // Get tag
    const tag = await dbService.getTag(tagIdOrSlug);
    if (!tag) {
      throw new Error(`Tag "${tagIdOrSlug}" not found`);
    }

    // Add tag to article
    await dbService.addTagToArticle(articleId, tag.id);

    spinner.succeed(chalk.green(`Added tag "${tag.name}" to article`));

    console.log('');
    console.log(chalk.white.bold('Article:'));
    console.log(chalk.gray(`  ${article.title}`));
    console.log('');
    console.log(chalk.white.bold('Tag:'));
    console.log(chalk.gray(`  ${tag.name}`));
    console.log('');

    // Show all tags for this article
    const allTags = await dbService.getArticleTags(articleId);
    console.log(chalk.white(`Tags on this article (${allTags.length}):`));
    allTags.forEach((t) => {
      const badge = chalk.hex(t.color || '#3b82f6')('●');
      console.log(chalk.gray(`  ${badge} ${t.name}`));
    });
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('Failed to add tag'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

/**
 * Remove tag from article
 */
async function removeTagFromArticle(articleId: string, tagIdOrSlug: string): Promise<void> {
  console.log(chalk.bold.cyan('\n🏷️  REMOVE TAG FROM ARTICLE\n'));

  const spinner = ora('Removing tag...').start();

  try {
    const dbService = createDatabaseService();

    // Get article
    const article = await dbService.getArticle(articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    // Get tag
    const tag = await dbService.getTag(tagIdOrSlug);
    if (!tag) {
      throw new Error(`Tag "${tagIdOrSlug}" not found`);
    }

    // Remove tag from article
    await dbService.removeTagFromArticle(articleId, tag.id);

    spinner.succeed(chalk.green(`Removed tag "${tag.name}" from article`));

    console.log('');
    console.log(chalk.white.bold('Article:'));
    console.log(chalk.gray(`  ${article.title}`));
    console.log('');

    // Show remaining tags
    const remainingTags = await dbService.getArticleTags(articleId);
    console.log(chalk.white(`Remaining tags (${remainingTags.length}):`));
    if (remainingTags.length > 0) {
      remainingTags.forEach((t) => {
        const badge = chalk.hex(t.color || '#3b82f6')('●');
        console.log(chalk.gray(`  ${badge} ${t.name}`));
      });
    } else {
      console.log(chalk.gray('  (none)'));
    }
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('Failed to remove tag'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

/**
 * Delete a tag
 */
async function deleteTag(tagIdOrSlug: string, force: boolean = false): Promise<void> {
  console.log(chalk.bold.cyan('\n🗑️  DELETE TAG\n'));

  try {
    const dbService = createDatabaseService();

    // Get tag
    const tag = await dbService.getTag(tagIdOrSlug);
    if (!tag) {
      console.error(chalk.red(`❌ Tag "${tagIdOrSlug}" not found\n`));
      process.exit(1);
    }

    // Check usage
    const usageCount = await dbService.getTagUsageCount(tag.id);

    console.log(chalk.white.bold('Tag:'));
    console.log(chalk.gray(`  Name: ${tag.name}`));
    console.log(chalk.gray(`  Used in: ${usageCount} article${usageCount !== 1 ? 's' : ''}\n`));

    if (usageCount > 0 && !force) {
      console.error(chalk.yellow('⚠️  This tag is used in articles'));
      console.log(chalk.gray('Use --force to delete anyway\n'));
      process.exit(1);
    }

    const spinner = ora('Deleting tag...').start();

    await dbService.deleteTag(tag.id);

    spinner.succeed(chalk.green(`Deleted tag: ${tag.name}\n`));

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

/**
 * Show articles with a specific tag
 */
async function showArticlesByTag(tagIdOrSlug: string): Promise<void> {
  console.log(chalk.bold.cyan('\n📚 ARTICLES BY TAG\n'));

  const spinner = ora('Loading articles...').start();

  try {
    const dbService = createDatabaseService();

    // Get tag
    const tag = await dbService.getTag(tagIdOrSlug);
    if (!tag) {
      throw new Error(`Tag "${tagIdOrSlug}" not found`);
    }

    const articles = await dbService.getArticlesByTag(tag.id);

    spinner.stop();

    const badge = chalk.hex(tag.color || '#3b82f6')('●');
    console.log(chalk.white.bold(`${badge} ${tag.name}`));
    if (tag.description) {
      console.log(chalk.gray(`${tag.description}`));
    }
    console.log('');

    if (articles.length === 0) {
      console.log(chalk.yellow('No articles with this tag\n'));
      return;
    }

    console.log(chalk.white(`Found ${articles.length} article${articles.length !== 1 ? 's' : ''}:\n`));

    articles.forEach((article, index) => {
      const num = chalk.gray(`${index + 1}.`);
      const statusBadge =
        article.status === 'published' ? chalk.green('●') :
        article.status === 'archived' ? chalk.red('●') :
        chalk.gray('●');
      const title = chalk.white.bold(article.title);
      const meta = chalk.gray(
        `${article.word_count || 0} words • ${article.platform || 'general'}`
      );
      const id = chalk.dim(`ID: ${article.id.slice(0, 8)}...`);

      console.log(`${num} ${statusBadge} ${title}`);
      console.log(`   ${meta}`);
      console.log(`   ${id}\n`);
    });

  } catch (error) {
    spinner.fail(chalk.red('Failed to load articles'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

// Create tags command
const program = new Command();

program
  .name('tags')
  .description('Manage article tags');

// List tags
program
  .command('list')
  .description('List all tags with usage counts')
  .action(listTags);

// Create tag
program
  .command('create <name>')
  .description('Create a new tag')
  .argument('[description]', 'Tag description')
  .option('--color <hex>', 'Tag color (hex code)', '#3b82f6')
  .action(async (name: string, description: string | undefined, options: any) => {
    await createTag(name, description, options.color);
  });

// Add tag to article
program
  .command('add <article-id> <tag>')
  .description('Add tag to article')
  .action(addTagToArticle);

// Remove tag from article
program
  .command('remove <article-id> <tag>')
  .description('Remove tag from article')
  .action(removeTagFromArticle);

// Delete tag
program
  .command('delete <tag>')
  .description('Delete a tag')
  .option('--force', 'Force delete even if used in articles')
  .action(async (tag: string, options: any) => {
    await deleteTag(tag, options.force);
  });

// Show articles by tag
program
  .command('show <tag>')
  .description('Show all articles with a specific tag')
  .action(showArticlesByTag);

// Default to list if no command
if (process.argv.length === 2) {
  process.argv.push('list');
}

program.parse();
