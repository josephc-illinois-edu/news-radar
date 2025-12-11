// ============================================================================
// Substack Publisher - Publish articles to Substack via browser automation
// ============================================================================
//
// Substack intentionally does not provide a public API for publishing.
// This publisher uses Puppeteer to automate the browser-based publishing flow.
//
// Required environment variables:
//   SUBSTACK_EMAIL - Your Substack account email
//   SUBSTACK_PASSWORD - Your Substack account password (must enable in settings)
//   SUBSTACK_PUBLICATION_URL - Your publication URL (e.g., yourname.substack.com)
//
// ============================================================================

import puppeteer, { Browser, Page } from 'puppeteer';

// Inline types to avoid cross-directory import issues
interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  source_urls?: string[];
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface PublishResult {
  success: boolean;
  platform: string;
  postId?: string;
  postUrl?: string;
  error?: string;
  scheduledFor?: Date;
}

interface PlatformSpecificOptions {
  substackPublicationUrl?: string;
  substackAudience?: 'everyone' | 'paid' | 'founding';
  substackSendEmail?: boolean;
}

export class SubstackPublisher {
  platform = 'substack' as const;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn = false;

  private get email(): string | undefined {
    return process.env.SUBSTACK_EMAIL;
  }

  private get password(): string | undefined {
    return process.env.SUBSTACK_PASSWORD;
  }

  private get publicationUrl(): string | undefined {
    return process.env.SUBSTACK_PUBLICATION_URL;
  }

  /**
   * Normalize publication URL - strip protocol and trailing slashes
   */
  private normalizePublicationUrl(url: string | undefined): string {
    if (!url) return '';
    return url
      .replace(/^https?:\/\//, '')  // Remove protocol
      .replace(/\/+$/, '');          // Remove trailing slashes
  }

  /**
   * Check if Substack is configured with required credentials
   */
  isConfigured(): boolean {
    return !!(this.email && this.password && this.publicationUrl);
  }

  /**
   * Validate credentials by attempting to log in
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      await this.initBrowser();
      await this.login();
      return this.isLoggedIn;
    } catch (error) {
      console.error('Substack credential validation failed:', error);
      return false;
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Initialize the browser instance
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    this.browser = await puppeteer.launch({
      headless: true, // Set to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.page = await this.browser.newPage();

    // Hide webdriver detection
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Set a realistic user agent matching installed Chrome version
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    );

    // Set viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  /**
   * Close the browser instance
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
    }
  }

  /**
   * Log in to Substack
   */
  private async login(): Promise<void> {
    if (!this.page || this.isLoggedIn) return;

    // Navigate to sign in page
    await this.page.goto('https://substack.com/sign-in', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    // Give page time to render after DOM is ready
    await this.delay(3000);

    // Wait for and click "Sign in with password"
    await this.page.waitForSelector('button, a', { timeout: 10000 });

    // Find and click the password sign-in option
    const passwordSignIn = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const btn = buttons.find(b =>
        b.textContent?.toLowerCase().includes('password') ||
        b.textContent?.toLowerCase().includes('sign in with password')
      );
      if (btn) {
        (btn as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!passwordSignIn) {
      // Try direct navigation to password login
      await this.page.goto('https://substack.com/sign-in?redirect=%2F&for_pub=&with_password=true', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await this.delay(3000);
    }

    // Wait for email input
    await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

    // Enter email
    await this.page.type('input[type="email"], input[name="email"]', this.email!, { delay: 50 });

    // Enter password
    const passwordInput = await this.page.$('input[type="password"], input[name="password"]');
    if (passwordInput) {
      await passwordInput.type(this.password!, { delay: 50 });
    } else {
      // Password field might appear after entering email
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await this.page.type('input[type="password"]', this.password!, { delay: 50 });
    }

    // Click sign in button
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
      this.page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Continue")'),
    ]).catch(async () => {
      // Try finding the submit button differently
      await this.page!.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitBtn = buttons.find(b =>
          b.type === 'submit' ||
          b.textContent?.toLowerCase().includes('sign in') ||
          b.textContent?.toLowerCase().includes('continue')
        );
        if (submitBtn) submitBtn.click();
      });
      await this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
    });
    await this.delay(3000);

    // Verify login succeeded
    const currentUrl = this.page.url();
    this.isLoggedIn = !currentUrl.includes('sign-in') && !currentUrl.includes('login');

    if (!this.isLoggedIn) {
      throw new Error('Failed to log in to Substack. Check credentials.');
    }

    // Small delay to ensure session is established
    await this.delay(1000);
  }

  /**
   * Publish article to Substack
   */
  async publish(article: Article, options?: PlatformSpecificOptions): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        platform: 'substack',
        error: 'Substack not configured. Set SUBSTACK_EMAIL, SUBSTACK_PASSWORD, and SUBSTACK_PUBLICATION_URL environment variables.',
      };
    }

    try {
      await this.initBrowser();
      await this.login();

      if (!this.page) {
        throw new Error('Browser page not initialized');
      }

      // Navigate to the new post editor
      const pubUrl = this.normalizePublicationUrl(options?.substackPublicationUrl || this.publicationUrl);
      const editorUrl = `https://${pubUrl}/publish/post`;

      await this.page.goto(editorUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await this.delay(3000);

      // Wait for editor to load
      await this.delay(2000);

      // Set the title
      const titleSelector = '[data-testid="post-title"], .post-title, [placeholder*="Title"], [contenteditable="true"]:first-of-type';
      await this.page.waitForSelector(titleSelector, { timeout: 10000 });

      // Clear and type title
      await this.page.click(titleSelector);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.type(titleSelector, article.title, { delay: 30 });

      // Tab to body or click on body area
      await this.page.keyboard.press('Tab');
      await this.delay(500);

      // Format content for Substack (convert markdown to HTML-like content)
      const formattedContent = this.formatForSubstack(article.content);

      // Paste content using clipboard API
      await this.page.evaluate((content) => {
        // Try to find the editor body
        const editor = document.querySelector('[data-testid="post-body"], .post-body, [contenteditable="true"]:not(:first-of-type), .ProseMirror');
        if (editor) {
          (editor as HTMLElement).focus();
          // Use execCommand for rich text paste
          document.execCommand('insertHTML', false, content);
        }
      }, formattedContent);

      // Alternative: type content if paste didn't work
      const bodyContent = await this.page.evaluate(() => {
        const editor = document.querySelector('[data-testid="post-body"], .post-body, .ProseMirror');
        return editor?.textContent || '';
      });

      if (!bodyContent || bodyContent.length < 10) {
        // Fallback to keyboard input
        await this.page.keyboard.type(article.content.substring(0, 5000), { delay: 10 });
      }

      await this.delay(1000);

      // Click Continue/Publish button to go to settings
      const continueButton = await this.findAndClickButton(['Continue', 'Next', 'Publish']);
      if (!continueButton) {
        throw new Error('Could not find Continue/Publish button');
      }

      await this.delay(2000);

      // Handle publish settings modal
      // Set audience if specified
      if (options?.substackAudience && options.substackAudience !== 'everyone') {
        await this.page.evaluate((audience) => {
          const labels = Array.from(document.querySelectorAll('label, button, [role="radio"]'));
          const targetLabel = labels.find(l =>
            l.textContent?.toLowerCase().includes(audience.toLowerCase())
          );
          if (targetLabel) (targetLabel as HTMLElement).click();
        }, options.substackAudience);
      }

      // Set email option
      if (options?.substackSendEmail === false) {
        await this.page.evaluate(() => {
          const emailToggle = document.querySelector('[data-testid="send-email-toggle"], input[type="checkbox"]');
          if (emailToggle && (emailToggle as HTMLInputElement).checked) {
            (emailToggle as HTMLElement).click();
          }
        });
      }

      // Final publish click
      const publishButton = await this.findAndClickButton(['Publish now', 'Publish', 'Send']);
      if (!publishButton) {
        throw new Error('Could not find final Publish button');
      }

      // Wait for publish to complete
      await this.delay(3000);

      // Try to get the published URL
      const postUrl = await this.page.evaluate(() => {
        // Check for success message with link
        const link = document.querySelector('a[href*="/p/"]');
        if (link) return (link as HTMLAnchorElement).href;

        // Check current URL if redirected to the post
        if (window.location.href.includes('/p/')) {
          return window.location.href;
        }

        return null;
      });

      return {
        success: true,
        platform: 'substack',
        postUrl: postUrl || `https://${pubUrl}`,
        postId: postUrl?.split('/p/')[1]?.split('?')[0],
      };

    } catch (error) {
      return {
        success: false,
        platform: 'substack',
        error: error instanceof Error ? error.message : 'Unknown error publishing to Substack',
      };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Schedule article for future publishing on Substack
   */
  async schedule(article: Article, scheduledFor: Date, options?: PlatformSpecificOptions): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        platform: 'substack',
        error: 'Substack not configured.',
      };
    }

    try {
      await this.initBrowser();
      await this.login();

      if (!this.page) {
        throw new Error('Browser page not initialized');
      }

      // Navigate to editor
      const pubUrl = this.normalizePublicationUrl(options?.substackPublicationUrl || this.publicationUrl);
      await this.page.goto(`https://${pubUrl}/publish/post`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await this.delay(3000);

      await this.delay(2000);

      // Enter title
      const titleSelector = '[data-testid="post-title"], .post-title, [placeholder*="Title"]';
      await this.page.waitForSelector(titleSelector, { timeout: 10000 });
      await this.page.click(titleSelector);
      await this.page.type(titleSelector, article.title, { delay: 30 });

      // Enter content
      await this.page.keyboard.press('Tab');
      await this.delay(500);

      const formattedContent = this.formatForSubstack(article.content);
      await this.page.evaluate((content) => {
        const editor = document.querySelector('.ProseMirror, [contenteditable="true"]:not(:first-of-type)');
        if (editor) {
          (editor as HTMLElement).focus();
          document.execCommand('insertHTML', false, content);
        }
      }, formattedContent);

      await this.delay(1000);

      // Click Continue
      await this.findAndClickButton(['Continue', 'Next']);
      await this.delay(2000);

      // Look for schedule option
      const scheduleClicked = await this.page.evaluate(() => {
        const scheduleBtn = Array.from(document.querySelectorAll('button, [role="button"]'))
          .find(b => b.textContent?.toLowerCase().includes('schedule'));
        if (scheduleBtn) {
          (scheduleBtn as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (!scheduleClicked) {
        throw new Error('Could not find schedule option');
      }

      await this.delay(1000);

      // Set the date/time (this part is tricky and may need adjustment based on Substack's UI)
      // For now, we'll attempt to find date/time inputs
      const dateStr = scheduledFor.toISOString().split('T')[0];
      const timeStr = scheduledFor.toTimeString().substring(0, 5);

      await this.page.evaluate((date, time) => {
        const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;

        if (dateInput) dateInput.value = date;
        if (timeInput) timeInput.value = time;
      }, dateStr, timeStr);

      // Confirm schedule
      await this.findAndClickButton(['Schedule', 'Confirm']);
      await this.delay(2000);

      return {
        success: true,
        platform: 'substack',
        scheduledFor,
      };

    } catch (error) {
      return {
        success: false,
        platform: 'substack',
        error: error instanceof Error ? error.message : 'Unknown error scheduling on Substack',
      };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Update an existing Substack post
   * @param postUrl - The full URL of the published post (e.g., https://yourname.substack.com/p/post-slug)
   * @param article - The updated article content
   */
  async update(postUrl: string, article: Article, _options?: PlatformSpecificOptions): Promise<PublishResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        platform: 'substack',
        error: 'Substack not configured.',
      };
    }

    if (!postUrl || !postUrl.includes('/p/')) {
      return {
        success: false,
        platform: 'substack',
        error: 'Invalid post URL. Must be a Substack post URL containing /p/',
      };
    }

    try {
      await this.initBrowser();
      await this.login();

      if (!this.page) {
        throw new Error('Browser page not initialized');
      }

      // Extract the post slug from the URL
      const postSlug = postUrl.split('/p/')[1]?.split('?')[0];
      if (!postSlug) {
        throw new Error('Could not extract post slug from URL');
      }

      // Navigate to the edit page for this post
      const pubUrl = this.normalizePublicationUrl(this.publicationUrl);
      const editUrl = `https://${pubUrl}/publish/post/${postSlug}`;

      await this.page.goto(editUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      await this.delay(3000);

      await this.delay(2000);

      // Check if we're on the edit page
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/publish/post/')) {
        // Try alternative edit URL format
        const altEditUrl = `https://${pubUrl}/publish/posts/${postSlug}/edit`;
        await this.page.goto(altEditUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        await this.delay(3000);
        await this.delay(2000);
      }

      // Clear and update the title
      const titleSelector = '[data-testid="post-title"], .post-title, [placeholder*="Title"], [contenteditable="true"]:first-of-type';
      await this.page.waitForSelector(titleSelector, { timeout: 10000 });

      // Select all and replace title
      await this.page.click(titleSelector);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      await this.page.type(titleSelector, article.title, { delay: 30 });

      // Tab to body
      await this.page.keyboard.press('Tab');
      await this.delay(500);

      // Clear and update the body content
      const bodySelector = '[data-testid="post-body"], .post-body, .ProseMirror, [contenteditable="true"]:not(:first-of-type)';
      await this.page.click(bodySelector);
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');

      await this.delay(500);

      // Insert new content
      const formattedContent = this.formatForSubstack(article.content);
      await this.page.evaluate((content) => {
        const editor = document.querySelector('[data-testid="post-body"], .post-body, .ProseMirror');
        if (editor) {
          (editor as HTMLElement).focus();
          document.execCommand('insertHTML', false, content);
        }
      }, formattedContent);

      // Fallback to typing if paste didn't work
      const bodyContent = await this.page.evaluate(() => {
        const editor = document.querySelector('[data-testid="post-body"], .post-body, .ProseMirror');
        return editor?.textContent || '';
      });

      if (!bodyContent || bodyContent.length < 10) {
        await this.page.keyboard.type(article.content.substring(0, 5000), { delay: 10 });
      }

      await this.delay(1000);

      // Click Save/Update button
      const saveClicked = await this.findAndClickButton(['Save', 'Update', 'Save changes', 'Continue']);
      if (!saveClicked) {
        // Try keyboard shortcut Ctrl+S
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('s');
        await this.page.keyboard.up('Control');
      }

      await this.delay(2000);

      // If there's a publish/update confirmation modal, handle it
      await this.findAndClickButton(['Update', 'Save', 'Publish', 'Confirm']);
      await this.delay(2000);

      return {
        success: true,
        platform: 'substack',
        postUrl: postUrl,
        postId: postSlug,
      };

    } catch (error) {
      return {
        success: false,
        platform: 'substack',
        error: error instanceof Error ? error.message : 'Unknown error updating Substack post',
      };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Delete a Substack post (not supported via automation)
   */
  async delete(_postId: string): Promise<PublishResult> {
    return {
      success: false,
      platform: 'substack',
      error: 'Deleting Substack posts via automation is not supported. Please delete directly on Substack.',
    };
  }

  /**
   * Format article content for Substack's editor
   * Substack strips most HTML, so we convert to simple HTML it accepts
   */
  private formatForSubstack(content: string): string {
    let formatted = content;

    // Convert markdown headers to HTML
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Convert bold and italic
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Convert links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Convert bullet lists
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convert numbered lists
    formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Convert blockquotes
    formatted = formatted.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Convert paragraphs (double newlines)
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = `<p>${formatted}</p>`;

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>(<h[1-6]>)/g, '$1');
    formatted = formatted.replace(/(<\/h[1-6]>)<\/p>/g, '$1');

    return formatted;
  }

  /**
   * Find and click a button by text content
   */
  private async findAndClickButton(textOptions: string[]): Promise<boolean> {
    if (!this.page) return false;

    for (const text of textOptions) {
      const clicked = await this.page.evaluate((buttonText) => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a.button'));
        const btn = buttons.find(b =>
          b.textContent?.toLowerCase().includes(buttonText.toLowerCase())
        );
        if (btn) {
          (btn as HTMLElement).click();
          return true;
        }
        return false;
      }, text);

      if (clicked) return true;
    }

    return false;
  }

  /**
   * Helper to add delays (for stability)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
