/**
 * @fileoverview Plagiarism Checker
 * @description Analyzes text similarity between generated article and source content
 */

/**
 * Plagiarism check result
 */
export interface PlagiarismCheckResult {
  similarityScore: number; // 0-100 percentage
  isOriginal: boolean; // true if similarity < 30%
  matchedPhrases: string[]; // Phrases that appear in both texts
  recommendation: string;
  details: {
    totalPhrases: number;
    matchedPhrases: number;
    uniquePhrases: number;
  };
}

/**
 * Plagiarism Checker class
 */
export class PlagiarismChecker {
  private readonly SIMILARITY_THRESHOLD = 30; // 30% or higher is concerning
  private readonly MIN_PHRASE_LENGTH = 5; // Minimum words in a phrase to check

  /**
   * Check if generated article is original compared to source
   */
  check(generatedArticle: string, sourceContent: string): PlagiarismCheckResult {
    // Clean and normalize texts
    const generatedClean = this.normalizeText(generatedArticle);
    const sourceClean = this.normalizeText(sourceContent);

    // Extract phrases (n-grams)
    const generatedPhrases = this.extractPhrases(generatedClean, this.MIN_PHRASE_LENGTH);
    const sourcePhrases = this.extractPhrases(sourceClean, this.MIN_PHRASE_LENGTH);

    // Find matching phrases
    const matchedPhrases = this.findMatches(generatedPhrases, sourcePhrases);

    // Calculate similarity score
    const similarityScore = generatedPhrases.size > 0
      ? (matchedPhrases.length / generatedPhrases.size) * 100
      : 0;

    // Determine if original
    const isOriginal = similarityScore < this.SIMILARITY_THRESHOLD;

    // Generate recommendation
    const recommendation = this.getRecommendation(similarityScore);

    return {
      similarityScore: Math.round(similarityScore * 10) / 10,
      isOriginal,
      matchedPhrases: matchedPhrases.slice(0, 5), // Top 5 matches
      recommendation,
      details: {
        totalPhrases: generatedPhrases.size,
        matchedPhrases: matchedPhrases.length,
        uniquePhrases: generatedPhrases.size - matchedPhrases.length,
      },
    };
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract phrases (n-grams) from text
   */
  private extractPhrases(text: string, n: number): Set<string> {
    const words = text.split(/\s+/);
    const phrases = new Set<string>();

    // Create n-grams of various lengths (n to n+2)
    for (let len = n; len <= n + 2; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        // Skip phrases that are just common words
        if (!this.isCommonPhrase(phrase)) {
          phrases.add(phrase);
        }
      }
    }

    return phrases;
  }

  /**
   * Check if phrase is too common to be meaningful
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonPatterns = [
      /^(the|a|an|and|or|but|in|on|at|to|for|of|with|by|from)\s/,
      /\s(is|are|was|were|be|been|being|have|has|had|do|does|did)$/,
      /^this is/,
      /^that is/,
      /^it is/,
      /^there is/,
      /^there are/,
    ];

    return commonPatterns.some(pattern => pattern.test(phrase));
  }

  /**
   * Find matching phrases between generated and source
   */
  private findMatches(generatedPhrases: Set<string>, sourcePhrases: Set<string>): string[] {
    const matches: string[] = [];

    for (const phrase of generatedPhrases) {
      if (sourcePhrases.has(phrase)) {
        matches.push(phrase);
      }
    }

    // Sort by length (longer matches are more significant)
    return matches.sort((a, b) => b.split(' ').length - a.split(' ').length);
  }

  /**
   * Get recommendation based on similarity score
   */
  private getRecommendation(score: number): string {
    if (score < 15) {
      return '✅ Excellent! Your article is highly original with minimal similarity to the source.';
    } else if (score < 30) {
      return '✅ Good! Your article is original. Some factual overlap is normal and expected.';
    } else if (score < 50) {
      return '⚠️  Moderate similarity detected. Review the matched phrases and rephrase if needed.';
    } else {
      return '❌ High similarity detected. Significant rewriting recommended to ensure originality.';
    }
  }

  /**
   * Generate a detailed report
   */
  generateReport(result: PlagiarismCheckResult): string {
    const lines = [
      '\n📊 PLAGIARISM CHECK RESULTS',
      '═'.repeat(70),
      `Similarity Score: ${result.similarityScore}% ${result.isOriginal ? '✅' : '⚠️'}`,
      `Status: ${result.isOriginal ? 'ORIGINAL' : 'NEEDS REVIEW'}`,
      '',
      `Total Phrases Analyzed: ${result.details.totalPhrases}`,
      `Unique Phrases: ${result.details.uniquePhrases} (${Math.round((result.details.uniquePhrases / result.details.totalPhrases) * 100)}%)`,
      `Matched Phrases: ${result.details.matchedPhrases} (${Math.round((result.details.matchedPhrases / result.details.totalPhrases) * 100)}%)`,
      '',
      result.recommendation,
    ];

    if (result.matchedPhrases.length > 0) {
      lines.push('');
      lines.push('Top Matched Phrases:');
      result.matchedPhrases.forEach((phrase, i) => {
        lines.push(`  ${i + 1}. "${phrase}"`);
      });
      lines.push('');
      lines.push('Note: Some factual phrases (numbers, names, dates) will naturally match.');
      lines.push('This is expected and acceptable in journalism.');
    }

    lines.push('═'.repeat(70));

    return lines.join('\n');
  }
}

/**
 * Create plagiarism checker instance
 */
export function createPlagiarismChecker(): PlagiarismChecker {
  return new PlagiarismChecker();
}
