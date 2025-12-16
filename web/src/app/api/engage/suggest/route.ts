/**
 * AI Reply Suggestions API
 * POST /api/engage/suggest - Get AI-suggested replies
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SuggestedReply } from '@/types/engage';
import { BANNED_PHRASES } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth if Supabase is configured
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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
        // Get a subset of banned phrases relevant to social replies
        const socialBanned = BANNED_PHRASES.filter(p =>
          ['Thank you for', 'I appreciate', 'Great point', 'Absolutely', 'Indeed'].some(s => p.includes(s)) ||
          p.includes('Moreover') || p.includes('Furthermore')
        ).slice(0, 10);

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
              content: `Write 3 reply options for this ${platform} comment from ${authorName}.

Comment: "${content}"
Sentiment: ${sentiment}

Write replies that sound like a real person typed them quickly, not a corporate social media manager.

AVOID these AI-sounding patterns:
- Starting with "Thank you for sharing" or "Great question!"
- "I appreciate your perspective"
- "Absolutely!" as a response
- Generic validation like "You make an excellent point"
${socialBanned.length > 0 ? `- ${socialBanned.join('\n- ')}` : ''}

GOOD replies:
- React to something specific they said
- Add a thought or question of your own
- Match their energy level
- Can be brief - doesn't need to be a full paragraph

Tones needed:
1. Casual - like texting a colleague
2. Engaged - shows you actually read their comment
3. Brief - quick acknowledgment or reaction

JSON format:
{
  "suggestions": [
    { "content": "reply text", "tone": "casual", "confidence": 0.9 },
    { "content": "reply text", "tone": "engaged", "confidence": 0.85 },
    { "content": "reply text", "tone": "brief", "confidence": 0.8 }
  ]
}

${platform === 'twitter' ? 'Max 280 chars per reply.' : 'Keep replies concise.'}`,
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

    // Fallback demo suggestions - sound more human
    const suggestions: SuggestedReply[] = [
      {
        content: `Ha, fair point ${authorName}. Hadn't thought about it that way.`,
        tone: 'casual',
        confidence: 0.85,
      },
      {
        content: `${authorName} - this is exactly why I wrote about this. What's your take on the longer-term implications?`,
        tone: 'engaged',
        confidence: 0.80,
      },
      {
        content: `Good call.`,
        tone: 'brief',
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
