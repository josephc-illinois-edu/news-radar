/**
 * Research Comparison API
 * POST /api/research/compare - Analyze differences between articles
 */
import { NextRequest, NextResponse } from 'next/server';
import type { StoryResult, DiffAnalysis, DiffPoint, PerspectiveInfo } from '@/types/research';

interface CompareRequest {
  articles: StoryResult[];
}

// === AI Analysis with Claude ===

async function analyzeWithAI(articles: StoryResult[]): Promise<DiffAnalysis> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return generateMockAnalysis(articles);
  }

  const prompt = buildComparisonPrompt(articles);

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
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', response.status);
      return generateMockAnalysis(articles);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    return parseAnalysisResponse(content, articles);
  } catch (error) {
    console.error('AI analysis failed:', error);
    return generateMockAnalysis(articles);
  }
}

function buildComparisonPrompt(articles: StoryResult[]): string {
  const articleSummaries = articles
    .map((a, i) => `
Article ${i + 1} (${a.sourceName}):
ID: ${a.id}
Title: ${a.title}
URL: ${a.url}
Content: ${a.contentSnippet}
Keywords: ${a.keywords.join(', ')}
Topics: ${a.topics.join(', ')}
    `)
    .join('\n---\n');

  return `You are a research analyst comparing news articles on the same or related topics.

Analyze these ${articles.length} articles and identify similarities, differences, and unique perspectives.

${articleSummaries}

Provide a JSON response with this exact structure:
{
  "similarities": [
    { "type": "fact|claim|quote|statistic|opinion", "text": "What they have in common", "articles": ["article_id_1", "article_id_2"], "confidence": 0.9 }
  ],
  "differences": [
    { "type": "fact|claim|quote|statistic|opinion", "text": "How they differ", "articles": ["article_id_1"], "confidence": 0.8 }
  ],
  "keyThemes": ["theme1", "theme2", "theme3"],
  "perspectiveAnalysis": [
    { "articleId": "article_id", "perspective": "tech-optimistic|skeptical|neutral|balanced|critical", "tone": "informative|persuasive|analytical|sensational", "biasIndicators": ["any bias indicators"] }
  ],
  "suggestedAngles": [
    "Angle 1: A unique perspective you could write about",
    "Angle 2: Another approach based on these sources"
  ]
}

Focus on:
1. Factual similarities and differences
2. Different perspectives or framing
3. Unique information in each article
4. Potential writing angles that synthesize the sources

Use the actual article IDs provided above in your response.`;
}

function parseAnalysisResponse(content: string, articles: StoryResult[]): DiffAnalysis {
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateMockAnalysis(articles);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      id: `analysis-${Date.now()}`,
      sessionId: '',
      similarities: (parsed.similarities || []).map((s: any) => ({
        type: s.type || 'fact',
        text: s.text || '',
        articles: s.articles || [],
        confidence: s.confidence || 0.7,
      })),
      differences: (parsed.differences || []).map((d: any) => ({
        type: d.type || 'fact',
        text: d.text || '',
        articles: d.articles || [],
        confidence: d.confidence || 0.7,
      })),
      keyThemes: parsed.keyThemes || [],
      perspectiveAnalysis: (parsed.perspectiveAnalysis || []).map((p: any) => ({
        articleId: p.articleId || '',
        perspective: p.perspective || 'neutral',
        tone: p.tone || 'informative',
        biasIndicators: p.biasIndicators || [],
      })),
      suggestedAngles: parsed.suggestedAngles || [],
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return generateMockAnalysis(articles);
  }
}

// === Mock Analysis for Demo Mode ===

function generateMockAnalysis(articles: StoryResult[]): DiffAnalysis {
  const articleIds = articles.map(a => a.id);

  // Extract common keywords
  const keywordCounts = new Map<string, number>();
  articles.forEach(a => {
    a.keywords.forEach(k => {
      keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1);
    });
  });

  const commonKeywords = Array.from(keywordCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([keyword]) => keyword);

  const uniqueKeywords = articles.map(a => ({
    articleId: a.id,
    keywords: a.keywords.filter(k => keywordCounts.get(k) === 1),
  }));

  return {
    id: `analysis-${Date.now()}`,
    sessionId: '',
    similarities: [
      {
        type: 'fact',
        text: `Both articles discuss ${commonKeywords[0] || 'the same general topic'}`,
        articles: articleIds,
        confidence: 0.85,
      },
      {
        type: 'claim',
        text: 'The articles share a similar timeframe and context',
        articles: articleIds,
        confidence: 0.7,
      },
    ],
    differences: [
      {
        type: 'opinion',
        text: `${articles[0]?.sourceName || 'Article 1'} focuses on ${articles[0]?.keywords[0] || 'different aspects'}`,
        articles: [articleIds[0]],
        confidence: 0.75,
      },
      {
        type: 'fact',
        text: `${articles[1]?.sourceName || 'Article 2'} provides ${articles[1]?.keywords[0] || 'unique information'}`,
        articles: [articleIds[1]],
        confidence: 0.8,
      },
    ],
    keyThemes: commonKeywords.length > 0 ? commonKeywords.slice(0, 5) : ['technology', 'current events'],
    perspectiveAnalysis: articles.map((a, i) => ({
      articleId: a.id,
      perspective: i === 0 ? 'balanced' : 'analytical',
      tone: a.sourceId === 'hackernews' ? 'technical' : 'informative',
      biasIndicators: [],
    })),
    suggestedAngles: [
      'Compare and contrast the different viewpoints presented in these sources',
      'Focus on the facts that both sources agree on as a foundation',
      'Explore the unique insights each source provides on the topic',
      'Analyze why different sources frame the story differently',
    ],
    createdAt: new Date().toISOString(),
  };
}

// === API Handler ===

export async function POST(request: NextRequest) {
  try {
    const body: CompareRequest = await request.json();

    if (!body.articles || body.articles.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 articles required for comparison' },
        { status: 400 }
      );
    }

    if (body.articles.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 articles for comparison' },
        { status: 400 }
      );
    }

    const analysis = await analyzeWithAI(body.articles);

    return NextResponse.json({ data: analysis });
  } catch (error) {
    console.error('Comparison error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Comparison failed' },
      { status: 500 }
    );
  }
}
