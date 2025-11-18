/**
 * @fileoverview Voice Generator - Writes articles in Joseph's voice  
 * @description Generates witty, urgent, optimistic articles from news stories
 * @module generators/voice
 */

import type { StoryResult } from '../types.js';

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

// const LENGTH_TARGETS: Record<string, number> = {
//   tweet: 280,
//   short: 400,
//   medium: 700,
//   long: 1200,
// };

export class VoiceGenerator {
  private config: VoiceConfig;

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

  /**
   * Extracts the core topic from a story title intelligently
   * Avoids just repeating the title verbatim
   */
  private extractCoreTopic(story: StoryResult): string {
    // Check for specific high-profile topics first
    const titleLower = story.title.toLowerCase();

    if (titleLower.includes('epstein')) {
      return 'the Epstein files and what they reveal about power protecting power';
    }
    if (titleLower.includes('ukraine') && titleLower.includes('deport')) {
      return 'deporting migrants to an active war zone';
    }
    if (titleLower.includes('voting') || titleLower.includes('voter')) {
      return 'voting rights and election integrity';
    }

    const isPolitical = story.keywords.some(k =>
      ['president', 'politics', 'election', 'government', 'leadership'].includes(k.toLowerCase())
    );
    const isAccountability = story.keywords.some(k =>
      ['accountability', 'crisis', 'decline', 'failure'].includes(k.toLowerCase())
    );

    // For political/accountability stories, try to be specific
    if (isPolitical && isAccountability) {
      // Use first meaningful keyword if available
      const specificKeyword = story.keywords.find(k =>
        !['politics', 'leadership', 'government', 'president'].includes(k.toLowerCase())
      );
      if (specificKeyword) {
        return `${specificKeyword} and the breakdown of accountability`;
      }
      return 'the ongoing erosion of executive accountability';
    }
    if (isPolitical) {
      // Try to use specific keywords instead of generic phrase
      const specificKeyword = story.keywords.find(k =>
        !['politics', 'leadership', 'government', 'president'].includes(k.toLowerCase())
      );
      if (specificKeyword) {
        return `the ${specificKeyword} situation`;
      }
      return 'presidential conduct that challenges constitutional norms';
    }
    if (isAccountability) {
      return 'institutional accountability failures';
    }

    // For other stories, extract key concept without repeating full title
    const mainKeyword = story.keywords[0] || 'this development';
    return `the implications of ${mainKeyword}`;
  }

  /**
   * Creates coherent analytical phrases from keywords
   * Avoids awkward literal keyword concatenation
   */
  private synthesizeKeywordAnalysis(story: StoryResult): string {
    const isPolitical = story.keywords.some(k =>
      ['president', 'politics', 'election', 'government', 'leadership'].includes(k.toLowerCase())
    );
    const isAccountability = story.keywords.some(k =>
      ['accountability', 'crisis', 'decline', 'failure'].includes(k.toLowerCase())
    );

    // Return conceptual synthesis rather than raw keyword joins
    if (isPolitical && isAccountability) {
      return 'executive behavior and institutional response mechanisms';
    }
    if (isPolitical) {
      return 'leadership conduct and constitutional constraints';
    }
    if (isAccountability) {
      return 'institutional failures and systemic accountability gaps';
    }

    // For other topics, provide general but coherent phrasing
    return 'these interconnected dynamics';
  }

  public generate(story: StoryResult): GeneratedArticle {
    const title = this.generateTitle(story);
    const opening = this.generateOpening(story);
    const citations = this.formatCitations(story);

    // Vary structure - don't always use all sections in same order
    const structureHash = (story.score + story.commentCount) % 4;

    let content: string;

    // Structure variation 1: Classic flow
    if (structureHash === 0) {
      const context = this.generateContext(story);
      const analysis = this.generateAnalysis(story);
      const implications = this.generateImplications(story);
      const closing = this.generateClosing(story);

      content = [
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
        `\n**Written by:** Joe C | ${new Date().toLocaleDateString()}`,
      ].join('\n');
    }
    // Structure variation 2: Analysis-first (dive right in)
    else if (structureHash === 1) {
      const analysis = this.generateAnalysis(story);
      const context = this.generateContext(story);
      const closing = this.generateClosing(story);

      content = [
        `# ${title}\n`,
        opening,
        '\n',
        analysis,
        '\n',
        context,
        '\n',
        closing,
        '\n---\n',
        '**Sources:**',
        ...citations,
        `\n**Written by:** Joe C | ${new Date().toLocaleDateString()}`,
      ].join('\n');
    }
    // Structure variation 3: Lean (no separate implications)
    else if (structureHash === 2) {
      const context = this.generateContext(story);
      const analysis = this.generateAnalysis(story);
      const closing = this.generateClosing(story);

      content = [
        `# ${title}\n`,
        opening,
        '\n',
        context,
        '\n',
        analysis,
        '\n',
        closing,
        '\n---\n',
        '**Sources:**',
        ...citations,
        `\n**Written by:** Joe C | ${new Date().toLocaleDateString()}`,
      ].join('\n');
    }
    // Structure variation 4: Integrated (analysis woven into context)
    else {
      const integratedSection = this.generateIntegratedAnalysis(story);
      const closing = this.generateClosing(story);

      content = [
        `# ${title}\n`,
        opening,
        '\n',
        integratedSection,
        '\n',
        closing,
        '\n---\n',
        '**Sources:**',
        ...citations,
        `\n**Written by:** Joe C | ${new Date().toLocaleDateString()}`,
      ].join('\n');
    }

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
    const coreTopic = this.extractCoreTopic(story);

    // Better variation selection using multiple story attributes
    const hash = story.title.length + story.score + story.keywords.length + story.publishedAt.getHours();
    const variation = hash % 7; // 7 variations instead of 3

    if (isAcademic && isPolitical && isUrgent) {
      const openings = [
        `The House just voted—overwhelmingly—to do something that should've happened years ago. And the fact that it took this long, that ${coreTopic} required this kind of pressure, tells you everything you need to know about how broken the accountability mechanisms really are.\n\n` +
        `Let me walk you through why this matters.`,

        `Here's the thing nobody wants to say out loud: democracies don't die with a dramatic explosion. They rust out slowly while everyone's arguing about something else.\n\n` +
        `That's what scares me about ${coreTopic}. We're watching institutional guardrails corrode in real-time, and I'm not convinced enough people see it happening.\n\n` +
        `So let's talk about what actually matters here.`,

        `There comes a point where you can't keep calling it a coincidence anymore. Where the incidents pile up and become a pattern you can't unsee.\n\n` +
        `We're past that point with ${coreTopic}. Way past it. The evidence isn't scattered anymore—it's a mountain.\n\n` +
        `Here's what the receipts show.`,

        `I keep coming back to this, and it won't leave me alone.\n\n` +
        `We're watching ${coreTopic} play out, and here's what strikes me: this isn't new. The pattern's been there. What's changed is that the evidence finally reached a point where even the deniers are running out of excuses.\n\n` +
        `Let me break down what I'm seeing.`,

        `You know what's wild? How long we've been pretending this isn't happening.\n\n` +
        `The thing about ${coreTopic} is that it didn't start yesterday. We've been watching the foundation crack for months—maybe years. But now? Now the cracks are undeniable.\n\n` +
        `Here's where we actually are.`,

        `Can we talk about something for a minute? Because I think we're all dancing around it.\n\n` +
        `${coreTopic} isn't a future threat or a hypothetical concern. It's happening right now, documented, observable, real. And the longer we treat it like background noise, the worse this gets.\n\n` +
        `So here's what we need to face.`,

        `I've been tracking this situation, and the pattern is unmistakable.\n\n` +
        `What we're seeing with ${coreTopic}—the pieces don't just connect, they form a picture. A clear, documented, impossible-to-ignore picture. And honestly? That picture should concern anyone who gives a damn about how this country is supposed to work.\n\n` +
        `Let me show you what I mean.`
      ];
      return openings[variation];
    }

    if (isPolitical && isUrgent) {
      const openings = [
        `The votes are in, and they're not even close. When something passes overwhelmingly in this political climate, you know the evidence is damning.\n\n` +
        `What we're seeing with ${coreTopic} isn't speculation anymore. It's documented, timestamped, impossible to deny. And the people who spent months running interference? They folded.\n\n` +
        `Let me break down why that matters.`,

        `Here's what keeps me up at night.\n\n` +
        `We're watching ${coreTopic} unfold, and it should scare anyone who gives a damn about how democracies are supposed to work. The question isn't whether lines are being crossed—it's whether we even remember where those lines were supposed to be.\n\n` +
        `So here's the deal.`,

        `You know that moment when something goes from "is this happening?" to "holy shit, this is definitely happening"?\n\n` +
        `We're there with ${coreTopic}. Past there, actually. The evidence isn't circumstantial anymore—it's overwhelming.\n\n` +
        `Let me lay this out.`,

        `The resistance collapsed. That's the story nobody's emphasizing enough.\n\n` +
        `What's happening with ${coreTopic} represents a complete reversal from people who swore up and down they'd never let this happen. And when resistance crumbles that fast? It means the position was never defensible to begin with.\n\n` +
        `Here's what that tells us.`,

        `Look, I'm not one for alarmism. But this? This warrants alarm.\n\n` +
        `${coreTopic} is playing out exactly like you'd expect if the guardrails were gone. And guess what? They might be. That's not hyperbole—that's what the evidence shows.\n\n` +
        `Let me explain.`,

        `We need to have an honest conversation about where we are.\n\n` +
        `${coreTopic} has crossed the line from "concerning trend" to "active crisis," and I'm not seeing enough people treat it with the urgency it deserves. Maybe I'm wrong. But the data suggests otherwise.\n\n` +
        `Here's what's actually happening.`,

        `I've been watching this unfold for a while now, and I can't stay quiet anymore.\n\n` +
        `The pattern with ${coreTopic} is clear. Not "reading tea leaves" clear—documented, observable, undeniable clear. And the implications? They're worse than most people realize.\n\n` +
        `So let's talk about it.`
      ];
      return openings[variation];
    }

    if (isUrgent) {
      return `Okay, this has been rattling around in my head and I need to get it out.\n\n` +
             `We're witnessing ${coreTopic}, and before you write this off as me being dramatic—just look at the actual evidence. I'm not making this up.\n\n` +
             `Stick with me here.`;
    }

    return `You ever get that feeling when something's clearly wrong but everyone's pretending it's fine?\n\n` +
           `That's what ${coreTopic} feels like. And that feeling? It's your bullshit detector working correctly.\n\n` +
           `Let me explain why this actually matters.`;
  }

  private generateContext(story: StoryResult): string {
    // const hasHighEngagement = story.engagementVelocity > 100;
    const isAcademic = this.config.style === 'academic';
    const coreTopic = this.extractCoreTopic(story);

    let context = isAcademic ? `## Here's What's Happening\n\n` : `## What's Happening\n\n`;

    // Extract specific story details from title
    const titleLower = story.title.toLowerCase();
    const hasSpecificEvent = titleLower.includes('vote') || titleLower.includes('court') ||
                             titleLower.includes('release') || titleLower.includes('block');

    // Use content snippet FIRST if substantive (prioritize detailed context)
    if (story.contentSnippet && story.contentSnippet.length > 150) {
      context += `${story.contentSnippet}\n\n`;
      context += `The question isn't whether this matters—it's whether we're paying attention to what it reveals about power and accountability.\n\n`;
    } else if (story.contentSnippet && story.contentSnippet.length > 50 && !story.contentSnippet.includes(story.title)) {
      context += `${story.contentSnippet}\n\n`;
    } else if (hasSpecificEvent) {
      // For stories with specific events, reference them directly
      const sourceLink = `[${story.sourceName}](${story.url})`;
      context += `${sourceLink} reports that ${story.title.charAt(0).toLowerCase()}${story.title.slice(1)}. The immediate facts are clear. What's less obvious are the downstream effects.\n\n`;
      context += `This matters because it's not isolated. It's part of a trajectory. And trajectories have momentum—they're easier to redirect early than after they've built speed.\n\n`;
    } else {
      // Fallback for abstract topics
      const isPolitical = story.keywords.some(k =>
        ['president', 'politics', 'election', 'government', 'leadership'].includes(k.toLowerCase())
      );

      if (isAcademic && isPolitical) {
        context += `The pattern with ${coreTopic} is becoming harder to ignore. We're not talking about isolated incidents anymore—we're watching a systematic approach to testing boundaries and finding out which rules actually have enforcement mechanisms.\n\n`;
        context += `What matters isn't just the individual actions. It's what those actions reveal about the structure underneath.\n\n`;
      } else if (isPolitical) {
        context += `What looks like chaos with ${coreTopic} is actually something more methodical. Each test of the boundaries reveals where the system is brittle, where accountability has gaps.\n\n`;
      } else {
        context += `The situation with ${coreTopic} reveals something deeper about how institutions respond when stress-tested. And right now, we're learning which parts hold and which parts... don't.\n\n`;
      }
    }

    const isAccountability = story.keywords.some(k =>
      ['accountability', 'crisis', 'decline', 'failure'].includes(k.toLowerCase())
    );

    if (isAccountability && isAcademic) {
      context += `Here's what makes this moment different from all the other moments: we've run out of ways to pretend it's not happening. The evidence isn't circumstantial anymore—it's overwhelming, documented, undeniable. Even the people who've been defending this can feel the ground shifting.`;
    } else if (isAccountability) {
      context += `The thing is, we've been watching the warning signs pile up for months. But there's a point where accumulation becomes avalanche. Where you cross from "this is concerning" to "this is the actual crisis." We just crossed it.`;
    } else {
      context += `What happens next isn't written yet. But the trajectory? That's becoming clear. And if you're paying attention, you can see where this is headed.`;
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

    // Vary the analytical framework - not always Tocqueville/erosion
    const frameworkHash = (story.score + story.keywords.length) % 3;

    if (isCritical && isPolitical && isAcademic) {
      if (frameworkHash === 0) {
        // Normalization framework
        analysis += `Look, this isn't about ${story.keywords[0] || 'one guy'} anymore. It's about how we've normalized behavior that should disqualify someone from holding power. Not dramatic collapse—just steady erosion.\n\n`;
        analysis += `He's shown us, repeatedly, that constitutional norms mean nothing to him. The constraints that every previous president respected? He treats them like suggestions. `;
        analysis += `And we're all just... watching. Pretending the foundations aren't cracking.\n\n`;
      } else if (frameworkHash === 1) {
        // Historical parallel framework
        analysis += `Hannah Arendt wrote about how authoritarianism doesn't announce itself—it creeps in while everyone's looking elsewhere. That's what ${story.keywords[0] || 'this'} reminds me of.\n\n`;
        analysis += `We're watching someone discover, in real time, that the rules don't actually have enforcement mechanisms. They're norms backed by the assumption that people in power will respect them. `;
        analysis += `What happens when that assumption breaks? We're finding out.\n\n`;
      } else {
        // Systems failure framework
        analysis += `This is a stress test. Not the kind anyone wanted, but revealing nonetheless. We're discovering which parts of our system actually work and which only functioned because nobody tested them.\n\n`;
        analysis += `${story.keywords[0] || 'This situation'} exposes a gap between what we thought our institutions could handle and what they actually can. That gap? It's larger than most people realized. `;
        analysis += `And gaps like that don't close themselves.\n\n`;
      }
    } else if (isCritical && isPolitical) {
      analysis += `This goes beyond ${story.keywords[0] || 'one person'}. Way beyond. It's about what we're collectively deciding to treat as acceptable.\n\n`;
      analysis += `The things that used to matter—accountability, honesty, basic democratic norms—they're being tested. And so far? We're failing the test. `;
      analysis += `Not because we don't know better. Because we're choosing not to act on what we know.\n\n`;
    } else if (isCritical) {
      analysis += `Let's be straight: this isn't surprising. We've watched ${story.keywords[0] || 'this'} build for months. `;
      analysis += `What's remarkable is the gap between recognition and response. We see it. We understand it. And yet.\n\n`;
    }

    const keywordAnalysis = this.synthesizeKeywordAnalysis(story);

    // Vary how we connect to broader patterns
    const transitionHash = story.commentCount % 3;

    if (transitionHash === 0) {
      analysis += isAcademic
        ? `The deeper concern: ${keywordAnalysis} aren't separate issues. They're connected symptoms revealing structural problems we've been avoiding.\n\n`
        : `The bigger picture: ${keywordAnalysis} don't exist in isolation. They're symptoms of something we're not addressing.\n\n`;
    } else if (transitionHash === 1) {
      analysis += isAcademic
        ? `What connects all this: ${keywordAnalysis} function as indicators. When you see them together, they're telling you something about system health. And right now? The diagnosis isn't good.\n\n`
        : `Here's what ties together: ${keywordAnalysis} aren't random. They're signals. And the signal is clear.\n\n`;
    } else {
      analysis += isAcademic
        ? `Consider how ${keywordAnalysis} intersect. Not coincidentally—structurally. They emerge from the same root causes we keep treating as separate problems.\n\n`
        : `Think about how ${keywordAnalysis} connect. Not by accident. They stem from the same underlying issues.\n\n`;
    }

    if (isHumorous && !isPolitical) {
      analysis += isAcademic
        ? `(Yes, I know this sounds heavy. Maybe I'm emphasizing for effect. But the underlying pattern holds.)\n\n`
        : `(And no, I'm not being dramatic. Okay, maybe a little. But I'm still right.)\n\n`;
    }

    // Vary the closing punch - not always "bottom line" or "here's the thing"
    const closingHash = (story.score + story.keywords.length) % 3;

    if (closingHash === 0) {
      analysis += isAcademic
        ? `What matters now: we're at one of those moments. The kind where what seemed unlikely yesterday is just... reality today. If you've been paying attention, you know what I mean.`
        : `The shift is happening. What seemed impossible yesterday is normal today. That's how fast things move when the brakes fail.`;
    } else if (closingHash === 1) {
      analysis += isAcademic
        ? `This represents a threshold. On one side, speculation about what could happen. On the other, documentation of what is happening. We've crossed it.`
        : `We've crossed a line. Not metaphorically—literally. The evidence is there. The question is whether we're willing to see it.`;
    } else {
      analysis += isAcademic
        ? `The trajectory is set. Not inevitable—trajectories can change. But they require recognition first. And recognition requires honesty about where we actually are.`
        : `The path is clear. We can still change direction. But first we have to admit which direction we're currently headed.`;
    }

    return analysis;
  }

  private generateImplications(story: StoryResult): string {
    const isAcademic = this.config.style === 'academic';
    const isPolitical = story.keywords.some(k =>
      ['president', 'politics', 'government'].includes(k.toLowerCase())
    );

    if (isPolitical && isAcademic) {
      return `## Why This Actually Matters\n\n` +
             `**For democracy:** Those institutional guardrails we assumed were automatic? They're not. They're being stress-tested right now, and every violation that goes unchecked becomes tomorrow's normal. That's how democracies break—gradually, then suddenly.\n\n` +
             `**For accountability:** Look, history shows that consequences catch up with people eventually. The question is whether it happens fast enough to prevent permanent damage, or whether we learn the lesson too late.\n\n` +
             `**For us:** We're living through one of those moments future people will read about. The kind where they'll ask "what did regular people do?" Our answer—what we do or don't do right now—that's going to be part of the story.`;
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
      return `## The Bottom Line\n\n` +
             `I don't know how this story ends. Nobody does. But here's what I believe: accountability shows up eventually. Maybe not on our timeline, maybe not as dramatically as we'd like, but it shows up.\n\n` +
             `My hope—and yeah, maybe I'm being too optimistic here—is that it happens fast enough to save the institutions we're going to need when the next crisis hits. Because there will be a next crisis.\n\n` +
             `Am I off base here? Tell me in the comments. Seriously, if you think I'm wrong, I want to hear why.`;
    }

    if (isPolitical) {
      return `## The Bottom Line\n\n` +
             `I'm not entirely sure where all of this leaves us, but I do know this: accountability eventually arrives for everyone.\n\n` +
             `I can only hope it finds those who need it most sooner rather than later.\n\n` +
             `What do you think? Am I off base here? Let me know in the comments.`;
    }

    if (isOptimistic && isAcademic) {
      return `## Where We Go From Here\n\n` +
             `Look, I know this is heavy stuff. But here's what gives me hope: people are finally paying attention.\n\n` +
             `Real change starts when enough people recognize the problem. And that recognition? We're getting there.\n\n` +
             `What's your take? I'm genuinely curious what you're thinking. Drop it in the comments.`;
    }

    if (isOptimistic) {
      return `## Where We Go From Here\n\n` +
             `I know this feels heavy. But here's what gives me hope: people are paying attention now.\n\n` +
             `Change starts with awareness. And awareness? We've got that in spades.\n\n` +
             `What's your take? Drop your thoughts below.`;
    }

    return `## The Real Question\n\n` +
           `Are we paying attention to what actually matters? Or are we so focused on ${story.keywords[0]} that we're missing the bigger picture?\n\n` +
           `I hope we figure it out before it's too late.\n\n` +
           `Sound off below. What am I missing?`;
  }

  /**
   * Generate integrated analysis section that weaves context and analysis together
   */
  private generateIntegratedAnalysis(story: StoryResult): string {
    const isAcademic = this.config.style === 'academic';
    const isPolitical = story.keywords.some(k =>
      ['president', 'politics', 'leadership'].includes(k.toLowerCase())
    );
    const coreTopic = this.extractCoreTopic(story);

    let section = isAcademic ? '## What This Reveals\n\n' : '## Here\'s What\'s Happening\n\n';

    if (isPolitical && isAcademic) {
      section += `According to [${story.sourceName}](${story.url}), we're seeing developments around ${coreTopic}. But here's what the reporting doesn't fully capture: the systemic implications.\n\n`;
      section += `This connects to a larger pattern. Not speculation—documented behavior over time. When institutions stop enforcing their own rules, the breakdown accelerates. We've seen this before in other democracies.\n\n`;
      section += `What makes this moment different: the evidence is public, documented, and undeniable. The question isn't whether this is happening—it's whether we're willing to acknowledge what it means.`;
    } else {
      section += `${story.sourceName} [reports](${story.url}) that ${coreTopic} is unfolding. The immediate facts are clear. What's less obvious are the downstream effects.\n\n`;
      section += `This matters because it's not isolated. It's part of a trajectory. And trajectories have momentum—they're easier to redirect early than after they've built speed.\n\n`;
      section += `The real question: are we paying attention to the right signals, or are we watching the spectacle while missing the structural shifts?`;
    }

    return section;
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
