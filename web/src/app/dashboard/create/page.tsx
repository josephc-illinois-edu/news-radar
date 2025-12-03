'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const DEFAULT_TONE: ToneSettings = {
  humor: 3,
  urgency: 5,
  optimism: 6,
  criticism: 4,
};

export default function CreatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Form state
  const [urls, setUrls] = useState<string>(searchParams.get('url') || '');
  const [platform, setPlatform] = useState<GenerationOptions['platform']>('facebook');
  const [length, setLength] = useState<GenerationOptions['length']>('medium');
  const [style, setStyle] = useState<GenerationOptions['style']>('conversational');
  const [tone, setTone] = useState<ToneSettings>(DEFAULT_TONE);
  const [variations, setVariations] = useState(1);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<number>(0);

  // Update URL from search params
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setUrls(urlParam);
    }
  }, [searchParams]);

  const handleGenerate = async () => {
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
