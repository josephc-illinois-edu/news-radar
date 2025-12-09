/**
 * Originality Check API
 * POST /api/articles/check-originality - Analyze content for originality, templates, and discussion potential
 */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  type CheckOriginalityRequest,
  type CheckOriginalityResponse,
  type OriginalityResult,
  type PatternFlag,
  type OriginalityBreakdown,
  BANNED_PATTERNS,
  calculateOverallScore,
  calculateTemplatePenalty,
} from '@/types/originality';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Detect banned patterns in content
function detectPatterns(content: string): PatternFlag[] {
  const flags: PatternFlag[] = [];

  for (const rule of BANNED_PATTERNS) {
    const matches = content.matchAll(rule.pattern);
    for (const match of matches) {
      flags.push({
        type: rule.type,
        text: match[0],
        suggestion: rule.suggestion,
        severity: rule.severity,
        location: match.index !== undefined
          ? { start: match.index, end: match.index + match[0].length }
          : undefined,
      });
    }
  }

  return flags;
}

// Analyze conclusion type
function analyzeConclusion(content: string): 'question' | 'implication' | 'call-to-action' | 'summary' {
  const lastParagraph = content.split(/\n\n/).filter(p => p.trim()).pop() || '';
  const lastSentences = lastParagraph.split(/[.!?]/).filter(s => s.trim()).slice(-2);
  const ending = lastSentences.join(' ').toLowerCase();

  if (ending.includes('?')) return 'question';
  if (/should|must|need to|have to|it's time|let's/.test(ending)) return 'call-to-action';
  if (/will|going to|expect|predict|future|implies|means that/.test(ending)) return 'implication';
  return 'summary';
}

// Fallback analysis when AI is not available
function getFallbackAnalysis(content: string, title?: string): OriginalityResult {
  const flags = detectPatterns(content);
  const templatePenalty = calculateTemplatePenalty(flags);
  const conclusionType = analyzeConclusion(content);

  // Calculate basic scores
  const templateScore = Math.max(0, 100 - templatePenalty);

  // Check for weak conclusion
  const discussionPenalty = conclusionType === 'question' ? 20 : 0;
  const discussionPotential = Math.max(0, 80 - discussionPenalty - (flags.filter(f => f.type === 'weak-engagement').length * 10));

  // Default scores for things we can't analyze without AI
  const sourceReliance = 75; // Assume decent originality
  const repetitionScore = 85; // Can't check without history

  const breakdown: OriginalityBreakdown = {
    templateScore,
    repetitionScore,
    sourceReliance,
    discussionPotential,
  };

  // Generate suggestions based on flags
  const suggestions: string[] = [];

  if (conclusionType === 'question') {
    suggestions.push('Strengthen your conclusion - end with implications or a bold prediction instead of a question');
  }

  const templateFlags = flags.filter(f => f.type === 'template');
  if (templateFlags.length > 0) {
    suggestions.push(`Remove ${templateFlags.length} template phrase${templateFlags.length > 1 ? 's' : ''} to sound more original`);
  }

  const hedgingFlags = flags.filter(f => f.type === 'hedging');
  if (hedgingFlags.length > 2) {
    suggestions.push('Reduce hedging language - take clearer positions');
  }

  const engagementFlags = flags.filter(f => f.type === 'weak-engagement');
  if (engagementFlags.length > 0) {
    suggestions.push('Remove weak engagement asks - let your content provoke discussion naturally');
  }

  if (suggestions.length === 0) {
    suggestions.push('Content looks original - consider adding a contrarian angle for more engagement');
  }

  return {
    overallScore: calculateOverallScore(breakdown),
    breakdown,
    flags,
    suggestions,
    analysis: {
      thesisStrength: flags.filter(f => f.type === 'hedging').length > 3 ? 'weak' : 'moderate',
      evidenceQuality: 'adequate', // Can't determine without AI
      counterarguments: content.toLowerCase().includes('however') || content.toLowerCase().includes('on the other hand'),
      conclusionType,
    },
    checkedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: CheckOriginalityRequest = await request.json();

    if (!body.content || body.content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content must be at least 50 characters' },
        { status: 400 }
      );
    }

    // Always run pattern detection
    const patternFlags = detectPatterns(body.content);
    const conclusionType = analyzeConclusion(body.content);

    // If no API key, return fallback analysis
    if (!anthropic) {
      const result = getFallbackAnalysis(body.content, body.title);
      return NextResponse.json<CheckOriginalityResponse>({
        result,
        source: 'fallback',
        processingTime: Date.now() - startTime,
      });
    }

    // Use Claude for deeper analysis
    const systemPrompt = `You are an expert content editor analyzing writing for originality and engagement potential.

Analyze the provided content and return a JSON object with these exact fields:

{
  "thesisStrength": "weak" | "moderate" | "strong",
  "evidenceQuality": "lacking" | "adequate" | "strong",
  "hasCounterarguments": boolean,
  "discussionPotentialScore": number (0-100),
  "sourceRelianceScore": number (0-100, higher = more original synthesis),
  "additionalSuggestions": string[] (2-4 actionable suggestions)
}

Scoring guidelines:
- discussionPotentialScore: Does this content make a clear argument that invites thoughtful disagreement?
  - 90+: Bold, specific thesis with evidence that readers will want to debate
  - 70-89: Clear position with good supporting points
  - 50-69: Generic take or weak thesis
  - <50: No clear argument or asks readers "what do you think?"

- sourceRelianceScore: Is this original synthesis or rehashing sources?
  - 90+: Unique insights and original analysis
  - 70-89: Good synthesis with personal perspective
  - 50-69: Mostly summarizing with light commentary
  - <50: Heavily derivative or copied structure

Focus on whether this content would spark productive discussion, not just whether it's grammatically correct.`;

    const userPrompt = `${body.title ? `Title: "${body.title}"\n\n` : ''}Content:
${body.content}

${body.sources?.length ? `\nSources used: ${body.sources.join(', ')}` : ''}

Analyze this content for originality and discussion potential. Return only valid JSON.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const aiAnalysis = JSON.parse(jsonMatch[0]);

    // Calculate template score from pattern detection
    const templatePenalty = calculateTemplatePenalty(patternFlags);
    const templateScore = Math.max(0, 100 - templatePenalty);

    // Build final result combining pattern detection and AI analysis
    const breakdown: OriginalityBreakdown = {
      templateScore,
      repetitionScore: 85, // TODO: Compare against user's previous articles
      sourceReliance: aiAnalysis.sourceRelianceScore || 75,
      discussionPotential: aiAnalysis.discussionPotentialScore || 70,
    };

    // Combine suggestions
    const suggestions: string[] = [];

    // Add pattern-based suggestions
    if (conclusionType === 'question') {
      suggestions.push('Strengthen your conclusion - end with implications or a bold prediction instead of a question');
    }

    const templateFlags = patternFlags.filter(f => f.type === 'template');
    if (templateFlags.length > 0) {
      suggestions.push(`Remove ${templateFlags.length} template phrase${templateFlags.length > 1 ? 's' : ''} to sound more original`);
    }

    const engagementFlags = patternFlags.filter(f => f.type === 'weak-engagement');
    if (engagementFlags.length > 0) {
      suggestions.push('Remove weak engagement asks - let your content provoke discussion naturally');
    }

    // Add AI suggestions
    if (aiAnalysis.additionalSuggestions) {
      suggestions.push(...aiAnalysis.additionalSuggestions);
    }

    // Dedupe and limit suggestions
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 5);

    const result: OriginalityResult = {
      overallScore: calculateOverallScore(breakdown),
      breakdown,
      flags: patternFlags,
      suggestions: uniqueSuggestions,
      analysis: {
        thesisStrength: aiAnalysis.thesisStrength || 'moderate',
        evidenceQuality: aiAnalysis.evidenceQuality || 'adequate',
        counterarguments: aiAnalysis.hasCounterarguments || false,
        conclusionType,
      },
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json<CheckOriginalityResponse>({
      result,
      source: 'ai',
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Originality check error:', error);

    // Try to return fallback on error
    try {
      const body = await request.clone().json();
      if (body.content) {
        const result = getFallbackAnalysis(body.content, body.title);
        return NextResponse.json<CheckOriginalityResponse>({
          result,
          source: 'fallback',
          processingTime: Date.now() - startTime,
        });
      }
    } catch {
      // Can't even parse the request
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
