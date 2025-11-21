// ============================================================================
// LinkedIn Publisher - Publish articles to LinkedIn
// ============================================================================

import { Publisher, Article, PublishResult, PlatformSpecificOptions } from '../types/publisher.js';
import { getConfigManager } from '../utils/config-manager.js';

export class LinkedInPublisher implements Publisher {
  platform = 'linkedin' as const;
  private accessToken?: string;
  private authorUrn?: string;

  constructor() {}

  /**
   * Initialize publisher with credentials
   */
  private async init(): Promise<void> {
    const config = await getConfigManager();
    const creds = config.getCredentials('linkedin');
    if (creds) {
      this.accessToken = creds.accessToken;
      this.authorUrn = creds.authorUrn;
    }
  }

  /**
   * Check if LinkedIn is configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.authorUrn);
  }

  /**
   * Validate credentials by making a test API call
   */
  async validateCredentials(): Promise<boolean> {
    await this.init();
    if (!this.accessToken) return false;

    try {
      const response = await fetch(
        'https://api.linkedin.com/v2/me',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Publish article to LinkedIn
   */
  async publish(article: Article, options?: PlatformSpecificOptions): Promise<PublishResult> {
    await this.init();

    if (!this.accessToken || !this.authorUrn) {
      return {
        success: false,
        platform: 'linkedin',
        error: 'LinkedIn not configured. Run: npm run publish config linkedin',
      };
    }

    try {
      const text = this.formatArticle(article);
      const visibility = options?.linkedinVisibility || 'PUBLIC';

      const postData = {
        author: this.authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      };

      const response = await fetch(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify(postData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: 'linkedin',
          error: error.message || 'Failed to publish to LinkedIn',
        };
      }

      const data = await response.json();
      const postId = data.id;

      return {
        success: true,
        platform: 'linkedin',
        postId,
        postUrl: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'linkedin',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule article for future publishing
   * Note: LinkedIn API doesn't support native scheduling, would need third-party service
   */
  async schedule(article: Article, scheduledFor: Date, options?: PlatformSpecificOptions): Promise<PublishResult> {
    return {
      success: false,
      platform: 'linkedin',
      error: 'LinkedIn API does not support native scheduling. Use a third-party tool or publish immediately.',
    };
  }

  /**
   * Update an existing LinkedIn post
   * Note: LinkedIn UGC posts cannot be edited after publishing
   */
  async update(postId: string, article: Article, options?: PlatformSpecificOptions): Promise<PublishResult> {
    return {
      success: false,
      platform: 'linkedin',
      error: 'LinkedIn does not support editing posts after publishing. You must delete and recreate.',
    };
  }

  /**
   * Delete a LinkedIn post
   */
  async delete(postId: string): Promise<PublishResult> {
    await this.init();

    if (!this.accessToken) {
      return {
        success: false,
        platform: 'linkedin',
        error: 'LinkedIn not configured',
      };
    }

    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(postId)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: 'linkedin',
          error: error.message || 'Failed to delete LinkedIn post',
        };
      }

      return {
        success: true,
        platform: 'linkedin',
        postId,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'linkedin',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Format article for LinkedIn (convert markdown to plain text with some formatting)
   */
  private formatArticle(article: Article): string {
    let content = article.content;

    // LinkedIn supports basic text formatting via Unicode
    content = content
      // Convert headers to bold-ish text
      .replace(/^#{1,6}\s+(.+)$/gm, '\n$1\n')
      // Remove markdown bold/italic markers (LinkedIn doesn't support)
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      // Keep links readable
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
      // Remove horizontal rules
      .replace(/^---$/gm, '')
      // Clean up excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // LinkedIn has a 3000 character limit for posts
    if (content.length > 3000) {
      content = content.substring(0, 2950) + '...\n\n[Content truncated - read full article]';
    }

    return content;
  }
}
