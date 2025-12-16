/**
 * @fileoverview AI-Powered Voice Generator
 * @description Uses Claude API to generate thoughtful articles in Joseph's voice
 */

import Anthropic from "@anthropic-ai/sdk";
import type { StoryResult, VoiceConfig, GeneratedArticle } from "../types.js";
import type { FetchedContent } from "../utils/content-fetcher.js";
import { getAntiDetectionPrompt } from "../utils/ai-prompts.js";

/**
 * AI Voice Generator using Claude
 */
export class AIVoiceGenerator {
  private anthropic: Anthropic;
  private config: VoiceConfig;

  constructor(config: Partial<VoiceConfig> = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY not found in environment variables. " +
          "Get your API key at https://console.anthropic.com/ and add it to your .env file."
      );
    }

    this.anthropic = new Anthropic({
      apiKey,
    });

    this.config = {
      length: config.length ?? "medium",
      platform: config.platform ?? "newsletter",
      style: config.style ?? "conversational",
      angle: config.angle,
      tone: {
        humor: config.tone?.humor ?? 4,
        urgency: config.tone?.urgency ?? 7,
        optimism: config.tone?.optimism ?? 6,
        criticism: config.tone?.criticism ?? 5,
      },
      voiceInstructions: config.voiceInstructions,
    };
  }

  /**
   * Generate article using Claude
   */
  async generate(
    story: StoryResult,
    fetchedContent?: FetchedContent
  ): Promise<GeneratedArticle> {
    const prompt = this.buildPrompt(story, fetchedContent);

    try {
      const message = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: this.getMaxTokens(),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content =
        message.content[0].type === "text" ? message.content[0].text : "";

      const wordCount = content.split(/\s+/).length;
      const citations = this.formatCitations(story, fetchedContent);

      return {
        title: this.extractTitle(content) || story.title,
        content: this.formatArticle(content, citations),
        wordCount,
        readingTimeMinutes: Math.ceil(wordCount / 200),
        citations,
        suggestedHashtags: this.generateHashtags(story),
        platform: this.config.platform,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`AI generation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Build prompt for Claude based on story and style
   */
  private buildPrompt(
    story: StoryResult,
    fetchedContent?: FetchedContent
  ): string {
    const styleGuide = this.getStyleGuide();
    const lengthGuide = this.getLengthGuide();
    const toneGuide = this.getToneGuide();
    const antiDetection = getAntiDetectionPrompt();

    let prompt = `Write an article for a news analysis platform. You have opinions and aren't afraid to share them.

${antiDetection}

${styleGuide}

${toneGuide}

${lengthGuide}
`;

    // Add custom voice instructions if provided
    if (this.config.voiceInstructions) {
      prompt += `
YOUR WRITING VOICE (based on past samples):
${this.config.voiceInstructions}

Stick to this voice - it's what your readers expect.
`;
    }

    prompt += `
TOPIC: ${story.title}
SOURCE: ${story.url}
`;

    if (fetchedContent) {
      const isMultiSource = (fetchedContent as any).sources?.length > 1;

      if (isMultiSource) {
        prompt += `
${(fetchedContent as any).sources.length} SOURCES - synthesize, don't summarize each one:

CONTENT:
${fetchedContent.content.slice(0, 8000)}

FACTS TO WORK WITH:
${fetchedContent.facts
  .slice(0, 12)
  .map((f, i) => `${i + 1}. ${f}`)
  .join("\n")}

${
  fetchedContent.quotes.length > 0
    ? `USABLE QUOTES:
${fetchedContent.quotes
  .slice(0, 5)
  .map((q, i) => `${i + 1}. "${q}"`)
  .join("\n")}
`
    : ""
}

${
  fetchedContent.numbers.length > 0
    ? `NUMBERS:
${fetchedContent.numbers.slice(0, 10).join(", ")}
`
    : ""
}

Look for where sources disagree or add different context. That's often the interesting part.
`;
      } else {
        prompt += `
SOURCE CONTENT:
${fetchedContent.content.slice(0, 8000)}

KEY FACTS:
${fetchedContent.facts
  .slice(0, 8)
  .map((f, i) => `${i + 1}. ${f}`)
  .join("\n")}

${
  fetchedContent.quotes.length > 0
    ? `QUOTES:
${fetchedContent.quotes
  .slice(0, 3)
  .map((q, i) => `${i + 1}. "${q}"`)
  .join("\n")}
`
    : ""
}

${
  fetchedContent.numbers.length > 0
    ? `NUMBERS:
${fetchedContent.numbers.slice(0, 8).join(", ")}
`
    : ""
}
`;
      }
    } else {
      prompt += `
No source content available - work with the topic and what you know about it.
`;
    }

    prompt += `
YOUR JOB:
- Analyze, don't summarize
- Have a take - what's your read on this?
- Use the facts/quotes to support your points
- Connect to bigger picture if relevant
- Write something worth reading

FORMAT:
- # [Title] at the top
- ## for section breaks if needed
- Markdown
- Skip the citations section (added automatically)
- No byline (added automatically)

Go:`;

    return prompt;
  }

  /**
   * Get style guide based on configuration
   */
  private getStyleGuide(): string {
    if (this.config.style === "academic") {
      return `STYLE: Analytical
- Dig into the why, not just the what
- Reference patterns and precedents when relevant
- Take positions but back them up
- Can use more complex sentences, but don't be obtuse
- Intellectual but not stuffy`;
    }

    return `STYLE: Conversational
- Write like you're explaining to a smart friend
- "I" and "you" are fine
- Short sentences mixed with longer ones
- Strong opinions welcome
- Skip the throat-clearing - get to the point`;
  }

  /**
   * Get tone guide based on configuration
   */
  private getToneGuide(): string {
    const { humor, urgency, optimism, criticism } = this.config.tone;

    const parts: string[] = [];

    if (urgency > 7) {
      parts.push("This matters now - make that clear without being alarmist");
    } else if (urgency > 5) {
      parts.push("Worth paying attention to, not a crisis");
    }
    // low urgency: don't add anything

    if (optimism > 6) {
      parts.push("Find the opportunity angle, but don't be naive");
    } else if (optimism < 4) {
      parts.push("Be real about the problems - skepticism is warranted");
    }
    // balanced: don't add anything

    if (criticism > 6) {
      parts.push("Call it like you see it - don't pull punches");
    } else if (criticism < 4) {
      parts.push("More observational than critical");
    }

    if (humor > 5) {
      parts.push("Humor welcome - dry wit, not slapstick");
    } else if (humor > 2) {
      parts.push("A wry observation here and there is fine");
    }

    if (parts.length === 0) {
      return "";
    }

    return `TONE:\n${parts.map((p) => `- ${p}`).join("\n")}`;
  }

  /**
   * Get length guide based on configuration
   */
  private getLengthGuide(): string {
    const guides: Record<VoiceConfig["length"], string> = {
      tweet: "LENGTH: Tweet (240-280 chars). One sharp take.",
      short: "LENGTH: ~300 words. Make one point well.",
      medium: "LENGTH: ~600 words. Room for 2-3 points.",
      long: "LENGTH: ~1200 words. Go deep.",
    };

    return guides[this.config.length];
  }

  /**
   * Get max tokens based on length
   */
  private getMaxTokens(): number {
    const tokens: Record<VoiceConfig["length"], number> = {
      tweet: 150,
      short: 600,
      medium: 1200,
      long: 2500,
    };

    return tokens[this.config.length];
  }

  /**
   * Extract title from generated content
   */
  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  /**
   * Format article with citations
   */
  private formatArticle(content: string, citations: string[]): string {
    return `${content}

---

**Sources:**
${citations.join("\n")}

**Written by:** Joe Chrisman | ${new Date().toLocaleDateString()}
**From News Radar:** An app helping you stay ahead of the news cycle.`;
  }

  /**
   * Format citations
   */
  private formatCitations(
    story: StoryResult,
    fetchedContent?: FetchedContent
  ): string[] {
    const citations = [`- [${story.title}](${story.url})`];

    if (fetchedContent?.author) {
      citations.push(`- Author: ${fetchedContent.author}`);
    }

    if (fetchedContent?.publishedDate) {
      citations.push(
        `- Published: ${fetchedContent.publishedDate.toLocaleDateString()}`
      );
    } else {
      citations.push(`- Source: ${story.sourceName}`);
    }

    const hoursAgo = Math.round(
      (Date.now() - story.detectedAt.getTime()) / (1000 * 60 * 60)
    );
    if (hoursAgo > 0) {
      citations.push(
        `- Detected: ${hoursAgo} hours before mainstream coverage`
      );
    }

    return citations;
  }

  /**
   * Generate hashtags from story
   */
  private generateHashtags(story: StoryResult): string[] {
    return story.keywords
      .slice(0, 5)
      .map(
        (kw) =>
          `#${
            kw.charAt(0).toUpperCase() +
            kw
              .slice(1)
              .toLowerCase()
              .replace(/[^a-z0-9]/gi, "")
          }`
      )
      .filter((tag) => tag.length > 2);
  }
}

/**
 * Create AI voice generator instance
 */
export function createAIVoiceGenerator(
  config?: Partial<VoiceConfig>
): AIVoiceGenerator {
  return new AIVoiceGenerator(config);
}
