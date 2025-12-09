/**
 * Prompt Suggestion API
 * POST /api/graphics/suggest-prompts - Generate image prompt suggestions based on article content
 */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface SuggestPromptsRequest {
  title: string;
  content?: string;
  platform: string;
  style: string;
}

interface PromptSuggestion {
  prompt: string;
  description: string;
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Fallback prompts when API is not available
function getFallbackPrompts(title: string, style: string, platform: string): PromptSuggestion[] {
  const styleDescriptions: Record<string, string> = {
    modern: 'clean corporate design with subtle gradients',
    minimal: 'minimalist with white space and simple shapes',
    bold: 'high contrast with vibrant colors',
    gradient: 'smooth color transitions and modern aesthetic',
    photo: 'photorealistic professional photograph',
  };

  const styleDesc = styleDescriptions[style] || styleDescriptions.modern;

  // Add center-focused composition for blog platforms (Medium crops edges)
  const isBlog = platform === 'blog' || platform === 'blog_hd';
  const compositionNote = isBlog
    ? 'Center-focused composition with main subject in middle third, safe for edge cropping.'
    : 'centered composition';

  return [
    {
      prompt: `Professional social media graphic: "${title}". ${styleDesc}, ${compositionNote}, business suitable.`,
      description: 'Standard professional style',
    },
    {
      prompt: `Abstract conceptual image representing "${title}". ${styleDesc}, symbolic imagery centered in frame, thought-provoking visual metaphor. ${isBlog ? compositionNote : ''}`,
      description: 'Abstract conceptual approach',
    },
    {
      prompt: `Dynamic editorial illustration for "${title}". ${styleDesc}, editorial style, magazine quality, ${compositionNote}, engaging visual.`,
      description: 'Editorial magazine style',
    },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestPromptsRequest = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // If no API key, return fallback suggestions
    if (!anthropic) {
      return NextResponse.json({
        suggestions: getFallbackPrompts(body.title, body.style, body.platform),
        source: 'fallback',
      });
    }

    // Use Claude to generate contextual prompts
    const isBlogPlatform = body.platform === 'blog' || body.platform === 'blog_hd';
    const compositionGuide = isBlogPlatform
      ? `\n\nIMPORTANT: For blog images, always use CENTER-FOCUSED COMPOSITION with the main subject in the middle third of the frame. Blog platforms like Medium crop images from the edges, so keep important elements away from borders.`
      : '';

    const systemPrompt = `You are an expert at creating image generation prompts for social media graphics.
Given an article title and optional content, generate 3 distinct image prompt suggestions.
Each prompt should be detailed, vivid, and optimized for AI image generation.
Consider the platform (${body.platform}) and visual style (${body.style}).

Style guidelines:
- modern: clean, professional, corporate, subtle gradients, sans-serif feel
- minimal: lots of white space, simple geometric shapes, elegant
- bold: high contrast, vibrant colors, impactful, eye-catching
- gradient: smooth color transitions, modern aesthetic, flowing
- photo: photorealistic, professional lighting, sharp focus${compositionGuide}

Return a JSON array with exactly 3 objects, each having:
- "prompt": the detailed image generation prompt (50-100 words)
- "description": a short 3-5 word description of the approach`;

    const userPrompt = `Article Title: "${body.title}"
${body.content ? `\nArticle Excerpt: "${body.content.slice(0, 500)}..."` : ''}

Platform: ${body.platform}
Style: ${body.style}

Generate 3 distinct image prompt suggestions that would work well as the header/featured image for this article.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Fallback if JSON parsing fails
      return NextResponse.json({
        suggestions: getFallbackPrompts(body.title, body.style, body.platform),
        source: 'fallback',
      });
    }

    const suggestions: PromptSuggestion[] = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      suggestions,
      source: 'ai',
    });
  } catch (error) {
    console.error('Prompt suggestion error:', error);

    // Return fallback on any error
    const body = await request.clone().json().catch(() => ({ title: '', style: 'modern', platform: 'blog' }));
    return NextResponse.json({
      suggestions: getFallbackPrompts(body.title || 'Article', body.style || 'modern', body.platform || 'blog'),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Generation failed',
    });
  }
}
