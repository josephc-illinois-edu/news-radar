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
import { getAntiDetectionPrompt, getNaturalTonePrompt } from '@/lib/ai-prompts';

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

  // Convert 0-100 scale to 0-10 for tone prompts
  const tonePrompt = getNaturalTonePrompt({
    humor: tone_humor !== undefined ? Math.round(tone_humor / 10) : undefined,
    urgency: tone_urgency !== undefined ? Math.round(tone_urgency / 10) : undefined,
    criticism: tone_criticism !== undefined ? Math.round(tone_criticism / 10) : undefined,
    optimism: tone_optimism !== undefined ? Math.round(tone_optimism / 10) : undefined,
  });

  let editorialContext = '';

  if (editorial_position && editorial_position !== 'neutral') {
    const positionGuide: Record<string, string> = {
      left: 'Frame from a progressive angle - focus on systemic issues, equity concerns',
      'center-left': 'Lean progressive but acknowledge complexity',
      center: 'Present the facts, let readers draw conclusions',
      'center-right': 'Lean toward traditional values, measured skepticism of change',
      right: 'Frame from a conservative angle - individual responsibility, tradition',
    };
    editorialContext += `\nPerspective: ${positionGuide[editorial_position] || editorial_position}`;
  }

  if (editorial_notes?.trim()) {
    editorialContext += `\nSpecific notes: ${editorial_notes}`;
  }

  const antiDetection = getAntiDetectionPrompt();

  return `You're rewriting content to sound more natural and human.
${antiDetection}
${tonePrompt}
${editorialContext ? `\nEDITORIAL DIRECTION:${editorialContext}` : ''}

ORIGINAL:
${content}

INSTRUCTION:
${instruction}

Rewrite the content. Output ONLY the rewritten text - no explanations, no "here's the rewrite", just the content itself.`;
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

  // Convert 0-100 scale to 0-10 for tone prompts
  const tonePrompt = getNaturalTonePrompt({
    humor: tone_humor !== undefined ? Math.round(tone_humor / 10) : undefined,
    urgency: tone_urgency !== undefined ? Math.round(tone_urgency / 10) : undefined,
    criticism: tone_criticism !== undefined ? Math.round(tone_criticism / 10) : undefined,
    optimism: tone_optimism !== undefined ? Math.round(tone_optimism / 10) : undefined,
  });

  let editorialContext = '';

  if (editorial_position && editorial_position !== 'neutral') {
    const positionGuide: Record<string, string> = {
      left: 'progressive angle',
      'center-left': 'lean progressive',
      center: 'neutral/balanced',
      'center-right': 'lean conservative',
      right: 'conservative angle',
    };
    editorialContext += `Perspective: ${positionGuide[editorial_position] || editorial_position}`;
  }

  if (editorial_notes?.trim()) {
    editorialContext += editorialContext ? `. ${editorial_notes}` : editorial_notes;
  }

  const antiDetection = getAntiDetectionPrompt();

  // Build context sections
  const contextBeforeSection = context_before?.trim()
    ? `[CONTEXT - text before selection, for reference only]\n${context_before}\n---\n`
    : '';

  const contextAfterSection = context_after?.trim()
    ? `\n---\n[CONTEXT - text after selection, for reference only]\n${context_after}`
    : '';

  return `Rewrite ONLY the selected text. Match the surrounding style and flow.
${antiDetection}
${tonePrompt}
${editorialContext ? `\nDirection: ${editorialContext}` : ''}

${contextBeforeSection}>>> SELECTED TEXT TO REWRITE <<<
${content}
>>> END SELECTED TEXT <<<${contextAfterSection}

Instruction: ${instruction}

Output ONLY the replacement text. No quotes, no explanations, just the rewritten selection.`;
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
