/**
 * Graphics/Image generation types
 */

export interface ImageGenerationOptions {
  title: string;
  subtitle?: string;
  platform: ImagePlatform;
  style: ImageStyle;
  mode: GenerateMode;
}

export type ImagePlatform = 'facebook' | 'linkedin' | 'twitter' | 'instagram' | 'blog';
export type ImageStyle = 'modern' | 'minimal' | 'bold' | 'gradient' | 'photo';
export type GenerateMode = 'ai' | 'placeholder';

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  platform: ImagePlatform;
  style: ImageStyle;
  prompt?: string;
}

export const PLATFORM_CONFIGS = {
  facebook: { width: 1200, height: 630, name: 'Facebook', ratio: '1.91:1' },
  linkedin: { width: 1200, height: 627, name: 'LinkedIn', ratio: '1.91:1' },
  twitter: { width: 1200, height: 675, name: 'Twitter/X', ratio: '16:9' },
  instagram: { width: 1080, height: 1080, name: 'Instagram', ratio: '1:1' },
  blog: { width: 1200, height: 800, name: 'Blog', ratio: '3:2' },
} as const;

export const IMAGE_STYLES = {
  modern: { name: 'Modern', description: 'Clean, professional design' },
  minimal: { name: 'Minimal', description: 'Simple with white space' },
  bold: { name: 'Bold', description: 'High contrast, eye-catching' },
  gradient: { name: 'Gradient', description: 'Smooth color transitions' },
  photo: { name: 'Photo', description: 'Photorealistic imagery' },
} as const;

export const GENERATE_MODES = {
  ai: { name: 'AI Generated', description: 'Uses Pollinations AI (free)' },
  placeholder: { name: 'Placeholder', description: 'SVG with gradient background' },
} as const;
