/**
 * AI Reply Suggestions API
 * POST /api/engage/suggest - Get AI-suggested replies
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SuggestedReply } from '@/types/engage';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, authorName, sentiment, platform } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // In production, use Anthropic API to generate contextual replies
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicKey) {
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
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `Generate 3 reply options for this ${platform} comment. The comment is from ${authorName} and has ${sentiment} sentiment.

Comment: "${content}"

Provide replies in these tones:
1. Professional - formal and business-appropriate
2. Friendly - warm and approachable
3. Formal - very professional, suitable for LinkedIn

Format as JSON:
{
  "suggestions": [
    { "content": "...", "tone": "professional", "confidence": 0.9 },
    { "content": "...", "tone": "friendly", "confidence": 0.85 },
    { "content": "...", "tone": "formal", "confidence": 0.8 }
  ]
}

Keep replies concise (under 280 chars for Twitter). Be authentic and engaging.`,
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.content[0]?.text || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return NextResponse.json({ suggestions: parsed.suggestions });
          }
        }
      } catch (e) {
        console.error('AI suggestion error:', e);
      }
    }

    // Fallback demo suggestions
    const suggestions: SuggestedReply[] = [
      {
        content: `Thank you for your thoughtful comment, ${authorName}! We appreciate your engagement with our content.`,
        tone: 'professional',
        confidence: 0.85,
      },
      {
        content: `Hey ${authorName}! Thanks for sharing your thoughts - we love hearing from our readers!`,
        tone: 'friendly',
        confidence: 0.80,
      },
      {
        content: `Thank you for your feedback, ${authorName}. We value your perspective and will take it into consideration.`,
        tone: 'formal',
        confidence: 0.75,
      },
    ];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Suggest reply error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
