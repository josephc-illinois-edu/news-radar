'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAIDiffAnalysis, useComparisonNotes, useArticleSelection } from '@/hooks/use-research';
import type { StoryResult, DiffAnalysis, ComparisonNote, ViewMode } from '@/types/research';

const COMPARE_ARTICLES_KEY = 'research-selected-articles';

export default function ComparePage() {
  return (
    <Suspense fallback={<ComparePageSkeleton />}>
      <ComparePageContent />
    </Suspense>
  );
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get article IDs from URL
  const articleIdsParam = searchParams.get('articles');
  const articleIds = articleIdsParam ? articleIdsParam.split(',') : [];

  // State
  const [articles, setArticles] = useState<StoryResult[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [showDiff, setShowDiff] = useState(true);
  const [analysis, setAnalysis] = useState<DiffAnalysis | null>(null);

  // Hooks
  const diffMutation = useAIDiffAnalysis();
  const sessionId = articleIds.sort().join('-');
  const { notes, addNote, deleteNote } = useComparisonNotes(sessionId);
  const { clearSelection } = useArticleSelection();

  // Load articles from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(COMPARE_ARTICLES_KEY);
    if (stored) {
      const allSelected: StoryResult[] = JSON.parse(stored);
      // Filter to only the articles in the URL
      const filtered = articleIds.length > 0
        ? allSelected.filter(a => articleIds.includes(a.id))
        : allSelected;
      setArticles(filtered);
    }
  }, [articleIdsParam]);

  // Run AI analysis when articles load
  useEffect(() => {
    if (articles.length >= 2 && !analysis && !diffMutation.isPending) {
      diffMutation.mutate(articles, {
        onSuccess: (data) => setAnalysis(data),
      });
    }
  }, [articles]);

  // Note handlers
  const [newNote, setNewNote] = useState('');
  const [noteArticleId, setNoteArticleId] = useState<string | undefined>(undefined);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate({
      sessionId,
      articleId: noteArticleId,
      content: newNote.trim(),
    });
    setNewNote('');
    setNoteArticleId(undefined);
  };

  const handleGenerateContent = () => {
    // Store context for Create page
    const urls = articles.map(a => a.url).join('\n');
    const notesText = notes.map(n => n.content).join('\n\n');

    sessionStorage.setItem('create-research-context', JSON.stringify({
      articles,
      notes: notesText,
      analysis,
    }));

    router.push(`/dashboard/create?mode=synthesis&urls=${encodeURIComponent(urls)}`);
  };

  if (articles.length < 2) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Select at least 2 articles to compare.
            </p>
            <Button asChild>
              <Link href="/dashboard/scanner">Go to Scanner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/scanner"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Scanner
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">Compare</span>
          </div>
          <h1 className="text-2xl font-bold">Compare Articles</h1>
          <p className="text-muted-foreground">
            Analyzing {articles.length} articles for similarities and differences
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              clearSelection();
              router.push('/dashboard/scanner');
            }}
          >
            Clear & Back
          </Button>
          <Button onClick={handleGenerateContent} disabled={!analysis}>
            Generate Content
          </Button>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-background shadow-sm'
                : 'hover:bg-background/50'
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('tabbed')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'tabbed'
                ? 'bg-background shadow-sm'
                : 'hover:bg-background/50'
            }`}
          >
            Tabbed
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showDiff}
            onChange={(e) => setShowDiff(e.target.checked)}
            className="rounded"
          />
          Show AI Analysis
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Articles View */}
        <div className="lg:col-span-3">
          {viewMode === 'side-by-side' ? (
            <SideBySideView articles={articles} analysis={analysis} showDiff={showDiff} />
          ) : (
            <TabbedView articles={articles} analysis={analysis} showDiff={showDiff} />
          )}
        </div>

        {/* Notes Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Research Notes</CardTitle>
              <CardDescription>
                Add notes as you compare
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add your thoughts..."
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <select
                  value={noteArticleId || ''}
                  onChange={(e) => setNoteArticleId(e.target.value || undefined)}
                  className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-background"
                >
                  <option value="">General note</option>
                  {articles.map((a, i) => (
                    <option key={a.id} value={a.id}>
                      Article {i + 1}: {a.title.slice(0, 25)}...
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes List */}
          {notes.length > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2 rounded bg-muted/50 text-sm group relative"
                  >
                    {note.articleId && (
                      <Badge variant="outline" className="text-xs mb-1">
                        Article {articles.findIndex(a => a.id === note.articleId) + 1}
                      </Badge>
                    )}
                    <p className="text-sm">{note.content}</p>
                    <button
                      onClick={() => deleteNote.mutate(note.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Analysis Panel */}
      {showDiff && (
        <AIAnalysisPanel
          analysis={analysis}
          isLoading={diffMutation.isPending}
          onRetry={() => diffMutation.mutate(articles, { onSuccess: setAnalysis })}
        />
      )}
    </div>
  );
}

// === Side by Side View ===

function SideBySideView({
  articles,
  analysis,
  showDiff,
}: {
  articles: StoryResult[];
  analysis: DiffAnalysis | null;
  showDiff: boolean;
}) {
  const gridCols = articles.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {articles.map((article, i) => (
        <ArticleCard
          key={article.id}
          article={article}
          index={i}
          perspective={analysis?.perspectiveAnalysis.find(p => p.articleId === article.id)}
        />
      ))}
    </div>
  );
}

// === Tabbed View ===

function TabbedView({
  articles,
  analysis,
  showDiff,
}: {
  articles: StoryResult[];
  analysis: DiffAnalysis | null;
  showDiff: boolean;
}) {
  return (
    <Tabs defaultValue={articles[0]?.id} className="space-y-4">
      <TabsList>
        {articles.map((article, i) => (
          <TabsTrigger key={article.id} value={article.id}>
            {article.sourceName} ({i + 1})
          </TabsTrigger>
        ))}
      </TabsList>

      {articles.map((article, i) => (
        <TabsContent key={article.id} value={article.id}>
          <ArticleCard
            article={article}
            index={i}
            perspective={analysis?.perspectiveAnalysis.find(p => p.articleId === article.id)}
            expanded
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

// === Article Card ===

function ArticleCard({
  article,
  index,
  perspective,
  expanded = false,
}: {
  article: StoryResult;
  index: number;
  perspective?: { perspective: string; tone: string; biasIndicators: string[] };
  expanded?: boolean;
}) {
  return (
    <Card className={expanded ? '' : 'h-fit'}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Badge variant="secondary">Article {index + 1}</Badge>
          <Badge variant="outline">{article.sourceName}</Badge>
        </div>
        <CardTitle className="text-base mt-2">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary"
          >
            {article.title}
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className={`text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-4'}`}>
          {article.contentSnippet || 'No preview available'}
        </p>

        <div className="flex flex-wrap gap-1">
          {article.keywords.slice(0, 5).map((keyword) => (
            <Badge key={keyword} variant="outline" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>

        {perspective && (
          <div className="pt-2 border-t space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Perspective:</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {perspective.perspective}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Tone:</span>
              <span className="capitalize">{perspective.tone}</span>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Published: {new Date(article.publishedAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

// === AI Analysis Panel ===

function AIAnalysisPanel({
  analysis,
  isLoading,
  onRetry,
}: {
  analysis: DiffAnalysis | null;
  isLoading: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-48 mx-auto" />
            <p className="text-sm text-muted-foreground">Analyzing articles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">Analysis not available</p>
          <Button variant="outline" onClick={onRetry}>
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Analysis</CardTitle>
        <CardDescription>
          Automated comparison of the selected articles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Themes */}
        <div>
          <h4 className="font-medium mb-2">Key Themes</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.keyThemes.map((theme) => (
              <Badge key={theme} variant="secondary">
                {theme}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Similarities */}
        <div>
          <h4 className="font-medium mb-2 text-green-600">Similarities</h4>
          <ul className="space-y-2">
            {analysis.similarities.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                  {point.type}
                </Badge>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Differences */}
        <div>
          <h4 className="font-medium mb-2 text-amber-600">Differences</h4>
          <ul className="space-y-2">
            {analysis.differences.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                  {point.type}
                </Badge>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        {/* Suggested Angles */}
        <div>
          <h4 className="font-medium mb-2">Suggested Writing Angles</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {analysis.suggestedAngles.map((angle, i) => (
              <li key={i}>• {angle}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// === Skeleton ===

function ComparePageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
