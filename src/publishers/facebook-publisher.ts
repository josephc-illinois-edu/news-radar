// ============================================================================
// Facebook Publisher - Publish articles to Facebook pages/profiles
// ============================================================================

import { Publisher, Article, PublishResult, PlatformSpecificOptions } from '../types/publisher.js';
import { getConfigManager } from '../utils/config-manager.js';

export class FacebookPublisher implements Publisher {
  platform = 'facebook' as const;
  private accessToken?: string;
  private pageId?: string;

  constructor() {}

  /**
   * Initialize publisher with credentials
   */
  private async init(): Promise<void> {
    const config = await getConfigManager();
    const creds = config.getCredentials('facebook');
    if (creds) {
      this.accessToken = creds.accessToken;
      this.pageId = creds.pageId;
    }
  }

  /**
   * Check if Facebook is configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken);
  }

  /**
   * Validate credentials by making a test API call
   */
  async validateCredentials(): Promise<boolean> {
    await this.init();
    if (!this.accessToken) return false;

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me?access_token=${this.accessToken}`
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Publish article to Facebook
   */
  async publish(article: Article, options?: PlatformSpecificOptions): Promise<PublishResult> {
    await this.init();

    if (!this.accessToken) {
      return {
        success: false,
        platform: 'facebook',
        error: 'Facebook not configured. Run: npm run publish config facebook',
      };
    }

    try {
      const targetId = options?.facebookPageId || this.pageId || 'me';
      const message = this.formatArticle(article);

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${targetId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            access_token: this.accessToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: 'facebook',
          error: error.error?.message || 'Failed to publish to Facebook',
        };
      }

      const data = await response.json();
      return {
        success: true,
        platform: 'facebook',
        postId: data.id,
        postUrl: `https://facebook.com/${data.id}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'facebook',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule article for future publishing
   */
  async schedule(article: Article, scheduledFor: Date, options?: PlatformSpecificOptions): Promise<PublishResult> {
    await this.init();

    if (!this.accessToken) {
      return {
        success: false,
        platform: 'facebook',
        error: 'Facebook not configured. Run: npm run publish config facebook',
      };
    }

    // Facebook only supports scheduling on pages, not profiles
    const targetId = options?.facebookPageId || this.pageId;
    if (!targetId || targetId === 'me') {
      return {
        success: false,
        platform: 'facebook',
        error: 'Scheduling is only supported for Facebook pages. Please configure a page ID.',
      };
    }

    try {
      const message = this.formatArticle(article);
      const scheduledTimestamp = Math.floor(scheduledFor.getTime() / 1000);

      // Schedule must be at least 10 minutes in the future
      const now = Math.floor(Date.now() / 1000);
      if (scheduledTimestamp < now + 600) {
        return {
          success: false,
          platform: 'facebook',
          error: 'Scheduled time must be at least 10 minutes in the future',
        };
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${targetId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            published: false,
            scheduled_publish_time: scheduledTimestamp,
            access_token: this.accessToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: 'facebook',
          error: error.error?.message || 'Failed to schedule post on Facebook',
        };
      }

      const data = await response.json();
      return {
        success: true,
        platform: 'facebook',
        postId: data.id,
        scheduledFor,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'facebook',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing Facebook post
   */
  async update(postId: string, article: Article, options?: PlatformSpecificOptions): Promise<PublishResult> {
    await this.init();

    if (!this.accessToken) {
      return {
        success: false,
        platform: 'facebook',
        error: 'Facebook not configured',
      };
    }

    try {
      const message = this.formatArticle(article);

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            access_token: this.accessToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: 'facebook',
          error: error.error?.message || 'Failed to update Facebook post',
        };
      }

      return {
        success: true,
        platform: 'facebook',
        postId,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'facebook',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a Facebook post
   */
  async delete(postId: string): Promise<PublishResult> {
    await this.init();

    if (!this.accessToken) {
      return {
        success: false,
        platform: 'facebook',
        error: 'Facebook not configured',
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?access_token=${this.accessToken}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: 'facebook',
          error: error.error?.message || 'Failed to delete Facebook post',
        };
      }

      return {
        success: true,
        platform: 'facebook',
        postId,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'facebook',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Format article for Facebook (convert markdown to plain text)
   */
  private formatArticle(article: Article): string {
    let content = article.content;

    // Remove markdown formatting
    content = content
      // Remove headers (# ## ###)
      .replace(/^#{1,6}\s+(.+)$/gm, '$1\n')
      // Remove bold/italic (**text** or *text*)
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      // Remove links [text](url) -> text (url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      // Remove horizontal rules
      .replace(/^---$/gm, '')
      // Clean up excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return content;
  }
}
