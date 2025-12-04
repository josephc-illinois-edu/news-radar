/**
 * DALL-E Cost Status API
 * Returns current usage and limits for image generation
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';

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

// DALL-E 3 costs
const DALLE_COSTS = {
  '1024x1024': 0.04,
  '1792x1024': 0.08,
  '1024x1792': 0.08,
};

function getCostLimits(): CostLimits {
  return {
    dailyLimit: parseFloat(process.env.DALLE_DAILY_LIMIT || '5'),
    monthlyLimit: parseFloat(process.env.DALLE_MONTHLY_LIMIT || '50'),
  };
}

async function loadCostTracker(): Promise<CostTracker> {
  const trackerPath = path.join(process.cwd(), '..', 'data', 'dalle-costs.json');
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

export async function GET() {
  try {
    const limits = getCostLimits();
    const tracker = await loadCostTracker();
    const dalleAvailable = !!process.env.OPENAI_API_KEY;

    // Calculate remaining budget
    const dailyRemaining = Math.max(0, limits.dailyLimit - tracker.daily.cost);
    const monthlyRemaining = Math.max(0, limits.monthlyLimit - tracker.monthly.cost);

    // Standard image cost (most common size)
    const nextImageCost = DALLE_COSTS['1792x1024'];

    // Check if within limits
    const withinLimits = dailyRemaining >= nextImageCost && monthlyRemaining >= nextImageCost;

    // Generate warnings
    const warnings: string[] = [];

    if (!dalleAvailable) {
      warnings.push('DALL-E not configured. Add OPENAI_API_KEY to enable premium images.');
    } else {
      // Daily warnings
      if (dailyRemaining <= 0) {
        warnings.push(`Daily limit reached ($${limits.dailyLimit.toFixed(2)}). Resets tomorrow.`);
      } else if (dailyRemaining < nextImageCost * 3) {
        warnings.push(`Low daily budget: $${dailyRemaining.toFixed(2)} remaining (~${Math.floor(dailyRemaining / nextImageCost)} images)`);
      }

      // Monthly warnings
      if (monthlyRemaining <= 0) {
        warnings.push(`Monthly limit reached ($${limits.monthlyLimit.toFixed(2)}). Resets next month.`);
      } else if (monthlyRemaining < limits.monthlyLimit * 0.1) {
        warnings.push(`Low monthly budget: $${monthlyRemaining.toFixed(2)} remaining (~${Math.floor(monthlyRemaining / nextImageCost)} images)`);
      }
    }

    const status: CostStatus = {
      tracker,
      limits,
      withinLimits,
      dailyRemaining,
      monthlyRemaining,
      nextImageCost,
      warnings,
      dalleAvailable,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching cost status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost status' },
      { status: 500 }
    );
  }
}
