# 📰 News Radar

> Detect emerging news stories 24 hours before they go mainstream

A command-line tool that scans multiple news sources (HackerNews, Reddit, etc.) to identify stories with unusual engagement patterns - the ones that might become tomorrow's headlines.

## ✨ Features

- 🔍 **Multi-Source Scanning** - HackerNews, Reddit (more coming soon)
- ⚡ **Velocity Analysis** - Detect stories gaining traction fast
- 🚨 **Anomaly Detection** - Flag unusual engagement patterns
- 🖼️ **Media Attribution** - Proper credit for images/videos
- 🎨 **Beautiful CLI** - Color-coded, emoji-rich terminal output
- 🔒 **TypeScript Strict Mode** - No 'any' types, fully typed
- 🆓 **100% Free** - No API keys required

## 🚀 Quick Start

### Installation

```bash
# Navigate to project directory
cd C:\Users\josephc\OneDrive\DevJournal\news-radar

# Install dependencies
npm install

# Run a scan
npm run scan -- --hours 24
```

### Basic Usage

```bash
# Scan last 24 hours (default)
npm run scan

# Scan last 12 hours with custom min score
npm run scan -- --hours 12 --min-score 100

# Filter by keywords
npm run scan -- --keywords "AI,climate,election"

# Scan specific sources
npm run scan -- --sources hackernews

# Show only top 10 results
npm run scan -- --max-results 10
```

## 📖 Command Reference

### `scan` - Scan for emerging stories

**Options:**
- `-h, --hours <number>` - Hours to look back (default: 24)
- `-s, --sources <sources>` - Sources to scan: `hackernews`, `reddit` (default: both)
- `-m, --min-score <number>` - Minimum engagement score (default: 50)
- `-k, --keywords <keywords>` - Filter by keywords (comma-separated)
- `-n, --max-results <number>` - Max stories to display (default: 15)
- `--media` - Include media attachments

**Examples:**

```bash
# Find trending AI stories from last 48 hours
npm run scan -- --hours 48 --keywords "AI,machine learning,LLM"

# High-quality stories only (score > 200)
npm run scan -- --min-score 200

# Reddit worldnews only
npm run scan -- --sources reddit --keywords "politics,international"
```

## 🎯 How It Works

### 1. **Engagement Velocity**
```
Velocity = (Upvotes + Comments × 2) / Hours Since Posted
```

Stories with high velocity are gaining attention quickly.

### 2. **Anomaly Detection**
Uses statistical analysis (mean + 2 standard deviations) to find outliers - stories with unusual engagement patterns.

### 3. **Multi-Source Aggregation**
Combines data from:
- **HackerNews** - Tech/startup stories via Algolia API
- **Reddit** - Multiple subreddits via RSS feeds
- **More coming**: Lobsters, Product Hunt, YouTube

## 📊 Understanding the Output

```bash
1. Revolutionary AI Model Beats GPT-4
   https://example.com/article
   ⚡ 156 velocity | ▲ 450 points | 💬 89 comments
   📍 HackerNews • 11/18/2025, 2:45:00 PM
   🏷️  revolutionary, model, beats
```

- **⚡ Velocity** - Engagement per hour (higher = faster growth)
- **▲ Points** - Total upvotes/score
- **💬 Comments** - Number of comments (shows discussion depth)
- **📍 Source** - Where the story came from
- **🏷️ Keywords** - Auto-extracted topic tags

## 🛠️ Development

### Project Structure

```
news-radar/
├── src/
│   ├── scrapers/
│   │   ├── hackernews.ts    # HN scraper
│   │   └── reddit.ts        # Reddit RSS scraper
│   ├── types.ts             # TypeScript interfaces
│   └── cli.ts               # CLI interface
├── package.json
├── tsconfig.json            # Strict TypeScript config
└── README.md
```

### Adding a New Scraper

1. Create `src/scrapers/your-source.ts`
2. Implement interface returning `StoryResult[]`
3. Add to CLI in `src/cli.ts`

Example:

```typescript
export class YourScraper {
  public async scrape(): Promise<StoryResult[]> {
    // Your scraping logic
    return stories;
  }
}
```

### TypeScript Rules

- ❌ NO `any` types allowed
- ✅ Create interfaces for all data structures
- ✅ Use strict mode in tsconfig.json
- ✅ JSDoc comments for all functions

## 🔮 Roadmap

### Phase 1: CLI MVP ✅
- [x] HackerNews scraper
- [x] Reddit RSS scraper
- [x] Engagement velocity analysis
- [x] Anomaly detection
- [x] Beautiful CLI output

### Phase 2: More Sources (This Week)
- [ ] Lobsters (tech community)
- [ ] Product Hunt (product launches)
- [ ] YouTube RSS (news channels)
- [ ] Wikimedia Commons (images with CC license)

### Phase 3: Intelligence Layer (Next Week)
- [ ] Keyword clustering (find related stories)
- [ ] Trend prediction (ML-based forecasting)
- [ ] Source credibility scoring
- [ ] Duplicate detection

### Phase 4: Publishing Tools (Week 3)
- [ ] Newsletter generation
- [ ] Voice-style analysis drafts
- [ ] Citation management
- [ ] Export to Markdown/HTML

### Phase 5: Web Dashboard (Week 4)
- [ ] NextJS app
- [ ] Supabase integration
- [ ] Real-time updates
- [ ] Team collaboration

## 📝 License

MIT

## 🙏 Attribution

News Radar properly attributes all media:
- Images from Unsplash include photographer credit
- Reddit thumbnails link back to original posts
- All content respects fair use and CC licenses

## 🤝 Contributing

This is a personal project, but feel free to:
1. Fork the repo
2. Add new scrapers
3. Submit pull requests
4. Report issues

## ⚡ Performance

- Scans 30-50 stories in ~5-10 seconds
- Rate-limited to respect source APIs (1 req/sec)
- Minimal memory footprint (<50MB)
- No database required for basic usage

## 🆘 Troubleshooting

### "Cannot find module" errors
```bash
npm install
npm run build
```

### Rate limiting errors
```bash
# Reduce scan frequency or max stories
npm run scan -- --hours 12
```

### No stories found
```bash
# Lower the minimum score threshold
npm run scan -- --min-score 10
```

---

**Made with ❤️ for spotting tomorrow's news today**
