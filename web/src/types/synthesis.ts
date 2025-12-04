import type { StoryResult } from './research';
import type { GeneratedArticle } from './create';

// === Research Context ===

export interface ResearchContext {
  stories: StoryResult[];
  notes?: string;
  focus?: string;
  analysis?: {
    similarities: string[];
    differences: string[];
    keyThemes: string[];
  };
}

// === Synthesis Results ===

export interface SynthesisResult {
  id: string;
  themes: ThemeAnalysis[];
  perspectives: PerspectiveAnalysis[];
  suggestedAngles: SuggestedAngle[];
  factSummary: FactSummary;
  contradictions?: Contradiction[];
  createdAt: string;
}

export interface ThemeAnalysis {
  name: string;
  description: string;
  frequency: number;
  sources: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
}

export interface PerspectiveAnalysis {
  sourceId: string;
  sourceName: string;
  stance: string;
  keyPoints: string[];
  bias?: 'left' | 'center' | 'right' | 'unknown';
  credibilityIndicators: string[];
}

export interface FactSummary {
  agreedFacts: FactPoint[];
  disputedFacts: FactPoint[];
  uniqueClaims: FactPoint[];
}

export interface FactPoint {
  claim: string;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
  category: 'statistic' | 'quote' | 'event' | 'opinion' | 'prediction';
}

export interface Contradiction {
  topic: string;
  positions: {
    sourceId: string;
    position: string;
  }[];
  significance: 'major' | 'minor';
}

// === Suggested Angles ===

export interface SuggestedAngle {
  id: string;
  name: string;
  thesis: string;
  description: string;
  supportingPoints: string[];
  counterpoints: string[];
  originalityScore: number; // 0-100
  riskLevel: 'safe' | 'moderate' | 'provocative';
  targetAudience?: string;
  suggestedTone: 'informative' | 'analytical' | 'persuasive' | 'entertaining';
}

// === Synthesized Article ===

export interface SynthesizedArticle extends Omit<GeneratedArticle, 'id'> {
  id: string;
  originalityScore: number;
  sourceAttributions: SourceAttribution[];
  factChecks: FactCheck[];
  synthesisMetadata: SynthesisMetadata;
}

export interface SourceAttribution {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  usedFor: 'fact' | 'quote' | 'context' | 'perspective';
  excerpt?: string;
  location: {
    paragraph: number;
    sentence?: number;
  };
}

export interface FactCheck {
  claim: string;
  status: 'verified' | 'unverified' | 'disputed';
  sources: string[];
  note?: string;
}

export interface SynthesisMetadata {
  angleUsed: string;
  sourcesAnalyzed: number;
  generationTime: number;
  originalityBreakdown: {
    structureScore: number;
    analysisScore: number;
    insightScore: number;
  };
}

// === API Request/Response Types ===

export interface SynthesizeRequest {
  context: ResearchContext;
  options?: SynthesizeOptions;
}

export interface SynthesizeOptions {
  maxAngles?: number;
  includeContradictions?: boolean;
  focusTheme?: string;
  targetAudience?: string;
}

export interface SynthesizeResponse {
  success: boolean;
  data?: SynthesisResult;
  error?: string;
}

export interface GenerateFromSynthesisRequest {
  angle: SuggestedAngle;
  context: ResearchContext;
  options?: GenerateFromSynthesisOptions;
}

export interface GenerateFromSynthesisOptions {
  attributionStyle: 'inline' | 'footnotes' | 'endnotes';
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  includeFactChecks?: boolean;
}

export interface GenerateFromSynthesisResponse {
  success: boolean;
  data?: SynthesizedArticle;
  error?: string;
}

// === Utility Functions ===

export function calculateOriginalityScore(
  structureScore: number,
  analysisScore: number,
  insightScore: number
): number {
  // Weighted average: insights matter most
  return Math.round(
    structureScore * 0.2 +
    analysisScore * 0.35 +
    insightScore * 0.45
  );
}

export function getRiskDescription(level: SuggestedAngle['riskLevel']): string {
  switch (level) {
    case 'safe':
      return 'Balanced, fact-focused coverage with minimal controversy';
    case 'moderate':
      return 'Takes a clear position while acknowledging other views';
    case 'provocative':
      return 'Strong opinion piece that may generate debate';
    default:
      return '';
  }
}

export function getToneDescription(tone: SuggestedAngle['suggestedTone']): string {
  switch (tone) {
    case 'informative':
      return 'Clear, educational, fact-driven';
    case 'analytical':
      return 'Deep dive with expert interpretation';
    case 'persuasive':
      return 'Compelling argument with call to action';
    case 'entertaining':
      return 'Engaging narrative with personality';
    default:
      return '';
  }
}
