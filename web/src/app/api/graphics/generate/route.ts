/**
 * Graphics Generation API
 * POST /api/graphics/generate - Generate social media images
 */
import { NextRequest, NextResponse } from 'next/server';
import type { ImageGenerationOptions, GeneratedImage } from '@/types/graphics';
import { PLATFORM_CONFIGS, IMAGE_STYLES } from '@/types/graphics';

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

  return `Social media graphic for ${platformConfig.name}: "${options.title}"${options.subtitle ? `. ${options.subtitle}` : ''}. ${stylePrompt}. Professional quality, suitable for business use.`;
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

    if (body.mode === 'ai') {
      // Use Pollinations AI (free, no API key required)
      const prompt = generatePrompt(body);
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;

      result = {
        url: imageUrl,
        width,
        height,
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
