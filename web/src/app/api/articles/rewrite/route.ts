/**
 * Article Rewrite API
 * POST /api/articles/rewrite - Rewrite content with Claude (Haiku or Sonnet)
 *
 * Supports two modes:
 * - 'full' (default): Rewrites entire content
 * - 'partial': Rewrites only selected text with surrounding context for understanding
 *
 * Uses editorial context (position, criticism level, notes) to guide rewrites.
 * Haiku is default (~100x cheaper than Opus), Sonnet available for complex rewrites.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { RewriteRequest, RewriteResponse, EditorialPosition } from '@/types/database';

// Model configs with pricing (per 1K tokens)
const MODEL_CONFIG = {
  haiku: {
    id: 'claude-3-5-haiku-20241022',
    inputCost: 0.0008,
    outputCost: 0.004,
  },
  sonnet: {
    id: 'claude-sonnet-4-20250514',
    inputCost: 0.003,
    outputCost: 0.015,
  },
} as const;

type ModelKey = keyof typeof MODEL_CONFIG;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      content,
      instruction,
      model: rawModel = 'haiku',
      mode = 'full',
      context_before,
      context_after,
      editorial_position,
      editorial_notes,
      tone_humor,
      tone_urgency,
      tone_criticism,
      tone_optimism,
    } = body;

    // Validate model key
    const model: ModelKey = rawModel === 'sonnet' ? 'sonnet' : 'haiku';

    // Validate input
    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!instruction?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Rewrite instruction is required' },
        { status: 400 }
      );
    }

    // Check for Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      // Return mock rewrite if no API key
      const mockResult = generateMockRewrite(content, instruction);
      return NextResponse.json({ success: true, data: mockResult });
    }

    // Build prompt with editorial context (full or partial mode)
    const prompt = mode === 'partial'
      ? buildPartialRewritePrompt({
          content,
          instruction,
          context_before,
          context_after,
          editorial_position,
          editorial_notes,
          tone_humor,
          tone_urgency,
          tone_criticism,
          tone_optimism,
        })
      : buildRewritePrompt({
          content,
          instruction,
          editorial_position,
          editorial_notes,
          tone_humor,
          tone_urgency,
          tone_criticism,
          tone_optimism,
        });

    // Call Claude API
    const modelConfig = MODEL_CONFIG[model];
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelConfig.id,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { success: false, error: 'AI rewrite failed' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rewritten = data.content[0]?.text || '';

    // Calculate cost estimate
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const estimatedCost =
      (inputTokens / 1000) * modelConfig.inputCost +
      (outputTokens / 1000) * modelConfig.outputCost;

    const result: RewriteResponse = {
      rewritten,
      model,
      tokens_used: inputTokens + outputTokens,
      estimated_cost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimals
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Rewrite error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Rewrite failed' },
      { status: 500 }
    );
  }
}

function buildRewritePrompt(params: {
  content: string;
  instruction: string;
  editorial_position?: EditorialPosition;
  editorial_notes?: string;
  tone_humor?: number;
  tone_urgency?: number;
  tone_criticism?: number;
  tone_optimism?: number;
}): string {
  const { content, instruction, editorial_position, editorial_notes, tone_humor, tone_urgency, tone_criticism, tone_optimism } = params;

  let editorialContext = '';

  if (editorial_position && editorial_position !== 'neutral') {
    const positionGuide = {
      left: 'progressive, emphasizing social justice, equity, and systemic critiques',
      'center-left': 'moderately progressive, balanced but leaning toward reform',
      center: 'balanced, presenting multiple viewpoints equally',
      'center-right': 'moderately conservative, emphasizing tradition and measured change',
      right: 'conservative, emphasizing individual responsibility and traditional values',
    };
    editorialContext += `\nEditorial position: ${positionGuide[editorial_position] || editorial_position}`;
  }

  if (tone_humor !== undefined && tone_humor !== 50) {
    const humorLevel = tone_humor > 70 ? 'playful and witty' : tone_humor > 40 ? 'balanced with light touches' : 'serious and straightforward';
    editorialContext += `\nHumor: ${humorLevel} (${tone_humor}/100)`;
  }

  if (tone_urgency !== undefined && tone_urgency !== 50) {
    const urgencyLevel = tone_urgency > 70 ? 'urgent, time-sensitive' : tone_urgency > 40 ? 'moderately pressing' : 'relaxed, evergreen';
    editorialContext += `\nUrgency: ${urgencyLevel} (${tone_urgency}/100)`;
  }

  if (tone_optimism !== undefined && tone_optimism !== 50) {
    const optimismLevel = tone_optimism > 70 ? 'optimistic' : tone_optimism > 40 ? 'balanced' : 'cautious/pessimistic';
    editorialContext += `\nOptimism: ${optimismLevel} (${tone_optimism}/100)`;
  }

  if (tone_criticism !== undefined && tone_criticism !== 50) {
    const criticismLevel = tone_criticism > 70 ? 'highly critical' : tone_criticism > 40 ? 'moderately critical' : 'supportive';
    editorialContext += `\nCriticism: ${criticismLevel} (${tone_criticism}/100)`;
  }

  if (editorial_notes?.trim()) {
    editorialContext += `\nAdditional editorial notes: ${editorial_notes}`;
  }

  return `You are an expert editor helping rewrite article content. Your task is to rewrite the following content according to the user's instruction while maintaining accuracy and readability.
${editorialContext ? `\n## Editorial Context${editorialContext}` : ''}

## Original Content
${content}

## Rewrite Instruction
${instruction}

## Output
Provide only the rewritten content, without any preamble, explanation, or commentary. The output should be ready to use directly.`;
}

function buildPartialRewritePrompt(params: {
  content: string;
  instruction: string;
  context_before?: string;
  context_after?: string;
  editorial_position?: EditorialPosition;
  editorial_notes?: string;
  tone_humor?: number;
  tone_urgency?: number;
  tone_criticism?: number;
  tone_optimism?: number;
}): string {
  const {
    content,
    instruction,
    context_before,
    context_after,
    editorial_position,
    editorial_notes,
    tone_humor,
    tone_urgency,
    tone_criticism,
    tone_optimism,
  } = params;

  let editorialContext = '';

  if (editorial_position && editorial_position !== 'neutral') {
    const positionGuide = {
      left: 'progressive, emphasizing social justice, equity, and systemic critiques',
      'center-left': 'moderately progressive, balanced but leaning toward reform',
      center: 'balanced, presenting multiple viewpoints equally',
      'center-right': 'moderately conservative, emphasizing tradition and measured change',
      right: 'conservative, emphasizing individual responsibility and traditional values',
    };
    editorialContext += `\nEditorial position: ${positionGuide[editorial_position] || editorial_position}`;
  }

  if (tone_humor !== undefined && tone_humor !== 50) {
    const humorLevel = tone_humor > 70 ? 'playful and witty' : tone_humor > 40 ? 'balanced with light touches' : 'serious and straightforward';
    editorialContext += `\nHumor: ${humorLevel}`;
  }

  if (tone_urgency !== undefined && tone_urgency !== 50) {
    const urgencyLevel = tone_urgency > 70 ? 'urgent, time-sensitive' : tone_urgency > 40 ? 'moderately pressing' : 'relaxed, evergreen';
    editorialContext += `\nUrgency: ${urgencyLevel}`;
  }

  if (tone_optimism !== undefined && tone_optimism !== 50) {
    const optimismLevel = tone_optimism > 70 ? 'optimistic' : tone_optimism > 40 ? 'balanced' : 'cautious/pessimistic';
    editorialContext += `\nOptimism: ${optimismLevel}`;
  }

  if (tone_criticism !== undefined && tone_criticism !== 50) {
    const criticismLevel = tone_criticism > 70 ? 'highly critical' : tone_criticism > 40 ? 'moderately critical' : 'supportive';
    editorialContext += `\nCriticism: ${criticismLevel}`;
  }

  if (editorial_notes?.trim()) {
    editorialContext += `\nAdditional notes: ${editorial_notes}`;
  }

  // Build context sections
  const contextBeforeSection = context_before?.trim()
    ? `## Context Before (DO NOT include in output)\n${context_before}\n`
    : '';

  const contextAfterSection = context_after?.trim()
    ? `## Context After (DO NOT include in output)\n${context_after}`
    : '';

  return `You are an expert editor. Rewrite ONLY the selected text according to the instruction. The context is provided for understanding but should NOT be included in your output.
${editorialContext ? `\n## Editorial Guidelines${editorialContext}` : ''}

${contextBeforeSection}
## Selected Text (REWRITE THIS)
${content}

${contextAfterSection}

## Instruction
${instruction}

## Output
Provide ONLY the rewritten version of the selected text. Do not include any context, preamble, or explanation. The output should seamlessly replace the selected text.`;
}

function generateMockRewrite(content: string, instruction: string): RewriteResponse {
  // Simple mock that acknowledges the instruction
  const mockRewritten = `[Demo Mode - No API Key]

The following content would be rewritten based on your instruction: "${instruction}"

Original content preview:
${content.slice(0, 200)}...

In production, Claude would rewrite this content according to your editorial preferences.`;

  return {
    rewritten: mockRewritten,
    model: 'haiku',
    tokens_used: 0,
    estimated_cost: 0,
  };
}
