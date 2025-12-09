/**
 * Graphics Generation API
 * POST /api/graphics/generate - Generate social media images
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { ImageGenerationOptions, GeneratedImage } from '@/types/graphics';
import { PLATFORM_CONFIGS, IMAGE_STYLES, IMAGE_QUALITIES } from '@/types/graphics';

// DALL-E cost tracking
interface CostTracker {
  daily: { date: string; cost: number; count: number };
  monthly: { month: string; cost: number; count: number };
  total: { cost: number; count: number };
}

const DALLE_COSTS: Record<string, number> = {
  '1024x1024': 0.04,
  '1792x1024': 0.08,
  '1024x1792': 0.08,
};

function getCostLimits() {
  return {
    dailyLimit: parseFloat(process.env.DALLE_DAILY_LIMIT || '5'),
    monthlyLimit: parseFloat(process.env.DALLE_MONTHLY_LIMIT || '50'),
  };
}

async function loadCostTracker(): Promise<CostTracker> {
  const trackerPath = path.join(process.cwd(), '..', 'data', 'dalle-costs.json');
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  try {
    const data = await fs.readFile(trackerPath, 'utf-8');
    const tracker = JSON.parse(data) as CostTracker;
    if (tracker.daily.date !== today) tracker.daily = { date: today, cost: 0, count: 0 };
    if (tracker.monthly.month !== month) tracker.monthly = { month, cost: 0, count: 0 };
    return tracker;
  } catch {
    return {
      daily: { date: today, cost: 0, count: 0 },
      monthly: { month, cost: 0, count: 0 },
      total: { cost: 0, count: 0 },
    };
  }
}

async function saveCostTracker(tracker: CostTracker): Promise<void> {
  const trackerPath = path.join(process.cwd(), '..', 'data', 'dalle-costs.json');
  await fs.mkdir(path.dirname(trackerPath), { recursive: true });
  await fs.writeFile(trackerPath, JSON.stringify(tracker, null, 2));
}

async function checkAndRecordCost(size: string): Promise<{ allowed: boolean; cost: number; reason?: string }> {
  const limits = getCostLimits();
  const tracker = await loadCostTracker();
  const cost = DALLE_COSTS[size] || 0.08;

  if (tracker.daily.cost >= limits.dailyLimit) {
    return { allowed: false, cost, reason: `Daily limit reached (${limits.dailyLimit.toFixed(2)})` };
  }
  if (tracker.monthly.cost >= limits.monthlyLimit) {
    return { allowed: false, cost, reason: `Monthly limit reached (${limits.monthlyLimit.toFixed(2)})` };
  }

  // Record the cost
  tracker.daily.cost += cost;
  tracker.daily.count += 1;
  tracker.monthly.cost += cost;
  tracker.monthly.count += 1;
  tracker.total.cost += cost;
  tracker.total.count += 1;
  await saveCostTracker(tracker);

  return { allowed: true, cost };
}

// Style-specific prompt modifiers
const STYLE_PROMPTS: Record<string, string> = {
  modern: 'clean modern design, professional, corporate style, subtle gradients, sans-serif typography',
  minimal: 'minimalist design, lots of white space, simple shapes, elegant typography',
  bold: 'bold colors, high contrast, impactful typography, eye-catching design',
  gradient: 'beautiful gradient background, smooth color transitions, modern aesthetic',
  photo: 'photorealistic, high quality photograph, professional lighting, sharp focus',
};

function generatePrompt(options: ImageGenerationOptions): string {
  const stylePrompt = STYLE_PROMPTS[options.style] || STYLE_PROMPTS.modern;
  const platformConfig = PLATFORM_CONFIGS[options.platform];

  // Add center-focused composition for blog images (Medium and other platforms crop edges)
  const isBlogPlatform = options.platform === 'blog' || options.platform === 'blog_hd';
  const compositionGuide = isBlogPlatform
    ? 'Center-focused composition with main subject in the middle third, safe for cropping on edges.'
    : '';

  return `Social media graphic for ${platformConfig.name}: "${options.title}"${options.subtitle ? `. ${options.subtitle}` : ''}. ${stylePrompt}. ${compositionGuide} Professional quality, suitable for business use.`.replace(/\s+/g, ' ').trim();
}

function generatePlaceholderSVG(options: ImageGenerationOptions): string {
  const config = PLATFORM_CONFIGS[options.platform];
  const { width, height } = config;

  // Generate gradient colors based on title hash
  const hash = options.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash * 7) % 360;

  // Style-based color adjustments
  let saturation = 70;
  let lightness = 50;
  if (options.style === 'minimal') {
    saturation = 20;
    lightness = 90;
  } else if (options.style === 'bold') {
    saturation = 100;
    lightness = 45;
  }

  const color1 = `hsl(${hue1}, ${saturation}%, ${lightness}%)`;
  const color2 = `hsl(${hue2}, ${saturation}%, ${lightness + 10}%)`;

  // Truncate title for display
  const displayTitle = options.title.length > 50
    ? options.title.substring(0, 47) + '...'
    : options.title;

  // Split title into lines
  const words = displayTitle.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).length > 25) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const fontSize = Math.min(width / 15, 48);
  const lineHeight = fontSize * 1.3;
  const textY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  const textColor = options.style === 'minimal' ? '#333' : '#fff';

  const textElements = lines
    .map((line, i) => `<text x="${width / 2}" y="${textY + i * lineHeight}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="600" fill="${textColor}">${escapeXml(line)}</text>`)
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1}"/>
      <stop offset="100%" style="stop-color:${color2}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${textElements}
  <text x="${width - 20}" y="${height - 20}" text-anchor="end" font-family="system-ui" font-size="14" fill="${textColor}" opacity="0.7">News Radar</text>
</svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationOptions = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const config = PLATFORM_CONFIGS[body.platform] || PLATFORM_CONFIGS.facebook;
    const { width, height } = config;

    let result: GeneratedImage;

    if (body.mode === 'dalle') {
      // DALL-E 3 generation
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return NextResponse.json(
          { error: 'DALL-E not configured. Add OPENAI_API_KEY to enable.' },
          { status: 400 }
        );
      }

      // Determine DALL-E size based on platform
      let dalleSize: string = '1792x1024';
      if (height > width) {
        dalleSize = '1024x1792';
      } else if (Math.abs(width - height) < 200) {
        dalleSize = '1024x1024';
      }

      // Check cost limits
      const costCheck = await checkAndRecordCost(dalleSize);
      if (!costCheck.allowed) {
        return NextResponse.json(
          { error: `DALL-E ${costCheck.reason}. Try free AI mode instead.` },
          { status: 429 }
        );
      }

      const prompt = body.customPrompt || generatePrompt(body);

      try {
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
          const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
          throw new Error(errorData.error?.message || 'DALL-E API error');
        }

        const data = await response.json() as { data: Array<{ url: string }> };
        const imageUrl = data.data[0]?.url;

        if (!imageUrl) {
          throw new Error('No image URL returned');
        }

        const [dalleWidth, dalleHeight] = dalleSize.split('x').map(Number);
        result = {
          url: imageUrl,
          width: dalleWidth,
          height: dalleHeight,
          platform: body.platform,
          style: body.style,
          prompt,
          cost: costCheck.cost,
        };
      } catch (err) {
        return NextResponse.json(
          { error: `DALL-E generation failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    } else if (body.mode === 'ai') {
      // Use Pollinations AI (free, no API key required)
      // Use custom prompt if provided, otherwise generate one
      const prompt = body.customPrompt || generatePrompt(body);
      const encodedPrompt = encodeURIComponent(prompt);

      // Apply quality scaling for preview mode
      const quality = body.quality || 'final';
      const scale = IMAGE_QUALITIES[quality]?.scale || 1;
      const scaledWidth = Math.round(width * scale);
      const scaledHeight = Math.round(height * scale);

      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${scaledWidth}&height=${scaledHeight}&nologo=true`;

      result = {
        url: imageUrl,
        width: scaledWidth,
        height: scaledHeight,
        platform: body.platform,
        style: body.style,
        prompt,
      };
    } else {
      // Generate SVG placeholder
      const svg = generatePlaceholderSVG(body);
      const base64 = Buffer.from(svg).toString('base64');
      const dataUrl = `data:image/svg+xml;base64,${base64}`;

      result = {
        url: dataUrl,
        width,
        height,
        platform: body.platform,
        style: body.style,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
