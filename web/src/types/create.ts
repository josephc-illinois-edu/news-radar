/**
 * Article creation/generation types
 */

export interface VoiceProfile {
  name: string;
  description: string;
  created_at: string;
  formality_score: number;
  uses_contractions: boolean;
  uses_first_person: boolean;
  stats: {
    avg_sentence_length: number;
    reading_level: string;
  };
}

export interface ToneSettings {
  humor: number;
  urgency: number;
  optimism: number;
  criticism: number;
}

export interface GenerationOptions {
  urls: string[];
  platform: 'facebook' | 'linkedin' | 'newsletter' | 'blog';
  length: 'tweet' | 'short' | 'medium' | 'long';
  style: 'conversational' | 'academic';
  tone: ToneSettings;
  voiceProfile?: string;
  variations: number;
  preview?: boolean;
}

export interface GeneratedArticle {
  title: string;
  content: string;
  wordCount: number;
  readingTimeMinutes: number;
  suggestedHashtags: string[];
  citations: string[];
  angle?: string;
}

export interface GenerationResult {
  articles: GeneratedArticle[];
  costEstimate?: {
    inputTokens: number;
    outputTokens: number;
    estimatedCost: string;
  };
  sources: Array<{
    url: string;
    title: string;
    facts: string[];
    quotes: string[];
  }>;
}

export const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', description: 'Casual, engaging posts' },
  { id: 'linkedin', name: 'LinkedIn', description: 'Professional, insightful' },
  { id: 'newsletter', name: 'Newsletter', description: 'In-depth analysis' },
  { id: 'blog', name: 'Blog', description: 'SEO-optimized content' },
] as const;

export const LENGTHS = [
  { id: 'tweet', name: 'Tweet', words: '50-100', description: 'Quick take' },
  { id: 'short', name: 'Short', words: '200-400', description: 'Brief post' },
  { id: 'medium', name: 'Medium', words: '600-900', description: 'Standard article' },
  { id: 'long', name: 'Long', words: '1200+', description: 'Deep dive' },
] as const;

export const STYLES = [
  { id: 'conversational', name: 'Conversational', description: 'Friendly, casual tone' },
  { id: 'academic', name: 'Academic', description: 'Formal, research-focused' },
] as const;

export const ANGLES = [
  { id: 'balanced', name: 'Balanced', description: 'Neutral perspective' },
  { id: 'provocative', name: 'Provocative', description: 'Bold, attention-grabbing' },
  { id: 'human-interest', name: 'Human Interest', description: 'Personal stories' },
  { id: 'analysis', name: 'Deep Analysis', description: 'Thorough breakdown' },
  { id: 'satirical', name: 'Satirical', description: 'Humorous take' },
] as const;
