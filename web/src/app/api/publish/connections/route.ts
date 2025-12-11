/**
 * Platform Connections API
 * GET /api/publish/connections - Get user's connected platforms
 * POST /api/publish/connections - Connect a platform
 * DELETE /api/publish/connections - Disconnect a platform
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PlatformConnection, PublishPlatform } from '@/types/publish';

// Check if Substack is configured via environment variables
function isSubstackConfigured(): boolean {
  return !!(
    process.env.SUBSTACK_EMAIL &&
    process.env.SUBSTACK_PASSWORD &&
    process.env.SUBSTACK_PUBLICATION_URL
  );
}

// Get connections - currently only Substack is supported
function getConnections(): PlatformConnection[] {
  const substackConfigured = isSubstackConfigured();
  const substackUrl = process.env.SUBSTACK_PUBLICATION_URL;

  return [
    {
      id: 'conn-substack',
      platform: 'substack',
      name: substackUrl || 'Substack Newsletter',
      username: process.env.SUBSTACK_EMAIL || undefined,
      connected: substackConfigured,
      connectedAt: substackConfigured ? new Date().toISOString() : undefined,
    },
  ];
}

export async function GET() {
  try {
    // Return connections based on env vars - no auth required for this
    // In production with user-specific OAuth connections, you'd check auth here
    // and merge env-based connections with user's OAuth connections from DB

    return NextResponse.json({ data: getConnections() });
  } catch (error) {
    console.error('Fetch connections error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth if Supabase is configured
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { platform, credentials } = await request.json();

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    // In production, this would:
    // 1. Initiate OAuth flow for social platforms
    // 2. Validate API keys for blog platforms
    // 3. Store encrypted credentials in database

    // Demo response
    const connection: PlatformConnection = {
      id: `conn-${Date.now()}`,
      platform: platform as PublishPlatform,
      name: `Connected ${platform}`,
      connected: true,
      connectedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      message: 'Platform connected successfully',
      connection,
    });
  } catch (error) {
    console.error('Connect platform error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth if Supabase is configured
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const connectionId = request.nextUrl.searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    // In production, delete from database
    // await supabase
    //   .from('platform_connections')
    //   .delete()
    //   .eq('id', connectionId)
    //   .eq('user_id', user.id);

    return NextResponse.json({ message: 'Platform disconnected successfully' });
  } catch (error) {
    console.error('Disconnect platform error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Disconnection failed' },
      { status: 500 }
    );
  }
}
