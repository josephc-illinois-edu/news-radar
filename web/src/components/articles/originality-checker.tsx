'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  FileText,
  MessageSquare,
} from 'lucide-react';
import type {
  OriginalityResult,
  PatternFlag,
  CheckOriginalityResponse,
} from '@/types/originality';

interface OriginalityCheckerProps {
  content: string;
  title?: string;
  sources?: string[];
  onCheck?: (result: OriginalityResult) => void;
  compact?: boolean;
}

export function OriginalityChecker({
  content,
  title,
  sources,
  onCheck,
  compact = false,
}: OriginalityCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<OriginalityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkOriginality = useCallback(async () => {
    if (!content || content.trim().length < 50) {
      setError('Content must be at least 50 characters');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/articles/check-originality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, sources }),
      });

      const data: CheckOriginalityResponse = await response.json();

      if ('error' in data) {
        setError(data.error as string);
        return;
      }

      setResult(data.result);
      onCheck?.(data.result);
    } catch (err) {
      setError('Failed to check originality');
    } finally {
      setIsChecking(false);
    }
  }, [content, title, sources, onCheck]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Work';
    return 'Poor';
  };

  const getSeverityIcon = (severity: PatternFlag['severity']) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: PatternFlag['type']) => {
    switch (type) {
      case 'template':
        return 'Template';
      case 'weak-engagement':
        return 'Weak Ask';
      case 'filler':
        return 'Filler';
      case 'hedging':
        return 'Hedging';
      case 'repetition':
        return 'Repetitive';
    }
  };

  if (compact && !result) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={checkOriginality}
        disabled={isChecking || content.length < 50}
        className="gap-2"
      >
        {isChecking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Target className="h-4 w-4" />
            Check Originality
          </>
        )}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Originality Check
          </CardTitle>
          {result && (
            <Badge
              variant={result.overallScore >= 70 ? 'default' : 'destructive'}
              className="text-sm"
            >
              {result.overallScore}/100
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Check your content for template patterns, weak engagement asks, and discussion potential.
            </p>
            <Button
              onClick={checkOriginality}
              disabled={isChecking || content.length < 50}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Check Originality
                </>
              )}
            </Button>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                  {result.overallScore}
                </span>
              </div>
              <Progress value={result.overallScore} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{getScoreLabel(result.overallScore)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkOriginality}
                  disabled={isChecking}
                  className="h-6 px-2 text-xs"
                >
                  {isChecking ? 'Checking...' : 'Re-check'}
                </Button>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <ScoreItem
                icon={<FileText className="h-4 w-4" />}
                label="Template-free"
                score={result.breakdown.templateScore}
              />
              <ScoreItem
                icon={<MessageSquare className="h-4 w-4" />}
                label="Discussion"
                score={result.breakdown.discussionPotential}
              />
              <ScoreItem
                icon={<Target className="h-4 w-4" />}
                label="Original"
                score={result.breakdown.sourceReliance}
              />
              <ScoreItem
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Unique"
                score={result.breakdown.repetitionScore}
              />
            </div>

            {/* Analysis Summary */}
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thesis</span>
                <Badge variant="outline" className="capitalize">
                  {result.analysis.thesisStrength}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evidence</span>
                <Badge variant="outline" className="capitalize">
                  {result.analysis.evidenceQuality}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Counterarguments</span>
                <Badge variant={result.analysis.counterarguments ? 'default' : 'secondary'}>
                  {result.analysis.counterarguments ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conclusion</span>
                <Badge
                  variant={result.analysis.conclusionType === 'question' ? 'destructive' : 'outline'}
                  className="capitalize"
                >
                  {result.analysis.conclusionType}
                </Badge>
              </div>
            </div>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Suggestions</h4>
                <ul className="space-y-1">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pattern Flags - Collapsible */}
            {result.flags.length > 0 && (
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-auto py-2">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {result.flags.length} Pattern{result.flags.length !== 1 ? 's' : ''} Detected
                    </span>
                    {showDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {result.flags.map((flag, i) => (
                    <div
                      key={i}
                      className="rounded-md border p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(flag.severity)}
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(flag.type)}
                        </Badge>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {flag.text}
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">
                        {flag.suggestion}
                      </p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Clear Results */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResult(null)}
              className="w-full"
            >
              Clear Results
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Score item component
function ScoreItem({
  icon,
  label,
  score,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
}) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-600 dark:text-green-400';
    if (s >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-semibold ${getColor(score)}`}>{score}</p>
      </div>
    </div>
  );
}
