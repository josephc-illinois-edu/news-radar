'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useArticle, useUpdateArticle } from '@/hooks/use-articles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FeaturedImageGenerator } from '@/components/articles/featured-image-generator';
import type { ImagePlatform, ImageStyle } from '@/types/graphics';
import type { EditorialPosition, RewriteModel, RewriteResponse } from '@/types/database';
import { Slider } from '@/components/ui/slider';
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: article, isLoading, error } = useArticle(id);
  const updateArticle = useUpdateArticle();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState<ImagePlatform>('facebook');
  const [status, setStatus] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('modern');
  const [isDirty, setIsDirty] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Editorial controls
  const [editorialPosition, setEditorialPosition] = useState<EditorialPosition>('neutral');
  const [editorialNotes, setEditorialNotes] = useState('');
  const [toneHumor, setToneHumor] = useState(50);
  const [toneUrgency, setToneUrgency] = useState(50);
  const [toneCriticism, setToneCriticism] = useState(50);
  const [toneOptimism, setToneOptimism] = useState(50);
  const [showEditorialControls, setShowEditorialControls] = useState(false);

  // Rewrite assistant
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [rewriteModel, setRewriteModel] = useState<RewriteModel>('haiku');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<RewriteResponse | null>(null);
  const [showRewritePanel, setShowRewritePanel] = useState(false);

  // Initialize form when article loads
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content);
      // Use featured_image_platform as primary, fallback to article platform
      setPlatform((article.featured_image_platform || article.platform || 'facebook') as ImagePlatform);
      setStatus(article.status);
      setHashtags(article.hashtags?.join(', ') || '');
      setImageStyle(article.featured_image_style || 'modern');
      // Editorial controls
      setEditorialPosition(article.editorial_position || 'neutral');
      setEditorialNotes(article.editorial_notes || '');
      setToneHumor(article.tone_humor ?? 50);
      setToneUrgency(article.tone_urgency ?? 50);
      setToneCriticism(article.tone_criticism ?? 50);
      setToneOptimism(article.tone_optimism ?? 50);
    }
  }, [article]);

  // Track changes
  useEffect(() => {
    if (article) {
      const currentPlatform = (article.featured_image_platform || article.platform || 'facebook') as ImagePlatform;
      const hasChanges =
        title !== article.title ||
        content !== article.content ||
        platform !== currentPlatform ||
        status !== article.status ||
        hashtags !== (article.hashtags?.join(', ') || '') ||
        imageStyle !== (article.featured_image_style || 'modern') ||
        editorialPosition !== (article.editorial_position || 'neutral') ||
        editorialNotes !== (article.editorial_notes || '') ||
        toneHumor !== (article.tone_humor ?? 50) ||
        toneUrgency !== (article.tone_urgency ?? 50) ||
        toneCriticism !== (article.tone_criticism ?? 50) ||
        toneOptimism !== (article.tone_optimism ?? 50);
      setIsDirty(hasChanges);
    }
  }, [title, content, platform, status, hashtags, imageStyle, editorialPosition, editorialNotes, toneHumor, toneUrgency, toneCriticism, toneOptimism, article]);

  const handleSaveClick = () => {
    // Check if article has no image settings - prompt user
    if (!article?.featured_image_platform && !pendingSave) {
      setShowImageDialog(true);
      return;
    }
    performSave();
  };

  const performSave = async () => {
    const hashtagsArray = hashtags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await updateArticle.mutateAsync({
      id,
      title,
      content,
      platform: platform, // Single platform for both content and image
      status: status as any,
      hashtags: hashtagsArray.length > 0 ? hashtagsArray : undefined,
      featured_image_platform: platform, // Same as article platform
      featured_image_style: imageStyle,
      word_count: content.split(/\s+/).filter(Boolean).length,
      reading_time_minutes: Math.ceil(content.split(/\s+/).filter(Boolean).length / 200),
      // Editorial controls
      editorial_position: editorialPosition,
      editorial_notes: editorialNotes || undefined,
      tone_humor: toneHumor,
      tone_urgency: toneUrgency,
      tone_criticism: toneCriticism,
      tone_optimism: toneOptimism,
    });

    setIsDirty(false);
    setPendingSave(false);
    router.push(`/dashboard/articles/${id}`);
  };

  // Rewrite handler
  const handleRewrite = async () => {
    if (!rewriteInstruction.trim() || !content.trim()) return;

    setIsRewriting(true);
    setRewriteResult(null);

    try {
      const response = await fetch('/api/articles/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          instruction: rewriteInstruction,
          model: rewriteModel,
          editorial_position: editorialPosition,
          editorial_notes: editorialNotes,
          tone_humor: toneHumor,
          tone_urgency: toneUrgency,
          tone_criticism: toneCriticism,
          tone_optimism: toneOptimism,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setRewriteResult(data.data);
      } else {
        console.error('Rewrite failed:', data.error);
      }
    } catch (error) {
      console.error('Rewrite error:', error);
    } finally {
      setIsRewriting(false);
    }
  };

  const applyRewrite = () => {
    if (rewriteResult?.rewritten) {
      setContent(rewriteResult.rewritten);
      setRewriteResult(null);
      setRewriteInstruction('');
    }
  };

  const handleSkipImage = () => {
    setShowImageDialog(false);
    setPendingSave(true);
    performSave();
  };

  const handleImageSettingsChange = (newPlatform: ImagePlatform, newStyle: ImageStyle) => {
    // Platform is unified - when image generator changes platform, update the main platform
    setPlatform(newPlatform);
    setImageStyle(newStyle);
  };

  if (isLoading) {
    return <EditorSkeleton />;
  }

  if (error || !article) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error?.message || 'Article not found'}
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/articles">Back to Articles</Link>
        </Button>
      </div>
    );
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/articles"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Articles
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              href={`/dashboard/articles/${id}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {article.title.slice(0, 20)}...
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm">Edit</span>
          </div>
          <h1 className="text-2xl font-bold">Edit Article</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/articles/${id}`}>Cancel</Link>
          </Button>
          <Button
            onClick={handleSaveClick}
            disabled={!isDirty || updateArticle.isPending}
          >
            {updateArticle.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Title</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                className="text-lg font-medium"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Content</CardTitle>
              <span className="text-sm text-muted-foreground">
                {wordCount.toLocaleString()} words · {Math.ceil(wordCount / 200)} min read
              </span>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="write">
                <TabsList className="mb-4">
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your article content..."
                    className="min-h-[400px] w-full resize-y rounded-md border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="min-h-[400px] rounded-md border p-4 prose prose-neutral dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap">{content || 'Nothing to preview'}</div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Editorial Controls - Below content */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setShowEditorialControls(!showEditorialControls)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Editorial Controls</CardTitle>
                {showEditorialControls ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {showEditorialControls && (
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Position / Bias</label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between capitalize">
                            {editorialPosition.replace('-', ' ')}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full">
                          <DropdownMenuRadioGroup
                            value={editorialPosition}
                            onValueChange={(v) => setEditorialPosition(v as EditorialPosition)}
                          >
                            <DropdownMenuRadioItem value="neutral">Neutral</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="left">Left</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="center-left">Center-Left</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="center">Center</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="center-right">Center-Right</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Humor</label>
                          <span className="text-xs text-muted-foreground">{toneHumor}</span>
                        </div>
                        <Slider value={[toneHumor]} onValueChange={([v]) => setToneHumor(v)} min={0} max={100} step={5} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Serious</span>
                          <span>Playful</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Urgency</label>
                          <span className="text-xs text-muted-foreground">{toneUrgency}</span>
                        </div>
                        <Slider value={[toneUrgency]} onValueChange={([v]) => setToneUrgency(v)} min={0} max={100} step={5} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Relaxed</span>
                          <span>Urgent</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Optimism</label>
                          <span className="text-xs text-muted-foreground">{toneOptimism}</span>
                        </div>
                        <Slider value={[toneOptimism]} onValueChange={([v]) => setToneOptimism(v)} min={0} max={100} step={5} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cautious</span>
                          <span>Optimistic</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Criticism</label>
                          <span className="text-xs text-muted-foreground">{toneCriticism}</span>
                        </div>
                        <Slider value={[toneCriticism]} onValueChange={([v]) => setToneCriticism(v)} min={0} max={100} step={5} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Supportive</span>
                          <span>Critical</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Editorial Notes</label>
                    <textarea
                      value={editorialNotes}
                      onChange={(e) => setEditorialNotes(e.target.value)}
                      placeholder="Add your editorial guidelines, preferences, or context..."
                      className="min-h-[200px] w-full resize-y rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Rewrite Assistant - Below content */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setShowRewritePanel(!showRewritePanel)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Rewrite Assistant
                </CardTitle>
                {showRewritePanel ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {showRewritePanel && (
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Instruction</label>
                      <textarea
                        value={rewriteInstruction}
                        onChange={(e) => setRewriteInstruction(e.target.value)}
                        placeholder="e.g., Make it more concise, add more criticism of the policy, emphasize the economic angle..."
                        className="min-h-[100px] w-full resize-y rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-between">
                            {rewriteModel === 'haiku' ? 'Haiku' : 'Sonnet'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuRadioGroup value={rewriteModel} onValueChange={(v) => setRewriteModel(v as RewriteModel)}>
                            <DropdownMenuRadioItem value="haiku">Haiku (cheaper)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="sonnet">Sonnet (better)</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button onClick={handleRewrite} disabled={isRewriting || !rewriteInstruction.trim() || !content.trim()} className="flex-1">
                        {isRewriting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rewriting...</> : <><Sparkles className="mr-2 h-4 w-4" />Rewrite</>}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Uses your editorial controls to guide the rewrite.</p>
                  </div>

                  {rewriteResult && (
                    <div className="space-y-2 rounded-md border p-3 bg-muted/50">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{rewriteResult.tokens_used.toLocaleString()} tokens</span>
                        <span>~${rewriteResult.estimated_cost.toFixed(4)}</span>
                      </div>
                      <div className="max-h-[150px] overflow-y-auto text-sm whitespace-pre-wrap">
                        {rewriteResult.rewritten.slice(0, 500)}
                        {rewriteResult.rewritten.length > 500 && '...'}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={applyRewrite} className="flex-1">Apply</Button>
                        <Button size="sm" variant="outline" onClick={() => setRewriteResult(null)} className="flex-1">Discard</Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Featured Image - Below content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              <FeaturedImageGenerator
                title={title}
                content={content}
                platform={platform}
                style={imageStyle}
                onSettingsChange={handleImageSettingsChange}
                articleId={id}
                existingImageUrl={article.featured_image_url}
                hidePlatformSelector={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Compact settings only */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between capitalize">
                      {status || 'Select status'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                      <DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="published">Published</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="archived">Archived</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between capitalize">
                      {platform}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuRadioGroup value={platform} onValueChange={(v) => setPlatform(v as ImagePlatform)}>
                      <DropdownMenuRadioItem value="facebook">Facebook</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="linkedin">LinkedIn</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="twitter">Twitter/X</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="instagram">Instagram</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="blog">Blog</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-muted-foreground">Sets content style and image dimensions</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hashtags</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#tag1, #tag2, #tag3"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Separate with commas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Article Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(article.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(article.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Views</span>
                <span>{article.view_count}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auto-suggest image dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent
          className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-labelledby="image-dialog-title"
          aria-describedby="image-dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="image-dialog-title">Generate a Featured Image?</DialogTitle>
            <DialogDescription id="image-dialog-description">
              Your article doesn&apos;t have a featured image yet. Would you like to generate one before saving?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FeaturedImageGenerator
              title={title}
              content={content}
              platform={platform}
              style={imageStyle}
              onSettingsChange={handleImageSettingsChange}
              articleId={id}
              hidePlatformSelector={true}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSkipImage} className="min-h-[44px] w-full sm:w-auto">
              Skip for now
            </Button>
            <Button onClick={() => { setShowImageDialog(false); performSave(); }} className="min-h-[44px] w-full sm:w-auto">
              Save with image settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
