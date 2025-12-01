#!/usr/bin/env node

/**
 * @fileoverview Export command - Export articles to various formats
 * @description CLI command for exporting saved articles to HTML, PDF, and JSON
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import puppeteer from 'puppeteer';
import { createDatabaseService } from './services/database.js';
import type { DBArticle } from './services/database.js';

/**
 * Export command options
 */
interface ExportOptions {
  format: 'html' | 'pdf' | 'json' | 'md';
  output?: string;
}

/**
 * HTML template for article export
 */
function generateHTML(article: DBArticle): string {
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Draft';

  const keywords = article.keywords?.join(', ') || 'None';
  const hashtags = article.hashtags?.join(' ') || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(article.excerpt || '')}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <title>${escapeHtml(article.title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 1rem;
      line-height: 1.2;
    }

    .metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-draft { background: #f3f4f6; color: #6b7280; }
    .badge-published { background: #d1fae5; color: #065f46; }
    .badge-archived { background: #fee2e2; color: #991b1b; }

    .excerpt {
      font-size: 1.25rem;
      color: #4b5563;
      font-style: italic;
      margin-bottom: 2rem;
      padding: 1rem;
      background: #f9fafb;
      border-left: 4px solid #2563eb;
    }

    .content {
      font-size: 1.125rem;
      line-height: 1.8;
      color: #374151;
    }

    .content p {
      margin-bottom: 1.5rem;
    }

    .content h1, .content h2, .content h3 {
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: #111827;
      font-weight: 700;
    }

    .content h1 { font-size: 2rem; }
    .content h2 { font-size: 1.5rem; }
    .content h3 { font-size: 1.25rem; }

    .content ul, .content ol {
      margin-left: 2rem;
      margin-bottom: 1.5rem;
    }

    .content li {
      margin-bottom: 0.5rem;
    }

    .content blockquote {
      border-left: 4px solid #e5e7eb;
      padding-left: 1rem;
      margin: 1.5rem 0;
      color: #6b7280;
      font-style: italic;
    }

    .content code {
      background: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-family: 'Courier New', monospace;
      font-size: 0.875em;
    }

    .content pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin-bottom: 1.5rem;
    }

    .content pre code {
      background: none;
      color: inherit;
      padding: 0;
    }

    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tag {
      background: #eff6ff;
      color: #1e40af;
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .stats {
      display: flex;
      gap: 2rem;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .watermark {
      text-align: center;
      margin-top: 2rem;
      color: #9ca3af;
      font-size: 0.75rem;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
        padding: 0;
      }
    }

    @media (max-width: 640px) {
      .container {
        padding: 1.5rem;
      }

      .title {
        font-size: 1.75rem;
      }

      .content {
        font-size: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1 class="title">${escapeHtml(article.title)}</h1>

      <div class="metadata">
        <span class="metadata-item">
          <span class="badge badge-${article.status}">${article.status}</span>
        </span>
        <span class="metadata-item">📅 ${publishedDate}</span>
        ${article.platform ? `<span class="metadata-item">📱 ${capitalize(article.platform)}</span>` : ''}
        ${article.length ? `<span class="metadata-item">📏 ${capitalize(article.length)}</span>` : ''}
        ${article.word_count ? `<span class="metadata-item">📝 ${article.word_count.toLocaleString()} words</span>` : ''}
        ${article.reading_time_minutes ? `<span class="metadata-item">⏱️ ${article.reading_time_minutes} min read</span>` : ''}
      </div>

      ${article.excerpt ? `<div class="excerpt">${escapeHtml(article.excerpt)}</div>` : ''}
    </header>

    <main class="content">
      ${formatContent(article.content)}
    </main>

    <footer class="footer">
      ${hashtags ? `
        <div class="tags">
          ${article.hashtags!.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}

      <div class="stats">
        <span>👁️ ${article.view_count || 0} views</span>
        <span>🎯 Platform: ${capitalize(article.platform || 'general')}</span>
        <span>✍️ Style: ${capitalize(article.style || 'conversational')}</span>
      </div>

      <div class="watermark">
        Generated by News Radar • ${new Date().toLocaleDateString()}
      </div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Format markdown-style content to HTML
 */
function formatContent(content: string): string {
  // Simple markdown-to-HTML conversion
  let html = escapeHtml(content);

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Paragraphs
  html = html.split('\n\n').map(para => {
    if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol')) {
      return para;
    }
    return `<p>${para.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Export article to HTML
 */
async function exportToHTML(article: DBArticle, outputPath: string): Promise<void> {
  const html = generateHTML(article);
  await fs.writeFile(outputPath, html, 'utf-8');
}

/**
 * Export article to JSON
 */
async function exportToJSON(article: DBArticle, outputPath: string): Promise<void> {
  const json = JSON.stringify(article, null, 2);
  await fs.writeFile(outputPath, json, 'utf-8');
}

/**
 * Export article to Markdown
 */
async function exportToMarkdown(article: DBArticle, outputPath: string): Promise<void> {
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Draft';

  const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
date: ${article.published_at || new Date().toISOString()}
status: ${article.status}
platform: ${article.platform || 'general'}
style: ${article.style || 'conversational'}
word_count: ${article.word_count || 0}
reading_time: ${article.reading_time_minutes || 0} min
${article.keywords?.length ? `keywords:\n${article.keywords.map(k => `  - ${k}`).join('\n')}` : ''}
${article.hashtags?.length ? `hashtags:\n${article.hashtags.map(h => `  - ${h}`).join('\n')}` : ''}
---

`;

  const content = article.content;

  // Add metadata footer
  const footer = `

---

*Published: ${publishedDate}*
${article.hashtags?.length ? `\n${article.hashtags.join(' ')}` : ''}

---
*Generated by News Radar*
`;

  await fs.writeFile(outputPath, frontmatter + content + footer, 'utf-8');
}

/**
 * Export article to PDF
 */
async function exportToPDF(article: DBArticle, outputPath: string): Promise<void> {
  // Generate HTML content
  const html = generateHTML(article);

  // Launch puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF with print-friendly settings
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

  } finally {
    await browser.close();
  }
}

/**
 * Execute export
 */
async function executeExport(articleId: string, options: ExportOptions): Promise<void> {
  const spinner = ora('Fetching article...').start();

  try {
    // Fetch article from database
    const dbService = createDatabaseService();
    const article = await dbService.getArticle(articleId);

    if (!article) {
      spinner.fail(chalk.red('Article not found'));
      process.exit(1);
    }

    spinner.succeed(chalk.green(`Loaded: ${article.title}`));

    // Determine output path
    const exportDir = 'exports';
    await fs.mkdir(exportDir, { recursive: true });

    const timestamp = new Date().toISOString().split('T')[0];
    const slug = article.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40);

    let outputPath: string;
    let extension: string;

    switch (options.format) {
      case 'html':
        extension = 'html';
        break;
      case 'pdf':
        extension = 'pdf';
        break;
      case 'json':
        extension = 'json';
        break;
      case 'md':
        extension = 'md';
        break;
    }

    outputPath = options.output || `${exportDir}/${timestamp}-${slug}.${extension}`;

    // Export
    spinner.start(`Exporting to ${options.format.toUpperCase()}...`);

    switch (options.format) {
      case 'html':
        await exportToHTML(article, outputPath);
        break;
      case 'pdf':
        await exportToPDF(article, outputPath);
        break;
      case 'json':
        await exportToJSON(article, outputPath);
        break;
      case 'md':
        await exportToMarkdown(article, outputPath);
        break;
    }

    spinner.succeed(chalk.green(`Exported to: ${outputPath}`));

    // Show summary
    console.log('');
    console.log(chalk.white.bold('Export Summary:'));
    console.log(chalk.gray(`  Title: ${article.title}`));
    console.log(chalk.gray(`  Format: ${options.format.toUpperCase()}`));
    console.log(chalk.gray(`  Output: ${outputPath}`));
    console.log(chalk.gray(`  Size: ${article.word_count || 0} words`));
    console.log('');

  } catch (error) {
    spinner.fail(chalk.red('Export failed'));
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`\n❌ ${message}\n`));
    process.exit(1);
  }
}

// Create export command
const exportCommand = new Command('export')
  .description('Export article to various formats')
  .argument('<article-id>', 'Article ID to export')
  .option('-f, --format <format>', 'Export format (html, pdf, json, md)', 'html')
  .option('-o, --output <path>', 'Custom output path')
  .action(async (articleId: string, cmdOptions) => {
    const options: ExportOptions = {
      format: (cmdOptions.format as ExportOptions['format']) || 'html',
      output: cmdOptions.output as string | undefined,
    };

    await executeExport(articleId, options);
  });

// Parse and run
const program = new Command();
program.addCommand(exportCommand);
program.parse();
