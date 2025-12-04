/**
 * Health Check API
 * GET /api/health - Returns server health status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    server: boolean;
    database: boolean;
    storage?: boolean;
  };
  details?: Record<string, unknown>;
}

const startTime = Date.now();

export async function GET() {
  const checks = {
    server: true,
    database: false,
    storage: false,
  };
  
  const details: Record<string, unknown> = {};

  // Check Supabase connection
  try {
    const supabase = await createClient();
    if (supabase) {
      // Quick query to verify DB connection
      const { error } = await supabase
        .from('articles')
        .select('id')
        .limit(1);
      
      checks.database = !error;
      if (error) {
        details.databaseError = error.message;
      }

      // Check storage bucket exists
      const { error: storageError } = await supabase.storage
        .from('article-images')
        .list('', { limit: 1 });
      
      checks.storage = !storageError;
      if (storageError) {
        details.storageError = storageError.message;
      }
    } else {
      // Demo mode - no Supabase configured
      checks.database = true;
      checks.storage = true;
      details.mode = 'demo';
    }
  } catch (error) {
    details.connectionError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Determine overall status
  let status: HealthStatus['status'] = 'healthy';
  if (!checks.database) {
    status = 'unhealthy';
  } else if (!checks.storage) {
    status = 'degraded';
  }

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '0.3.0',
    checks,
    ...(Object.keys(details).length > 0 && { details }),
  };

  const httpStatus = status === 'unhealthy' ? 503 : 200;
  
  return NextResponse.json(response, { status: httpStatus });
}
