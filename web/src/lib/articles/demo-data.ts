/**
 * Shared demo article data
 * Single source of truth for demo articles across homepage and article pages
 */

export interface DemoArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: string;
  wordCount: number;
  imageUrl?: string;
  featured?: boolean;
}

/**
 * Generate a deterministic gradient based on article slug
 * Used as fallback when no image is available
 */
export function getArticleGradient(slug: string): string {
  // Hash the slug to get a consistent color
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate hue from hash (0-360)
  const hue = Math.abs(hash % 360);

  // Return gradient with primary color accent
  return `linear-gradient(135deg, hsl(${hue}, 30%, 25%) 0%, hsl(${(hue + 40) % 360}, 40%, 15%) 100%)`;
}

/**
 * Category color mappings for consistent badge colors
 */
export const categoryColors: Record<string, string> = {
  Technology: 'bg-blue-600',
  Strategy: 'bg-emerald-600',
  Media: 'bg-purple-600',
  Trends: 'bg-amber-600',
  Craft: 'bg-rose-600',
  Analysis: 'bg-cyan-600',
};

/**
 * Demo articles with full content
 */
export const demoArticles: DemoArticle[] = [
  {
    id: '1',
    slug: 'future-of-ai-content-creation',
    title: 'The Future of AI in Content Creation',
    excerpt:
      'How artificial intelligence is transforming the media landscape and what it means for publishers navigating the digital age.',
    content: `The integration of artificial intelligence into content creation represents one of the most significant shifts in media production since the advent of the internet. As newsrooms grapple with shrinking budgets and increasing demands for content, AI tools are emerging as powerful allies in the quest to maintain quality while scaling output.

## The Current Landscape

Today's AI writing assistants can generate drafts, suggest headlines, and even conduct preliminary research. Major news organizations are experimenting with these tools, though often behind closed doors. The technology has progressed rapidly—from simple text completion to sophisticated systems capable of understanding context, tone, and audience.

## Opportunities and Challenges

For publishers, the opportunities are significant. AI can handle routine reporting tasks, freeing journalists to focus on investigative work and in-depth analysis. It can personalize content for different audience segments and optimize headlines for engagement.

However, challenges remain. Questions about accuracy, bias, and the preservation of journalistic integrity demand careful consideration. The best implementations treat AI as an augmentation tool rather than a replacement for human judgment.

## Looking Ahead

The publishers who will thrive are those who thoughtfully integrate these tools while maintaining the human oversight that ensures quality and trustworthiness. The future isn't about AI versus human journalists—it's about the powerful combination of both.`,
    category: 'Technology',
    author: 'Sarah Chen',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    readTime: '8 min',
    wordCount: 1850,
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
    featured: true,
  },
  {
    id: '2',
    slug: 'sustainable-content-strategies',
    title: 'Building Sustainable Content Strategies',
    excerpt:
      'Key insights for developing a content approach that drives engagement without burning out your team.',
    content: `Content fatigue is real—both for creators and consumers. In the race to feed algorithmic demands, many publishers have sacrificed quality for quantity, leading to burnout among staff and declining engagement among audiences. A sustainable content strategy offers a better path forward.

## Quality Over Quantity

The most successful content operations have shifted focus from volume metrics to impact metrics. Rather than publishing 20 mediocre pieces per day, they're finding that 5 well-researched, thoughtfully produced articles generate more meaningful engagement and loyalty.

## The Planning Framework

A sustainable strategy starts with clear priorities. What topics genuinely serve your audience? What stories only your team can tell? By focusing resources on high-impact content, publishers can reduce the grind while improving results.

## Team Well-being Matters

Sustainable content isn't just about business metrics—it's about the humans producing it. Organizations that build in creative time, limit after-hours communications, and celebrate quality over speed report lower turnover and higher job satisfaction.

The path to sustainability requires courage to step off the content treadmill. But the rewards—in team morale, audience trust, and long-term viability—make it worthwhile.`,
    category: 'Strategy',
    author: 'Marcus Webb',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    readTime: '5 min',
    wordCount: 1200,
  },
  {
    id: '3',
    slug: 'news-organizations-platform-changes',
    title: 'How News Organizations Are Adapting to Platform Changes',
    excerpt:
      'A deep dive into how media companies are adapting their distribution strategies in response to algorithm shifts.',
    content: `The relationship between news publishers and social platforms has always been complicated. But recent algorithm changes have forced a fundamental rethinking of distribution strategies across the industry.

## The Facebook Pivot (Again)

Meta's continued de-prioritization of news content has pushed publishers to diversify. Those who built their audiences primarily on Facebook are scrambling to establish direct relationships with readers through newsletters and apps.

## The Rise of Direct Distribution

Smart publishers are investing heavily in owned channels. Email newsletters have seen a renaissance, with some organizations reporting that newsletter readers are 10x more valuable than social referrals. Push notifications and dedicated apps round out the direct distribution toolkit.

## Platform Pragmatism

Rather than abandoning platforms entirely, successful publishers are taking a pragmatic approach. They maintain presence where audiences gather while building sustainable direct channels. The key is reducing dependency, not eliminating presence.

## What's Working

Organizations finding success share common traits: they've diversified revenue beyond advertising, built loyal subscriber bases, and maintained flexibility to adapt as platforms evolve. The lesson is clear—own your audience relationship.`,
    category: 'Media',
    author: 'Elena Rodriguez',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    readTime: '6 min',
    wordCount: 2100,
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop',
  },
  {
    id: '4',
    slug: 'rise-of-newsletter-journalism',
    title: 'The Rise of Newsletter Journalism',
    excerpt:
      'Understanding the newsletter boom and its impact on independent journalism in the creator economy.',
    content: `The past few years have witnessed an explosion in newsletter journalism. Platforms like Substack, Ghost, and Beehiiv have enabled individual journalists to build sustainable businesses directly serving readers. This shift is reshaping the media landscape in profound ways.

## Why Newsletters Work

The newsletter model succeeds because it solves problems for both creators and readers. Writers get direct revenue and creative freedom. Readers get content tailored to their interests, delivered reliably to their inbox, free from algorithmic interference.

## The Economics

Top newsletter writers are earning substantial incomes—some exceeding what they made at traditional outlets. But success isn't guaranteed. The median newsletter generates modest revenue, and building an audience requires sustained effort and genuine expertise.

## Impact on Traditional Media

Established outlets are responding in various ways. Some have launched their own newsletter products. Others have partnered with newsletter platforms. A few have lost prominent voices to the independent route, prompting soul-searching about workplace culture and creative freedom.

## The Future

Newsletters aren't replacing traditional journalism—they're complementing it. The most likely outcome is a hybrid ecosystem where independent voices and established institutions coexist, each serving different audience needs.`,
    category: 'Trends',
    author: 'James Park',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    readTime: '7 min',
    wordCount: 1600,
    imageUrl: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1200&h=630&fit=crop',
  },
  {
    id: '5',
    slug: 'data-driven-storytelling',
    title: 'Data-Driven Storytelling: Best Practices',
    excerpt:
      'How to use data to enhance your narrative without losing the human element.',
    content: `Data journalism has matured from a niche specialty to an essential capability. But the best data-driven stories aren't about the numbers—they're about what the numbers reveal about human experience.

## Start With the Story

The most common mistake in data journalism is leading with the data. Effective practitioners start with a question or hypothesis, then use data to explore and illuminate. The data serves the story, not the other way around.

## Visualization Principles

Good data visualization follows clear principles: clarity over cleverness, accuracy over aesthetics, and accessibility for all readers. The best visualizations make complex information intuitive without oversimplifying.

## The Human Element

Every dataset represents human lives and experiences. The strongest data stories connect numbers to real people—using case studies, interviews, and narrative techniques to bring statistics to life.

## Tools and Techniques

Modern data journalists have access to powerful tools for analysis and visualization. But technical skill alone isn't enough. The differentiator is editorial judgment—knowing which data matters and how to present it meaningfully.`,
    category: 'Craft',
    author: 'Priya Sharma',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    readTime: '6 min',
    wordCount: 1400,
  },
];

/**
 * Get article by slug
 */
export function getArticleBySlug(slug: string): DemoArticle | undefined {
  return demoArticles.find((article) => article.slug === slug);
}

/**
 * Get all article slugs (for static generation)
 */
export function getAllArticleSlugs(): string[] {
  return demoArticles.map((article) => article.slug);
}

/**
 * Get featured articles
 */
export function getFeaturedArticles(limit = 5): DemoArticle[] {
  return demoArticles.slice(0, limit);
}
