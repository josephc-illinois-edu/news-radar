/**
 * @fileoverview AI-Powered Voice Generator
 * @description Uses Claude API to generate thoughtful articles in Joseph's voice
 */

import Anthropic from "@anthropic-ai/sdk";
import type { StoryResult, VoiceConfig, GeneratedArticle } from "../types.js";
import type { FetchedContent } from "../utils/content-fetcher.js";

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
        content: this.formatArticle(content, citations, story),
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

    let prompt = `You are writing an article for Joseph Chrisman's news analysis platform. Write in his distinctive voice.

${styleGuide}

${toneGuide}

${lengthGuide}
`;

    // Add custom voice instructions if provided
    if (this.config.voiceInstructions) {
      prompt += `
PERSONAL WRITING STYLE (trained from your past writing):
${this.config.voiceInstructions}

IMPORTANT: Follow these voice instructions closely - they reflect your authentic writing style.
`;
    }

    prompt += `
ARTICLE TOPIC: ${story.title}
SOURCE URL: ${story.url}
`;

    if (fetchedContent) {
      const isMultiSource = (fetchedContent as any).sources?.length > 1;

      if (isMultiSource) {
        prompt += `
MULTIPLE SOURCES TO ANALYZE (${(fetchedContent as any).sources.length} sources):
This story has been covered by multiple outlets. Your job is to synthesize insights from all sources to provide a balanced, comprehensive perspective.

COMBINED ARTICLE CONTENT:
${fetchedContent.content.slice(0, 8000)}

KEY FACTS FROM ALL SOURCES:
${fetchedContent.facts
  .slice(0, 12)
  .map((f, i) => `${i + 1}. ${f}`)
  .join("\n")}

${
  fetchedContent.quotes.length > 0
    ? `KEY QUOTES FROM SOURCES:
${fetchedContent.quotes
  .slice(0, 5)
  .map((q, i) => `${i + 1}. "${q}"`)
  .join("\n")}
`
    : ""
}

${
  fetchedContent.numbers.length > 0
    ? `KEY STATISTICS:
${fetchedContent.numbers.slice(0, 10).join(", ")}
`
    : ""
}

IMPORTANT: Look for different perspectives, contradictions, or complementary information across sources. Synthesize these into a cohesive analysis.
`;
      } else {
        prompt += `
ARTICLE CONTENT TO ANALYZE:
${fetchedContent.content.slice(0, 8000)}

KEY FACTS FROM SOURCE:
${fetchedContent.facts
  .slice(0, 8)
  .map((f, i) => `${i + 1}. ${f}`)
  .join("\n")}

${
  fetchedContent.quotes.length > 0
    ? `KEY QUOTES:
${fetchedContent.quotes
  .slice(0, 3)
  .map((q, i) => `${i + 1}. "${q}"`)
  .join("\n")}
`
    : ""
}

${
  fetchedContent.numbers.length > 0
    ? `KEY STATISTICS:
${fetchedContent.numbers.slice(0, 8).join(", ")}
`
    : ""
}
`;
      }
    } else {
      prompt += `
NOTE: No source article content available. Write based on the topic and your analysis of what this story means.
`;
    }

    prompt += `
INSTRUCTIONS:
1. Write an engaging, original article that analyzes this story
2. Use the facts, quotes, and numbers provided to support your analysis
3. Don't just summarize - provide YOUR perspective and insights
4. Connect this story to broader trends or implications
5. Make it conversational and accessible, not academic unless specified
6. Start with a compelling hook that draws readers in
7. End with a thought-provoking question or call to reflection

FORMAT:
- Start with # [Your Article Title]
- Use ## for section headers
- Write in markdown format
- Do NOT include a sources/citations section (that will be added automatically)
- Do NOT include author byline (that will be added automatically)

Write the complete article now:`;

    return prompt;
  }

  /**
   * Get style guide based on configuration
   */
  private getStyleGuide(): string {
    if (this.config.style === "academic") {
      return `WRITING STYLE: Academic/Formal
- Use sophisticated vocabulary and complex sentence structures
- Reference broader concepts (historical patterns, institutional behavior, systemic issues)
- Be measured and analytical in tone
- Use phrases like "Consider what this represents", "The observable phenomenon", "What distinguishes this moment"
- Cite implications for democratic systems, accountability mechanisms, institutional norms
- Maintain intellectual rigor while remaining accessible`;
    }

    return `WRITING STYLE: Conversational
- Write like you're talking to a smart friend over coffee
- Use "I" and "you" freely
- Keep sentences crisp and punchy
- Vary your openings - avoid repetitive phrases or formulaic starts
- Be direct and relatable, but change up your approach each time
- It's okay to be a little dramatic for emphasis
- Use occasional humor, but stay grounded in facts
- IMPORTANT: Each article should feel fresh and unique, not templated`;
  }

  /**
   * Get tone guide based on configuration
   */
  private getToneGuide(): string {
    const { humor, urgency, optimism, criticism } = this.config.tone;

    let guide = "TONE SETTINGS:\n";

    if (urgency > 7) {
      guide +=
        "- HIGH URGENCY: This matters NOW. Make readers feel the importance and timeliness.\n";
    } else if (urgency > 5) {
      guide +=
        "- MODERATE URGENCY: Important but not panic-inducing. Thoughtful concern.\n";
    } else {
      guide +=
        "- LOW URGENCY: Take your time. This is about understanding, not reacting.\n";
    }

    if (optimism > 6) {
      guide +=
        "- OPTIMISTIC: Find the silver lining. Show how this could lead to positive change.\n";
    } else if (optimism < 4) {
      guide +=
        "- REALISTIC/SKEPTICAL: Don't sugarcoat. Call out problems honestly.\n";
    } else {
      guide += "- BALANCED: Present both concerns and opportunities.\n";
    }

    if (criticism > 6) {
      guide +=
        "- CRITICAL: Don't hold back on calling out problems, failures, or bad actors.\n";
    } else if (criticism < 4) {
      guide +=
        "- MEASURED: Be fair. Acknowledge complexity and competing interests.\n";
    }

    if (humor > 5) {
      guide +=
        "- HUMOR: Use wit and occasional sarcasm, but don't undercut serious points.\n";
    } else if (humor > 2) {
      guide +=
        "- LIGHT HUMOR: A wry observation here and there, but mostly serious.\n";
    }

    return guide;
  }

  /**
   * Get length guide based on configuration
   */
  private getLengthGuide(): string {
    const guides: Record<VoiceConfig["length"], string> = {
      tweet:
        "TARGET LENGTH: Tweet-length (240-280 characters). ONE punchy take.",
      short:
        "TARGET LENGTH: Short-form (200-400 words). Quick read, one main point.",
      medium:
        "TARGET LENGTH: Medium-form (500-800 words). Develop 2-3 key points with analysis.",
      long: "TARGET LENGTH: Long-form (1000-1500 words). Deep dive with multiple angles and implications.",
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
  private formatArticle(
    content: string,
    citations: string[],
    story: StoryResult
  ): string {
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
