/**
 * Originality Check Types
 * Types for plagiarism detection, template pattern detection, and content quality scoring
 */

// === Pattern Detection ===

export interface PatternFlag {
  type: 'template' | 'repetition' | 'weak-engagement' | 'filler' | 'hedging';
  text: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  location?: {
    start: number;
    end: number;
  };
}

// === Originality Scores ===

export interface OriginalityBreakdown {
  templateScore: number;       // 0-100: How template-free (100 = no templates)
  repetitionScore: number;     // 0-100: Compared to previous articles (100 = unique)
  sourceReliance: number;      // 0-100: Original synthesis vs copying (100 = original)
  discussionPotential: number; // 0-100: Thesis strength, provocative angles
}

export interface OriginalityResult {
  overallScore: number;        // 0-100 weighted average
  breakdown: OriginalityBreakdown;
  flags: PatternFlag[];
  suggestions: string[];
  analysis: {
    thesisStrength: 'weak' | 'moderate' | 'strong';
    evidenceQuality: 'lacking' | 'adequate' | 'strong';
    counterarguments: boolean;
    conclusionType: 'question' | 'implication' | 'call-to-action' | 'summary';
  };
  checkedAt: string;
}

// === API Types ===

export interface CheckOriginalityRequest {
  content: string;
  title?: string;
  articleId?: string;           // For comparison against other articles
  sources?: string[];           // Source URLs to check against
  checkHistory?: boolean;       // Compare against user's previous articles
}

export interface CheckOriginalityResponse {
  result: OriginalityResult;
  source: 'ai' | 'fallback';
  processingTime: number;
}

// === Pattern Rules ===

export const BANNED_PATTERNS: Array<{
  pattern: RegExp;
  type: PatternFlag['type'];
  suggestion: string;
  severity: PatternFlag['severity'];
}> = [
  // Weak reader questions - high severity
  {
    pattern: /what do you think\??/gi,
    type: 'weak-engagement',
    suggestion: 'End with implications or a provocative statement instead of asking readers what they think',
    severity: 'high',
  },
  {
    pattern: /let me know in the comments/gi,
    type: 'weak-engagement',
    suggestion: 'Remove comment solicitation - quality content generates discussion naturally',
    severity: 'high',
  },
  {
    pattern: /share your thoughts/gi,
    type: 'weak-engagement',
    suggestion: 'Replace with a concrete prediction or contrarian take',
    severity: 'high',
  },
  {
    pattern: /what are your thoughts\??/gi,
    type: 'weak-engagement',
    suggestion: 'State your position more forcefully instead of deferring to the reader',
    severity: 'high',
  },
  {
    pattern: /i'd love to hear/gi,
    type: 'weak-engagement',
    suggestion: 'Remove - this weakens your authority as the writer',
    severity: 'medium',
  },

  // Template closings - high severity
  {
    pattern: /in conclusion,?/gi,
    type: 'template',
    suggestion: 'Remove "In conclusion" - just state your conclusion directly',
    severity: 'high',
  },
  {
    pattern: /to sum up,?/gi,
    type: 'template',
    suggestion: 'Remove "To sum up" - redundant if your conclusion is clear',
    severity: 'high',
  },
  {
    pattern: /as we('ve| have) seen,?/gi,
    type: 'template',
    suggestion: 'Remove "As we\'ve seen" - trust your reader\'s comprehension',
    severity: 'medium',
  },
  {
    pattern: /in summary,?/gi,
    type: 'template',
    suggestion: 'Remove "In summary" - your final paragraph should naturally conclude',
    severity: 'medium',
  },

  // Template openings - medium severity
  {
    pattern: /in today's (world|age|society)/gi,
    type: 'template',
    suggestion: 'Start with a specific fact, statistic, or observation instead',
    severity: 'medium',
  },
  {
    pattern: /it's no secret that/gi,
    type: 'template',
    suggestion: 'If it\'s not a secret, just state the fact directly',
    severity: 'medium',
  },
  {
    pattern: /there's no denying/gi,
    type: 'template',
    suggestion: 'Remove hedging - state your claim with confidence',
    severity: 'medium',
  },

  // Filler phrases - medium severity
  {
    pattern: /it's worth noting/gi,
    type: 'filler',
    suggestion: 'Remove "It\'s worth noting" - if it\'s worth noting, just note it',
    severity: 'medium',
  },
  {
    pattern: /it goes without saying/gi,
    type: 'filler',
    suggestion: 'If it goes without saying, don\'t say it',
    severity: 'medium',
  },
  {
    pattern: /needless to say/gi,
    type: 'filler',
    suggestion: 'Remove "Needless to say" - then don\'t say it',
    severity: 'medium',
  },
  {
    pattern: /it should be noted/gi,
    type: 'filler',
    suggestion: 'Just note it directly without preamble',
    severity: 'low',
  },
  {
    pattern: /it is important to note/gi,
    type: 'filler',
    suggestion: 'Remove preamble - just state the important thing',
    severity: 'low',
  },

  // Over-hedging - medium severity
  {
    pattern: /it could be argued/gi,
    type: 'hedging',
    suggestion: 'Either make the argument yourself or cite who argues it',
    severity: 'medium',
  },
  {
    pattern: /some might say/gi,
    type: 'hedging',
    suggestion: 'Be specific about who says this, or take a position yourself',
    severity: 'medium',
  },
  {
    pattern: /one could argue/gi,
    type: 'hedging',
    suggestion: 'Make the argument yourself with conviction',
    severity: 'medium',
  },
  {
    pattern: /many (people |experts |)believe/gi,
    type: 'hedging',
    suggestion: 'Cite specific sources or take your own position',
    severity: 'low',
  },

  // Generic content - low severity
  {
    pattern: /this (article|post) will (explore|discuss|examine)/gi,
    type: 'template',
    suggestion: 'Jump straight into your content - readers know what articles do',
    severity: 'low',
  },
  {
    pattern: /stay tuned/gi,
    type: 'weak-engagement',
    suggestion: 'Remove "stay tuned" - deliver value now, not promises',
    severity: 'low',
  },
];

// === Score Calculation ===

export function calculateOverallScore(breakdown: OriginalityBreakdown): number {
  // Weights: discussion potential matters most, then template-free, then originality
  const weights = {
    discussionPotential: 0.35,
    templateScore: 0.30,
    sourceReliance: 0.20,
    repetitionScore: 0.15,
  };

  return Math.round(
    breakdown.discussionPotential * weights.discussionPotential +
    breakdown.templateScore * weights.templateScore +
    breakdown.sourceReliance * weights.sourceReliance +
    breakdown.repetitionScore * weights.repetitionScore
  );
}

// === Severity Scoring ===

export function calculateTemplatePenalty(flags: PatternFlag[]): number {
  let penalty = 0;
  for (const flag of flags) {
    switch (flag.severity) {
      case 'high':
        penalty += 15;
        break;
      case 'medium':
        penalty += 8;
        break;
      case 'low':
        penalty += 3;
        break;
    }
  }
  return Math.min(penalty, 100); // Cap at 100
}
