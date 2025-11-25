// ============================================================================
// Variation Generator - Generate multiple article variations with different angles
// ============================================================================

export interface VariationAngle {
  id: string;
  name: string;
  description: string;
  focusInstruction: string;
  openingStrategy: string;
  titleStyle: string;
}

/**
 * Predefined angles for article variations
 */
export const VARIATION_ANGLES: VariationAngle[] = [
  {
    id: 'balanced',
    name: 'Balanced Analysis',
    description: 'Objective, well-rounded perspective',
    focusInstruction: 'Take a balanced, analytical approach. Present multiple perspectives fairly. Focus on facts and implications.',
    openingStrategy: 'Start with a clear, informative statement that sets up the story comprehensively.',
    titleStyle: 'Straightforward and descriptive - tell readers exactly what happened.',
  },
  {
    id: 'provocative',
    name: 'Provocative Take',
    description: 'Bold, controversial angle',
    focusInstruction: 'Take a strong stance. Emphasize what\'s controversial or unexpected. Challenge conventional wisdom. Be bold but back it up.',
    openingStrategy: 'Start with a provocative statement or controversial observation that immediately grabs attention.',
    titleStyle: 'Bold and attention-grabbing - make a statement that makes people want to click.',
  },
  {
    id: 'human-interest',
    name: 'Human Interest',
    description: 'Personal, emotional connection',
    focusInstruction: 'Focus on the human element. Emphasize personal stories, emotional impact, and relatable experiences. Make it personal.',
    openingStrategy: 'Start with a human moment, personal anecdote, or relatable scenario that draws readers in emotionally.',
    titleStyle: 'Emotional and relatable - focus on the human element and personal impact.',
  },
  {
    id: 'analytical',
    name: 'Deep Analysis',
    description: 'Data-driven, investigative',
    focusInstruction: 'Dig deeper into the data and context. Connect dots others might miss. Focus on underlying causes and long-term implications.',
    openingStrategy: 'Start with a surprising statistic, data point, or pattern that reveals something deeper.',
    titleStyle: 'Intriguing and analytical - hint at deeper insights readers will discover.',
  },
  {
    id: 'satirical',
    name: 'Satirical Edge',
    description: 'Witty, ironic commentary',
    focusInstruction: 'Use wit and irony to highlight absurdities. Be clever and entertaining while making serious points. Satire with substance.',
    openingStrategy: 'Start with an ironic observation or witty take that immediately establishes the satirical tone.',
    titleStyle: 'Clever and ironic - use wordplay or irony to intrigue readers.',
  },
];

/**
 * Get a specific angle by ID
 */
export function getAngle(angleId: string): VariationAngle | undefined {
  return VARIATION_ANGLES.find(angle => angle.id === angleId);
}

/**
 * Get N random angles for variation generation
 */
export function getRandomAngles(count: number): VariationAngle[] {
  const shuffled = [...VARIATION_ANGLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, VARIATION_ANGLES.length));
}

/**
 * Get all available angles
 */
export function getAllAngles(): VariationAngle[] {
  return VARIATION_ANGLES;
}

/**
 * Build variation-specific prompt instructions
 */
export function buildVariationPrompt(angle: VariationAngle, baseInstructions?: string): string {
  let prompt = `VARIATION ANGLE: ${angle.name}\n\n`;

  prompt += `FOCUS:\n${angle.focusInstruction}\n\n`;
  prompt += `OPENING STRATEGY:\n${angle.openingStrategy}\n\n`;
  prompt += `TITLE STYLE:\n${angle.titleStyle}\n\n`;

  prompt += `IMPORTANT: This is one of multiple variations being generated. Make this version distinctly different from other possible angles. `;
  prompt += `Don't hedge or be generic - commit fully to this particular angle and approach.\n\n`;

  if (baseInstructions) {
    prompt += `BASE INSTRUCTIONS:\n${baseInstructions}\n\n`;
  }

  return prompt;
}

/**
 * Variation metadata for tracking
 */
export interface VariationMetadata {
  variationNumber: number;
  totalVariations: number;
  angleId: string;
  angleName: string;
  timestamp: string;
}

/**
 * Create metadata for a variation
 */
export function createVariationMetadata(
  variationNumber: number,
  totalVariations: number,
  angle: VariationAngle
): VariationMetadata {
  return {
    variationNumber,
    totalVariations,
    angleId: angle.id,
    angleName: angle.name,
    timestamp: new Date().toISOString(),
  };
}
