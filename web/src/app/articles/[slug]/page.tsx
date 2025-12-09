import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArticleThumbnail } from '@/components/articles/article-thumbnail';
import {
  getArticleBySlug,
  getAllArticleSlugs,
  demoArticles,
  type DemoArticle,
} from '@/lib/articles/demo-data';
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Share2,
  Bookmark,
  Newspaper,
} from 'lucide-react';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate static params for all demo articles
 */
export async function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return { title: 'Article Not Found' };
  }

  return {
    title: `${article.title} | News Radar`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.author],
      images: article.imageUrl ? [article.imageUrl] : [],
    },
  };
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get related articles (exclude current, max 3)
 */
function getRelatedArticles(currentSlug: string, limit = 3): DemoArticle[] {
  return demoArticles
    .filter((article) => article.slug !== currentSlug)
    .slice(0, limit);
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedArticles(slug);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Back
              </Link>
            </Button>
          </div>

          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Newspaper className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="font-display text-lg font-bold hidden sm:inline">News Radar</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Share article">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Bookmark article">
              <Bookmark className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </header>

      <main className="pb-16">
        {/* Hero Section */}
        <article>
          <header className="relative">
            {/* Featured Image */}
            <ArticleThumbnail
              src={article.imageUrl}
              alt={article.title}
              slug={article.slug}
              aspectRatio="aspect-[21/9]"
              sizes="100vw"
              priority
              showFallbackIcon={false}
            />

            {/* Article Header Overlay */}
            <div className="absolute inset-0 flex items-end">
              <div className="w-full bg-gradient-to-t from-background via-background/80 to-transparent pt-32 pb-8">
                <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                  <Badge className="mb-4">{article.category}</Badge>
                  <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                    {article.title}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                    {article.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" aria-hidden="true" />
                      {article.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      <time dateTime={article.publishedAt}>
                        {formatDate(article.publishedAt)}
                      </time>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      {article.readTime} read
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Article Content */}
          <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-12">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {article.content.split('\n\n').map((paragraph, index) => {
                // Handle markdown headers
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="font-display text-2xl font-bold mt-8 mb-4">
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                }
                // Regular paragraphs
                return (
                  <p key={index} className={index === 0 ? 'drop-cap' : ''}>
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>
        </article>

        {/* Related Articles */}
        <section className="border-t pt-12">
          <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <h2 className="font-display text-2xl font-bold mb-8 editorial-divider pb-2">
              More Stories
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/articles/${related.slug}`}
                  className="group block"
                >
                  <article className="overflow-hidden rounded-lg border bg-card card-hover">
                    <ArticleThumbnail
                      src={related.imageUrl}
                      alt={related.title}
                      slug={related.slug}
                      aspectRatio="aspect-[4/3]"
                      category={related.category}
                    />
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {related.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {related.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{related.author}</span>
                        <span>{related.readTime}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 bg-muted/30 py-12">
          <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
            <h2 className="font-display text-2xl font-bold mb-4">
              Want to create content like this?
            </h2>
            <p className="text-muted-foreground mb-6">
              News Radar Studio helps you research, write, and publish professional articles.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild>
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Try the Demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Newspaper className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="font-display font-semibold">News Radar Studio</span>
            </Link>
            <p className="text-sm text-muted-foreground">v0.3.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
