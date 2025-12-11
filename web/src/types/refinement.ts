/**
 * Types for inline text refinement and preference learning
 */

export type FeedbackType = 'redundant' | 'unclear' | 'tone' | 'wordy' | 'factual' | 'custom';

export interface RefinementSelection {
  text: string;
  start: number;
  end: number;
}

export interface RefinementRequest {
  article_id: string;
  selection: RefinementSelection;
  feedback_type: FeedbackType;
  instruction: string;
  context_before: string;
  context_after: string;
}

export interface RefinementResult {
  refined_text: string;
  tokens_used: number;
  cost: number;
}

export interface DBArticleRefinement {
  id: string;
  article_id: string;
  user_id: string;
  selection_text: string;
  selection_start: number;
  selection_end: number;
  feedback_type: FeedbackType;
  instruction: string;
  before_text: string;
  after_text: string | null;
  applied: boolean;
  model: string;
  tokens_used: number;
  cost: number;
  promoted_to_preference_id: string | null;
  created_at: string;
}

export interface DBUserWritingPreference {
  id: string;
  user_id: string;
  category: 'tone' | 'structure' | 'terminology' | 'style';
  scope: string;
  rule_type: 'avoid' | 'prefer' | 'replace' | 'example';
  content: {
    pattern?: string;
    replacement?: string;
    examples?: Array<{ before: string; after: string }>;
  };
  weight: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Feedback type presets with their instructions
export const FEEDBACK_PRESETS: Record<Exclude<FeedbackType, 'custom'>, { label: string; instruction: string }> = {
  redundant: {
    label: 'Redundant',
    instruction: 'Remove redundant information while preserving the core meaning',
  },
  unclear: {
    label: 'Unclear',
    instruction: 'Clarify this text to be more understandable and direct',
  },
  tone: {
    label: 'Tone',
    instruction: 'Adjust the tone to match the editorial guidelines',
  },
  wordy: {
    label: 'Wordy',
    instruction: 'Make this more concise without losing essential information',
  },
  factual: {
    label: 'Factual',
    instruction: 'Ensure factual accuracy and add specificity where needed',
  },
};

// Create refinement input for API
export interface CreateRefinementInput {
  article_id: string;
  selection_text: string;
  selection_start: number;
  selection_end: number;
  feedback_type: FeedbackType;
  instruction: string;
  before_text: string;
  after_text: string | null;
  applied: boolean;
  model: string;
  tokens_used: number;
  cost: number;
}
