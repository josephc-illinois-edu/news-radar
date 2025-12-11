/**
 * Topic Intelligence Pipeline Types
 *
 * Enables hypothesis, analysis, and synthesis for emerging topics.
 * Builds on scanner.ts (TrendingTopic) and synthesis.ts (SuggestedAngle).
 */

import type { TrendingTopic, TrendingScore } from './scanner';
import type { StoryResult } from './research';
import type { SuggestedAngle, ThemeAnalysis, PerspectiveAnalysis, FactSummary, Contradiction } from './synthesis';

// === Topic Intelligence Core ===

/**
 * Extended topic with full intelligence analysis
 */
export interface TopicIntelligence {
  id: string;
  topic: TrendingTopic;
  stories: StoryResult[];
  hypothesis: TopicHypothesis;
  analysis: TopicAnalysis;
  synthesis: TopicSynthesis;
  timeline: TopicTimeline;
  createdAt: string;
  updatedAt: string;
}

// === Hypothesis Phase ===

/**
 * AI-generated hypothesis about why a topic is emerging
 */
export interface TopicHypothesis {
  id: string;
  topicId: string;

  /** Core hypothesis statement */
  statement: string;

  /** Why is this topic trending now? */
  emergenceReason: EmergenceReason;

  /** Predicted trajectory */
  trajectory: TopicTrajectory;

  /** Confidence in this hypothesis */
  confidence: number; // 0-100

  /** Supporting evidence from the stories */
  evidence: HypothesisEvidence[];

  /** Alternative hypotheses considered */
  alternatives: AlternativeHypothesis[];

  createdAt: string;
}

export interface EmergenceReason {
  category: EmergenceCategory;
  description: string;
  triggers: string[];
  relatedEvents?: string[];
}

export type EmergenceCategory =
  | 'breaking_news'      // Something just happened
  | 'controversy'        // Debate or disagreement emerged
  | 'announcement'       // Product launch, policy change, etc.
  | 'trend_shift'        // Gradual change reaching tipping point
  | 'seasonal'           // Recurring topic (holidays, events)
  | 'viral_content'      // Single piece spreading rapidly
  | 'follow_up'          // Development on previous story
  | 'unknown';           // Can't determine clear cause

export interface TopicTrajectory {
  direction: 'rising' | 'peaking' | 'declining' | 'stable';
  momentum: number; // -100 to 100
  predictedPeakHours: number; // Hours until peak (or since peak if declining)
  sustainabilityScore: number; // 0-100, how likely to stay relevant
  reasoning: string;
}

export interface HypothesisEvidence {
  type: 'story' | 'pattern' | 'timing' | 'source_convergence';
  description: string;
  storyIds?: string[];
  weight: number; // 0-1, how much this evidence supports the hypothesis
}

export interface AlternativeHypothesis {
  statement: string;
  confidence: number;
  whyLessLikely: string;
}

// === Analysis Phase ===

/**
 * Deep analysis of topic patterns and stakeholders
 */
export interface TopicAnalysis {
  id: string;
  topicId: string;

  /** Key patterns identified across sources */
  patterns: TopicPattern[];

  /** Stakeholder positions and interests */
  stakeholders: StakeholderAnalysis[];

  /** Sentiment trajectory over time */
  sentimentAnalysis: SentimentAnalysis;

  /** Key questions being debated */
  keyQuestions: DebatedQuestion[];

  /** Facts vs opinions breakdown */
  factOpinionSplit: FactOpinionSplit;

  /** Gaps in coverage - what's NOT being discussed */
  coverageGaps: CoverageGap[];

  /** Reuses synthesis types for consistency */
  themes: ThemeAnalysis[];
  perspectives: PerspectiveAnalysis[];
  contradictions: Contradiction[];

  createdAt: string;
}

export interface TopicPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  sources: string[];
  significance: 'high' | 'medium' | 'low';
  examples: string[];
}

export interface StakeholderAnalysis {
  id: string;
  name: string;
  type: StakeholderType;
  position: string;
  interests: string[];
  influence: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  quotes?: string[];
}

export type StakeholderType =
  | 'company'
  | 'government'
  | 'individual'
  | 'industry'
  | 'community'
  | 'media'
  | 'expert'
  | 'other';

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  trajectory: 'improving' | 'worsening' | 'stable' | 'volatile';
  keyDrivers: string[];
}

export interface DebatedQuestion {
  question: string;
  positions: {
    position: string;
    supporters: string[];
    strength: number; // 0-100
  }[];
  resolution: 'unresolved' | 'emerging_consensus' | 'stalemate';
}

export interface FactOpinionSplit {
  factCount: number;
  opinionCount: number;
  ratio: number; // facts / total
  keyFacts: string[];
  keyOpinions: string[];
}

export interface CoverageGap {
  topic: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
  potentialAngle: string;
}

// === Synthesis Phase ===

/**
 * Content opportunities derived from topic analysis
 */
export interface TopicSynthesis {
  id: string;
  topicId: string;

  /** Reuses SuggestedAngle from synthesis.ts for consistency */
  angles: SuggestedAngle[];

  /** Topic-specific content opportunities */
  opportunities: ContentOpportunity[];

  /** Fact summary (reused from synthesis.ts) */
  factSummary: FactSummary;

  /** Quick-hit content ideas */
  quickHits: QuickHitIdea[];

  /** Long-form content ideas */
  deepDives: DeepDiveIdea[];

  createdAt: string;
}

export interface ContentOpportunity {
  id: string;
  type: ContentOpportunityType;
  title: string;
  description: string;
  uniqueValue: string; // What makes this angle unique
  difficulty: 'easy' | 'medium' | 'hard';
  timelinessScore: number; // 0-100, how time-sensitive
  originalityScore: number; // 0-100
  targetAudience: string;
  requiredResearch: string[];
}

export type ContentOpportunityType =
  | 'explainer'          // Help people understand
  | 'analysis'           // Deep dive into implications
  | 'opinion'            // Take a stance
  | 'roundup'            // Aggregate perspectives
  | 'prediction'         // Future implications
  | 'contrarian'         // Challenge consensus
  | 'interview'          // Who to talk to
  | 'data_story'         // Statistics-driven
  | 'timeline'           // Historical context
  | 'comparison';        // Compare to similar events

export interface QuickHitIdea {
  id: string;
  headline: string;
  hook: string;
  format: 'social_post' | 'short_article' | 'newsletter_item' | 'video_script';
  urgency: 'now' | 'today' | 'this_week';
}

export interface DeepDiveIdea {
  id: string;
  title: string;
  thesis: string;
  outline: string[];
  estimatedLength: 'medium' | 'long' | 'series';
  researchNeeded: string[];
  expertSources: string[];
}

// === Timeline ===

export interface TopicTimeline {
  events: TimelineEvent[];
  firstMention: string;
  peakActivity: string;
  currentPhase: 'emerging' | 'growing' | 'peak' | 'declining' | 'stable';
}

export interface TimelineEvent {
  timestamp: string;
  type: 'story_published' | 'spike' | 'source_joined' | 'sentiment_shift';
  description: string;
  storyIds?: string[];
  significance: 'high' | 'medium' | 'low';
}

// === API Request/Response Types ===

export interface AnalyzeTopicRequest {
  topic: TrendingTopic;
  stories: StoryResult[];
  options?: AnalyzeTopicOptions;
}

export interface AnalyzeTopicOptions {
  depth: 'quick' | 'standard' | 'deep';
  focusAreas?: ('hypothesis' | 'analysis' | 'synthesis')[];
  maxAngles?: number;
  includeTimeline?: boolean;
  targetAudience?: string;
}

export interface AnalyzeTopicResponse {
  success: boolean;
  data?: TopicIntelligence;
  error?: string;
  processingTime?: number;
}

// For streaming/progressive loading
export interface TopicAnalysisProgress {
  phase: 'hypothesis' | 'analysis' | 'synthesis' | 'complete';
  progress: number; // 0-100
  currentStep: string;
  partialResult?: Partial<TopicIntelligence>;
}

// === Workspace State ===

export interface TopicWorkspaceState {
  topic: TrendingTopic | null;
  stories: StoryResult[];
  intelligence: TopicIntelligence | null;
  isAnalyzing: boolean;
  analysisProgress: TopicAnalysisProgress | null;
  selectedAngle: SuggestedAngle | null;
  notes: TopicNote[];
  error: string | null;
}

export interface TopicNote {
  id: string;
  topicId: string;
  content: string;
  category: 'hypothesis' | 'analysis' | 'synthesis' | 'general';
  linkedStoryIds?: string[];
  createdAt: string;
}

// === Utility Functions ===

export function getTrajectoryLabel(trajectory: TopicTrajectory): string {
  const labels: Record<TopicTrajectory['direction'], string> = {
    rising: 'Gaining Momentum',
    peaking: 'At Peak Interest',
    declining: 'Winding Down',
    stable: 'Steady Interest',
  };
  return labels[trajectory.direction];
}

export function getEmergenceCategoryLabel(category: EmergenceCategory): string {
  const labels: Record<EmergenceCategory, string> = {
    breaking_news: 'Breaking News',
    controversy: 'Emerging Controversy',
    announcement: 'Major Announcement',
    trend_shift: 'Trend Shift',
    seasonal: 'Seasonal Topic',
    viral_content: 'Viral Content',
    follow_up: 'Story Development',
    unknown: 'Emerging Topic',
  };
  return labels[category];
}

export function getOpportunityTypeLabel(type: ContentOpportunityType): string {
  const labels: Record<ContentOpportunityType, string> = {
    explainer: 'Explainer',
    analysis: 'Deep Analysis',
    opinion: 'Opinion Piece',
    roundup: 'Perspective Roundup',
    prediction: 'Future Outlook',
    contrarian: 'Contrarian Take',
    interview: 'Interview Angle',
    data_story: 'Data Story',
    timeline: 'Timeline/Context',
    comparison: 'Comparison Piece',
  };
  return labels[type];
}

export function calculateTopicReadiness(intelligence: TopicIntelligence): {
  score: number;
  label: string;
  recommendation: string;
} {
  const { hypothesis, analysis, synthesis } = intelligence;

  // Weight: hypothesis confidence, analysis depth, synthesis originality
  const hypothesisScore = hypothesis.confidence;
  const analysisScore = Math.min(100, analysis.patterns.length * 20 + analysis.stakeholders.length * 15);
  const synthesisScore = synthesis.angles.length > 0
    ? synthesis.angles.reduce((sum, a) => sum + a.originalityScore, 0) / synthesis.angles.length
    : 0;

  const score = Math.round(hypothesisScore * 0.3 + analysisScore * 0.3 + synthesisScore * 0.4);

  let label: string;
  let recommendation: string;

  if (score >= 80) {
    label = 'Ready to Write';
    recommendation = 'Strong analysis complete. Pick an angle and start creating.';
  } else if (score >= 60) {
    label = 'Good Foundation';
    recommendation = 'Solid understanding. Consider deeper research on specific angles.';
  } else if (score >= 40) {
    label = 'Needs More Research';
    recommendation = 'Basic understanding. Gather more sources before writing.';
  } else {
    label = 'Early Stage';
    recommendation = 'Topic is still developing. Monitor for more coverage.';
  }

  return { score, label, recommendation };
}
