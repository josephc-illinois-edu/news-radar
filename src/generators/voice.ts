/**
 * @fileoverview Voice Generator - Writes articles in Joseph's voice
 * @description Generates witty, urgent, optimistic articles from news stories
 * @module generators/voice
 */

import type { StoryResult } from '../types.js';
import type { FetchedContent } from '../utils/content-fetcher.js';

/**
 * Article generation configuration
 */
export interface VoiceConfig {
  length: 'tweet' | 'short' | 'medium' | 'long';
  platform: 'facebook' | 'linkedin' | 'newsletter' | 'blog';
  style?: 'conversational' | 'academic';
  angle?: string;
  tone: {
    humor: number;
    urgency: number;
    optimism: number;
    criticism: number;
  };
}

/**
 * Generated article structure
 */
export interface GeneratedArticle {
  title: string;
  content: string;
  wordCount: number;
  readingTimeMinutes: number;
  citations: string[];
  suggestedHashtags: string[];
  platform: string;
}

export class VoiceGenerator {
  private config: VoiceConfig;
  private fetchedContent?: FetchedContent;

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      length: config.length ?? 'medium',
      platform: config.platform ?? 'newsletter',
      style: config.style ?? 'conversational',
      angle: config.angle,
      tone: {
        humor: config.tone?.humor ?? 4,
        urgency: config.tone?.urgency ?? 7,
        optimism: config.tone?.optimism ?? 6,
        criticism: config.tone?.criticism ?? 5,
      },
    };
  }

  public generate(story: StoryResult, fetchedContent?: FetchedContent): GeneratedArticle {
    this.fetchedContent = fetchedContent;

    const title = this.generateTitle(story);
    const opening = this.generateOpening(story);
    const context = this.generateContext(story);
    const analysis = this.generateAnalysis(story);
    const implications = this.generateImplications(story);
    const closing = this.generateClosing(story);
    const citations = this.formatCitations(story);

    const content = [
      `# ${title}\n`,
      opening,
      '\n',
      context,
      '\n',
      analysis,
      '\n',
      implications,
      '\n',
      closing,
      '\n---\n',
      '**Sources:**',
      ...citations,
      `\n**Written by:** Joseph C | ${new Date().toLocaleDateString()}`,
      '**From News Radar:** Emerging story detection system',
    ].join('\n');

    const wordCount = content.split(/\s+/).length;

    return {
      title,
      content,
      wordCount,
      readingTimeMinutes: Math.ceil(wordCount / 200),
      citations,
      suggestedHashtags: this.generateHashtags(story),
      platform: this.config.platform,
    };
  }

  private generateTitle(story: StoryResult): string {
    // Use the actual story title if it's punchy enough
    if (story.title.length < 60 && !story.title.includes('http')) {
      return story.title;
    }

    // Otherwise create from keywords
    const main = story.keywords[0] || 'This';
    const action = story.keywords.some(k => k.includes('melt') || k.includes('declin') || k.includes('fall')) 
      ? 'Is Falling Apart' 
      : 'Just Changed Everything';
    
    return `${main.charAt(0).toUpperCase() + main.slice(1)} ${action}`;
  }

  private generateOpening(story: StoryResult): string {
    const isUrgent = this.config.tone.urgency > 6;
    const isAcademic = this.config.style === 'academic';
    const isPolitical = story.keywords.some(k =>
      ['president', 'politics', 'election', 'government', 'leadership'].includes(k.toLowerCase())
    );

    if (isAcademic && isPolitical && isUrgent) {
      return `Somewhere across this republic tonight, citizens are confronting a profound unease—one that transcends partisan affiliation yet refuses simple articulation.\n\n` +
             `Consider what ${story.title} represents: not merely an isolated aberration, but a systematic pattern of conduct. And patterns, as any student of institutional behavior understands, illuminate character with unforgiving clarity.\n\n` +
             `Allow me to articulate what we're witnessing.`;
    }

    if (isPolitical && isUrgent) {
      return `Somewhere in America tonight, someone is watching the news with a sinking feeling they can't quite name.\n\n` +
             `Here's the thing about ${story.title}: it's not just one incident. It's a pattern. And patterns reveal character.\n\n` +
             `Let me break this down.`;
    }

    if (isUrgent) {
      return `I need to talk about something that's been bothering me.\n\n` +
             `${story.title}.\n\n` +
             `And before you roll your eyes and think "here we go again," hear me out.`;
    }

    return `You know that feeling when something's off, but you can't quite put your finger on it?\n\n` +
           `That's how I felt when I saw this: ${story.title}.\n\n` +
           `Let me explain why this matters more than you think.`;
  }

  private generateContext(story: StoryResult): string {
    const hasHighEngagement = story.engagementVelocity > 100;
    const isAcademic = this.config.style === 'academic';

    let context = isAcademic ? `## The Observable Phenomenon\n\n` : `## What's Happening\n\n`;

    if (hasHighEngagement && isAcademic) {
      context += `The velocity of public discourse surrounding this development proves anomalous—${story.score} discrete reactions coupled with ${story.commentCount} substantive discussions constitute a statistical deviation from baseline engagement metrics.\n\n`;
    } else if (hasHighEngagement) {
      context += `This story is blowing up right now - ${story.score} reactions and ${story.commentCount} people discussing it. That's not normal.\n\n`;
    }

    // Use fetched content if available
    if (this.fetchedContent && this.fetchedContent.facts.length > 0) {
      context += `Here's what we know:\n\n`;

      // Include top 3 facts
      const topFacts = this.fetchedContent.facts.slice(0, 3);
      for (const fact of topFacts) {
        context += `${fact}.\n\n`;
      }

      // Add a key quote if available
      if (this.fetchedContent.quotes.length > 0) {
        const quote = this.fetchedContent.quotes[0];
        context += `"${quote}"\n\n`;
      }

      // Add numbers/stats if available
      if (this.fetchedContent.numbers.length > 0) {
        const numbers = this.fetchedContent.numbers.slice(0, 3).join(', ');
        context += `The numbers tell a story: ${numbers}.\n\n`;
      }
    } else {
      context += `${story.contentSnippet || `The core issue: ${story.title}.`}\n\n`;
    }

    const isAccountability = story.keywords.some(k =>
      ['accountability', 'crisis', 'decline', 'failure'].includes(k.toLowerCase())
    );

    if (isAccountability && isAcademic) {
      context += `This phenomenon exists not in isolation, but as the culmination of observable antecedents documented across months—perhaps years. ` +
                 `What distinguishes this moment is the collapse of plausible deniability.`;
    } else if (isAccountability) {
      context += `This isn't happening in a vacuum. We've seen the warning signs for months - maybe years. ` +
                 `But now? Now it's undeniable.`;
    } else {
      context += `The implications ripple outward in ways most people aren't seeing yet.`;
    }

    return context;
  }

  private generateAnalysis(story: StoryResult): string {
    const isAcademic = this.config.style === 'academic';
    let analysis = isAcademic ? '## My Analysis\n\n' : '## Here\'s What I Think\n\n';

    const isCritical = this.config.tone.criticism > 6;
    const isHumorous = this.config.tone.humor > 5;
    const isPolitical = story.keywords.some(k =>
      ['president', 'politics', 'leadership'].includes(k.toLowerCase())
    );

    if (isCritical && isPolitical && isAcademic) {
      analysis += `This transcends the significance of ${story.keywords[0] || 'any individual actor'}. What we're examining is the progressive normalization of conduct that violates foundational democratic principles—a phenomenon Tocqueville presciently warned against.\n\n`;
      analysis += `He has demonstrated, through repeated observable instances, a systematic disregard for constitutional norms that previous executives considered inviolable. `;
      analysis += `Yet we persist in witnessing this deterioration while maintaining the pretense of institutional stability.\n\n`;
    } else if (isCritical && isPolitical) {
      analysis += `This is about more than ${story.keywords[0] || 'one person'}. It's about what we're willing to accept as normal.\n\n`;
      analysis += `He's shown, time and again, that he doesn't care about the things most Americans consider fundamental. `;
      analysis += `And yet here we are, watching it happen in real-time while pretending it's somehow acceptable.\n\n`;
    } else if (isCritical) {
      analysis += `Let's be honest: this isn't surprising. We've been watching ${story.keywords[0] || 'this'} unfold for a while now. `;
      analysis += `What's surprising is how long it took for people to pay attention.\n\n`;
    }

    // Add additional facts if we have them
    if (this.fetchedContent && this.fetchedContent.facts.length > 3) {
      const additionalFacts = this.fetchedContent.facts.slice(3, 5);
      if (additionalFacts.length > 0) {
        analysis += isAcademic
          ? `Consider the additional evidence: `
          : `And get this: `;

        analysis += additionalFacts.join(' ') + '\n\n';
      }
    }

    analysis += isAcademic
      ? `The more substantial concern involves the interconnected nature of ${story.keywords.slice(0, 2).join(' and ')}, which function as symptomatic manifestations of deeper structural pathologies we've systematically avoided confronting.\n\n`
      : `The bigger issue is this: ${story.keywords.slice(0, 2).join(' and ')} don't exist in isolation. They're symptoms of something deeper that we're not talking about enough.\n\n`;

    if (isHumorous && !isPolitical) {
      analysis += isAcademic
        ? `(I recognize this may sound hyperbolic. Perhaps it contains elements of rhetorical emphasis. Yet the empirical foundation remains sound.)\n\n`
        : `(And no, I'm not being dramatic. Okay, maybe a little dramatic. But I'm right.)\n\n`;
    }

    analysis += isAcademic
      ? `This represents an inflection point for anyone maintaining genuine situational awareness. What seemed implausible mere hours ago has materialized as our contemporary reality.`
      : `Here's the kicker: this changes everything for anyone paying attention. What seemed impossible yesterday is now our reality today.`;

    return analysis;
  }

  private generateImplications(story: StoryResult): string {
    const isAcademic = this.config.style === 'academic';
    const isPolitical = story.keywords.some(k =>
      ['president', 'politics', 'government'].includes(k.toLowerCase())
    );

    if (isPolitical && isAcademic) {
      return `## Systemic Implications\n\n` +
             `**For democratic resilience:** The institutional safeguards we presumed self-sustaining face unprecedented stress-testing. Each precedent violated today establishes tomorrow's baseline.\n\n` +
             `**For accountability mechanisms:** History demonstrates that consequences eventually materialize—though the temporal lag remains the salient variable.\n\n` +
             `**For engaged citizens:** We occupy the position of contemporary witnesses to constitutional stress-testing with profound historical ramifications.`;
    }

    if (isPolitical) {
      return `## What This Means\n\n` +
             `**For democracy:** The norms we took for granted? They're being tested daily.\n\n` +
             `**For accountability:** Eventually, it catches up with everyone. The question is when.\n\n` +
             `**For the rest of us:** We're watching history unfold. How we respond matters.`;
    }

    return `## What This Means For You\n\n` +
           `**If you're following ${story.keywords[0]}:** This is the inflection point. Pay attention.\n\n` +
           `**If you're making decisions:** Your timeline just got shorter.\n\n` +
           `**If you're just trying to keep up:** You're not alone. None of us are.`;
  }

  private generateClosing(story: StoryResult): string {
    const isAcademic = this.config.style === 'academic';
    const isOptimistic = this.config.tone.optimism > 6;
    const isPolitical = story.keywords.some(k =>
      ['president', 'politics'].includes(k.toLowerCase())
    );

    if (isPolitical && isAcademic) {
      return `## Final Assessment\n\n` +
             `I cannot claim certainty regarding our ultimate destination, yet this much I understand: accountability functions as an inexorable force.\n\n` +
             `My hope is that these mechanisms activate with sufficient velocity to prevent irreversible institutional damage.\n\n` +
             `What's your analysis? I genuinely welcome your intellectual challenge in the comments.`;
    }

    if (isPolitical) {
      return `## The Bottom Line\n\n` +
             `I'm not entirely sure where all of this leaves us, but I do know this: accountability eventually arrives for everyone.\n\n` +
             `I can only hope it finds those who need it most sooner rather than later.\n\n` +
             `What do you think? Am I off base here? Let me know in the comments.`;
    }

    if (isOptimistic) {
      return `## Where We Go From Here\n\n` +
             `Look, I know this feels heavy. But here's what gives me hope: people are paying attention now.\n\n` +
             `Change starts with awareness. And awareness? We've got that in spades right now.\n\n` +
             `What's your take? Drop your thoughts below.`;
    }

    return `## The Real Question\n\n` +
           `Are we paying attention to what actually matters? Or are we so focused on ${story.keywords[0]} that we're missing the bigger picture?\n\n` +
           `I hope we figure it out before it's too late.\n\n` +
           `Sound off below. What am I missing?`;
  }

  private formatCitations(story: StoryResult): string[] {
    const hoursAgo = Math.round((Date.now() - story.detectedAt.getTime()) / (1000 * 60 * 60));
    return [
      `- [${story.title}](${story.url})`,
      `- Source: ${story.sourceName}`,
      `- Published: ${story.publishedAt.toLocaleDateString()}`,
      hoursAgo > 0 ? `- Detected: ${hoursAgo} hours before mainstream coverage` : '',
    ].filter(Boolean);
  }

  private generateHashtags(story: StoryResult): string[] {
    return story.keywords.slice(0, 5).map(kw => 
      `#${kw.charAt(0).toUpperCase() + kw.slice(1).toLowerCase().replace(/[^a-z0-9]/gi, '')}`
    );
  }
}

export function createVoiceGenerator(config?: Partial<VoiceConfig>): VoiceGenerator {
  return new VoiceGenerator(config);
}
