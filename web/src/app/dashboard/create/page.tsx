'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PLATFORMS,
  LENGTHS,
  STYLES,
  type GenerationOptions,
  type ToneSettings,
  type GeneratedArticle,
} from '@/types/create';
import {
  useSynthesizeResearch,
  useResearchContext,
  getRecommendedAngle,
} from '@/hooks/use-synthesis';
import type { SuggestedAngle, SynthesisResult, ResearchContext } from '@/types/synthesis';
import type { EditorialPosition } from '@/types/database';

const DEFAULT_TONE: ToneSettings = {
  humor: 3,
  urgency: 5,
  optimism: 6,
  criticism: 4,
};

export default function CreatePage() {
  return (
    <Suspense fallback={<CreatePageSkeleton />}>
      <CreatePageContent />
    </Suspense>
  );
}

function CreatePageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 bg-muted rounded w-48 animate-pulse" />
        <div className="h-5 bg-muted rounded w-72 mt-2 animate-pulse" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card><CardContent className="py-12" /></Card>
        </div>
        <div className="lg:col-span-2">
          <Card><CardContent className="py-12" /></Card>
        </div>
      </div>
    </div>
  );
}

function CreatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mode detection
  const mode = searchParams.get('mode');
  const isSynthesisMode = mode === 'synthesis';

  // Form state
  const [urls, setUrls] = useState<string>(searchParams.get('url') || searchParams.get('urls') || '');
  const [platform, setPlatform] = useState<GenerationOptions['platform']>('facebook');
  const [length, setLength] = useState<GenerationOptions['length']>('medium');
  const [style, setStyle] = useState<GenerationOptions['style']>('conversational');
  const [tone, setTone] = useState<ToneSettings>(DEFAULT_TONE);
  const [variations, setVariations] = useState(1);
  const [attributionStyle, setAttributionStyle] = useState<'inline' | 'footnotes' | 'endnotes'>('inline');

  // Editorial controls
  const [editorialPosition, setEditorialPosition] = useState<EditorialPosition>('neutral');
  const [editorialNotes, setEditorialNotes] = useState('');

  // Synthesis state
  const { data: researchContext, clearContext } = useResearchContext();
  const synthesizeMutation = useSynthesizeResearch();
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<SuggestedAngle | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<number>(0);

  // Load synthesis context and run analysis
  useEffect(() => {
    if (isSynthesisMode && researchContext?.context?.stories && !synthesis && !synthesizeMutation.isPending) {
      synthesizeMutation.mutate(
        { context: researchContext.context },
        { onSuccess: (data) => setSynthesis(data) }
      );
    }
  }, [isSynthesisMode, researchContext]);

  // Update URL from search params
  useEffect(() => {
    const urlParam = searchParams.get('url') || searchParams.get('urls');
    if (urlParam) {
      setUrls(urlParam);
    }
  }, [searchParams]);

  // Auto-select recommended angle
  useEffect(() => {
    if (synthesis && !selectedAngle) {
      const recommended = getRecommendedAngle(synthesis.suggestedAngles);
      if (recommended) setSelectedAngle(recommended);
    }
  }, [synthesis]);

  const handleGenerate = async () => {
    // Synthesis mode generation
    if (isSynthesisMode && selectedAngle && researchContext?.context?.stories) {
      setIsGenerating(true);
      setError(null);
      setResults([]);

      try {
        const urlList = researchContext.context.stories.map(s => s.url);

        const response = await fetch('/api/create/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: urlList,
            platform,
            length,
            style,
            tone,
            variations: 1,
            // Pass synthesis context for enhanced generation
            synthesisContext: {
              angle: selectedAngle,
              themes: synthesis?.themes || [],
              attributionStyle,
            },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Generation failed');
        }

        const data = await response.json();
        setResults(data.articles || []);
        setSelectedResult(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Standard URL-based generation
    if (!urls.trim()) {
      setError('Please enter at least one URL');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);

    try {
      const urlList = urls.split('\n').map(u => u.trim()).filter(Boolean);

      const response = await fetch('/api/create/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlList,
          platform,
          length,
          style,
          tone,
          variations,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await response.json();
      setResults(data.articles || []);
      setSelectedResult(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveArticle = async (article: GeneratedArticle) => {
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          word_count: article.wordCount,
          reading_time_minutes: article.readingTimeMinutes,
          platform,
          length,
          style,
          tone_humor: tone.humor,
          tone_urgency: tone.urgency,
          tone_optimism: tone.optimism,
          tone_criticism: tone.criticism,
          editorial_position: editorialPosition,
          editorial_notes: editorialNotes || undefined,
          hashtags: article.suggestedHashtags,
          status: 'draft',
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      const data = await response.json();
      router.push(`/dashboard/articles/${data.data.id}`);
    } catch (err) {
      setError('Failed to save article');
    }
  };

  // Synthesis mode - show research-based creation flow
  if (isSynthesisMode) {
    return (
      <div className="space-y-6">
        {/* Header with breadcrumb */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/research"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Research
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">Create from Research</span>
          </div>
          <h1 className="text-2xl font-bold">Create from Research</h1>
          <p className="text-muted-foreground">
            Generate original content synthesized from your research
          </p>
        </div>

        {/* No research context or invalid context */}
        {(!researchContext || !researchContext.context?.stories) && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No research context found. Start by comparing articles in the Research module.
              </p>
              <Button asChild>
                <Link href="/dashboard/research">Go to Research</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading synthesis */}
        {researchContext?.context?.stories && synthesizeMutation.isPending && (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-48 mx-auto" />
                <p className="text-sm text-muted-foreground">Analyzing your research...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Synthesis error */}
        {synthesizeMutation.error && researchContext?.context && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{synthesizeMutation.error.message}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => synthesizeMutation.mutate({ context: researchContext.context })}
              >
                Retry Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main synthesis workflow */}
        {researchContext?.context?.stories && synthesis && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Research Context & Angles */}
            <div className="lg:col-span-1 space-y-4">
              {/* Research Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Research Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Sources:</span>{' '}
                    {researchContext.context.stories.length} articles
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {synthesis.themes.slice(0, 4).map((theme) => (
                      <Badge key={theme.name} variant="secondary" className="text-xs">
                        {theme.name}
                      </Badge>
                    ))}
                  </div>
                  {researchContext.context.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Your notes:</span>
                      <p className="mt-1 text-xs line-clamp-2">{researchContext.context.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Angle Selection */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Select an Angle</CardTitle>
                  <CardDescription>Choose how to frame your article</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {synthesis.suggestedAngles.map((angle) => (
                    <AngleCard
                      key={angle.id}
                      angle={angle}
                      isSelected={selectedAngle?.id === angle.id}
                      onSelect={() => setSelectedAngle(angle)}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Attribution Style */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Attribution Style</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={attributionStyle}
                    onValueChange={(v) => setAttributionStyle(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inline">Inline citations</SelectItem>
                      <SelectItem value="footnotes">Footnotes</SelectItem>
                      <SelectItem value="endnotes">End notes</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Output Settings */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Output Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Length</Label>
                    <Select value={length} onValueChange={(v) => setLength(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LENGTHS.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name} ({l.words} words)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Editorial Controls */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Editorial Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Position / Bias</Label>
                    <Select value={editorialPosition} onValueChange={(v) => setEditorialPosition(v as EditorialPosition)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center-left">Center-Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="center-right">Center-Right</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Editorial Notes</Label>
                    <Textarea
                      value={editorialNotes}
                      onChange={(e) => setEditorialNotes(e.target.value)}
                      placeholder="Add editorial guidelines or context..."
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedAngle}
                className="w-full"
                size="lg"
              >
                {isGenerating ? 'Generating...' : 'Generate Article'}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  clearContext();
                  router.push('/dashboard/create');
                }}
              >
                Start Fresh
              </Button>
            </div>

            {/* Right: Preview/Results */}
            <div className="lg:col-span-2 space-y-4">
              {/* Selected Angle Detail */}
              {selectedAngle && !results.length && !isGenerating && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{selectedAngle.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={
                          selectedAngle.riskLevel === 'safe' ? 'secondary' :
                          selectedAngle.riskLevel === 'moderate' ? 'outline' : 'destructive'
                        }>
                          {selectedAngle.riskLevel}
                        </Badge>
                        <Badge variant="outline">{selectedAngle.originalityScore}% original</Badge>
                      </div>
                    </div>
                    <CardDescription>{selectedAngle.thesis}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Supporting Points</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {selectedAngle.supportingPoints.map((point, i) => (
                          <li key={i}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                    {selectedAngle.counterpoints.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Counterpoints to Address</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {selectedAngle.counterpoints.map((point, i) => (
                            <li key={i}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Separator />
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tone:</span>{' '}
                        <span className="capitalize">{selectedAngle.suggestedTone}</span>
                      </div>
                      {selectedAngle.targetAudience && (
                        <div>
                          <span className="text-muted-foreground">Audience:</span>{' '}
                          {selectedAngle.targetAudience}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fact Summary */}
              {synthesis.factSummary.agreedFacts.length > 0 && !results.length && !isGenerating && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Fact Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {synthesis.factSummary.agreedFacts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-600 mb-1">Agreed Facts</h4>
                        <ul className="text-sm space-y-1">
                          {synthesis.factSummary.agreedFacts.slice(0, 3).map((fact, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Badge variant="outline" className="text-xs shrink-0">
                                {fact.confidence}
                              </Badge>
                              <span className="text-muted-foreground">{fact.claim}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {synthesis.contradictions && synthesis.contradictions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-amber-600 mb-1">Contradictions</h4>
                        <ul className="text-sm space-y-1">
                          {synthesis.contradictions.slice(0, 2).map((c, i) => (
                            <li key={i} className="text-muted-foreground">
                              <span className="font-medium">{c.topic}:</span>{' '}
                              {c.positions.map(p => p.position).join(' vs ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Generation Loading */}
              {isGenerating && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="animate-pulse space-y-4">
                      <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                    <p className="mt-4 text-muted-foreground">
                      Synthesizing original content with {selectedAngle?.name} angle...
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Results */}
              {results.length > 0 && !isGenerating && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Generated Content</CardTitle>
                      {selectedAngle && (
                        <Badge variant="outline">{selectedAngle.originalityScore}% original</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ArticlePreview
                      article={results[0]}
                      onSave={() => handleSaveArticle(results[0])}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Error */}
              {error && (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <p className="text-destructive">{error}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard creation mode
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Article</h1>
        <p className="text-muted-foreground">Generate AI-powered content from source URLs</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Configuration */}
        <div className="lg:col-span-1 space-y-4">
          {/* Source URLs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source URLs</CardTitle>
              <CardDescription>Enter URLs to generate content from</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://example.com/article&#10;https://another-source.com/post"
                className="min-h-[100px] font-mono text-sm"
              />
              <p className="mt-2 text-xs text-muted-foreground">One URL per line (1-5 sources)</p>
            </CardContent>
          </Card>

          {/* Platform & Length */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - {p.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Length</Label>
                <Select value={length} onValueChange={(v) => setLength(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTHS.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.words} words)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Variations</Label>
                <Select value={String(variations)} onValueChange={(v) => setVariations(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} variation{n > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tone Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tone Settings</CardTitle>
              <CardDescription>Adjust the voice characteristics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ToneSlider
                label="Humor"
                value={tone.humor}
                onChange={(v) => setTone({ ...tone, humor: v })}
                lowLabel="Serious"
                highLabel="Humorous"
              />
              <ToneSlider
                label="Urgency"
                value={tone.urgency}
                onChange={(v) => setTone({ ...tone, urgency: v })}
                lowLabel="Relaxed"
                highLabel="Urgent"
              />
              <ToneSlider
                label="Optimism"
                value={tone.optimism}
                onChange={(v) => setTone({ ...tone, optimism: v })}
                lowLabel="Cautious"
                highLabel="Optimistic"
              />
              <ToneSlider
                label="Criticism"
                value={tone.criticism}
                onChange={(v) => setTone({ ...tone, criticism: v })}
                lowLabel="Supportive"
                highLabel="Critical"
              />
            </CardContent>
          </Card>

          {/* Editorial Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Editorial Position</CardTitle>
              <CardDescription>Set your editorial stance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Position / Bias</Label>
                <Select value={editorialPosition} onValueChange={(v) => setEditorialPosition(v as EditorialPosition)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center-left">Center-Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="center-right">Center-Right</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Editorial Notes</Label>
                <Textarea
                  value={editorialNotes}
                  onChange={(e) => setEditorialNotes(e.target.value)}
                  placeholder="Add editorial guidelines or context..."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !urls.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? 'Generating...' : 'Generate Article'}
          </Button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          {error && (
            <Card className="border-destructive mb-4">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
                <p className="mt-4 text-muted-foreground">Generating content...</p>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && !isGenerating && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Content</CardTitle>
                  {results.length > 1 && (
                    <div className="flex gap-1">
                      {results.map((_, i) => (
                        <Button
                          key={i}
                          variant={selectedResult === i ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedResult(i)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {results[selectedResult] && (
                  <ArticlePreview
                    article={results[selectedResult]}
                    onSave={() => handleSaveArticle(results[selectedResult])}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {!isGenerating && results.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Configure your settings and click "Generate Article" to create content
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ToneSlider({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground">{value}/10</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={10}
        min={0}
        step={1}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function ArticlePreview({
  article,
  onSave,
}: {
  article: GeneratedArticle;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{article.title}</h2>
        <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
          <span>{article.wordCount} words</span>
          <span>·</span>
          <span>{article.readingTimeMinutes} min read</span>
          {article.angle && (
            <>
              <span>·</span>
              <Badge variant="outline">{article.angle}</Badge>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="raw">Raw Text</TabsTrigger>
        </TabsList>
        <TabsContent value="preview">
          <div className="prose prose-neutral dark:prose-invert max-w-none border rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <div className="whitespace-pre-wrap">{article.content}</div>
          </div>
        </TabsContent>
        <TabsContent value="raw">
          <Textarea
            value={article.content}
            readOnly
            className="min-h-[400px] font-mono text-sm"
          />
        </TabsContent>
      </Tabs>

      {article.suggestedHashtags && article.suggestedHashtags.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Suggested Hashtags</p>
          <div className="flex flex-wrap gap-1">
            {article.suggestedHashtags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {article.citations && article.citations.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Citations</p>
          <ul className="text-sm text-muted-foreground list-disc list-inside">
            {article.citations.map((citation, i) => (
              <li key={i}>{citation}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={onSave}>Save as Draft</Button>
        <Button variant="outline" onClick={() => navigator.clipboard.writeText(article.content)}>
          Copy to Clipboard
        </Button>
      </div>
    </div>
  );
}

function AngleCard({
  angle,
  isSelected,
  onSelect,
}: {
  angle: SuggestedAngle;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{angle.name}</div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {angle.thesis}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <Badge
            variant={
              angle.riskLevel === 'safe'
                ? 'secondary'
                : angle.riskLevel === 'moderate'
                ? 'outline'
                : 'destructive'
            }
            className="text-xs"
          >
            {angle.riskLevel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {angle.originalityScore}%
          </span>
        </div>
      </div>
    </button>
  );
}
