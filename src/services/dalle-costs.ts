/**
 * DALL-E Cost Tracking Module
 * Tracks and limits DALL-E usage to prevent cost overruns
 */

import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * DALL-E 3 pricing per image (USD)
 */
export const DALLE_COSTS: Record<string, number> = {
  '1024x1024': 0.04,
  '1792x1024': 0.08,
  '1024x1792': 0.08,
};

/**
 * Cost tracking data
 */
export interface CostTracker {
  daily: { date: string; cost: number; count: number };
  monthly: { month: string; cost: number; count: number };
  total: { cost: number; count: number };
}

/**
 * Cost limits configuration
 */
export interface CostLimits {
  dailyLimit: number;
  monthlyLimit: number;
}

/**
 * Get cost limits from environment variables
 * Defaults: $5/day, $50/month
 */
export function getCostLimits(): CostLimits {
  return {
    dailyLimit: parseFloat(process.env.DALLE_DAILY_LIMIT || '5'),
    monthlyLimit: parseFloat(process.env.DALLE_MONTHLY_LIMIT || '50'),
  };
}

/**
 * Get cost tracker file path
 */
function getCostTrackerPath(): string {
  return path.join(process.cwd(), 'data', 'dalle-costs.json');
}

/**
 * Load cost tracker from file
 */
export async function loadCostTracker(): Promise<CostTracker> {
  const trackerPath = getCostTrackerPath();
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  try {
    const data = await fs.readFile(trackerPath, 'utf-8');
    const tracker = JSON.parse(data) as CostTracker;

    // Reset daily if new day
    if (tracker.daily.date !== today) {
      tracker.daily = { date: today, cost: 0, count: 0 };
    }

    // Reset monthly if new month
    if (tracker.monthly.month !== month) {
      tracker.monthly = { month, cost: 0, count: 0 };
    }

    return tracker;
  } catch {
    return {
      daily: { date: today, cost: 0, count: 0 },
      monthly: { month, cost: 0, count: 0 },
      total: { cost: 0, count: 0 },
    };
  }
}

/**
 * Save cost tracker to file
 */
export async function saveCostTracker(tracker: CostTracker): Promise<void> {
  const trackerPath = getCostTrackerPath();
  await fs.mkdir(path.dirname(trackerPath), { recursive: true });
  await fs.writeFile(trackerPath, JSON.stringify(tracker, null, 2));
}

/**
 * Record a DALL-E generation cost
 */
export async function recordCost(size: string): Promise<{ cost: number; tracker: CostTracker }> {
  const cost = DALLE_COSTS[size] || 0.08;
  const tracker = await loadCostTracker();

  tracker.daily.cost += cost;
  tracker.daily.count += 1;
  tracker.monthly.cost += cost;
  tracker.monthly.count += 1;
  tracker.total.cost += cost;
  tracker.total.count += 1;

  await saveCostTracker(tracker);
  return { cost, tracker };
}

/**
 * Check if within cost limits
 */
export async function checkCostLimits(): Promise<{ allowed: boolean; reason?: string; tracker: CostTracker }> {
  const limits = getCostLimits();
  const tracker = await loadCostTracker();

  if (tracker.daily.cost >= limits.dailyLimit) {
    return {
      allowed: false,
      reason: 'Daily limit reached: $' + tracker.daily.cost.toFixed(2) + ' / $' + limits.dailyLimit.toFixed(2),
      tracker,
    };
  }

  if (tracker.monthly.cost >= limits.monthlyLimit) {
    return {
      allowed: false,
      reason: 'Monthly limit reached: $' + tracker.monthly.cost.toFixed(2) + ' / $' + limits.monthlyLimit.toFixed(2),
      tracker,
    };
  }

  return { allowed: true, tracker };
}

/**
 * Get current cost status summary
 */
export async function getCostStatus(): Promise<{
  tracker: CostTracker;
  limits: CostLimits;
  withinLimits: boolean;
  summary: string;
}> {
  const limits = getCostLimits();
  const tracker = await loadCostTracker();
  const withinLimits = tracker.daily.cost < limits.dailyLimit && tracker.monthly.cost < limits.monthlyLimit;

  const summary = [
    'DALL-E Cost Status:',
    '  Today: $' + tracker.daily.cost.toFixed(2) + ' / $' + limits.dailyLimit.toFixed(2) + ' (' + tracker.daily.count + ' images)',
    '  Month: $' + tracker.monthly.cost.toFixed(2) + ' / $' + limits.monthlyLimit.toFixed(2) + ' (' + tracker.monthly.count + ' images)',
    '  Total: $' + tracker.total.cost.toFixed(2) + ' (' + tracker.total.count + ' images)',
  ].join('\n');

  return { tracker, limits, withinLimits, summary };
}
