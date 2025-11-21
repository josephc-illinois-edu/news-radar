// ============================================================================
// Publisher Factory - Create platform-specific publishers
// ============================================================================

import { Publisher, Platform } from '../types/publisher.js';
import { FacebookPublisher } from './facebook-publisher.js';
import { LinkedInPublisher } from './linkedin-publisher.js';

export class PublisherFactory {
  static create(platform: Platform): Publisher {
    switch (platform) {
      case 'facebook':
        return new FacebookPublisher();
      case 'linkedin':
        return new LinkedInPublisher();
      case 'medium':
        throw new Error('Medium publisher not yet implemented');
      case 'wordpress':
        throw new Error('WordPress publisher not yet implemented');
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  static createAll(platforms: Platform[]): Publisher[] {
    return platforms.map(platform => this.create(platform));
  }
}
