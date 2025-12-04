/**
 * Research Synthesis API
 * POST /api/create/synthesize - Analyze research and suggest writing angles
 *
 * Takes research context (articles, notes, analysis) and produces:
 * - Key themes across sources
 * - Perspective analysis per source
 * - Suggested writing angles with originality scores
 * - Fact summary with contradictions
 */
import { NextRequest, NextResponse } from 'next/server';
import type {
  SynthesizeRequest,
  SynthesizeResponse,
  SynthesisResult,
  ThemeAnalysis,
  PerspectiveAnalysis,
  SuggestedAngle,
  FactSummary,
  FactPoint,
  Contradiction,
} from '@/types/synthesis';

export async function POST(request: NextRequest): Promise<NextResponse<SynthesizeResponse>> {
  try {
    const body: SynthesizeRequest = await request.json();
    const { context, options } = body;

    // Validate input
    if (!context.stories || context.stories.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 stories are required for synthesis' },
        { status: 400 }
      );
    }

    if (context.stories.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum 5 stories allowed' },
        { status: 400 }
      );
    }

    // Check for Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      // Return mock synthesis if no API key
      const mockResult = generateMockSynthesis(context, options);
      return NextResponse.json({ success: true, data: mockResult });
    }

    // Full AI synthesis
    const result = await synthesizeWithAI(context, options, anthropicKey);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Synthesis error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Synthesis failed' },
      { status: 500 }
    );
  }
}

async function synthesizeWithAI(
  context: SynthesizeRequest['context'],
  options: SynthesizeRequest['options'],
  apiKey: string
): Promise<SynthesisResult> {
  const prompt = buildSynthesisPrompt(context, options);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      throw new Error('AI synthesis failed');
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    return parseSynthesisResponse(content, context);
  } catch (error) {
    console.error('AI synthesis error:', error);
    // Fallback to mock if AI fails
    return generateMockSynthesis(context, options);
  }
}

function buildSynthesisPrompt(
  context: SynthesizeRequest['context'],
  options: SynthesizeRequest['options']
): string {
  const storySummaries = context.stories
    .map((story, i) => `
Source ${i + 1}: "${story.title}"
- Publisher: ${story.sourceName}
- URL: ${story.url}
- Keywords: ${story.keywords.join(', ') || 'None'}
- Content: ${story.contentSnippet || 'No preview available'}
- Score: ${story.score}, Comments: ${story.commentCount}
    `.trim())
    .join('\n\n');

  const notesSection = context.notes
    ? `\nResearcher Notes:\n${context.notes}`
    : '';

  const analysisSection = context.analysis
    ? `\nPrevious Analysis:
- Similarities: ${context.analysis.similarities.join('; ')}
- Differences: ${context.analysis.differences.join('; ')}
- Key Themes: ${context.analysis.keyThemes.join(', ')}`
    : '';

  const focusSection = context.focus
    ? `\nFocus Area: ${context.focus}`
    : '';

  return `You are a research analyst helping a journalist synthesize multiple news sources into original content.

Analyze these ${context.stories.length} sources and provide synthesis:

${storySummaries}
${notesSection}
${analysisSection}
${focusSection}

Produce a JSON response with this exact structure:
{
  "themes": [
    {
      "name": "theme name",
      "description": "what this theme covers",
      "frequency": 1-5,
      "sources": ["source names that cover this"],
      "sentiment": "positive|negative|neutral|mixed"
    }
  ],
  "perspectives": [
    {
      "sourceId": "story id",
      "sourceName": "source name",
      "stance": "how this source frames the topic",
      "keyPoints": ["main arguments or claims"],
      "bias": "left|center|right|unknown",
      "credibilityIndicators": ["what makes this source credible or not"]
    }
  ],
  "suggestedAngles": [
    {
      "id": "unique-id",
      "name": "angle name",
      "thesis": "the central argument",
      "description": "what makes this angle interesting",
      "supportingPoints": ["evidence that supports this angle"],
      "counterpoints": ["potential objections or alternative views"],
      "originalityScore": 0-100,
      "riskLevel": "safe|moderate|provocative",
      "targetAudience": "who this would resonate with",
      "suggestedTone": "informative|analytical|persuasive|entertaining"
    }
  ],
  "factSummary": {
    "agreedFacts": [
      { "claim": "fact text", "sources": ["source names"], "confidence": "high|medium|low", "category": "statistic|quote|event|opinion|prediction" }
    ],
    "disputedFacts": [],
    "uniqueClaims": []
  },
  "contradictions": [
    {
      "topic": "what they disagree on",
      "positions": [
        { "sourceId": "id", "position": "what this source says" }
      ],
      "significance": "major|minor"
    }
  ]
}

Requirements:
- Generate 3-5 suggested angles with varying risk levels
- Originality scores: 90+ for truly unique takes, 70-89 for fresh perspectives, 50-69 for standard coverage
- Include at least one "safe" angle and one "provocative" angle
- Identify any contradictions between sources
- Be specific about what makes each angle original`;
}

function parseSynthesisResponse(
  content: string,
  context: SynthesizeRequest['context']
): SynthesisResult {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        id: `synthesis-${Date.now()}`,
        themes: parsed.themes || [],
        perspectives: parsed.perspectives || [],
        suggestedAngles: (parsed.suggestedAngles || []).map((a: any, i: number) => ({
          ...a,
          id: a.id || `angle-${i + 1}`,
        })),
        factSummary: parsed.factSummary || {
          agreedFacts: [],
          disputedFacts: [],
          uniqueClaims: [],
        },
        contradictions: parsed.contradictions || [],
        createdAt: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('Failed to parse synthesis response:', e);
  }

  // Return fallback if parsing fails
  return generateMockSynthesis(context, {});
}

function generateMockSynthesis(
  context: SynthesizeRequest['context'],
  options: SynthesizeRequest['options'] | undefined
): SynthesisResult {
  const stories = context.stories;
  const allKeywords = stories.flatMap(s => s.keywords);
  const uniqueKeywords = [...new Set(allKeywords)];
  const commonKeywords = allKeywords.filter(
    (kw, _, arr) => arr.filter(k => k === kw).length > 1
  );

  // Generate themes from keywords
  const themes: ThemeAnalysis[] = uniqueKeywords.slice(0, 3).map(kw => ({
    name: kw,
    description: `Coverage of ${kw} across multiple sources`,
    frequency: allKeywords.filter(k => k === kw).length,
    sources: stories.filter(s => s.keywords.includes(kw)).map(s => s.sourceName),
    sentiment: 'neutral' as const,
  }));

  // Generate perspective analysis
  const perspectives: PerspectiveAnalysis[] = stories.map(story => ({
    sourceId: story.id,
    sourceName: story.sourceName,
    stance: `Covers the topic from ${story.sourceName}'s perspective`,
    keyPoints: story.keywords.slice(0, 3),
    bias: 'unknown' as const,
    credibilityIndicators: ['Established publication'],
  }));

  // Generate suggested angles
  const suggestedAngles: SuggestedAngle[] = [
    {
      id: 'angle-1',
      name: 'Balanced Overview',
      thesis: `A comprehensive look at ${commonKeywords[0] || 'this topic'} drawing from multiple perspectives`,
      description: 'Presents all viewpoints fairly without taking a strong position',
      supportingPoints: stories.map(s => `${s.sourceName} reports: ${s.title.slice(0, 50)}...`),
      counterpoints: ['Some readers may want a clearer stance'],
      originalityScore: 55,
      riskLevel: 'safe',
      targetAudience: 'General news readers',
      suggestedTone: 'informative',
    },
    {
      id: 'angle-2',
      name: 'Deep Analysis',
      thesis: `What the coverage of ${commonKeywords[0] || 'this story'} reveals about broader trends`,
      description: 'Goes beyond the news to explore underlying patterns and implications',
      supportingPoints: ['Multiple sources covering same topic indicates significance', 'Different angles suggest complexity'],
      counterpoints: ['Analysis may oversimplify nuanced situations'],
      originalityScore: 72,
      riskLevel: 'moderate',
      targetAudience: 'Engaged readers seeking depth',
      suggestedTone: 'analytical',
    },
    {
      id: 'angle-3',
      name: 'Contrarian Take',
      thesis: `Why the mainstream narrative on ${commonKeywords[0] || 'this topic'} misses the point`,
      description: 'Challenges conventional wisdom with evidence from the sources',
      supportingPoints: ['Sources show inconsistencies in coverage', 'Key details often overlooked'],
      counterpoints: ['May alienate readers who agree with mainstream view'],
      originalityScore: 85,
      riskLevel: 'provocative',
      targetAudience: 'Critical thinkers',
      suggestedTone: 'persuasive',
    },
  ];

  // Generate fact summary
  const factSummary: FactSummary = {
    agreedFacts: stories.length > 0
      ? [{
          claim: `Multiple sources are reporting on ${commonKeywords[0] || 'this topic'}`,
          sources: stories.map(s => s.sourceName),
          confidence: 'high',
          category: 'event',
        }]
      : [],
    disputedFacts: [],
    uniqueClaims: stories.map(s => ({
      claim: s.title,
      sources: [s.sourceName],
      confidence: 'medium' as const,
      category: 'event' as const,
    })),
  };

  // Generate contradictions if sources have different keywords
  const contradictions: Contradiction[] = [];
  if (stories.length >= 2) {
    const story1Keywords = new Set(stories[0].keywords);
    const story2Keywords = new Set(stories[1].keywords);
    const uniqueToFirst = stories[0].keywords.filter(k => !story2Keywords.has(k));
    const uniqueToSecond = stories[1].keywords.filter(k => !story1Keywords.has(k));

    if (uniqueToFirst.length > 0 && uniqueToSecond.length > 0) {
      contradictions.push({
        topic: 'Focus and framing',
        positions: [
          { sourceId: stories[0].id, position: `Emphasizes: ${uniqueToFirst.join(', ')}` },
          { sourceId: stories[1].id, position: `Emphasizes: ${uniqueToSecond.join(', ')}` },
        ],
        significance: 'minor',
      });
    }
  }

  return {
    id: `synthesis-${Date.now()}`,
    themes,
    perspectives,
    suggestedAngles,
    factSummary,
    contradictions,
    createdAt: new Date().toISOString(),
  };
}
