// ============================================================================
// Config Manager - Secure credential storage and management
// ============================================================================

import fs from 'fs/promises';
import path from 'path';
import { PlatformCredentials, Platform } from '../types/publisher.js';

const CONFIG_FILE = '.publisher-config.json';
const CONFIG_PATH = path.join(process.cwd(), CONFIG_FILE);

export class ConfigManager {
  private credentials: PlatformCredentials = {};

  /**
   * Load credentials from config file or environment variables
   */
  async load(): Promise<void> {
    // Try loading from file first
    try {
      const fileContent = await fs.readFile(CONFIG_PATH, 'utf-8');
      this.credentials = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or is invalid, try environment variables
      this.loadFromEnvironment();
    }
  }

  /**
   * Load credentials from environment variables
   */
  private loadFromEnvironment(): void {
    // Facebook
    if (process.env.FACEBOOK_ACCESS_TOKEN) {
      this.credentials.facebook = {
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
        pageId: process.env.FACEBOOK_PAGE_ID,
      };
    }

    // LinkedIn
    if (process.env.LINKEDIN_ACCESS_TOKEN) {
      this.credentials.linkedin = {
        accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
        authorUrn: process.env.LINKEDIN_AUTHOR_URN,
      };
    }

    // Medium
    if (process.env.MEDIUM_INTEGRATION_TOKEN) {
      this.credentials.medium = {
        integrationToken: process.env.MEDIUM_INTEGRATION_TOKEN,
        authorId: process.env.MEDIUM_AUTHOR_ID,
      };
    }

    // WordPress
    if (process.env.WORDPRESS_SITE_URL && process.env.WORDPRESS_USERNAME && process.env.WORDPRESS_APP_PASSWORD) {
      this.credentials.wordpress = {
        siteUrl: process.env.WORDPRESS_SITE_URL,
        username: process.env.WORDPRESS_USERNAME,
        applicationPassword: process.env.WORDPRESS_APP_PASSWORD,
      };
    }
  }

  /**
   * Save credentials to config file
   */
  async save(): Promise<void> {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(this.credentials, null, 2), 'utf-8');
  }

  /**
   * Get credentials for a specific platform
   */
  getCredentials(platform: Platform): any {
    return this.credentials[platform];
  }

  /**
   * Set credentials for a specific platform
   */
  setCredentials(platform: Platform, credentials: any): void {
    this.credentials[platform] = credentials;
  }

  /**
   * Check if platform is configured
   */
  isConfigured(platform: Platform): boolean {
    const creds = this.credentials[platform];
    if (!creds) return false;

    // Platform-specific validation
    switch (platform) {
      case 'facebook':
        return !!(creds as any).accessToken;
      case 'linkedin':
        return !!(creds as any).accessToken;
      case 'medium':
        return !!(creds as any).integrationToken;
      case 'wordpress':
        return !!(creds as any).siteUrl && !!(creds as any).username && !!(creds as any).applicationPassword;
      default:
        return false;
    }
  }

  /**
   * Get all configured platforms
   */
  getConfiguredPlatforms(): Platform[] {
    const platforms: Platform[] = ['facebook', 'linkedin', 'medium', 'wordpress'];
    return platforms.filter(platform => this.isConfigured(platform));
  }

  /**
   * Remove credentials for a platform
   */
  removeCredentials(platform: Platform): void {
    delete this.credentials[platform];
  }

  /**
   * Get all credentials (for display purposes, tokens masked)
   */
  getAllCredentials(masked: boolean = true): PlatformCredentials {
    if (!masked) return this.credentials;

    const maskedCreds: PlatformCredentials = {};

    if (this.credentials.facebook) {
      maskedCreds.facebook = {
        accessToken: this.maskToken(this.credentials.facebook.accessToken),
        pageId: this.credentials.facebook.pageId,
      };
    }

    if (this.credentials.linkedin) {
      maskedCreds.linkedin = {
        accessToken: this.maskToken(this.credentials.linkedin.accessToken),
        authorUrn: this.credentials.linkedin.authorUrn,
      };
    }

    if (this.credentials.medium) {
      maskedCreds.medium = {
        integrationToken: this.maskToken(this.credentials.medium.integrationToken),
        authorId: this.credentials.medium.authorId,
      };
    }

    if (this.credentials.wordpress) {
      maskedCreds.wordpress = {
        siteUrl: this.credentials.wordpress.siteUrl,
        username: this.credentials.wordpress.username,
        applicationPassword: this.maskToken(this.credentials.wordpress.applicationPassword),
      };
    }

    return maskedCreds;
  }

  /**
   * Mask sensitive tokens for display
   */
  private maskToken(token: string): string {
    if (token.length <= 8) return '********';
    return token.slice(0, 4) + '...' + token.slice(-4);
  }
}

// Singleton instance
let configManagerInstance: ConfigManager | null = null;

export async function getConfigManager(): Promise<ConfigManager> {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
    await configManagerInstance.load();
  }
  return configManagerInstance;
}
