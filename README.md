# 📰 News Radar

> **AI-Powered News Analysis & Article Generation** - Detect emerging stories, analyze multiple sources, and generate original articles in your voice.

A complete content creation system that scans news sources, extracts insights, and uses Claude AI to write thoughtful articles with automatic plagiarism checking.

---

## ✨ Features

###  Story Discovery
- 🔍 **Multi-Source Scanning** - 10+ sources (NewsData.io, Guardian, Reuters, BBC, AP News, NPR, TechCrunch, HackerNews, Lobsters)
- ⚡ **Velocity Analysis** - Identify trending stories by engagement speed
- 🚨 **Anomaly Detection** - Flag unusual engagement patterns
- 🔎 **Keyword Filtering** - Find stories on specific topics
- 📊 **Engagement Metrics** - Track scores, comments, and velocity

### 🤖 AI Article Generation
- **Claude-Powered Writing** - Uses Anthropic's Claude Sonnet 4
- **Voice Customization** - Conversational or academic styles
- **Tone Control** - Adjust humor, urgency, optimism, criticism (0-10 scales)
- **Multiple Lengths** - Tweet, Short (200-400), Medium (500-800), Long (1000-1500 words)
- **Platform Optimization** - Facebook, LinkedIn, Newsletter, Blog formats
- **Multi-Source Synthesis** - Combine 1-5 sources for balanced analysis

### 🛡️ Quality Assurance
- ✅ **Automatic Plagiarism Checking** - Similarity detection against sources
- 👁️ **Preview Mode** - Review content before using API credits
- 💰 **Cost Estimation** - Know API costs upfront (~$0.02-0.05/article)
- 📝 **Source Attribution** - Automatic citations
- 🎯 **Original Content** - AI analyzes, doesn't copy

---

## 🚀 Quick Start

### 1. Installation

```bash
cd news-radar
npm install
```

### 2. Configuration

Create `.env` file in project root:

```env
# NewsData.io API (optional - for aggregated news)
NEWSDATA_API_KEY=your_newsdata_key_here

# Anthropic Claude API (required for article generation)
ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Get API Keys:**
- NewsData.io: https://newsdata.io/ (free tier available)
- Anthropic: https://console.anthropic.com/ (pay-as-you-go, ~$0.02-0.05/article)

### 3. Find Stories

```bash
npm run scan -- --sources newsdata,guardian --keywords "AI,technology" --hours 48
```

### 4. Generate Article (with preview)

```bash
npm run write -- \
  --url "https://example.com/article" \
  --preview \
  --length medium \
  --platform newsletter
```

### 5. Review & Publish

Articles saved to `drafts/` folder as Markdown files.

---

## 📚 Commands

### `scan` - Find Emerging Stories

```bash
npm run scan -- [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--sources <list>` | Comma-separated sources | `hackernews,newsdata` |
| `--keywords <list>` | Filter by keywords | None |
| `--hours <number>` | Hours to look back | `24` |
| `--min-score <number>` | Minimum engagement score | `50` |
| `--max-results <number>` | Maximum results | `15` |

**Available Sources:**
`newsdata`, `guardian`, `bbc`, `reuters`, `apnews`, `npr`, `techcrunch`, `hackernews`, `lobsters`

**Example:**

```bash
npm run scan -- \
  --sources newsdata,guardian,techcrunch \
  --keywords "artificial intelligence,AI,ChatGPT" \
  --hours 72 \
  --max-results 20
```

---

### `write` - Generate AI Articles

```bash
npm run write -- [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Article URL(s) - can use multiple | Required* |
| `--story <title>` | Story title (if no URL) | Required* |
| `--preview` | Preview before using API credits | `false` |
| `--length <type>` | tweet, short, medium, long | `medium` |
| `--platform <type>` | facebook, linkedin, newsletter, blog | `newsletter` |
| `--style <type>` | conversational, academic | `conversational` |
| `--urgency <0-10>` | Urgency level | `7` |
| `--optimism <0-10>` | Optimism level | `6` |
| `--criticism <0-10>` | Criticism level | `5` |
| `--humor <0-10>` | Humor level | `4` |

*One of `--url` or `--story` is required

**Single Source:**

```bash
npm run write -- \
  --url "https://techcrunch.com/ai-breakthrough" \
  --length medium \
  --platform linkedin
```

**Multi-Source (Balanced Analysis):**

```bash
npm run write -- \
  --url "https://reuters.com/story1" \
  --url "https://guardian.com/story2" \
  --url "https://bloomberg.com/story3" \
  --length long \
  --preview
```

---

## 🔄 Common Workflows

### Workflow 1: Quick Article

```bash
# 1. Find story
npm run scan -- --keywords "topic" --hours 24

# 2. Generate with preview (see content before spending credits)
npm run write -- --url [url] --preview

# 3. Review in drafts/ and publish
```

### Workflow 2: Multi-Source Deep Dive

```bash
# 1. Find multiple perspectives
npm run scan -- \
  --sources newsdata,guardian,reuters \
  --keywords "topic" \
  --hours 72

# 2. Pick 3-5 different sources
# 3. Generate synthesis
npm run write -- \
  --url "url1" --url "url2" --url "url3" \
  --length long \
  --preview
```

### Workflow 3: Batch Research

```bash
# Research is FREE - scan as much as you want
npm run scan -- --keywords "topic1" > topic1.txt
npm run scan -- --keywords "topic2" > topic2.txt

# Review offline
# Only generate articles for best ones (uses credits)
npm run write -- --url [best-url] --preview
```

---

## 💰 API Costs & Credit Management

### What Uses Credits

**ONLY** AI article generation (when you confirm in preview or run without `--preview`)

### What's FREE

- ✅ Scanning for news
- ✅ Fetching article content (1-5+ sources)
- ✅ Extracting facts/quotes/numbers
- ✅ Plagiarism checking
- ✅ Preview mode
- ✅ Everything except AI generation

### Cost Per Article

| Length | Words | Cost | $10 Gets You |
|--------|-------|------|--------------|
| Tweet | 280 chars | ~$0.01 | ~1000 |
| Short | 200-400 | ~$0.02 | ~500 |
| Medium | 500-800 | ~$0.03 | ~333 |
| Long | 1000-1500 | ~$0.05 | ~200 |

### Cost Optimization Tips

1. **Always use `--preview`** - See content before using credits
2. **Start short** - Generate short version first, extend if needed
3. **Multi-source is free** - Fetching 5 sources costs same as 1 (both $0)
4. **Batch research** - Scan offline, generate only best stories

### Monitor Usage

Check spending: https://console.anthropic.com/settings/billing

---

## 📝 Examples

### Financial News

```bash
npm run scan -- \
  --sources newsdata,reuters \
  --keywords "stock,investment,market" \
  --hours 48

npm run write -- \
  --url "https://reuters.com/market-news" \
  --url "https://bloomberg.com/analysis" \
  --length medium \
  --platform linkedin \
  --preview
```

### Political Analysis

```bash
npm run scan -- \
  --sources guardian,bbc,apnews \
  --keywords "politics,election" \
  --hours 72

npm run write -- \
  --url "url1" --url "url2" --url "url3" \
  --length long \
  --platform newsletter \
  --urgency 8 \
  --criticism 7 \
  --optimism 4 \
  --preview
```

### Tech News

```bash
npm run scan -- \
  --sources techcrunch,hackernews \
  --keywords "AI,startup" \
  --hours 24

npm run write -- \
  --url "url" \
  --length short \
  --platform twitter \
  --humor 6 \
  --preview
```

---

## 📊 Plagiarism Check Guide

### Similarity Scores

- **<15%** - Excellent (highly original)
- **15-30%** - Good (original with expected factual overlap)
- **30-50%** - Review needed
- **>50%** - Rewrite recommended

### What's Normal

Matching phrases for factual data (numbers, names, quotes, terms) is **expected and acceptable** in journalism.

---

## 🔍 Output Files

Articles saved to `drafts/`:

```
drafts/
├── 2025-11-21-article-title.md
├── 2025-11-21-another-story.md
└── 2025-11-20-older-article.md
```

**Format:**

```markdown
# Article Title

[Your AI-generated content...]

---

**Sources:**
- [Article Title](url)
- Author: Name
- Published: Date

**Written by:** Joseph C | Date
**From News Radar:** AI-powered emerging story analysis
```

---

## 🛠️ Troubleshooting

### "API key not found"

Add keys to `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
NEWSDATA_API_KEY=pub_...
```

### "Credit balance too low"

Add credits at: https://console.anthropic.com/settings/billing

### "Could not fetch URL"

- Try different source
- Use multiple URLs
- Some sites block scraping

### High Similarity Score (>30%)

- Review matched phrases
- Factual data matches are OK
- Edit article if needed
- Or regenerate with different tone

---

## 📦 Project Structure

```
news-radar/
├── src/
│   ├── scrapers/           # News source scrapers
│   │   ├── hackernews.ts
│   │   ├── newsdata.ts
│   │   ├── guardian.ts
│   │   └── ...
│   ├── generators/         # Article generators
│   │   ├── ai-voice.ts     # Claude AI generator
│   │   └── voice.ts        # Template generator
│   ├── utils/              # Utilities
│   │   ├── content-fetcher.ts
│   │   └── plagiarism-checker.ts
│   ├── types.ts            # TypeScript interfaces
│   ├── cli.ts              # Scan command
│   └── write-command.ts    # Write command
├── drafts/                 # Generated articles
├── .env                    # API keys (create this)
├── package.json
└── README.md
```

---

## 🔐 Privacy & Security

- API keys stored in `.env` (not committed to git)
- No data stored on external servers (except Anthropic for generation)
- Articles saved locally in `drafts/`
- Source content fetched directly

---

## 📜 License

MIT

---

## 📞 Support

- Check Troubleshooting section
- Review Examples
- Anthropic docs: https://docs.anthropic.com/

---

## 🗂️ Version

**Current Version:** 0.1.0

See [CHANGELOG.md](CHANGELOG.md) for updates.

---

**Built with:**
- TypeScript
- Anthropic Claude Sonnet 4
- NewsData.io API
- RSS Parsers (Guardian, BBC, Reuters, etc.)
- Cheerio (content extraction)

---

**Made with ❤️ for thoughtful news analysis**
