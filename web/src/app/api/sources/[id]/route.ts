/**
 * Sources API - Individual Source Operations
 * GET /api/sources/[id] - Get a single source
 * PATCH /api/sources/[id] - Update a source (enable/disable, config)
 * DELETE /api/sources/[id] - Delete a custom source
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { UpdateSourceRequest, NewsSource } from '@/types/sources';
import { DEFAULT_SOURCES } from '@/types/sources';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single source
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isSupabaseConfigured()) {
      const source = DEFAULT_SOURCES.find(s => s.id === id || s.slug === id);
      if (!source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      return NextResponse.json({ source });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const { data: source, error } = await supabase
      .from('news_sources')
      .select('*')
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (error || !source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Source GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch source' },
      { status: 500 }
    );
  }
}

// PATCH - Update a source
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateSourceRequest = await request.json();

    if (!isSupabaseConfigured()) {
      // Mock update for demo mode
      const source = DEFAULT_SOURCES.find(s => s.id === id || s.slug === id);
      if (!source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      const updatedSource = {
        ...source,
        ...body,
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json({ source: updatedSource });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Build update object (only include fields that were provided)
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.config !== undefined) updateData.config = body.config;
    if (body.is_enabled !== undefined) updateData.is_enabled = body.is_enabled;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: source, error } = await supabase
      .from('news_sources')
      .update(updateData)
      .or(`id.eq.${id},slug.eq.${id}`)
      .select()
      .single();

    if (error) {
      console.error('Failed to update source:', error);
      return NextResponse.json(
        { error: 'Failed to update source' },
        { status: 500 }
      );
    }

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Source PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update source' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a custom source
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isSupabaseConfigured()) {
      const source = DEFAULT_SOURCES.find(s => s.id === id || s.slug === id);
      if (!source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      if (source.is_system) {
        return NextResponse.json(
          { error: 'Cannot delete system sources. Disable it instead.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // First check if it's a system source
    const { data: existing } = await supabase
      .from('news_sources')
      .select('is_system')
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system sources. Disable it instead.' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('news_sources')
      .delete()
      .or(`id.eq.${id},slug.eq.${id}`);

    if (error) {
      console.error('Failed to delete source:', error);
      return NextResponse.json(
        { error: 'Failed to delete source' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Source DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete source' },
      { status: 500 }
    );
  }
}
