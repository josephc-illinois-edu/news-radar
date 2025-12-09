/**
 * Graphics Save API
 * POST /api/graphics/save - Save generated image to Supabase
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { GenerateMode, ImagePlatform, ImageStyle } from '@/types/graphics';

interface SaveImageRequest {
  articleId?: string;
  imageUrl: string;
  title: string;
  platform: ImagePlatform;
  style: ImageStyle;
  mode: GenerateMode;
  prompt?: string;
  width: number;
  height: number;
  cost?: number;
  setAsFeatured?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveImageRequest = await request.json();

    if (!body.imageUrl || !body.title) {
      return NextResponse.json(
        { error: 'imageUrl and title are required' },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          message: 'Image persistence requires Supabase. Running in demo mode.',
          demoMode: true
        },
        { status: 200 }
      );
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to create Supabase client' },
        { status: 500 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedTitle = body.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 50);
    const filename = `${sanitizedTitle}-${body.platform}-${timestamp}.png`;
    const storagePath = body.articleId
      ? `articles/${body.articleId}/${filename}`
      : `orphaned/${filename}`;

    let publicUrl: string | null = null;
    let storageError: string | null = null;

    // For data URLs (SVG placeholders), convert directly
    if (body.imageUrl.startsWith('data:')) {
      const base64Data = body.imageUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      const { error } = await supabase.storage
        .from('article-images')
        .upload(storagePath, buffer, {
          contentType: 'image/svg+xml',
          upsert: true,
        });

      if (error) {
        storageError = error.message;
      } else {
        const { data: urlData } = supabase.storage
          .from('article-images')
          .getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      }
    } else {
      // Fetch external image and upload to storage
      try {
        const imageResponse = await fetch(body.imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/png';

        const { error } = await supabase.storage
          .from('article-images')
          .upload(storagePath, imageBuffer, {
            contentType,
            upsert: true,
          });

        if (error) {
          storageError = error.message;
        } else {
          const { data: urlData } = supabase.storage
            .from('article-images')
            .getPublicUrl(storagePath);
          publicUrl = urlData.publicUrl;
        }
      } catch (fetchErr) {
        storageError = fetchErr instanceof Error ? fetchErr.message : 'Failed to fetch image';
      }
    }

    // Don't save to DB if storage upload failed
    if (!publicUrl) {
      return NextResponse.json(
        { error: `Storage upload failed: ${storageError || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Save metadata to article_images table
    const { data: imageRecord, error: dbError } = await supabase
      .from('article_images')
      .insert({
        article_id: body.articleId || null,
        title: body.title,
        filename,
        storage_path: storagePath,
        public_url: publicUrl,
        platform: body.platform,
        style: body.style,
        generation_mode: body.mode,
        prompt: body.prompt,
        width: body.width,
        height: body.height,
        cost: body.cost || 0,
        is_featured: body.setAsFeatured ?? true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error saving image:', dbError);
      return NextResponse.json(
        { error: `Failed to save image metadata: ${dbError.message}` },
        { status: 500 }
      );
    }

    // If setAsFeatured and articleId provided, update the article
    if (body.setAsFeatured && body.articleId && imageRecord) {
      // First, unset any existing featured images for this article
      await supabase
        .from('article_images')
        .update({ is_featured: false })
        .eq('article_id', body.articleId)
        .neq('id', imageRecord.id);

      // Update article with featured image reference
      const { error: articleError } = await supabase
        .from('articles')
        .update({
          featured_image_url: publicUrl,
          featured_image_id: imageRecord.id,
        })
        .eq('id', body.articleId);

      if (articleError) {
        console.error('Error updating article with featured image:', articleError);
      }
    }

    return NextResponse.json({
      success: true,
      image: {
        id: imageRecord.id,
        publicUrl,
        storagePath,
        filename,
      },
      storageError, // Include any storage errors (image still saved to DB)
    });
  } catch (error) {
    console.error('Save image error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save image' },
      { status: 500 }
    );
  }
}

// GET - Fetch images for an article
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ images: [], demoMode: true });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }

  const query = supabase
    .from('article_images')
    .select('*')
    .not('public_url', 'is', null)  // Only return images with valid URLs
    .order('created_at', { ascending: false });

  if (articleId) {
    query.eq('article_id', articleId);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ images: data || [] });
}
