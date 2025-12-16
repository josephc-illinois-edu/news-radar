/**
 * AI Prompt Utilities for Natural Content Generation (Backend)
 *
 * Mirrors web/src/lib/ai-prompts.ts for use in CLI/backend services.
 */

/**
 * Common AI phrases to avoid - these are dead giveaways
 */
export const BANNED_PHRASES = [
  // Opening clichés
  "In today's",
  "In this day and age",
  "It's no secret that",
  "Have you ever wondered",
  "In the ever-evolving",
  "In a world where",
  "As we navigate",
  "In the realm of",
  "When it comes to",
  "At its core",

  // Transition overuse
  "Moreover",
  "Furthermore",
  "Additionally",
  "It's worth noting",
  "It's important to note",
  "Interestingly",
  "Notably",
  "Consequently",
  "Subsequently",
  "In essence",

  // Hedging and filler
  "It goes without saying",
  "Needless to say",
  "As such",
  "That being said",
  "With that in mind",
  "All things considered",
  "By and large",
  "For the most part",

  // Conclusion clichés
  "In conclusion",
  "To sum up",
  "In summary",
  "All in all",
  "At the end of the day",
  "The bottom line is",
  "Only time will tell",
  "The future remains to be seen",
  "Moving forward",

  // Hyperbolic AI-isms
  "game-changer",
  "paradigm shift",
  "revolutionize",
  "cutting-edge",
  "groundbreaking",
  "unprecedented",
  "transformative",
  "synergy",
  "leverage",
  "utilize",

  // Overused connectors
  "However,",
  "Therefore,",
  "Thus,",
  "Hence,",
  "Indeed,",

  // Meta-commentary
  "Let's dive in",
  "Let's explore",
  "Let's take a look",
  "Let's break this down",
  "I'll walk you through",
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
${BANNED_PHRASES.map((p) => `- "${p}"`).join("\n")}

If you catch yourself writing any of these, stop and rephrase completely.
`;
}

/**
 * Get the full anti-detection prompt
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
