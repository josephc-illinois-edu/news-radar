'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import {
  useTopicWorkspace,
  useTopicNavigation,
  useTopicToCreate,
  useTopicReadiness,
} from '@/hooks/use-topics';
import type { SuggestedAngle } from '@/types/synthesis';
import type {
  TopicIntelligence,
  TopicHypothesis,
  TopicAnalysis,
  TopicSynthesis,
  ContentOpportunity,
  StakeholderAnalysis,
  TopicPattern,
} from '@/types/topics';
import {
  getTrajectoryLabel,
  getEmergenceCategoryLabel,
  getOpportunityTypeLabel,
} from '@/types/topics';

export default function TopicWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const {
    topic,
    stories,
    intelligence,
    isAnalyzing,
    analysisProgress,
    selectedAngle,
    notes,
    error,
    setTopic,
    analyze,
    selectAngle,
    addNote,
    removeNote,
    reset,
    isReady,
    hasAnalysis,
  } = useTopicWorkspace();

  const { getPendingTopic } = useTopicNavigation();
  const { prepareCreateFromTopic } = useTopicToCreate();
  const readiness = useTopicReadiness(intelligence);

  const [noteInput, setNoteInput] = useState('');
  const [activeTab, setActiveTab] = useState('hypothesis');

  // Load pending topic from navigation
  useEffect(() => {
    const pending = getPendingTopic();
    if (pending) {
      setTopic(pending.topic, pending.stories);
    }
  }, [getPendingTopic, setTopic]);

  // Auto-analyze when topic is set
  useEffect(() => {
    if (isReady && !hasAnalysis && !isAnalyzing) {
      analyze({ depth: 'standard' });
    }
  }, [isReady, hasAnalysis, isAnalyzing, analyze]);

  const handleCreateFromAngle = () => {
    if (intelligence && selectedAngle) {
      prepareCreateFromTopic(intelligence, selectedAngle);
      router.push('/dashboard/create?mode=synthesis');
    }
  };

  const handleAddNote = () => {
    if (noteInput.trim()) {
      addNote(noteInput.trim(), activeTab as 'hypothesis' | 'analysis' | 'synthesis' | 'general');
      setNoteInput('');
    }
  };

  // Loading state - waiting for topic
  if (!topic) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No topic selected. Go to the{' '}
              <Link href="/dashboard/scanner" className="text-primary underline">
                Scanner
              </Link>{' '}
              to analyze a trending topic.
            </p>
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold capitalize">{topic.name}</h1>
            <Badge variant={intelligence ? 'default' : 'secondary'}>
              {intelligence ? 'Analyzed' : 'Pending'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {topic.sourceCount} sources &bull; {topic.frequency} mentions &bull; Score: {topic.trendScore}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            New Topic
          </Button>
          {!isAnalyzing && (
            <Button
              variant="outline"
              onClick={() => analyze({ depth: 'deep' })}
              disabled={!isReady}
            >
              Re-analyze
            </Button>
          )}
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && analysisProgress && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{analysisProgress.currentStep}</span>
                <span>{analysisProgress.progress}%</span>
              </div>
              <Progress value={analysisProgress.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Readiness Score */}
      {intelligence && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{readiness.score}</span>
                  <Badge variant={readiness.score >= 70 ? 'default' : 'secondary'}>
                    {readiness.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{readiness.recommendation}</p>
              </div>
              {selectedAngle && (
                <Button onClick={handleCreateFromAngle}>
                  Create Article
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      {intelligence && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hypothesis">Hypothesis</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="synthesis">Synthesis</TabsTrigger>
            <TabsTrigger value="stories">Stories ({stories.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="hypothesis" className="space-y-4">
            <HypothesisSection hypothesis={intelligence.hypothesis} />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <AnalysisSection analysis={intelligence.analysis} />
          </TabsContent>

          <TabsContent value="synthesis" className="space-y-4">
            <SynthesisSection
              synthesis={intelligence.synthesis}
              selectedAngle={selectedAngle}
              onSelectAngle={selectAngle}
            />
          </TabsContent>

          <TabsContent value="stories" className="space-y-4">
            <StoriesSection stories={stories} />
          </TabsContent>
        </Tabs>
      )}

      {/* Notes Section */}
      {intelligence && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
            <CardDescription>Add notes as you explore the topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note..."
                className="min-h-[60px]"
              />
              <Button onClick={handleAddNote} disabled={!noteInput.trim()}>
                Add
              </Button>
            </div>
            {notes.length > 0 && (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <Badge variant="outline" className="text-xs mb-1">
                        {note.category}
                      </Badge>
                      <p className="text-sm">{note.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNote(note.id)}
                      aria-label="Remove note"
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// === Section Components ===

function HypothesisSection({ hypothesis }: { hypothesis: TopicHypothesis }) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main Hypothesis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Core Hypothesis</CardTitle>
            <Badge variant="secondary">{hypothesis.confidence}% confidence</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{hypothesis.statement}</p>
        </CardContent>
      </Card>

      {/* Emergence Reason */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Why Is This Trending?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge>{getEmergenceCategoryLabel(hypothesis.emergenceReason.category)}</Badge>
          </div>
          <p>{hypothesis.emergenceReason.description}</p>
          {hypothesis.emergenceReason.triggers.length > 0 && (
            <div>
              <span className="text-sm font-medium">Triggers:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {hypothesis.emergenceReason.triggers.map((trigger, i) => (
                  <Badge key={i} variant="outline">{trigger}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trajectory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Predicted Trajectory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <Badge variant={
                hypothesis.trajectory.direction === 'rising' ? 'default' :
                hypothesis.trajectory.direction === 'peaking' ? 'secondary' :
                'outline'
              }>
                {getTrajectoryLabel(hypothesis.trajectory)}
              </Badge>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Momentum</span>
                <span>{hypothesis.trajectory.momentum > 0 ? '+' : ''}{hypothesis.trajectory.momentum}</span>
              </div>
              <Progress
                value={Math.abs(hypothesis.trajectory.momentum)}
                className="h-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Peak in:</span>{' '}
              <span className="font-medium">{hypothesis.trajectory.predictedPeakHours}h</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sustainability:</span>{' '}
              <span className="font-medium">{hypothesis.trajectory.sustainabilityScore}%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{hypothesis.trajectory.reasoning}</p>
        </CardContent>
      </Card>

      {/* Evidence */}
      {hypothesis.evidence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Supporting Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hypothesis.evidence.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 p-2 bg-muted/50 rounded">
                  <Badge variant="outline" className="text-xs shrink-0">{ev.type}</Badge>
                  <p className="text-sm flex-1">{ev.description}</p>
                  <span className="text-xs text-muted-foreground">{Math.round(ev.weight * 100)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternative Hypotheses */}
      {hypothesis.alternatives.length > 0 && (
        <Collapsible open={showAlternatives} onOpenChange={setShowAlternatives}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <CardTitle className="text-lg flex items-center justify-between">
                  Alternative Hypotheses
                  <span className="text-sm font-normal text-muted-foreground">
                    {showAlternatives ? '−' : '+'}
                  </span>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {hypothesis.alternatives.map((alt, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <p className="font-medium">{alt.statement}</p>
                      <Badge variant="outline">{alt.confidence}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{alt.whyLessLikely}</p>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}

function AnalysisSection({ analysis }: { analysis: TopicAnalysis }) {
  return (
    <div className="space-y-4">
      {/* Patterns */}
      {analysis.patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.patterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stakeholders */}
      {analysis.stakeholders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stakeholders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {analysis.stakeholders.map((stakeholder) => (
                <StakeholderCard key={stakeholder.id} stakeholder={stakeholder} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <Badge variant={
              analysis.sentimentAnalysis.overall === 'positive' ? 'default' :
              analysis.sentimentAnalysis.overall === 'negative' ? 'destructive' :
              'secondary'
            }>
              {analysis.sentimentAnalysis.overall}
            </Badge>
            <Badge variant="outline">{analysis.sentimentAnalysis.trajectory}</Badge>
          </div>
          <div className="flex gap-2 h-4">
            <div
              className="bg-green-500 rounded"
              style={{ width: `${analysis.sentimentAnalysis.distribution.positive}%` }}
              title={`Positive: ${analysis.sentimentAnalysis.distribution.positive}%`}
            />
            <div
              className="bg-gray-400 rounded"
              style={{ width: `${analysis.sentimentAnalysis.distribution.neutral}%` }}
              title={`Neutral: ${analysis.sentimentAnalysis.distribution.neutral}%`}
            />
            <div
              className="bg-red-500 rounded"
              style={{ width: `${analysis.sentimentAnalysis.distribution.negative}%` }}
              title={`Negative: ${analysis.sentimentAnalysis.distribution.negative}%`}
            />
          </div>
          {analysis.sentimentAnalysis.keyDrivers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.sentimentAnalysis.keyDrivers.map((driver, i) => (
                <Badge key={i} variant="outline" className="text-xs">{driver}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Questions */}
      {analysis.keyQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Questions Being Debated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.keyQuestions.map((q, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <p className="font-medium mb-2">{q.question}</p>
                  <div className="space-y-2">
                    {q.positions.map((pos, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Progress value={pos.strength} className="h-2 flex-1" />
                        <span className="text-sm w-24 truncate">{pos.position}</span>
                      </div>
                    ))}
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">{q.resolution}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Gaps */}
      {analysis.coverageGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coverage Gaps</CardTitle>
            <CardDescription>What&apos;s NOT being discussed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.coverageGaps.map((gap, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <span className="font-medium">{gap.topic}</span>
                    <Badge variant={
                      gap.importance === 'high' ? 'default' :
                      gap.importance === 'medium' ? 'secondary' :
                      'outline'
                    } className="text-xs">
                      {gap.importance}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
                  <p className="text-sm text-primary mt-2">Angle: {gap.potentialAngle}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contradictions */}
      {analysis.contradictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contradictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.contradictions.map((c, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{c.topic}</span>
                    <Badge variant={c.significance === 'major' ? 'destructive' : 'outline'} className="text-xs">
                      {c.significance}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {c.positions.map((pos, j) => (
                      <p key={j} className="text-sm">
                        <span className="text-muted-foreground">{pos.sourceId}:</span> {pos.position}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SynthesisSection({
  synthesis,
  selectedAngle,
  onSelectAngle,
}: {
  synthesis: TopicSynthesis;
  selectedAngle: SuggestedAngle | null;
  onSelectAngle: (angle: SuggestedAngle | null) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Writing Angles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suggested Angles</CardTitle>
          <CardDescription>Select an angle to create content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {synthesis.angles.map((angle) => (
              <AngleCard
                key={angle.id}
                angle={angle}
                isSelected={selectedAngle?.id === angle.id}
                onSelect={() => onSelectAngle(selectedAngle?.id === angle.id ? null : angle)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Opportunities */}
      {synthesis.opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {synthesis.opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Hits */}
      {synthesis.quickHits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Hit Ideas</CardTitle>
            <CardDescription>Fast content you can publish now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {synthesis.quickHits.map((hit) => (
                <div key={hit.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{hit.headline}</p>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">{hit.format}</Badge>
                      <Badge variant={
                        hit.urgency === 'now' ? 'destructive' :
                        hit.urgency === 'today' ? 'default' :
                        'secondary'
                      } className="text-xs">
                        {hit.urgency}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{hit.hook}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deep Dives */}
      {synthesis.deepDives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deep Dive Ideas</CardTitle>
            <CardDescription>Long-form content projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {synthesis.deepDives.map((dive) => (
                <div key={dive.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium">{dive.title}</h4>
                    <Badge variant="outline">{dive.estimatedLength}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{dive.thesis}</p>
                  <div className="mt-3">
                    <span className="text-xs font-medium">Outline:</span>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground mt-1">
                      {dive.outline.map((section, i) => (
                        <li key={i}>{section}</li>
                      ))}
                    </ol>
                  </div>
                  {dive.expertSources.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium">Expert sources:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dive.expertSources.map((source, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{source}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StoriesSection({ stories }: { stories: TopicIntelligence['stories'] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Related Stories</CardTitle>
          <CardDescription>{stories.length} stories analyzed for this topic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stories.map((story) => (
              <div key={story.id} className="p-3 border rounded-lg">
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary"
                >
                  {story.title}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{story.sourceName}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Score: {story.score} &bull; {story.commentCount} comments
                  </span>
                </div>
                {story.contentSnippet && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {story.contentSnippet}
                  </p>
                )}
                {story.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {story.keywords.slice(0, 5).map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// === Helper Components ===

function PatternCard({ pattern }: { pattern: TopicPattern }) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-start justify-between">
        <span className="font-medium">{pattern.name}</span>
        <Badge variant={
          pattern.significance === 'high' ? 'default' :
          pattern.significance === 'medium' ? 'secondary' :
          'outline'
        } className="text-xs">
          {pattern.significance}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
      {pattern.examples.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-muted-foreground">Examples:</span>
          <ul className="list-disc list-inside text-xs text-muted-foreground">
            {pattern.examples.slice(0, 2).map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StakeholderCard({ stakeholder }: { stakeholder: StakeholderAnalysis }) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-medium">{stakeholder.name}</span>
          <Badge variant="outline" className="text-xs ml-2">{stakeholder.type}</Badge>
        </div>
        <Badge variant={
          stakeholder.sentiment === 'positive' ? 'default' :
          stakeholder.sentiment === 'negative' ? 'destructive' :
          'secondary'
        } className="text-xs">
          {stakeholder.sentiment}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{stakeholder.position}</p>
      {stakeholder.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {stakeholder.interests.map((interest, i) => (
            <Badge key={i} variant="outline" className="text-xs">{interest}</Badge>
          ))}
        </div>
      )}
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
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{angle.name}</h4>
            <Badge variant={
              angle.riskLevel === 'provocative' ? 'destructive' :
              angle.riskLevel === 'moderate' ? 'default' :
              'secondary'
            } className="text-xs">
              {angle.riskLevel}
            </Badge>
          </div>
          <p className="text-sm font-medium text-primary mt-1">{angle.thesis}</p>
          <p className="text-sm text-muted-foreground mt-1">{angle.description}</p>
        </div>
        <div className="text-right ml-4">
          <div className="text-2xl font-bold">{angle.originalityScore}</div>
          <div className="text-xs text-muted-foreground">originality</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-3">
        <Badge variant="outline" className="text-xs">{angle.suggestedTone}</Badge>
        {angle.targetAudience && (
          <Badge variant="outline" className="text-xs">{angle.targetAudience}</Badge>
        )}
      </div>
      {isSelected && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div>
            <span className="text-xs font-medium">Supporting points:</span>
            <ul className="list-disc list-inside text-xs text-muted-foreground">
              {angle.supportingPoints.slice(0, 3).map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
          {angle.counterpoints.length > 0 && (
            <div>
              <span className="text-xs font-medium">Counterpoints:</span>
              <ul className="list-disc list-inside text-xs text-muted-foreground">
                {angle.counterpoints.slice(0, 2).map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: ContentOpportunity }) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-start justify-between">
        <Badge variant="outline" className="text-xs">
          {getOpportunityTypeLabel(opportunity.type)}
        </Badge>
        <div className="flex gap-1">
          <Badge variant={
            opportunity.difficulty === 'easy' ? 'secondary' :
            opportunity.difficulty === 'medium' ? 'default' :
            'destructive'
          } className="text-xs">
            {opportunity.difficulty}
          </Badge>
        </div>
      </div>
      <h4 className="font-medium mt-2">{opportunity.title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{opportunity.description}</p>
      <div className="flex gap-4 mt-2 text-xs">
        <span>
          <span className="text-muted-foreground">Timeliness:</span>{' '}
          <span className="font-medium">{opportunity.timelinessScore}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Originality:</span>{' '}
          <span className="font-medium">{opportunity.originalityScore}</span>
        </span>
      </div>
    </div>
  );
}
