/**
 * Sources API
 * GET /api/sources - List all sources
 * POST /api/sources - Create a custom source
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { NewsSource, CreateSourceRequest, DEFAULT_SOURCES } from '@/types/sources';
import { DEFAULT_SOURCES as FALLBACK_SOURCES } from '@/types/sources';

// GET - List all sources
export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Return demo data
      const system = FALLBACK_SOURCES.filter(s => s.is_system);
      const custom = FALLBACK_SOURCES.filter(s => !s.is_system);
      return NextResponse.json({
        sources: FALLBACK_SOURCES,
        system,
        custom,
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({
        sources: FALLBACK_SOURCES,
        system: FALLBACK_SOURCES.filter(s => s.is_system),
        custom: [],
      });
    }

    const { data: sources, error } = await supabase
      .from('news_sources')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name');

    if (error) {
      console.error('Failed to fetch sources:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sources' },
        { status: 500 }
      );
    }

    const system = sources.filter((s: NewsSource) => s.is_system);
    const custom = sources.filter((s: NewsSource) => !s.is_system);

    return NextResponse.json({
      sources,
      system,
      custom,
    });
  } catch (error) {
    console.error('Sources GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

// POST - Create a custom source
export async function POST(request: NextRequest) {
  try {
    const body: CreateSourceRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.category || !body.source_type || !body.config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, source_type, config' },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      // Return mock created source for demo mode
      const mockSource: NewsSource = {
        id: `demo-${Date.now()}`,
        slug,
        name: body.name,
        icon: body.icon || null,
        category: body.category,
        source_type: body.source_type,
        config: body.config,
        is_system: false,
        is_enabled: true,
        last_scanned_at: null,
        last_error: null,
        error_count: 0,
        stories_found: 0,
        avg_engagement: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json({ source: mockSource }, { status: 201 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    const { data: source, error } = await supabase
      .from('news_sources')
      .insert({
        slug,
        name: body.name,
        icon: body.icon || null,
        category: body.category,
        source_type: body.source_type,
        config: body.config,
        is_system: false, // Custom sources are never system
        is_enabled: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create source:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A source with this slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create source' },
        { status: 500 }
      );
    }

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error('Sources POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create source' },
      { status: 500 }
    );
  }
}
