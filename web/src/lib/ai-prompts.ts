/**
 * AI Prompt Utilities for Natural Content Generation
 *
 * These utilities help produce content that reads naturally and doesn't
 * exhibit typical AI writing patterns.
 */

/**
 * Common AI phrases to avoid - these are dead giveaways
 */
export const BANNED_PHRASES = [
  // Opening clichés
  'In today\'s',
  'In this day and age',
  'It\'s no secret that',
  'Have you ever wondered',
  'In the ever-evolving',
  'In a world where',
  'As we navigate',
  'In the realm of',
  'When it comes to',
  'At its core',

  // Transition overuse
  'Moreover',
  'Furthermore',
  'Additionally',
  'It\'s worth noting',
  'It\'s important to note',
  'Interestingly',
  'Notably',
  'Consequently',
  'Subsequently',
  'In essence',

  // Hedging and filler
  'It goes without saying',
  'Needless to say',
  'As such',
  'That being said',
  'With that in mind',
  'All things considered',
  'By and large',
  'For the most part',

  // Conclusion clichés
  'In conclusion',
  'To sum up',
  'In summary',
  'All in all',
  'At the end of the day',
  'The bottom line is',
  'Only time will tell',
  'The future remains to be seen',
  'Moving forward',

  // Hyperbolic AI-isms
  'game-changer',
  'paradigm shift',
  'revolutionize',
  'cutting-edge',
  'groundbreaking',
  'unprecedented',
  'transformative',
  'synergy',
  'leverage',
  'utilize',

  // Overused connectors
  'However,',
  'Therefore,',
  'Thus,',
  'Hence,',
  'Indeed,',

  // Meta-commentary
  'Let\'s dive in',
  'Let\'s explore',
  'Let\'s take a look',
  'Let\'s break this down',
  'I\'ll walk you through',
];

/**
 * Natural writing characteristics to encourage
 */
export const NATURAL_WRITING_TRAITS = `
WRITE LIKE A HUMAN - CRITICAL RULES:

1. SENTENCE VARIETY
   - Mix short punchy sentences with longer ones
   - Occasionally start with "And" or "But" - it's fine
   - Use fragments when they work. Like this.
   - Don't make every sentence flow perfectly into the next

2. IMPERFECT STRUCTURE
   - Not every paragraph needs a topic sentence
   - Jump into ideas sometimes without setup
   - It's okay to trail off or change direction mid-thought
   - Skip the neat intro-body-conclusion format

3. AUTHENTIC VOICE
   - Use contractions freely (don't, won't, can't)
   - Include occasional parenthetical asides (like this one)
   - Ask rhetorical questions without always answering them
   - Show genuine uncertainty when you're uncertain

4. OPINION AND EDGE
   - Take a stance - don't hedge everything
   - If something is dumb, you can say it's dumb
   - Show mild frustration, excitement, or skepticism
   - Avoid the "both sides have valid points" trap

5. SPECIFIC OVER GENERIC
   - Name specific people, companies, examples
   - Use concrete numbers instead of "many" or "significant"
   - Reference actual events or analogies from real life
   - Avoid abstract generalities

6. RHYTHM BREAKERS
   - Throw in a one-word paragraph occasionally
   - Use em-dashes—they add punch
   - Drop in a relevant tangent, then come back
   - End some sections abruptly without wrapping up
`;

/**
 * Banned phrases formatted as a prompt instruction
 */
export function getBannedPhrasesPrompt(): string {
  return `
BANNED PHRASES - NEVER USE THESE:
${BANNED_PHRASES.map(p => `- "${p}"`).join('\n')}

If you catch yourself writing any of these, stop and rephrase completely.
`;
}

/**
 * Get the full anti-detection prompt to prepend to content generation
 */
export function getAntiDetectionPrompt(): string {
  return `
${NATURAL_WRITING_TRAITS}

${getBannedPhrasesPrompt()}

OPENING VARIETY - Don't start articles the same way:
- Start with a specific fact or number
- Open with a question (but not "Have you ever...")
- Begin with a bold claim
- Lead with a brief anecdote or scenario
- Jump straight into the news

CLOSING VARIETY - Don't end predictably:
- End with a specific question for the reader
- Finish on a concrete prediction
- Close with a callback to an earlier point
- Stop when you've made your point (no need to summarize)
- Leave something unresolved if it's genuinely unresolved
`;
}

/**
 * Get content generation system prompt with anti-detection built in
 * @param role - The specific role/expertise for this content type
 */
export function getContentSystemPrompt(role: string): string {
  return `${role}

${getAntiDetectionPrompt()}

Remember: The goal is content that sounds like it was written by a specific person with opinions and a voice, not by a helpful assistant trying to please everyone.`;
}

/**
 * Add variety instructions based on previous outputs
 * This helps avoid repetition across multiple generations
 */
export function getVarietyPrompt(previousOpenings?: string[]): string {
  if (!previousOpenings?.length) {
    return '';
  }

  return `
AVOID REPETITION - You've recently used these openings:
${previousOpenings.map(o => `- "${o.slice(0, 50)}..."`).join('\n')}

Use a completely different approach this time.
`;
}

/**
 * Platform-specific natural voice adjustments
 */
export function getPlatformVoicePrompt(platform: string): string {
  const platformGuides: Record<string, string> = {
    twitter: `
TWITTER VOICE:
- Be punchy and direct
- Hot takes are okay
- Use "lol" or "tbh" sparingly but naturally
- Thread format: each tweet should work alone
- Don't overexplain - let readers infer`,

    linkedin: `
LINKEDIN VOICE:
- Professional but not stuffy
- Personal stories work well
- Avoid corporate buzzwords
- Skip the "I'm humbled" stuff
- Be direct about what you learned`,

    newsletter: `
NEWSLETTER VOICE:
- Write like you're emailing a friend who cares about this topic
- Personality over polish
- Include your actual reactions and thoughts
- Don't be afraid of first person
- Readers subscribed for YOUR take, give it to them`,

    blog: `
BLOG VOICE:
- More room to explore tangents
- Can be conversational or analytical depending on topic
- Include specific examples and evidence
- Take clear positions
- Write the piece you'd want to read`,

    substack: `
SUBSTACK VOICE:
- Personal and opinionated
- Your subscribers want YOUR perspective
- Include behind-the-scenes thinking
- It's okay to change your mind mid-piece
- Build relationship through authentic voice`,
  };

  return platformGuides[platform.toLowerCase()] || platformGuides.newsletter;
}

/**
 * Tone adjustment prompts that feel natural, not robotic
 */
export function getNaturalTonePrompt(settings: {
  humor?: number;
  urgency?: number;
  criticism?: number;
  optimism?: number;
}): string {
  const parts: string[] = [];

  // Humor (0-10 scale)
  if (settings.humor !== undefined) {
    if (settings.humor >= 7) {
      parts.push('Lean into humor - dry wit, absurdist observations, playful jabs. Make it fun to read.');
    } else if (settings.humor >= 4) {
      parts.push('Light touches of humor where natural. A wry observation here and there.');
    } else if (settings.humor >= 1) {
      parts.push('Keep it mostly serious, but don\'t be stiff.');
    }
    // humor = 0: fully serious, no instruction needed
  }

  // Urgency (0-10 scale)
  if (settings.urgency !== undefined) {
    if (settings.urgency >= 7) {
      parts.push('This matters right now. Make readers feel the stakes without being alarmist.');
    } else if (settings.urgency >= 4) {
      parts.push('Worth paying attention to, but not a five-alarm fire.');
    }
    // low urgency: don't add anything, let it breathe
  }

  // Criticism (0-10 scale)
  if (settings.criticism !== undefined) {
    if (settings.criticism >= 7) {
      parts.push('Don\'t pull punches. If something is wrong or stupid, say so clearly.');
    } else if (settings.criticism >= 4) {
      parts.push('Fair criticism where warranted, but acknowledge complexity.');
    } else {
      parts.push('More observational than critical. Present the facts and let readers judge.');
    }
  }

  // Optimism (0-10 scale)
  if (settings.optimism !== undefined) {
    if (settings.optimism >= 7) {
      parts.push('Find the opportunity or silver lining, but don\'t be naive about challenges.');
    } else if (settings.optimism <= 3) {
      parts.push('Be realistic about downsides. Skepticism is warranted here.');
    }
    // middle ground: balanced, no instruction needed
  }

  if (parts.length === 0) {
    return '';
  }

  return `\nTONE GUIDANCE:\n${parts.map(p => `- ${p}`).join('\n')}\n`;
}
