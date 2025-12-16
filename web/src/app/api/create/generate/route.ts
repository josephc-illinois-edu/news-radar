/**
 * Article Generation API
 * POST /api/create/generate - Generate articles from source URLs
 *
 * Note: Full implementation requires Anthropic API key.
 * This is a simplified version that demonstrates the API structure.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { GenerationOptions, GeneratedArticle, GenerationResult } from '@/types/create';
import {
  getContentSystemPrompt,
  getPlatformVoicePrompt,
  getNaturalTonePrompt,
} from '@/lib/ai-prompts';

// Simple content fetcher (production would use the CLI's content-fetcher)
async function fetchContent(url: string): Promise<{ title: string; content: string; facts: string[] }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsRadar/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Simple extraction (production would use cheerio/puppeteer)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    // Extract text content (very simplified)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    // Extract potential facts (sentences with numbers or quotes)
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const facts = sentences
      .filter(s => /\d+|percent|million|billion|according/i.test(s))
      .slice(0, 5)
      .map(s => s.trim());

    return { title, content: textContent, facts };
  } catch (error) {
    return {
      title: url,
      content: '',
      facts: [],
    };
  }
}

// Generate article using Anthropic API (if available)
async function generateWithAI(
  sources: Array<{ title: string; content: string; facts: string[] }>,
  options: GenerationOptions
): Promise<GeneratedArticle[]> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    // Return mock/demo content if no API key
    return generateMockArticles(sources, options);
  }

  // Full Anthropic API implementation
  const wordTargets: Record<string, string> = {
    tweet: '50-100',
    short: '200-400',
    medium: '600-900',
    long: '1200-1500',
  };

  const prompt = buildPrompt(sources, options, wordTargets[options.length]);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error('Anthropic API failed');
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    // Parse the response (expecting JSON format)
    const articles = parseArticleResponse(content, options.variations);
    return articles;
  } catch (error) {
    console.error('AI generation failed:', error);
    return generateMockArticles(sources, options);
  }
}

function buildPrompt(
  sources: Array<{ title: string; content: string; facts: string[] }>,
  options: GenerationOptions,
  wordTarget: string
): string {
  const systemPrompt = getContentSystemPrompt(
    `You write ${options.platform} content. You have strong opinions and a distinctive voice.`
  );

  const platformVoice = getPlatformVoicePrompt(options.platform);

  const tonePrompt = getNaturalTonePrompt({
    humor: options.tone.humor,
    urgency: options.tone.urgency,
    criticism: options.tone.criticism,
    optimism: options.tone.optimism,
  });

  const sourceSummaries = sources
    .map((s, i) => `Source ${i + 1}: "${s.title}"\nKey facts: ${s.facts.join('; ') || 'None extracted'}\nContent: ${s.content.slice(0, 500)}...`)
    .join('\n\n');

  const styleGuide = options.style === 'academic'
    ? 'Write with intellectual rigor - cite implications, reference patterns, maintain analytical depth.'
    : 'Write like you\'re explaining this to a smart friend. Skip the formalities.';

  return `${systemPrompt}

${platformVoice}
${tonePrompt}

SOURCES TO WORK WITH:
${sourceSummaries}

YOUR TASK:
Write ${options.variations} distinct piece(s), each ~${wordTarget} words.
${styleGuide}

Each piece needs a different angle:
- One might be more analytical
- Another more opinionated
- Another focused on a specific surprising detail

FORMAT (JSON):
{
  "articles": [
    {
      "title": "Your title - make it specific, not generic",
      "content": "The full piece in markdown",
      "angle": "balanced|provocative|human-interest|analysis|satirical",
      "suggestedHashtags": ["#relevant", "#specific"]
    }
  ]
}

Credit your sources naturally within the text. Don't add a separate citations section.`;
}

function parseArticleResponse(content: string, variationCount: number): GeneratedArticle[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.articles && Array.isArray(parsed.articles)) {
        return parsed.articles.map((a: any) => ({
          title: a.title || 'Untitled',
          content: a.content || '',
          wordCount: a.content?.split(/\s+/).length || 0,
          readingTimeMinutes: Math.ceil((a.content?.split(/\s+/).length || 0) / 200),
          suggestedHashtags: a.suggestedHashtags || [],
          citations: a.citations || [],
          angle: a.angle,
        }));
      }
    }
  } catch (e) {
    // If JSON parsing fails, treat the whole response as a single article
  }

  return [{
    title: 'Generated Article',
    content,
    wordCount: content.split(/\s+/).length,
    readingTimeMinutes: Math.ceil(content.split(/\s+/).length / 200),
    suggestedHashtags: [],
    citations: [],
  }];
}

function generateMockArticles(
  sources: Array<{ title: string; content: string; facts: string[] }>,
  options: GenerationOptions
): GeneratedArticle[] {
  const angles = ['balanced', 'provocative', 'human-interest', 'analysis', 'satirical'];

  return Array.from({ length: options.variations }, (_, i) => {
    const angle = angles[i % angles.length];
    const sourceTitle = sources[0]?.title || 'Source Article';
    const facts = sources.flatMap(s => s.facts).slice(0, 3);

    const content = `# ${sourceTitle}: A ${angle.charAt(0).toUpperCase() + angle.slice(1)} Take

This is a demo article generated without the Anthropic API key.

To enable full AI-powered article generation:
1. Add ANTHROPIC_API_KEY to your web/.env.local file
2. The system will use Claude to generate high-quality content

**Key points from sources:**
${facts.length > 0 ? facts.map(f => `- ${f}`).join('\n') : '- No specific facts extracted from source'}

**Platform:** ${options.platform}
**Style:** ${options.style}
**Tone:** Humor ${options.tone.humor}/10, Urgency ${options.tone.urgency}/10

---
*Configure your API key for real AI-generated content.*`;

    return {
      title: `${sourceTitle} - ${angle.charAt(0).toUpperCase() + angle.slice(1)} Perspective`,
      content,
      wordCount: content.split(/\s+/).length,
      readingTimeMinutes: Math.ceil(content.split(/\s+/).length / 200),
      suggestedHashtags: ['#news', '#analysis', `#${options.platform}`],
      citations: sources.map(s => s.title),
      angle,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerationOptions = await request.json();

    // Validate input
    if (!body.urls || body.urls.length === 0) {
      return NextResponse.json(
        { error: 'At least one URL is required' },
        { status: 400 }
      );
    }

    if (body.urls.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 URLs allowed' },
        { status: 400 }
      );
    }

    // Fetch content from URLs
    const sources = await Promise.all(body.urls.map(fetchContent));

    // Check if we got any valid content
    const validSources = sources.filter(s => s.content.length > 100);
    if (validSources.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract content from provided URLs' },
        { status: 400 }
      );
    }

    // Generate articles
    const articles = await generateWithAI(validSources, body);

    const result: GenerationResult = {
      articles,
      sources: validSources.map(s => ({
        url: '',
        title: s.title,
        facts: s.facts,
        quotes: [],
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
