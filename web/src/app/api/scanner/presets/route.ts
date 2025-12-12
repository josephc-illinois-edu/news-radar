/**
 * Scanner Presets API
 * GET /api/scanner/presets - List user presets
 * POST /api/scanner/presets - Save a new preset
 * PUT /api/scanner/presets - Update a preset
 * DELETE /api/scanner/presets?id=xxx - Delete a preset
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { ScanPreset, ScanConfig } from '@/types/scanner';

export async function GET() {
  try {
    // Demo mode - presets handled by localStorage
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        presets: [],
        demo: true,
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({
        presets: [],
        demo: true,
      });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({
        presets: [],
        error: 'Not authenticated',
      });
    }

    // Fetch presets
    const { data, error } = await supabase
      .from('scan_presets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching presets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch presets' },
        { status: 500 }
      );
    }

    const presets: ScanPreset[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      config: row.config as ScanConfig,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ presets });
  } catch (error) {
    console.error('Scanner presets GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get presets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, config } = body;

    if (!name || !config) {
      return NextResponse.json(
        { error: 'Name and config are required' },
        { status: 400 }
      );
    }

    // Demo mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        preset: {
          id: `demo-${Date.now()}`,
          name,
          config,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        demo: true,
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({
        preset: {
          id: `demo-${Date.now()}`,
          name,
          config,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        demo: true,
      });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Insert preset
    const { data, error } = await supabase
      .from('scan_presets')
      .insert({
        user_id: user.id,
        name,
        config,
        is_default: body.isDefault || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving preset:', error);
      return NextResponse.json(
        { error: 'Failed to save preset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preset: {
        id: data.id,
        name: data.name,
        config: data.config,
        isDefault: data.is_default,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error('Scanner presets POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save preset' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, config, isDefault } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Preset ID is required' },
        { status: 400 }
      );
    }

    // Demo mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        preset: { id, name, config, isDefault, updatedAt: new Date().toISOString() },
        demo: true,
      });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({
        preset: { id, name, config, isDefault, updatedAt: new Date().toISOString() },
        demo: true,
      });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (config !== undefined) updates.config = config;
    if (isDefault !== undefined) updates.is_default = isDefault;

    // Update preset
    const { data, error } = await supabase
      .from('scan_presets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating preset:', error);
      return NextResponse.json(
        { error: 'Failed to update preset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preset: {
        id: data.id,
        name: data.name,
        config: data.config,
        isDefault: data.is_default,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error('Scanner presets PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update preset' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Preset ID is required' },
        { status: 400 }
      );
    }

    // Demo mode
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, demo: true });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: true, demo: true });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Delete preset
    const { error } = await supabase
      .from('scan_presets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting preset:', error);
      return NextResponse.json(
        { error: 'Failed to delete preset' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scanner presets DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete preset' },
      { status: 500 }
    );
  }
}
