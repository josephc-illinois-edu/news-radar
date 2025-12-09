import { Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/server';
import { ArticleGrid } from '@/components/articles/article-grid';
import type { ArticleCardProps } from '@/components/articles/article-card';
import {
  FileText,
  Send,
  Eye,
  TrendingUp,
  PlusCircle,
  Search,
  Radio,
  ArrowRight,
} from 'lucide-react';

async function getStats() {
  const supabase = await createClient();

  // Return demo stats if Supabase is not configured
  if (!supabase) {
    return {
      total: 12,
      published: 5,
      drafts: 7,
      thisWeek: 3,
    };
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [articlesResult, publishedResult, draftsResult, weekResult] = await Promise.all([
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString()),
  ]);

  return {
    total: articlesResult.count || 0,
    published: publishedResult.count || 0,
    drafts: draftsResult.count || 0,
    thisWeek: weekResult.count || 0,
  };
}

async function getRecentArticles(): Promise<ArticleCardProps[]> {
  const supabase = await createClient();

  // Return demo articles if Supabase is not configured
  if (!supabase) {
    return [
      {
        id: '1',
        title: 'The Future of AI in Content Creation: What Publishers Need to Know',
        excerpt: 'Exploring how artificial intelligence is transforming the media landscape and what it means for content creators.',
        category: 'Technology',
        author: 'Editorial Team',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        wordCount: 1850,
      },
      {
        id: '2',
        title: 'Building a Sustainable Content Strategy in 2025',
        excerpt: 'Key insights for developing a content strategy that drives engagement without burnout.',
        category: 'Strategy',
        author: 'Editorial Team',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        wordCount: 1200,
      },
      {
        id: '3',
        title: 'How News Organizations Are Adapting to Platform Changes',
        excerpt: 'A deep dive into the strategies media companies are using to maintain reach.',
        category: 'Media',
        author: 'Editorial Team',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        wordCount: 2100,
      },
      {
        id: '4',
        title: 'The Rise of Newsletter Journalism',
        excerpt: 'Understanding the newsletter boom and its impact on independent journalism.',
        category: 'Trends',
        author: 'Editorial Team',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        wordCount: 1600,
      },
      {
        id: '5',
        title: 'Data-Driven Storytelling: Best Practices',
        excerpt: 'How to use data to enhance your narrative without losing the human element.',
        category: 'Craft',
        author: 'Editorial Team',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        wordCount: 1400,
      },
    ];
  }

  const { data } = await supabase
    .from('articles')
    .select('id, title, excerpt, content, platform, style, created_at, word_count, featured_image_url')
    .order('created_at', { ascending: false })
    .limit(6);

  return (data || []).map((article) => {
    // Generate excerpt from content if not provided
    let excerpt = article.excerpt;
    if (!excerpt && article.content) {
      excerpt = article.content
        .replace(/^#.*$/gm, '')
        .replace(/\*\*/g, '')
        .replace(/\n+/g, ' ')
        .trim()
        .slice(0, 150) + '...';
    }

    return {
      id: article.id,
      title: article.title || 'Untitled',
      excerpt: excerpt || '',
      category: article.platform || article.style || 'Article',
      author: 'Editorial Team',
      publishedAt: article.created_at,
      wordCount: article.word_count || 0,
      imageUrl: article.featured_image_url,
    };
  });
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof FileText;
}) {
  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof PlusCircle;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="h-full card-hover border-2 border-transparent hover:border-primary/20">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>
          <ArrowRight
            className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all mt-1"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    </Link>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function StatsSection() {
  const stats = await getStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Articles"
        value={stats.total}
        description="All articles in database"
        icon={FileText}
      />
      <StatCard
        title="Published"
        value={stats.published}
        description="Live articles"
        icon={Send}
      />
      <StatCard
        title="Drafts"
        value={stats.drafts}
        description="Work in progress"
        icon={Eye}
      />
      <StatCard
        title="This Week"
        value={stats.thisWeek}
        description="Recently created"
        icon={TrendingUp}
      />
    </div>
  );
}

async function RecentArticlesSection() {
  const articles = await getRecentArticles();

  return (
    <section aria-labelledby="recent-articles-heading">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            id="recent-articles-heading"
            className="font-display text-2xl font-bold editorial-divider pb-2"
          >
            Recent Articles
          </h2>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/articles">
            View all
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <ArticleGrid articles={articles} layout="magazine" showLayoutToggle={false} />
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header>
        <h1 className="font-display text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to News Radar Studio. Your command center for content creation.
        </p>
      </header>

      {/* Stats */}
      <Suspense fallback={<StatsLoading />}>
        <StatsSection />
      </Suspense>

      {/* Quick Actions */}
      <section aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="font-display text-2xl font-bold mb-6 editorial-divider pb-2"
        >
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Create Article"
            description="Generate new content with AI assistance"
            href="/dashboard/create"
            icon={PlusCircle}
          />
          <QuickActionCard
            title="Scan Sources"
            description="Discover trending stories from multiple sources"
            href="/dashboard/scanner"
            icon={Radio}
          />
          <QuickActionCard
            title="Research Topics"
            description="Deep dive into topics for your next piece"
            href="/dashboard/research"
            icon={Search}
          />
        </div>
      </section>

      {/* Recent Articles */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <ArticleGrid articles={[]} isLoading layout="magazine" showLayoutToggle={false} />
          </div>
        }
      >
        <RecentArticlesSection />
      </Suspense>
    </div>
  );
}
