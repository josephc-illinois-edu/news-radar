'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CostTracker {
  daily: { date: string; cost: number; count: number };
  monthly: { month: string; cost: number; count: number };
  total: { cost: number; count: number };
}

interface CostLimits {
  dailyLimit: number;
  monthlyLimit: number;
}

interface CostStatus {
  tracker: CostTracker;
  limits: CostLimits;
  withinLimits: boolean;
  dailyRemaining: number;
  monthlyRemaining: number;
  nextImageCost: number;
  warnings: string[];
  dalleAvailable: boolean;
}

interface DalleCostStatusProps {
  /** Compact mode shows only essential info */
  compact?: boolean;
  /** Callback when DALL-E is unavailable or over limit */
  onLimitReached?: () => void;
  /** Class name for the container */
  className?: string;
}

export function DalleCostStatus({ compact = false, onLimitReached, className = '' }: DalleCostStatusProps) {
  const [status, setStatus] = useState<CostStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCostStatus();
  }, []);

  useEffect(() => {
    if (status && !status.withinLimits && onLimitReached) {
      onLimitReached();
    }
  }, [status, onLimitReached]);

  async function fetchCostStatus() {
    try {
      const response = await fetch('/api/graphics/cost-status');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError('Unable to load cost status');
      console.error('Cost status error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Refresh status after generation
  const refresh = () => fetchCostStatus();

  if (loading) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Loading cost info...
      </div>
    );
  }

  if (error || !status) {
    return null; // Fail silently - don't block the UI
  }

  // Calculate progress percentages
  const dailyPercent = Math.min(100, (status.tracker.daily.cost / status.limits.dailyLimit) * 100);
  const monthlyPercent = Math.min(100, (status.tracker.monthly.cost / status.limits.monthlyLimit) * 100);

  // Determine status color
  const getStatusColor = (percent: number) => {
    if (percent >= 100) return 'bg-destructive';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-primary';
  };

  if (compact) {
    // Compact mode: just warnings and basic info
    return (
      <div className={`space-y-2 ${className}`}>
        {status.warnings.length > 0 && (
          <div className="space-y-1">
            {status.warnings.map((warning, i) => (
              <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ {warning}
              </p>
            ))}
          </div>
        )}
        {status.dalleAvailable && status.withinLimits && (
          <p className="text-xs text-muted-foreground">
            DALL-E: ${status.nextImageCost.toFixed(2)}/image •
            Today: {status.tracker.daily.count} images (${status.tracker.daily.cost.toFixed(2)})
          </p>
        )}
        {!status.dalleAvailable && (
          <p className="text-xs text-muted-foreground">
            Using free Pollinations.ai • Add OPENAI_API_KEY for DALL-E
          </p>
        )}
      </div>
    );
  }

  // Full mode: detailed card
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Image Generation Costs</CardTitle>
          {status.dalleAvailable ? (
            <Badge variant={status.withinLimits ? 'secondary' : 'destructive'}>
              {status.withinLimits ? 'DALL-E Active' : 'Limit Reached'}
            </Badge>
          ) : (
            <Badge variant="outline">Free Mode</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Warnings */}
        {status.warnings.length > 0 && (
          <div className="space-y-1 p-2 bg-yellow-50 dark:bg-yellow-950 rounded-md border border-yellow-200 dark:border-yellow-800">
            {status.warnings.map((warning, i) => (
              <p key={i} className="text-xs text-yellow-700 dark:text-yellow-300">
                {warning}
              </p>
            ))}
          </div>
        )}

        {status.dalleAvailable && (
          <>
            {/* Daily Usage */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Today</span>
                <span>
                  ${status.tracker.daily.cost.toFixed(2)} / ${status.limits.dailyLimit.toFixed(2)}
                  <span className="text-muted-foreground ml-1">
                    ({status.tracker.daily.count} images)
                  </span>
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getStatusColor(dailyPercent)}`}
                  style={{ width: `${dailyPercent}%` }}
                />
              </div>
            </div>

            {/* Monthly Usage */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">This Month</span>
                <span>
                  ${status.tracker.monthly.cost.toFixed(2)} / ${status.limits.monthlyLimit.toFixed(2)}
                  <span className="text-muted-foreground ml-1">
                    ({status.tracker.monthly.count} images)
                  </span>
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getStatusColor(monthlyPercent)}`}
                  style={{ width: `${monthlyPercent}%` }}
                />
              </div>
            </div>

            {/* Next Image Cost */}
            <div className="flex justify-between text-xs pt-1 border-t">
              <span className="text-muted-foreground">Next DALL-E image</span>
              <span className="font-medium">${status.nextImageCost.toFixed(2)}</span>
            </div>
          </>
        )}

        {!status.dalleAvailable && (
          <p className="text-xs text-muted-foreground">
            Currently using Pollinations.ai (free). Add <code className="bg-muted px-1 rounded">OPENAI_API_KEY</code> to
            your environment to enable DALL-E 3 premium image generation.
          </p>
        )}

        {/* Total Stats */}
        <div className="text-xs text-muted-foreground pt-1 border-t">
          Total: {status.tracker.total.count} images generated (${status.tracker.total.cost.toFixed(2)})
        </div>
      </CardContent>
    </Card>
  );
}
