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
import { getBannedPhrasesPrompt } from '@/lib/ai-prompts';

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

  const bannedPhrases = getBannedPhrasesPrompt();

  return `You're helping a writer find genuinely interesting angles across these sources.

SOURCES:
${storySummaries}
${notesSection}
${analysisSection}
${focusSection}

When suggesting angles, avoid generic takes. Bad examples:
- "A balanced look at X" - too vague
- "The implications of Y" - what implications specifically?
- "What this means for Z" - cliché

Good angle examples:
- "The specific number that undermines the official narrative"
- "Why Source A and Source B can both be right"
- "The question nobody is asking about X"
- "What the comment section reveals that the articles miss"

${bannedPhrases}

OUTPUT FORMAT (JSON):
{
  "themes": [
    {
      "name": "specific theme name",
      "description": "concrete description",
      "frequency": 1-5,
      "sources": ["source names"],
      "sentiment": "positive|negative|neutral|mixed"
    }
  ],
  "perspectives": [
    {
      "sourceId": "story id",
      "sourceName": "source name",
      "stance": "specific framing or angle this source takes",
      "keyPoints": ["concrete claims, not vague summaries"],
      "bias": "left|center|right|unknown",
      "credibilityIndicators": ["specific credibility signals"]
    }
  ],
  "suggestedAngles": [
    {
      "id": "unique-id",
      "name": "specific, punchy angle name",
      "thesis": "one clear argument in one sentence",
      "description": "why this is interesting - be specific",
      "supportingPoints": ["concrete evidence from sources"],
      "counterpoints": ["real objections, not strawmen"],
      "originalityScore": 0-100,
      "riskLevel": "safe|moderate|provocative",
      "targetAudience": "specific reader type",
      "suggestedTone": "informative|analytical|persuasive|entertaining"
    }
  ],
  "factSummary": {
    "agreedFacts": [
      { "claim": "specific fact", "sources": ["source names"], "confidence": "high|medium|low", "category": "statistic|quote|event|opinion|prediction" }
    ],
    "disputedFacts": [],
    "uniqueClaims": []
  },
  "contradictions": [
    {
      "topic": "specific disagreement",
      "positions": [
        { "sourceId": "id", "position": "exact position" }
      ],
      "significance": "major|minor"
    }
  ]
}

SCORING GUIDE:
- 90+: Angle most writers would miss entirely
- 75-89: Fresh take that requires connecting dots
- 60-74: Solid angle but somewhat predictable
- Below 60: Standard coverage angle

Generate 3-5 angles. At least one should score 80+ and take a real stance.`;
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
