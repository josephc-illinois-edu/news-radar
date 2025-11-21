#!/usr/bin/env node

/**
 * @fileoverview Voice command - Train and manage writing voice profiles
 * @description CLI command for analyzing writing samples and creating voice profiles
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { createContentFetcher } from './utils/content-fetcher.js';
import {
  analyzeText,
  mergeAnalyses,
  generateVoiceInstructions,
  type VoiceProfile,
} from './utils/voice-analyzer.js';

const VOICES_DIR = 'voices';

/**
 * Ensure voices directory exists
 */
async function ensureVoicesDir(): Promise<void> {
  try {
    await fs.mkdir(VOICES_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

/**
 * Train a new voice profile from samples
 */
async function trainVoice(
  name: string,
  samples: string[],
  options: { description?: string }
): Promise<void> {
  console.log(chalk.bold.cyan('\n🎤 VOICE TRAINING\n'));

  const spinner = ora(`Analyzing ${samples.length} sample(s)...`).start();

  try {
    await ensureVoicesDir();

    // Check if voice already exists
    const voicePath = `${VOICES_DIR}/${name}.json`;
    try {
      await fs.access(voicePath);
      spinner.fail(chalk.red(`Voice "${name}" already exists`));
      console.log(chalk.gray('\nUse a different name or delete the existing voice:\n'));
      console.log(chalk.gray(`  npm run voice delete ${name}\n`));
      process.exit(1);
    } catch {
      // Voice doesn't exist, continue
    }

    // Fetch and analyze samples
    const analyses: Partial<VoiceProfile>[] = [];
    const fetcher = createContentFetcher();

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      spinner.text = `Analyzing sample ${i + 1}/${samples.length}: ${sample.slice(0, 50)}...`;

      let text: string;

      // Check if it's a URL or file path
      if (sample.startsWith('http://') || sample.startsWith('https://')) {
        const content = await fetcher.fetch(sample);
        text = content.content;
      } else {
        text = await fs.readFile(sample, 'utf-8');
      }

      const analysis = analyzeText(text);
      analyses.push(analysis);
    }

    // Merge analyses
    spinner.text = 'Creating voice profile...';
    const mergedProfile = mergeAnalyses(analyses);

    // Create complete profile
    const profile: VoiceProfile = {
      name,
      description: options.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      samples_count: samples.length,
      ...mergedProfile,
    } as VoiceProfile;

    // Save profile
    await fs.writeFile(voicePath, JSON.stringify(profile, null, 2), 'utf-8');

    spinner.succeed(chalk.green(`Created voice profile: ${name}`));

    // Display summary
    console.log('');
    console.log(chalk.white.bold('Voice Profile Summary:'));
    console.log(chalk.gray(`  Name: ${profile.name}`));
    if (profile.description) {
      console.log(chalk.gray(`  Description: ${profile.description}`));
    }
    console.log(chalk.gray(`  Samples: ${profile.samples_count}`));
    console.log(chalk.gray(`  Total Words: ${profile.total_words.toLocaleString()}`));
    console.log(chalk.gray(`  Avg Sentence Length: ${Math.round(profile.avg_sentence_length)} words`));
    console.log(chalk.gray(`  Formality: ${Math.round(profile.formality_score)}/10`));
    console.log(chalk.gray(`  Reading Level: ${profile.stats.reading_level}`));
    console.log('');

    console.log(chalk.cyan('Use this voice:'));
    console.log(chalk.gray(`  npm run write -- --url [url] --voice ${name}\n`));

  } catch (error) {
    spinner.fail(chalk.red('Training failed'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

/**
 * List all voice profiles
 */
async function listVoices(): Promise<void> {
  console.log(chalk.bold.cyan('\n🎤 VOICE PROFILES\n'));

  const spinner = ora('Loading voices...').start();

  try {
    await ensureVoicesDir();
    const files = await fs.readdir(VOICES_DIR);
    const voiceFiles = files.filter(f => f.endsWith('.json'));

    if (voiceFiles.length === 0) {
      spinner.info(chalk.yellow('No voice profiles found'));
      console.log(chalk.gray('\nCreate a voice profile:'));
      console.log(chalk.gray('  npm run voice train my-style --samples "article1.txt,article2.txt"\n'));
      return;
    }

    spinner.stop();

    console.log(chalk.white(`Total: ${voiceFiles.length} profile(s)\n`));

    for (const file of voiceFiles) {
      const content = await fs.readFile(`${VOICES_DIR}/${file}`, 'utf-8');
      const profile: VoiceProfile = JSON.parse(content);

      console.log(chalk.white.bold(`📝 ${profile.name}`));
      if (profile.description) {
        console.log(chalk.gray(`   ${profile.description}`));
      }
      console.log(chalk.gray(`   Samples: ${profile.samples_count} • Words: ${profile.total_words.toLocaleString()}`));
      console.log(chalk.gray(`   Formality: ${Math.round(profile.formality_score)}/10 • Reading: ${profile.stats.reading_level}`));
      console.log(chalk.dim(`   Created: ${new Date(profile.created_at).toLocaleDateString()}\n`));
    }

    console.log(chalk.gray('Commands:'));
    console.log(chalk.gray('  npm run voice show <name>       View voice details'));
    console.log(chalk.gray('  npm run voice delete <name>     Delete voice'));
    console.log(chalk.gray('  npm run write -- --url [url] --voice <name>  Use voice\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to list voices'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

/**
 * Show voice profile details
 */
async function showVoice(name: string): Promise<void> {
  console.log(chalk.bold.cyan('\n🎤 VOICE PROFILE\n'));

  try {
    await ensureVoicesDir();
    const voicePath = `${VOICES_DIR}/${name}.json`;
    const content = await fs.readFile(voicePath, 'utf-8');
    const profile: VoiceProfile = JSON.parse(content);

    console.log(chalk.white.bold(`${profile.name}`));
    if (profile.description) {
      console.log(chalk.gray(profile.description));
    }
    console.log('');

    console.log(chalk.cyan('📊 Statistics:'));
    console.log(chalk.white(`  Samples Analyzed: ${profile.samples_count}`));
    console.log(chalk.white(`  Total Words: ${profile.total_words.toLocaleString()}`));
    console.log(chalk.white(`  Total Sentences: ${profile.stats.total_sentences}`));
    console.log(chalk.white(`  Total Paragraphs: ${profile.stats.total_paragraphs}`));
    console.log('');

    console.log(chalk.cyan('✍️  Writing Style:'));
    console.log(chalk.white(`  Avg Sentence Length: ${Math.round(profile.avg_sentence_length)} words`));
    console.log(chalk.white(`  Avg Paragraph Length: ${Math.round(profile.avg_paragraph_length)} sentences`));
    console.log(chalk.white(`  Formality Score: ${Math.round(profile.formality_score)}/10`));
    console.log(chalk.white(`  Reading Level: ${profile.stats.reading_level}`));
    console.log(chalk.white(`  Unique Words Ratio: ${(profile.unique_words_ratio * 100).toFixed(1)}%`));
    console.log('');

    console.log(chalk.cyan('🎯 Voice Markers:'));
    console.log(chalk.white(`  Uses Contractions: ${profile.uses_contractions ? 'Yes' : 'No'}`));
    console.log(chalk.white(`  First Person: ${profile.uses_first_person ? 'Yes' : 'No'}`));
    console.log(chalk.white(`  Second Person: ${profile.uses_second_person ? 'Yes' : 'No'}`));
    console.log('');

    if (profile.signature_phrases.length > 0) {
      console.log(chalk.cyan('💬 Signature Phrases:'));
      profile.signature_phrases.slice(0, 5).forEach(phrase => {
        console.log(chalk.gray(`  • "${phrase}"`));
      });
      console.log('');
    }

    if (profile.common_words.length > 0) {
      console.log(chalk.cyan('📚 Common Words:'));
      console.log(chalk.gray(`  ${profile.common_words.slice(0, 10).join(', ')}`));
      console.log('');
    }

    console.log(chalk.cyan('📝 AI Instructions:'));
    const instructions = generateVoiceInstructions(profile);
    console.log(chalk.gray(`  ${instructions.slice(0, 300)}...`));
    console.log('');

    console.log(chalk.cyan('Use this voice:'));
    console.log(chalk.gray(`  npm run write -- --url [url] --voice ${name}\n`));

  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.error(chalk.red(`❌ Voice "${name}" not found\n`));
      console.log(chalk.gray('Tip: Use "npm run voice list" to see all voices\n'));
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red(`\n❌ ${message}\n`));
    }
    process.exit(1);
  }
}

/**
 * Delete voice profile
 */
async function deleteVoice(name: string): Promise<void> {
  console.log(chalk.bold.cyan('\n🗑️  DELETE VOICE\n'));

  try {
    await ensureVoicesDir();
    const voicePath = `${VOICES_DIR}/${name}.json`;

    // Check if exists
    await fs.access(voicePath);

    const content = await fs.readFile(voicePath, 'utf-8');
    const profile: VoiceProfile = JSON.parse(content);

    console.log(chalk.white.bold('Voice:'));
    console.log(chalk.gray(`  ${profile.name}`));
    if (profile.description) {
      console.log(chalk.gray(`  ${profile.description}`));
    }
    console.log('');

    const spinner = ora('Deleting voice...').start();
    await fs.unlink(voicePath);
    spinner.succeed(chalk.green(`Deleted voice: ${name}\n`));

  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.error(chalk.red(`❌ Voice "${name}" not found\n`));
      console.log(chalk.gray('Tip: Use "npm run voice list" to see all voices\n'));
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red(`\n❌ ${message}\n`));
    }
    process.exit(1);
  }
}

// Create voice command
const program = new Command();

program
  .name('voice')
  .description('Train and manage writing voice profiles');

// Train command
program
  .command('train <name>')
  .description('Train a new voice profile from writing samples')
  .requiredOption('--samples <samples>', 'Comma-separated URLs or file paths')
  .option('--description <desc>', 'Voice description')
  .action(async (name: string, options: any) => {
    const samples = options.samples.split(',').map((s: string) => s.trim());
    await trainVoice(name, samples, {
      description: options.description,
    });
  });

// List command
program
  .command('list')
  .description('List all voice profiles')
  .action(listVoices);

// Show command
program
  .command('show <name>')
  .description('Show voice profile details')
  .action(showVoice);

// Delete command
program
  .command('delete <name>')
  .description('Delete a voice profile')
  .action(deleteVoice);

// Default to list if no command
if (process.argv.length === 2) {
  process.argv.push('list');
}

program.parse();
