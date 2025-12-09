import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArticleThumbnail } from '@/components/articles/article-thumbnail';
import { getFeaturedArticles, type DemoArticle } from '@/lib/articles/demo-data';
import {
  Newspaper,
  Radio,
  PenTool,
  Send,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Radio,
    title: 'Smart Scanning',
    description: 'Aggregate news from Hacker News, Lobsters, The Guardian, and custom RSS feeds in real-time.',
  },
  {
    icon: Sparkles,
    title: 'AI Synthesis',
    description: 'Transform multiple sources into original, well-researched articles with proper attribution.',
  },
  {
    icon: PenTool,
    title: 'Editorial Control',
    description: 'Full editing suite with version history, originality checking, and multiple content angles.',
  },
  {
    icon: Send,
    title: 'Multi-Platform Publishing',
    description: 'Distribute to Facebook, LinkedIn, Twitter, and more with optimized formatting for each.',
  },
];

// Article type for homepage display
interface HomepageArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  imageUrl?: string;
  readTime: string;
  featured?: boolean;
}

/**
 * Calculate reading time from word count
 */
function calculateReadTime(wordCount?: number): string {
  if (!wordCount || wordCount <= 0) return '1 min';
  const minutes = Math.ceil(wordCount / 225);
  return `${minutes} min`;
}

/**
 * Fetch published articles from Supabase
 * Falls back to demo articles if Supabase is not configured
 */
async function getHomepageArticles(): Promise<HomepageArticle[]> {
  const supabase = await createClient();

  // Fallback to demo articles if Supabase is not configured
  if (!supabase) {
    console.log('[Homepage] No Supabase client - using demo articles');
    const demoArticles = getFeaturedArticles(4);
    return demoArticles.map((article, index) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      imageUrl: article.imageUrl,
      readTime: article.readTime,
      featured: index === 0,
    }));
  }

  // Fetch published articles from Supabase
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, excerpt, content, platform, style, featured_image_url, word_count, status')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(4);

  if (error || !data || data.length === 0) {
    // Fall back to demo articles if no published articles
    const demoArticles = getFeaturedArticles(4);
    return demoArticles.map((article, index) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      imageUrl: article.imageUrl,
      readTime: article.readTime,
      featured: index === 0,
    }));
  }

  // Transform Supabase articles to homepage format
  return data.map((article, index) => {
    // Generate excerpt from content if not provided
    let excerpt = article.excerpt;
    if (!excerpt && article.content) {
      // Strip markdown and get first ~150 chars
      excerpt = article.content
        .replace(/^#.*$/gm, '') // Remove headers
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\n+/g, ' ') // Collapse newlines
        .trim()
        .slice(0, 150) + '...';
    }

    return {
      id: article.id,
      slug: article.id,
      title: article.title || 'Untitled',
      excerpt: excerpt || '',
      category: article.platform || article.style || 'Article',
      imageUrl: article.featured_image_url || undefined,
      readTime: calculateReadTime(article.word_count),
      featured: index === 0,
    };
  });
}

export default async function Home() {
  const supabase = await createClient();

  // Check if user is logged in
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      redirect('/dashboard');
    }
  }

  // Get articles from Supabase (or demo fallback)
  const articles = await getHomepageArticles();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Newspaper className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="font-display text-xl font-bold">News Radar</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#articles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Articles
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

          <div className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm mb-6">
                <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>AI-Powered Editorial Platform</span>
              </div>

              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
                Transform News Into
                <span className="text-primary"> Original Content</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Research trending topics, synthesize multiple sources, and publish professional articles
                across all your platforms—powered by AI, controlled by you.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href="/signup">
                    Start Creating Free
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/dashboard">View Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Article Previews Section */}
        <section id="articles" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold mb-2 editorial-divider pb-2">
                Latest from the Studio
              </h2>
              <p className="text-muted-foreground">
                See what AI-assisted journalism looks like
              </p>
            </div>
            <Button variant="outline" asChild className="hidden sm:inline-flex">
              <Link href="/dashboard/articles">
                View All
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                href={`/dashboard/articles/${article.id}`}
                className={`group block ${article.featured ? 'md:col-span-2 md:row-span-2' : ''}`}
              >
                <Card className="h-full overflow-hidden card-hover">
                  {/* Article Thumbnail with fallback */}
                  <ArticleThumbnail
                    src={article.imageUrl}
                    alt={article.title}
                    slug={article.slug}
                    aspectRatio={article.featured ? 'aspect-[16/9]' : 'aspect-[4/3]'}
                    category={article.category}
                    priority={index === 0}
                    sizes={article.featured
                      ? '(max-width: 768px) 100vw, 50vw'
                      : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                    }
                  />

                  {/* Title overlay on image */}
                  <div className="relative -mt-16 pt-8 px-4 pb-0 bg-gradient-to-t from-card via-card to-transparent">
                    <h3 className={`font-display font-semibold line-clamp-2 group-hover:text-primary transition-colors ${
                      article.featured ? 'text-xl md:text-2xl' : 'text-base'
                    }`}>
                      {article.title}
                    </h3>
                  </div>

                  <div className="p-4 pt-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{article.readTime} read</span>
                      <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Read more <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/30 py-16 md:py-24">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold mb-4">
                Everything You Need to Create
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From discovery to distribution, News Radar Studio handles the entire content lifecycle.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="p-6 card-hover">
                  <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">10x</div>
              <p className="text-muted-foreground">Faster content creation</p>
            </div>
            <div>
              <div className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">50+</div>
              <p className="text-muted-foreground">News sources supported</p>
            </div>
            <div>
              <div className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">5</div>
              <p className="text-muted-foreground">Publishing platforms</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="pricing" className="bg-primary text-primary-foreground py-16 md:py-24">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <TrendingUp className="h-12 w-12 opacity-80" aria-hidden="true" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
              Join publishers who are already creating better content faster with News Radar Studio.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                <Link href="/dashboard">Try the Demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Newspaper className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="font-display font-semibold">News Radar Studio</span>
            </div>

            <nav className="flex items-center gap-6 text-sm text-muted-foreground" aria-label="Footer navigation">
              <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="#articles" className="hover:text-foreground transition-colors">Articles</Link>
              <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            </nav>

            <p className="text-sm text-muted-foreground">
              v0.3.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
