/**
 * @fileoverview Voice Analyzer - Extract writing style patterns from text
 * @description Analyzes text samples to create voice profiles
 */

/**
 * Voice profile - Extracted patterns from writing samples
 */
export interface VoiceProfile {
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  samples_count: number;
  total_words: number;

  // Structural patterns
  avg_sentence_length: number;
  avg_paragraph_length: number;
  sentence_length_variance: number;

  // Vocabulary patterns
  unique_words_ratio: number;
  common_words: string[];
  rare_words: string[];
  signature_phrases: string[];

  // Tone indicators
  formality_score: number; // 0-10
  humor_indicators: string[];
  emotion_words: string[];

  // Punctuation patterns
  exclamation_frequency: number;
  question_frequency: number;
  ellipsis_frequency: number;
  em_dash_frequency: number;

  // Stylistic markers
  uses_contractions: boolean;
  uses_first_person: boolean;
  uses_second_person: boolean;
  transition_words: string[];

  // Raw statistics
  stats: {
    total_sentences: number;
    total_paragraphs: number;
    avg_word_length: number;
    reading_level: string;
  };
}

/**
 * Analyze text and extract voice profile
 */
export function analyzeText(text: string): Partial<VoiceProfile> {
  const sentences = splitIntoSentences(text);
  const paragraphs = splitIntoParagraphs(text);
  const words = extractWords(text);

  const totalWords = words.length;
  const totalSentences = sentences.length;
  const totalParagraphs = paragraphs.length;

  return {
    total_words: totalWords,
    avg_sentence_length: totalWords / totalSentences,
    avg_paragraph_length: totalSentences / totalParagraphs,
    sentence_length_variance: calculateVariance(sentences.map(s => extractWords(s).length)),
    unique_words_ratio: new Set(words.map(w => w.toLowerCase())).size / totalWords,
    common_words: findCommonWords(words, 20),
    rare_words: findRareWords(words, 20),
    signature_phrases: findSignaturePhrases(text, 10),
    formality_score: calculateFormality(text, words),
    humor_indicators: findHumorIndicators(text),
    emotion_words: findEmotionWords(words),
    exclamation_frequency: (text.match(/!/g) || []).length / totalSentences,
    question_frequency: (text.match(/\?/g) || []).length / totalSentences,
    ellipsis_frequency: (text.match(/\.\.\./g) || []).length / totalSentences,
    em_dash_frequency: (text.match(/—/g) || []).length / totalSentences,
    uses_contractions: /\b\w+'\w+\b/.test(text),
    uses_first_person: /\b(I|me|my|mine|we|us|our|ours)\b/i.test(text),
    uses_second_person: /\b(you|your|yours)\b/i.test(text),
    transition_words: findTransitionWords(text),
    stats: {
      total_sentences: totalSentences,
      total_paragraphs: totalParagraphs,
      avg_word_length: words.reduce((sum, w) => sum + w.length, 0) / totalWords,
      reading_level: calculateReadingLevel(totalWords, totalSentences, countSyllables(text)),
    },
  };
}

/**
 * Merge multiple analyses into a single voice profile
 */
export function mergeAnalyses(analyses: Partial<VoiceProfile>[]): Partial<VoiceProfile> {
  if (analyses.length === 0) {
    throw new Error('No analyses to merge');
  }

  if (analyses.length === 1) {
    return analyses[0];
  }

  // Average numerical values
  const merged: Partial<VoiceProfile> = {
    samples_count: analyses.length,
    total_words: sum(analyses.map(a => a.total_words || 0)),
    avg_sentence_length: average(analyses.map(a => a.avg_sentence_length || 0)),
    avg_paragraph_length: average(analyses.map(a => a.avg_paragraph_length || 0)),
    sentence_length_variance: average(analyses.map(a => a.sentence_length_variance || 0)),
    unique_words_ratio: average(analyses.map(a => a.unique_words_ratio || 0)),
    formality_score: average(analyses.map(a => a.formality_score || 0)),
    exclamation_frequency: average(analyses.map(a => a.exclamation_frequency || 0)),
    question_frequency: average(analyses.map(a => a.question_frequency || 0)),
    ellipsis_frequency: average(analyses.map(a => a.ellipsis_frequency || 0)),
    em_dash_frequency: average(analyses.map(a => a.em_dash_frequency || 0)),
    uses_contractions: analyses.some(a => a.uses_contractions),
    uses_first_person: analyses.some(a => a.uses_first_person),
    uses_second_person: analyses.some(a => a.uses_second_person),
  };

  // Merge word/phrase lists (take most common across all samples)
  const allCommonWords = analyses.flatMap(a => a.common_words || []);
  merged.common_words = findMostCommon(allCommonWords, 20);

  const allSignaturePhrases = analyses.flatMap(a => a.signature_phrases || []);
  merged.signature_phrases = findMostCommon(allSignaturePhrases, 10);

  const allTransitionWords = analyses.flatMap(a => a.transition_words || []);
  merged.transition_words = findMostCommon(allTransitionWords, 15);

  const allHumorIndicators = analyses.flatMap(a => a.humor_indicators || []);
  merged.humor_indicators = findMostCommon(allHumorIndicators, 10);

  const allEmotionWords = analyses.flatMap(a => a.emotion_words || []);
  merged.emotion_words = findMostCommon(allEmotionWords, 15);

  // Merge stats
  merged.stats = {
    total_sentences: sum(analyses.map(a => a.stats?.total_sentences || 0)),
    total_paragraphs: sum(analyses.map(a => a.stats?.total_paragraphs || 0)),
    avg_word_length: average(analyses.map(a => a.stats?.avg_word_length || 0)),
    reading_level: analyses[0].stats?.reading_level || 'Unknown',
  };

  return merged;
}

/**
 * Generate prompt instructions from voice profile
 */
export function generateVoiceInstructions(profile: VoiceProfile): string {
  const instructions: string[] = [];

  // Sentence structure
  instructions.push(
    `Write with an average sentence length of ${Math.round(profile.avg_sentence_length)} words. ` +
    `${profile.sentence_length_variance > 50 ? 'Vary sentence length significantly for rhythm.' : 'Keep sentences relatively consistent in length.'}`
  );

  // Formality
  if (profile.formality_score < 3) {
    instructions.push('Use a very casual, conversational tone.');
  } else if (profile.formality_score < 6) {
    instructions.push('Use a balanced, approachable tone - professional but not stiff.');
  } else {
    instructions.push('Maintain a formal, professional tone.');
  }

  // Contractions
  if (profile.uses_contractions) {
    instructions.push("Use contractions (don't, can't, it's) naturally.");
  }

  // Point of view
  const pov: string[] = [];
  if (profile.uses_first_person) pov.push('first person (I/we)');
  if (profile.uses_second_person) pov.push('second person (you)');
  if (pov.length > 0) {
    instructions.push(`Write in ${pov.join(' and ')}.`);
  }

  // Signature phrases
  if (profile.signature_phrases.length > 0) {
    instructions.push(
      `Use phrases like: "${profile.signature_phrases.slice(0, 5).join('", "')}"`
    );
  }

  // Transition words
  if (profile.transition_words.length > 0) {
    instructions.push(
      `Use these transitions: ${profile.transition_words.slice(0, 5).join(', ')}`
    );
  }

  // Punctuation
  if (profile.exclamation_frequency > 0.1) {
    instructions.push('Use exclamation points for emphasis occasionally.');
  }
  if (profile.question_frequency > 0.15) {
    instructions.push('Ask rhetorical questions to engage readers.');
  }

  // Humor
  if (profile.humor_indicators.length > 2) {
    instructions.push('Include subtle humor and wit where appropriate.');
  }

  // Regional/Cultural (American default)
  instructions.push('IMPORTANT: Write from an American perspective using American English.');
  instructions.push('Use American measurements (pounds, feet, inches, miles) - never use stone, metres, or kilometres.');
  instructions.push('Use American spelling (color not colour, realize not realise, etc).');
  instructions.push('Reference American cultural context and idioms where relevant.');

  // Anti-Pattern Instructions (Combat Formulaic Writing)
  instructions.push('CRITICAL: Avoid formulaic patterns and repetitive structures.');
  instructions.push('BANNED PHRASES: Never use "honestly", "here\'s the thing", "let me walk you through", "let me paint you the picture".');
  instructions.push('OPENING VARIATION: Do NOT start with "You know...", "Somewhere in America...", or scene-setting clichés. Vary your openings: start mid-action, with a quote, a statistic, historical context, or just dive straight in.');
  instructions.push('ENDING VARIATION: Do NOT always end with a provocative question to the reader. Mix it up: end with a fact, a prediction, an anecdote, abruptly, or with silence.');
  instructions.push('SECTION HEADERS: If you use headers, vary the style - mix questions, single words, long descriptive headers, or skip them entirely. Don\'t use the same punchy 2-4 word formula every time.');
  instructions.push('ARGUMENT STRUCTURE: Do NOT follow the same template (hook → personal reaction → context → stats → bigger picture → question). Vary your structure: try chronological, problem-solution, compare-contrast, inverted pyramid, or mystery reveal.');
  instructions.push('Each article should feel architecturally different from the last, even while maintaining the same voice and personality.');

  return instructions.join(' ');
}

// ============================================================================
// Helper Functions
// ============================================================================

function splitIntoSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function calculateVariance(numbers: number[]): number {
  const avg = average(numbers);
  const squaredDiffs = numbers.map(n => Math.pow(n - avg, 2));
  return average(squaredDiffs);
}

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
]);

function findCommonWords(words: string[], limit: number): string[] {
  const frequency = new Map<string, number>();
  words
    .map(w => w.toLowerCase())
    .filter(w => !STOP_WORDS.has(w) && w.length > 3)
    .forEach(w => frequency.set(w, (frequency.get(w) || 0) + 1));

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function findRareWords(words: string[], limit: number): string[] {
  const frequency = new Map<string, number>();
  words
    .map(w => w.toLowerCase())
    .filter(w => !STOP_WORDS.has(w) && w.length > 5)
    .forEach(w => frequency.set(w, (frequency.get(w) || 0) + 1));

  return Array.from(frequency.entries())
    .filter(([_, count]) => count === 1)
    .slice(0, limit)
    .map(([word]) => word);
}

function findSignaturePhrases(text: string, limit: number): string[] {
  const phrases = new Set<string>();
  const sentences = splitIntoSentences(text);

  // Find 2-4 word phrases
  sentences.forEach(sentence => {
    const words = extractWords(sentence);
    for (let len = 2; len <= 4; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.split(' ').every(w => !STOP_WORDS.has(w) || len > 2)) {
          phrases.add(phrase);
        }
      }
    }
  });

  return Array.from(phrases).slice(0, limit);
}

const FORMAL_WORDS = ['moreover', 'furthermore', 'consequently', 'therefore', 'thus', 'hence', 'whereas', 'nevertheless'];
const CASUAL_WORDS = ['yeah', 'kinda', 'sorta', 'gonna', 'wanna', 'basically', 'literally', 'actually'];

function calculateFormality(text: string, words: string[]): number {
  const lowerText = text.toLowerCase();
  const formalCount = FORMAL_WORDS.filter(w => lowerText.includes(w)).length;
  const casualCount = CASUAL_WORDS.filter(w => lowerText.includes(w)).length;

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const hasContractions = /\w+'\w+/.test(text);

  let score = 5; // Start neutral
  score += formalCount * 0.5;
  score -= casualCount * 0.5;
  score += (avgWordLength - 5) * 0.3;
  if (hasContractions) score -= 1;

  return Math.max(0, Math.min(10, score));
}

const HUMOR_INDICATORS = ['lol', 'haha', 'joke', 'funny', 'ironic', 'sarcasm', 'pun', 'wit'];

function findHumorIndicators(text: string): string[] {
  const lowerText = text.toLowerCase();
  return HUMOR_INDICATORS.filter(indicator => lowerText.includes(indicator));
}

const EMOTION_WORDS = ['love', 'hate', 'fear', 'joy', 'anger', 'sad', 'happy', 'excited', 'worried', 'hope'];

function findEmotionWords(words: string[]): string[] {
  const lowerWords = words.map(w => w.toLowerCase());
  return EMOTION_WORDS.filter(emotion => lowerWords.includes(emotion));
}

const TRANSITION_WORDS = [
  'however', 'therefore', 'meanwhile', 'furthermore', 'additionally',
  'consequently', 'nevertheless', 'moreover', 'otherwise', 'similarly',
  'likewise', 'instead', 'still', 'yet', 'besides'
];

function findTransitionWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  return TRANSITION_WORDS.filter(word => lowerText.includes(word));
}

function countSyllables(text: string): number {
  const words = extractWords(text);
  return words.reduce((total, word) => {
    // Simple syllable counting (not perfect but good enough)
    const syllables = word
      .toLowerCase()
      .replace(/[^aeiouy]+/g, ' ')
      .trim()
      .split(/\s+/)
      .length;
    return total + Math.max(1, syllables);
  }, 0);
}

function calculateReadingLevel(words: number, sentences: number, syllables: number): string {
  // Flesch-Kincaid Grade Level
  const grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;

  if (grade < 6) return 'Elementary';
  if (grade < 9) return 'Middle School';
  if (grade < 12) return 'High School';
  if (grade < 16) return 'College';
  return 'Graduate';
}

function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

function average(numbers: number[]): number {
  return numbers.length > 0 ? sum(numbers) / numbers.length : 0;
}

function findMostCommon<T>(items: T[], limit: number): T[] {
  const frequency = new Map<T, number>();
  items.forEach(item => frequency.set(item, (frequency.get(item) || 0) + 1));

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item);
}
