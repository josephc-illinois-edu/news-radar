# Changelog

All notable changes to News Radar will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-21

### Added
- **Supabase Database Integration** - Complete PostgreSQL database for article management
- **Database Schema** - 7 tables: articles, users, sources, revisions, tags, article_tags, analytics_events
- **Automatic Article Saving** - Articles saved to database by default after generation
- **Article Management Commands**:
  - `npm run articles list` - List all saved articles with filtering
  - `npm run articles view <id>` - View detailed article information
  - `npm run articles publish <id>` - Publish drafts (draft → published workflow)
  - `npm run articles archive <id>` - Archive articles
  - `npm run articles delete <id> --force` - Delete permanently
- **Draft/Published Workflow** - Status management for article lifecycle
- **Revision History** - Automatic version tracking for all articles
- **Source Tracking** - Save source URLs with extracted facts, quotes, and similarity scores
- **Row Level Security (RLS)** - Database policies for data isolation
- **TypeScript Service Layer** - Type-safe database operations with full CRUD support
- **Engagement Tracking** - View counts and analytics events
- **Database Migrations** - SQL migrations for schema versioning

### Changed
- Write command now saves to database by default (use `--no-save` to skip)
- Articles include database ID for future reference
- Enhanced CLI output with database save confirmation

### Technical Details
- Tables: users, articles, article_revisions, sources, tags, article_tags, analytics_events
- Automatic timestamps (created_at, updated_at)
- UUID primary keys for distributed systems
- Indexed queries for performance
- Support for anonymous usage (personal CLI tool)

## [0.1.0] - 2025-11-21

### Added
- **AI-Powered Article Generation** using Anthropic Claude Sonnet 4
- **Multi-Source Analysis** - Combine 1-5 sources for balanced perspective
- **Content Extraction** - Automatic extraction of facts, quotes, and statistics
- **Plagiarism Checking** - Local similarity detection against source material
- **Preview Mode** - Review content and costs before using API credits
- **Voice Customization** - Conversational vs academic writing styles
- **Tone Controls** - Adjust humor, urgency, optimism, criticism (0-10 scales)
- **Multiple Article Lengths** - Tweet, short, medium, long formats
- **Platform Optimization** - Facebook, LinkedIn, Newsletter, Blog formats
- **NewsData.io Integration** - Aggregated news from 1000s of sources
- **Cost Estimation** - Show API costs before generation
- **Source Attribution** - Automatic citations of all sources
- **Guardian RSS Scraper** - BBC News RSS Scraper
- **Reuters RSS Scraper**
- **AP News RSS Scraper**
- **NPR RSS Scraper**
- **TechCrunch RSS Scraper**
- **Lobsters Scraper**

### Changed
- Removed Reddit scraper (API limitations)
- Updated default sources to use NewsData.io and HackerNews
- Enhanced scan command with more source options
- Improved CLI output with better formatting

### Fixed
- Environment variable loading for all commands
- Content fetching error handling
- Multi-URL parsing in write command

## [0.0.1] - 2025-11-20

### Added
- Initial project setup
- HackerNews scraper
- Reddit RSS scraper (later removed)
- Basic CLI interface
- Engagement velocity analysis
- Anomaly detection
- TypeScript strict mode
- Basic README documentation

---

## Upcoming Features

### Planned for 0.2.0 - Database & Storage Layer
- [ ] **Supabase Integration**
  - [ ] Articles database (content, metadata, status)
  - [ ] User authentication and profiles
  - [ ] Analytics tracking (views, engagement)
  - [ ] Source tracking and history
- [ ] **Article Management**
  - [ ] Save generated articles to database
  - [ ] Article revision history and version control
  - [ ] Draft/published status workflow
  - [ ] Tag and category system
- [ ] **Content Generation Enhancements**
  - [ ] Batch article generation (queue multiple stories)
  - [ ] Export to multiple formats (HTML, PDF, JSON)
  - [ ] Custom voice training from sample articles
- [ ] **AI Image Generation**
  - [ ] OpenAI DALL-E or Stable Diffusion integration
  - [ ] Auto-generate social media graphics from articles
  - [ ] Template-based image generation (quotes, stats)

### Planned for 0.3.0 - Next.js Web Dashboard
- [ ] **CMS Interface**
  - [ ] Next.js 14+ with App Router
  - [ ] Visual article editor (WYSIWYG or Markdown)
  - [ ] Drag-and-drop article organization
  - [ ] Content calendar view
- [ ] **Graphics Studio**
  - [ ] Built-in graphics generator interface
  - [ ] Social media image templates
  - [ ] Preview and customize AI-generated images
  - [ ] Export optimized for each platform
- [ ] **Publishing Platform Integrations**
  - [ ] LinkedIn API integration
  - [ ] Medium API integration
  - [ ] WordPress REST API integration
  - [ ] Facebook/Instagram scheduling
- [ ] **Analytics Dashboard**
  - [ ] Article performance tracking
  - [ ] Source effectiveness metrics
  - [ ] Engagement trends visualization
  - [ ] Cost tracking (API usage)

### Planned for 0.4.0 - Advanced Features
- [ ] **Real-time Monitoring**
  - [ ] Live news feed dashboard
  - [ ] WebSocket updates for trending stories
  - [ ] Custom alert rules and notifications
- [ ] **Collaboration**
  - [ ] Team workspaces
  - [ ] Role-based permissions (editor, writer, admin)
  - [ ] Comment and review workflow
  - [ ] Shared drafts and templates
- [ ] **API & Extensibility**
  - [ ] REST API for programmatic access
  - [ ] Webhook integrations
  - [ ] Custom plugin system
  - [ ] CLI tool enhancements
- [ ] **AI Improvements**
  - [ ] Fine-tune voice model on your writing samples
  - [ ] Multi-language support
  - [ ] SEO optimization suggestions
  - [ ] A/B testing different article versions

---

## Breaking Changes

None yet - this is the initial release.

---

## Migration Guide

### Upgrading to 0.1.0 from 0.0.1

1. **Add Anthropic API Key**
   ```env
   # Add to .env
   ANTHROPIC_API_KEY=your_key_here
   ```

2. **Remove Reddit Usage**
   ```bash
   # Old (no longer works)
   npm run scan -- --sources reddit

   # New (use other sources)
   npm run scan -- --sources newsdata,guardian
   ```

3. **Update Commands**
   ```bash
   # New write command available
   npm run write -- --url [url] --preview
   ```

---

## Credits

- Built with TypeScript
- Powered by Anthropic Claude AI
- News sources: NewsData.io, Guardian, BBC, Reuters, AP News, NPR, TechCrunch, HackerNews, Lobsters
- Content extraction: Cheerio
- CLI framework: Commander.js

---

## Contributors

- Joseph Chrisman - Initial development

---

## License

MIT License - see LICENSE file for details
