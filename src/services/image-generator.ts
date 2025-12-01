/**
 * @fileoverview AI Image Generator Service
 * @description Generate social media graphics using OpenAI DALL-E or placeholder templates
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Image generation options
 */
export interface ImageOptions {
  title: string;
  excerpt?: string;
  keywords?: string[];
  platform: 'facebook' | 'linkedin' | 'twitter' | 'instagram' | 'blog';
  style?: 'modern' | 'minimal' | 'bold' | 'gradient' | 'photo';
  width?: number;
  height?: number;
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  url?: string;
  localPath?: string;
  prompt: string;
  width: number;
  height: number;
  platform: string;
  style: string;
  source: 'dalle' | 'pollinations' | 'placeholder';
}

/**
 * Platform-specific dimensions
 */
const PLATFORM_DIMENSIONS: Record<string, { width: number; height: number }> = {
  facebook: { width: 1200, height: 630 },
  linkedin: { width: 1200, height: 627 },
  twitter: { width: 1200, height: 675 },
  instagram: { width: 1080, height: 1080 },
  blog: { width: 1200, height: 800 },
};

/**
 * Style-specific prompt modifiers
 */
const STYLE_PROMPTS: Record<string, string> = {
  modern: 'clean modern design, professional, corporate style, subtle gradients, sans-serif typography',
  minimal: 'minimalist design, lots of white space, simple shapes, elegant typography',
  bold: 'bold colors, high contrast, impactful typography, eye-catching design',
  gradient: 'beautiful gradient background, smooth color transitions, modern aesthetic',
  photo: 'photorealistic, professional photography style, editorial quality',
};

/**
 * Create an AI image generator
 */
export function createImageGenerator() {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  /**
   * Generate a DALL-E prompt from article content
   */
  function generatePrompt(options: ImageOptions): string {
    const { title, excerpt, keywords, style = 'modern' } = options;
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.modern;

    // Extract key themes from title and excerpt
    const content = `${title} ${excerpt || ''}`.toLowerCase();

    // Determine visual theme based on content
    let themeHints = '';
    if (content.includes('politic') || content.includes('government') || content.includes('president')) {
      themeHints = 'political theme, official atmosphere, capital building silhouette';
    } else if (content.includes('tech') || content.includes('ai') || content.includes('digital')) {
      themeHints = 'technology theme, digital elements, circuit patterns, futuristic';
    } else if (content.includes('business') || content.includes('economy') || content.includes('market')) {
      themeHints = 'business theme, financial imagery, growth charts, professional';
    } else if (content.includes('health') || content.includes('medical') || content.includes('doctor')) {
      themeHints = 'healthcare theme, medical imagery, clean clinical feel';
    } else if (content.includes('environment') || content.includes('climate') || content.includes('nature')) {
      themeHints = 'environmental theme, nature imagery, green tones, earth';
    } else if (content.includes('sport') || content.includes('game') || content.includes('team')) {
      themeHints = 'sports theme, dynamic movement, athletic energy';
    } else {
      themeHints = 'news media theme, journalistic feel, informative';
    }

    // Build the prompt
    const keywordHints = keywords?.slice(0, 3).join(', ') || '';

    return `Create a social media header image for a news article.
Title: "${title}"
${stylePrompt}
${themeHints}
${keywordHints ? `Related topics: ${keywordHints}` : ''}
No text in the image. Abstract or symbolic representation. High quality, professional design suitable for news media.`;
  }

  /**
   * Generate image using OpenAI DALL-E
   */
  async function generateWithDallE(options: ImageOptions): Promise<GeneratedImage> {
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured. Add it to your .env file.');
    }

    const dimensions = PLATFORM_DIMENSIONS[options.platform] || PLATFORM_DIMENSIONS.blog;
    const width = options.width || dimensions.width;
    const height = options.height || dimensions.height;
    const style = options.style || 'modern';

    const prompt = generatePrompt(options);

    // DALL-E 3 supported sizes: 1024x1024, 1792x1024, 1024x1792
    // Map to closest supported size
    let dalleSize: '1024x1024' | '1792x1024' | '1024x1792' = '1792x1024';
    if (height > width) {
      dalleSize = '1024x1792';
    } else if (Math.abs(width - height) < 200) {
      dalleSize = '1024x1024';
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: dalleSize,
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message?: string } };
      throw new Error(`DALL-E API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as { data: Array<{ url: string; revised_prompt?: string }> };
    const imageUrl = data.data[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    return {
      url: imageUrl,
      prompt,
      width,
      height,
      platform: options.platform,
      style,
      source: 'dalle' as const,
    };
  }

  /**
   * Generate a shorter prompt optimized for Pollinations.ai
   */
  function generatePollinationsPrompt(options: ImageOptions): string {
    const { title, style = 'modern' } = options;
    const content = title.toLowerCase();

    // Short style keywords
    const styleHint = {
      modern: 'clean modern design',
      minimal: 'minimalist elegant',
      bold: 'bold vibrant colors',
      gradient: 'beautiful gradient',
      photo: 'photorealistic',
    }[style] || 'professional';

    // Detect theme from title
    let theme = 'news media';
    if (content.includes('tech') || content.includes('ai') || content.includes('digital')) {
      theme = 'technology futuristic';
    } else if (content.includes('business') || content.includes('economy') || content.includes('market')) {
      theme = 'business finance';
    } else if (content.includes('health') || content.includes('medical')) {
      theme = 'healthcare medical';
    } else if (content.includes('politic') || content.includes('government')) {
      theme = 'politics government';
    } else if (content.includes('environment') || content.includes('climate')) {
      theme = 'nature environment';
    }

    // Keep prompt short for URL encoding
    return `${styleHint} ${theme} social media header, professional, no text`;
  }

  /**
   * Generate image using Pollinations.ai (free, no API key)
   */
  async function generateWithPollinations(options: ImageOptions): Promise<GeneratedImage> {
    const dimensions = PLATFORM_DIMENSIONS[options.platform] || PLATFORM_DIMENSIONS.blog;
    const width = options.width || dimensions.width;
    const height = options.height || dimensions.height;
    const style = options.style || 'modern';

    // Use shorter prompt for Pollinations (URL length limits)
    const prompt = generatePollinationsPrompt(options);

    // Pollinations generates on-demand - URL encodes the prompt
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;

    // Pollinations generates on GET request, no pre-validation needed
    // The download step will verify the URL works
    return {
      url: imageUrl,
      prompt,
      width,
      height,
      platform: options.platform,
      style,
      source: 'pollinations' as const,
    };
  }

  /**
   * Download image from URL and save locally
   */
  async function downloadImage(url: string, outputPath: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NewsRadar/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: HTTP ${response.status} ${response.statusText || 'Unknown error'}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('image')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error('Downloaded image is empty');
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, Buffer.from(buffer));

    return outputPath;
  }

  /**
   * Generate SVG placeholder image (no API required)
   */
  async function generatePlaceholder(options: ImageOptions): Promise<GeneratedImage> {
    const dimensions = PLATFORM_DIMENSIONS[options.platform] || PLATFORM_DIMENSIONS.blog;
    const width = options.width || dimensions.width;
    const height = options.height || dimensions.height;
    const style = options.style || 'gradient';

    // Generate gradient colors based on title hash
    const hash = options.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hash * 7) % 360;

    // Truncate title for display
    const displayTitle = options.title.length > 60
      ? options.title.substring(0, 57) + '...'
      : options.title;

    // Split title into lines
    const words = displayTitle.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length > 35) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Generate SVG
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue1}, 70%, 45%);stop-opacity:1" />
      <stop offset="100%" style="stop-color:hsl(${hue2}, 70%, 35%);stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)"/>

  <!-- Decorative elements -->
  <circle cx="${width * 0.85}" cy="${height * 0.15}" r="${height * 0.2}" fill="rgba(255,255,255,0.1)"/>
  <circle cx="${width * 0.1}" cy="${height * 0.9}" r="${height * 0.15}" fill="rgba(255,255,255,0.08)"/>

  <!-- Title text -->
  <g filter="url(#shadow)">
    ${lines.map((line, i) => `
    <text x="${width / 2}" y="${height / 2 + (i - lines.length / 2 + 0.5) * 48}"
          font-family="system-ui, -apple-system, sans-serif"
          font-size="36"
          font-weight="700"
          fill="white"
          text-anchor="middle">${escapeXml(line)}</text>
    `).join('')}
  </g>

  <!-- News Radar branding -->
  <text x="${width - 20}" y="${height - 20}"
        font-family="system-ui, sans-serif"
        font-size="14"
        fill="rgba(255,255,255,0.6)"
        text-anchor="end">News Radar</text>
</svg>`;

    // Save SVG
    const outputDir = 'images';
    const timestamp = Date.now();
    const slug = options.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 30);
    const outputPath = `${outputDir}/${timestamp}-${slug}.svg`;

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, svg, 'utf-8');

    return {
      localPath: outputPath,
      prompt: `Placeholder image for: ${options.title}`,
      width,
      height,
      platform: options.platform,
      style,
      source: 'placeholder' as const,
    };
  }

  /**
   * Generation mode options
   */
  type GenerateMode = 'dalle' | 'free' | 'placeholder';

  /**
   * Generate image with specified mode
   * - 'dalle': Use DALL-E 3 (requires OPENAI_API_KEY, ~$0.04-0.08/image)
   * - 'free': Use Pollinations.ai (free, no API key needed)
   * - 'placeholder': Use local SVG placeholder (free, instant)
   */
  async function generate(options: ImageOptions, mode: GenerateMode = 'free'): Promise<GeneratedImage> {
    const outputDir = 'images';
    const timestamp = Date.now();
    const slug = options.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 30);

    // Placeholder mode - instant, no API
    if (mode === 'placeholder') {
      return generatePlaceholder(options);
    }

    // DALL-E mode - premium, requires API key
    if (mode === 'dalle') {
      if (!openaiApiKey) {
        console.warn('DALL-E requested but OPENAI_API_KEY not set. Falling back to Pollinations.');
        mode = 'free';
      } else {
        try {
          const result = await generateWithDallE(options);
          const outputPath = `${outputDir}/${timestamp}-${slug}.png`;

          if (result.url) {
            result.localPath = await downloadImage(result.url, outputPath);
          }

          return result;
        } catch (err) {
          console.warn(`DALL-E generation failed, falling back to Pollinations: ${err instanceof Error ? err.message : String(err)}`);
          mode = 'free';
        }
      }
    }

    // Free mode - Pollinations.ai
    if (mode === 'free') {
      try {
        const result = await generateWithPollinations(options);
        const outputPath = `${outputDir}/${timestamp}-${slug}.png`;

        if (result.url) {
          result.localPath = await downloadImage(result.url, outputPath);
        }

        return result;
      } catch (err) {
        console.warn(`Pollinations generation failed, using placeholder: ${err instanceof Error ? err.message : String(err)}`);
        return generatePlaceholder(options);
      }
    }

    return generatePlaceholder(options);
  }

  /**
   * Check if DALL-E is available
   */
  function isDallEAvailable(): boolean {
    return !!openaiApiKey;
  }

  return {
    generate,
    generatePlaceholder,
    generateWithDallE,
    generateWithPollinations,
    generatePrompt,
    downloadImage,
    isDallEAvailable,
    PLATFORM_DIMENSIONS,
  };
}

export type GenerateMode = 'dalle' | 'free' | 'placeholder';

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type ImageGenerator = ReturnType<typeof createImageGenerator>;
