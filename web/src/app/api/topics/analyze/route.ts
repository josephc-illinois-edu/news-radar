/**
 * Topic Intelligence Analysis API
 * POST /api/topics/analyze - Generate hypothesis, analysis, and synthesis for a trending topic
 *
 * Takes a trending topic with related stories and produces:
 * - Hypothesis: Why is this topic emerging now?
 * - Analysis: Patterns, stakeholders, sentiment, key questions
 * - Synthesis: Content opportunities and writing angles
 */
import { NextRequest, NextResponse } from 'next/server';
import type {
  AnalyzeTopicRequest,
  AnalyzeTopicResponse,
  TopicIntelligence,
  TopicHypothesis,
  TopicAnalysis,
  TopicSynthesis,
  TopicTimeline,
  EmergenceCategory,
  TopicPattern,
  StakeholderAnalysis,
  ContentOpportunity,
  ContentOpportunityType,
  QuickHitIdea,
  DeepDiveIdea,
  TimelineEvent,
} from '@/types/topics';
import type { SuggestedAngle, ThemeAnalysis, FactSummary, Contradiction } from '@/types/synthesis';

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeTopicResponse>> {
  const startTime = Date.now();

  try {
    const body: AnalyzeTopicRequest = await request.json();
    const { topic, stories, options } = body;

    // Validate input
    if (!topic || !topic.id) {
      return NextResponse.json(
        { success: false, error: 'Topic is required' },
        { status: 400 }
      );
    }

    if (!stories || stories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one related story is required' },
        { status: 400 }
      );
    }

    // Check for Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      // Return mock analysis if no API key
      const mockResult = generateMockTopicIntelligence(topic, stories, options);
      return NextResponse.json({
        success: true,
        data: mockResult,
        processingTime: Date.now() - startTime,
      });
    }

    // Full AI analysis
    const result = await analyzeTopicWithAI(topic, stories, options, anthropicKey);
    return NextResponse.json({
      success: true,
      data: result,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Topic analysis error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

async function analyzeTopicWithAI(
  topic: AnalyzeTopicRequest['topic'],
  stories: AnalyzeTopicRequest['stories'],
  options: AnalyzeTopicRequest['options'],
  apiKey: string
): Promise<TopicIntelligence> {
  const depth = options?.depth || 'standard';
  const prompt = buildTopicAnalysisPrompt(topic, stories, options);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: depth === 'deep' ? 'claude-sonnet-4-20250514' : 'claude-sonnet-4-20250514',
        max_tokens: depth === 'deep' ? 8192 : 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      throw new Error('AI analysis failed');
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    return parseTopicAnalysisResponse(content, topic, stories);
  } catch (error) {
    console.error('AI topic analysis error:', error);
    // Fallback to mock if AI fails
    return generateMockTopicIntelligence(topic, stories, options);
  }
}

function buildTopicAnalysisPrompt(
  topic: AnalyzeTopicRequest['topic'],
  stories: AnalyzeTopicRequest['stories'],
  options: AnalyzeTopicRequest['options']
): string {
  const storySummaries = stories
    .map((story, i) => `
Story ${i + 1}: "${story.title}"
- Source: ${story.sourceName}
- URL: ${story.url}
- Published: ${story.publishedAt}
- Engagement: Score ${story.score}, ${story.commentCount} comments
- Keywords: ${story.keywords.join(', ') || 'None'}
- Preview: ${story.contentSnippet || 'No preview'}
    `.trim())
    .join('\n\n');

  const depth = options?.depth || 'standard';
  const depthInstructions = {
    quick: 'Provide a rapid assessment focusing on the core hypothesis and 2-3 key angles.',
    standard: 'Provide comprehensive analysis covering hypothesis, patterns, stakeholders, and content opportunities.',
    deep: 'Provide exhaustive analysis with detailed stakeholder mapping, timeline reconstruction, and multiple hypothesis alternatives.',
  };

  return `You are a senior news analyst and research strategist. Analyze this emerging topic to help a journalist understand WHY it's trending and WHAT content opportunities exist.

TOPIC: "${topic.name}"
- Trend Score: ${topic.trendScore}/100
- Velocity Score: ${topic.velocityScore}
- Source Coverage: ${topic.sourceCount} sources
- First Seen: ${topic.firstSeen}
- Related Keywords: ${topic.relatedKeywords.join(', ')}

RELATED STORIES (${stories.length}):
${storySummaries}

ANALYSIS DEPTH: ${depth}
${depthInstructions[depth]}

Produce a JSON response with this structure:
{
  "hypothesis": {
    "statement": "One sentence hypothesis about why this topic is emerging now",
    "emergenceReason": {
      "category": "breaking_news|controversy|announcement|trend_shift|seasonal|viral_content|follow_up|unknown",
      "description": "Detailed explanation of why this is trending",
      "triggers": ["specific events or factors that triggered this"],
      "relatedEvents": ["relevant background events"]
    },
    "trajectory": {
      "direction": "rising|peaking|declining|stable",
      "momentum": -100 to 100,
      "predictedPeakHours": number,
      "sustainabilityScore": 0-100,
      "reasoning": "why you predict this trajectory"
    },
    "confidence": 0-100,
    "evidence": [
      {
        "type": "story|pattern|timing|source_convergence",
        "description": "what supports this hypothesis",
        "weight": 0-1
      }
    ],
    "alternatives": [
      {
        "statement": "alternative hypothesis",
        "confidence": 0-100,
        "whyLessLikely": "explanation"
      }
    ]
  },
  "analysis": {
    "patterns": [
      {
        "name": "pattern name",
        "description": "what this pattern shows",
        "frequency": 1-5,
        "sources": ["which sources show this"],
        "significance": "high|medium|low",
        "examples": ["specific examples from stories"]
      }
    ],
    "stakeholders": [
      {
        "name": "stakeholder name",
        "type": "company|government|individual|industry|community|media|expert|other",
        "position": "their stance on this topic",
        "interests": ["what they want"],
        "influence": "high|medium|low",
        "sentiment": "positive|negative|neutral|mixed",
        "quotes": ["relevant quotes if any"]
      }
    ],
    "sentimentAnalysis": {
      "overall": "positive|negative|neutral|mixed",
      "distribution": { "positive": 0-100, "negative": 0-100, "neutral": 0-100 },
      "trajectory": "improving|worsening|stable|volatile",
      "keyDrivers": ["what's driving the sentiment"]
    },
    "keyQuestions": [
      {
        "question": "key question being debated",
        "positions": [
          { "position": "one stance", "supporters": ["who holds this"], "strength": 0-100 }
        ],
        "resolution": "unresolved|emerging_consensus|stalemate"
      }
    ],
    "coverageGaps": [
      {
        "topic": "what's missing",
        "description": "why it matters",
        "importance": "high|medium|low",
        "potentialAngle": "how to address this gap"
      }
    ],
    "themes": [
      {
        "name": "theme name",
        "description": "what it covers",
        "frequency": 1-5,
        "sources": ["source names"],
        "sentiment": "positive|negative|neutral|mixed"
      }
    ],
    "contradictions": [
      {
        "topic": "what they disagree on",
        "positions": [{ "sourceId": "id", "position": "their position" }],
        "significance": "major|minor"
      }
    ]
  },
  "synthesis": {
    "angles": [
      {
        "id": "unique-id",
        "name": "angle name",
        "thesis": "central argument",
        "description": "what makes this interesting",
        "supportingPoints": ["evidence"],
        "counterpoints": ["objections"],
        "originalityScore": 0-100,
        "riskLevel": "safe|moderate|provocative",
        "targetAudience": "who this resonates with",
        "suggestedTone": "informative|analytical|persuasive|entertaining"
      }
    ],
    "opportunities": [
      {
        "type": "explainer|analysis|opinion|roundup|prediction|contrarian|interview|data_story|timeline|comparison",
        "title": "suggested title",
        "description": "what this piece would cover",
        "uniqueValue": "what makes this angle unique",
        "difficulty": "easy|medium|hard",
        "timelinessScore": 0-100,
        "originalityScore": 0-100,
        "targetAudience": "who would read this",
        "requiredResearch": ["what additional research is needed"]
      }
    ],
    "quickHits": [
      {
        "headline": "catchy headline",
        "hook": "opening hook",
        "format": "social_post|short_article|newsletter_item|video_script",
        "urgency": "now|today|this_week"
      }
    ],
    "deepDives": [
      {
        "title": "long-form title",
        "thesis": "main argument",
        "outline": ["section 1", "section 2"],
        "estimatedLength": "medium|long|series",
        "researchNeeded": ["what to investigate"],
        "expertSources": ["who to interview"]
      }
    ],
    "factSummary": {
      "agreedFacts": [{ "claim": "fact", "sources": ["names"], "confidence": "high|medium|low", "category": "statistic|quote|event|opinion|prediction" }],
      "disputedFacts": [],
      "uniqueClaims": []
    }
  }
}

Requirements:
- Hypothesis should be specific and testable
- Include at least one "safe" and one "provocative" angle
- Originality scores: 90+ truly unique, 70-89 fresh perspective, 50-69 standard coverage
- Identify real stakeholders from the stories
- Coverage gaps should suggest actionable content ideas
- Quick hits should be immediately publishable
- Deep dives should be substantive projects`;
}

function parseTopicAnalysisResponse(
  content: string,
  topic: AnalyzeTopicRequest['topic'],
  stories: AnalyzeTopicRequest['stories']
): TopicIntelligence {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const now = new Date().toISOString();

      // Build hypothesis
      const hypothesis: TopicHypothesis = {
        id: `hyp-${Date.now()}`,
        topicId: topic.id,
        statement: parsed.hypothesis?.statement || `${topic.name} is gaining attention across multiple sources`,
        emergenceReason: parsed.hypothesis?.emergenceReason || {
          category: 'unknown' as EmergenceCategory,
          description: 'Topic emergence reason not determined',
          triggers: [],
        },
        trajectory: parsed.hypothesis?.trajectory || {
          direction: 'rising',
          momentum: 50,
          predictedPeakHours: 24,
          sustainabilityScore: 50,
          reasoning: 'Based on current velocity',
        },
        confidence: parsed.hypothesis?.confidence || 60,
        evidence: parsed.hypothesis?.evidence || [],
        alternatives: parsed.hypothesis?.alternatives || [],
        createdAt: now,
      };

      // Build analysis
      const analysis: TopicAnalysis = {
        id: `analysis-${Date.now()}`,
        topicId: topic.id,
        patterns: (parsed.analysis?.patterns || []).map((p: any, i: number) => ({
          id: `pattern-${i}`,
          ...p,
        })),
        stakeholders: (parsed.analysis?.stakeholders || []).map((s: any, i: number) => ({
          id: `stakeholder-${i}`,
          ...s,
        })),
        sentimentAnalysis: parsed.analysis?.sentimentAnalysis || {
          overall: 'neutral',
          distribution: { positive: 33, negative: 33, neutral: 34 },
          trajectory: 'stable',
          keyDrivers: [],
        },
        keyQuestions: parsed.analysis?.keyQuestions || [],
        factOpinionSplit: {
          factCount: 0,
          opinionCount: 0,
          ratio: 0.5,
          keyFacts: [],
          keyOpinions: [],
        },
        coverageGaps: parsed.analysis?.coverageGaps || [],
        themes: parsed.analysis?.themes || [],
        perspectives: [],
        contradictions: parsed.analysis?.contradictions || [],
        createdAt: now,
      };

      // Build synthesis
      const synthesis: TopicSynthesis = {
        id: `synthesis-${Date.now()}`,
        topicId: topic.id,
        angles: (parsed.synthesis?.angles || []).map((a: any, i: number) => ({
          ...a,
          id: a.id || `angle-${i}`,
        })),
        opportunities: (parsed.synthesis?.opportunities || []).map((o: any, i: number) => ({
          id: `opp-${i}`,
          ...o,
        })),
        factSummary: parsed.synthesis?.factSummary || {
          agreedFacts: [],
          disputedFacts: [],
          uniqueClaims: [],
        },
        quickHits: (parsed.synthesis?.quickHits || []).map((q: any, i: number) => ({
          id: `quick-${i}`,
          ...q,
        })),
        deepDives: (parsed.synthesis?.deepDives || []).map((d: any, i: number) => ({
          id: `deep-${i}`,
          ...d,
        })),
        createdAt: now,
      };

      // Build timeline from stories
      const timeline = buildTimeline(stories, topic);

      return {
        id: `intel-${Date.now()}`,
        topic,
        stories,
        hypothesis,
        analysis,
        synthesis,
        timeline,
        createdAt: now,
        updatedAt: now,
      };
    }
  } catch (e) {
    console.error('Failed to parse topic analysis response:', e);
  }

  // Return fallback if parsing fails
  return generateMockTopicIntelligence(topic, stories, {});
}

function buildTimeline(
  stories: AnalyzeTopicRequest['stories'],
  topic: AnalyzeTopicRequest['topic']
): TopicTimeline {
  // Sort stories by publication time
  const sortedStories = [...stories].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  const events: TimelineEvent[] = sortedStories.map(story => ({
    timestamp: story.publishedAt,
    type: 'story_published' as const,
    description: `${story.sourceName}: ${story.title.slice(0, 60)}...`,
    storyIds: [story.id],
    significance: story.score > 100 ? 'high' as const : story.score > 50 ? 'medium' as const : 'low' as const,
  }));

  // Determine current phase based on velocity and recency
  const now = Date.now();
  const mostRecentStory = sortedStories[sortedStories.length - 1];
  const hoursSinceLatest = mostRecentStory
    ? (now - new Date(mostRecentStory.publishedAt).getTime()) / (1000 * 60 * 60)
    : 24;

  let currentPhase: TopicTimeline['currentPhase'] = 'emerging';
  if (topic.velocityScore > 15) {
    currentPhase = hoursSinceLatest < 2 ? 'peak' : 'growing';
  } else if (hoursSinceLatest > 12) {
    currentPhase = 'declining';
  } else if (stories.length > 5) {
    currentPhase = 'stable';
  }

  return {
    events,
    firstMention: sortedStories[0]?.publishedAt || topic.firstSeen,
    peakActivity: sortedStories.reduce((peak, s) =>
      s.score > (peak?.score || 0) ? s : peak
    , sortedStories[0])?.publishedAt || topic.lastSeen,
    currentPhase,
  };
}

function generateMockTopicIntelligence(
  topic: AnalyzeTopicRequest['topic'],
  stories: AnalyzeTopicRequest['stories'],
  options: AnalyzeTopicRequest['options'] | undefined
): TopicIntelligence {
  const now = new Date().toISOString();

  // Derive mock data from actual topic and stories
  const allKeywords = stories.flatMap(s => s.keywords);
  const uniqueKeywords = [...new Set(allKeywords)];
  const sources = [...new Set(stories.map(s => s.sourceName))];

  // Mock hypothesis
  const hypothesis: TopicHypothesis = {
    id: `hyp-${Date.now()}`,
    topicId: topic.id,
    statement: `"${topic.name}" is trending due to recent developments that have captured attention across ${sources.length} major sources`,
    emergenceReason: {
      category: topic.velocityScore > 10 ? 'breaking_news' : 'trend_shift',
      description: `This topic has gained traction with ${topic.frequency} mentions and a velocity score of ${topic.velocityScore}`,
      triggers: uniqueKeywords.slice(0, 3),
      relatedEvents: stories.slice(0, 2).map(s => s.title.slice(0, 50)),
    },
    trajectory: {
      direction: topic.velocityScore > 10 ? 'rising' : topic.velocityScore > 5 ? 'peaking' : 'stable',
      momentum: Math.min(100, topic.velocityScore * 5),
      predictedPeakHours: topic.velocityScore > 10 ? 12 : 24,
      sustainabilityScore: Math.min(80, topic.sourceCount * 20),
      reasoning: `Based on ${topic.sourceCount} sources covering this topic with an average velocity of ${topic.velocityScore}`,
    },
    confidence: Math.min(85, 50 + topic.sourceCount * 10),
    evidence: [
      {
        type: 'source_convergence',
        description: `${topic.sourceCount} independent sources reporting on this topic`,
        weight: 0.8,
      },
      {
        type: 'timing',
        description: `Activity detected since ${topic.firstSeen}`,
        weight: 0.6,
      },
    ],
    alternatives: [
      {
        statement: 'This could be a scheduled announcement or event',
        confidence: 30,
        whyLessLikely: 'The velocity pattern suggests organic emergence',
      },
    ],
    createdAt: now,
  };

  // Mock analysis
  const analysis: TopicAnalysis = {
    id: `analysis-${Date.now()}`,
    topicId: topic.id,
    patterns: uniqueKeywords.slice(0, 3).map((kw, i) => ({
      id: `pattern-${i}`,
      name: kw,
      description: `Recurring theme of "${kw}" across coverage`,
      frequency: allKeywords.filter(k => k === kw).length,
      sources: stories.filter(s => s.keywords.includes(kw)).map(s => s.sourceName),
      significance: 'medium' as const,
      examples: stories.filter(s => s.keywords.includes(kw)).map(s => s.title).slice(0, 2),
    })),
    stakeholders: sources.map((source, i) => ({
      id: `stakeholder-${i}`,
      name: source,
      type: 'media' as const,
      position: 'Covering this topic from their editorial perspective',
      interests: ['Audience engagement', 'Breaking news coverage'],
      influence: 'medium' as const,
      sentiment: 'neutral' as const,
    })),
    sentimentAnalysis: {
      overall: 'neutral',
      distribution: { positive: 35, negative: 25, neutral: 40 },
      trajectory: 'stable',
      keyDrivers: ['News coverage', 'Community discussion'],
    },
    keyQuestions: [
      {
        question: `What are the implications of ${topic.name}?`,
        positions: [
          { position: 'Significant impact expected', supporters: sources.slice(0, 2), strength: 60 },
          { position: 'Limited impact', supporters: sources.slice(2), strength: 40 },
        ],
        resolution: 'unresolved',
      },
    ],
    factOpinionSplit: {
      factCount: stories.length,
      opinionCount: Math.floor(stories.length * 0.3),
      ratio: 0.7,
      keyFacts: stories.slice(0, 3).map(s => s.title),
      keyOpinions: [],
    },
    coverageGaps: [
      {
        topic: 'Expert analysis',
        description: 'Limited expert commentary in current coverage',
        importance: 'medium',
        potentialAngle: 'Interview industry experts for deeper perspective',
      },
      {
        topic: 'Historical context',
        description: 'How does this compare to similar past events?',
        importance: 'medium',
        potentialAngle: 'Timeline piece showing evolution of this topic',
      },
    ],
    themes: uniqueKeywords.slice(0, 3).map(kw => ({
      name: kw,
      description: `Coverage related to ${kw}`,
      frequency: allKeywords.filter(k => k === kw).length,
      sources: stories.filter(s => s.keywords.includes(kw)).map(s => s.sourceName),
      sentiment: 'neutral' as const,
    })),
    perspectives: [],
    contradictions: [],
    createdAt: now,
  };

  // Mock synthesis
  const synthesis: TopicSynthesis = {
    id: `synthesis-${Date.now()}`,
    topicId: topic.id,
    angles: [
      {
        id: 'angle-1',
        name: 'Comprehensive Overview',
        thesis: `A balanced look at ${topic.name} and why it matters now`,
        description: 'Synthesize all perspectives into an accessible overview',
        supportingPoints: sources.map(s => `${s} coverage`),
        counterpoints: ['May lack strong opinion', 'Requires careful balance'],
        originalityScore: 55,
        riskLevel: 'safe',
        targetAudience: 'General readers seeking understanding',
        suggestedTone: 'informative',
      },
      {
        id: 'angle-2',
        name: 'Deep Analysis',
        thesis: `What ${topic.name} reveals about larger trends`,
        description: 'Connect this topic to broader patterns and implications',
        supportingPoints: ['Multiple sources converging', 'Clear pattern emerging'],
        counterpoints: ['May overreach in conclusions'],
        originalityScore: 72,
        riskLevel: 'moderate',
        targetAudience: 'Engaged readers wanting depth',
        suggestedTone: 'analytical',
      },
      {
        id: 'angle-3',
        name: 'Contrarian Take',
        thesis: `Why the mainstream narrative on ${topic.name} misses key nuances`,
        description: 'Challenge conventional wisdom with evidence from coverage gaps',
        supportingPoints: analysis.coverageGaps.map(g => g.topic),
        counterpoints: ['May alienate some readers', 'Requires strong evidence'],
        originalityScore: 85,
        riskLevel: 'provocative',
        targetAudience: 'Critical thinkers and skeptics',
        suggestedTone: 'persuasive',
      },
    ],
    opportunities: [
      {
        id: 'opp-1',
        type: 'explainer' as ContentOpportunityType,
        title: `${topic.name}: What You Need to Know`,
        description: 'Break down the topic for newcomers',
        uniqueValue: 'Accessible entry point for general audience',
        difficulty: 'easy',
        timelinessScore: 90,
        originalityScore: 50,
        targetAudience: 'General audience',
        requiredResearch: ['Background context', 'Key terminology'],
      },
      {
        id: 'opp-2',
        type: 'analysis' as ContentOpportunityType,
        title: `The Real Story Behind ${topic.name}`,
        description: 'Deep dive into causes and implications',
        uniqueValue: 'Original analysis not found in wire coverage',
        difficulty: 'medium',
        timelinessScore: 80,
        originalityScore: 75,
        targetAudience: 'Informed readers',
        requiredResearch: ['Expert interviews', 'Historical comparison'],
      },
    ],
    factSummary: {
      agreedFacts: stories.length > 1 ? [{
        claim: `${topic.name} is receiving significant attention across ${sources.length} sources`,
        sources,
        confidence: 'high',
        category: 'event',
      }] : [],
      disputedFacts: [],
      uniqueClaims: stories.map(s => ({
        claim: s.title,
        sources: [s.sourceName],
        confidence: 'medium' as const,
        category: 'event' as const,
      })),
    },
    quickHits: [
      {
        id: 'quick-1',
        headline: `${topic.name}: The Key Takeaways`,
        hook: `${sources.length} major sources are covering this story. Here's what you need to know.`,
        format: 'social_post',
        urgency: 'now',
      },
      {
        id: 'quick-2',
        headline: `Why ${topic.name} Matters`,
        hook: 'A quick breakdown of the trending topic everyone is discussing.',
        format: 'newsletter_item',
        urgency: 'today',
      },
    ],
    deepDives: [
      {
        id: 'deep-1',
        title: `The Complete Guide to ${topic.name}`,
        thesis: `Understanding the full context and implications of ${topic.name}`,
        outline: [
          'Background and context',
          'Key players and stakeholders',
          'Current developments',
          'Future implications',
          'What to watch for next',
        ],
        estimatedLength: 'long',
        researchNeeded: ['Expert interviews', 'Historical data', 'Stakeholder perspectives'],
        expertSources: ['Industry analysts', 'Academic researchers', 'Primary sources'],
      },
    ],
    createdAt: now,
  };

  // Build timeline
  const timeline = buildTimeline(stories, topic);

  return {
    id: `intel-${Date.now()}`,
    topic,
    stories,
    hypothesis,
    analysis,
    synthesis,
    timeline,
    createdAt: now,
    updatedAt: now,
  };
}
