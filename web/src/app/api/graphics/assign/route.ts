/**
 * Graphics Assign API
 * POST /api/graphics/assign - Assign an existing image to an article
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

interface AssignImageRequest {
  articleId: string;
  imageId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AssignImageRequest = await request.json();

    if (!body.articleId || !body.imageId) {
      return NextResponse.json(
        { error: 'articleId and imageId are required' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured', demoMode: true },
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

    // Get the image record
    const { data: image, error: imageError } = await supabase
      .from('article_images')
      .select('*')
      .eq('id', body.imageId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Unset any existing featured images for this article
    await supabase
      .from('article_images')
      .update({ is_featured: false })
      .eq('article_id', body.articleId);

    // Update the image to be associated with this article and marked as featured
    const { error: updateImageError } = await supabase
      .from('article_images')
      .update({
        article_id: body.articleId,
        is_featured: true,
      })
      .eq('id', body.imageId);

    if (updateImageError) {
      console.error('Error updating image:', updateImageError);
      return NextResponse.json(
        { error: `Failed to update image: ${updateImageError.message}` },
        { status: 500 }
      );
    }

    // Update article with featured image reference
    const { error: articleError } = await supabase
      .from('articles')
      .update({
        featured_image_url: image.public_url,
        featured_image_id: body.imageId,
      })
      .eq('id', body.articleId);

    if (articleError) {
      console.error('Error updating article:', articleError);
      return NextResponse.json(
        { error: `Failed to update article: ${articleError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        publicUrl: image.public_url,
      },
    });
  } catch (error) {
    console.error('Assign image error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign image' },
      { status: 500 }
    );
  }
}
