# 🚀 Quick Start Guide - Get Running in 5 Minutes

## Step 1: Open Terminal

```bash
cd C:\Users\josephc\OneDrive\DevJournal\news-radar
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `commander` - CLI framework
- `rss-parser` - RSS feed parsing
- `chalk` - Colored terminal output
- `ora` - Loading spinners
- TypeScript tooling

**Time: ~30 seconds**

## Step 3: Run Your First Scan

```bash
npm run scan
```

This will:
- Scrape HackerNews (last 24 hours)
- Scrape Reddit worldnews, technology, science (last 24 hours)
- Calculate engagement velocity for each story
- Detect anomalies (stories with unusual engagement)
- Display top 15 stories

**Time: ~10-15 seconds**

## Step 4: Try Custom Scans

### Find AI Stories
```bash
npm run scan -- --keywords "AI,artificial intelligence,machine learning"
```

### High-Quality Only (200+ points)
```bash
npm run scan -- --min-score 200
```

### Recent Stories (Last 6 Hours)
```bash
npm run scan -- --hours 6
```

### HackerNews Only
```bash
npm run scan -- --sources hackernews
```

## What You'll See

```
🔍 News Radar - Emerging Story Scanner

Scanning last 24 hours...

✓ HackerNews: 28 stories
✓ Reddit: 42 stories

📰 TOP STORIES BY ENGAGEMENT

1. Revolutionary AI Model Challenges GPT Architecture
   https://example.com/ai-breakthrough
   ⚡ 156 velocity | ▲ 450 points | 💬 89 comments
   📍 HackerNews • 11/18/2025, 2:45:00 PM
   🏷️  revolutionary, model, challenges, architecture

2. New Battery Tech Could Change Electric Vehicles
   https://example.com/battery-tech
   ⚡ 128 velocity | ▲ 380 points | 💬 67 comments
   📍 Reddit - r/technology • 11/18/2025, 1:30:00 PM
   🏷️  battery, tech, electric, vehicles

...

🚨 ANOMALOUS ENGAGEMENT DETECTED

These stories are gaining traction unusually fast:

1. Breakthrough in Quantum Computing Announced
   ⚡ 234 velocity (3.5× above average)

────────────────────────────────────────────────────────────────────
📊 SCAN SUMMARY
────────────────────────────────────────────────────────────────────
Total Stories: 70
Flagged: 70
Anomalies: 3
Media Found: 8
Duration: 12.3s

📈 Source Breakdown:
   HackerNews: 28 stories
   Reddit - r/worldnews: 15 stories
   Reddit - r/technology: 18 stories
   Reddit - r/science: 9 stories

🔥 Top Keywords:
   model, battery, climate, breakthrough, research, quantum, technology

────────────────────────────────────────────────────────────────────

✨ Scan completed successfully!
```

## Next Steps

### 1. Schedule Daily Scans
Create a Windows Task or cron job:
```bash
# Run every morning at 8am
npm run scan -- --hours 24 --min-score 100
```

### 2. Create Topic Alerts
```bash
# Track specific topics
npm run scan -- --keywords "your-topic" > daily-scan.txt
```

### 3. Build Your Newsletter
- Use scan results to find trending topics
- Click through to read full stories
- Write your analysis
- Credit sources properly

### 4. Integrate with Claude Code
The skill is ready! Just say:
> "Run my morning news scan"

And Claude will execute the scan and generate a summary.

## Troubleshooting

### No stories found?
```bash
# Lower the score threshold
npm run scan -- --min-score 10
```

### Too many results?
```bash
# Increase score or limit results
npm run scan -- --min-score 200 --max-results 10
```

### Scan too slow?
```bash
# Reduce time window or use single source
npm run scan -- --hours 12 --sources hackernews
```

## Understanding Metrics

- **⚡ Velocity** = (Score + Comments×2) / Hours
  - Higher = faster growth
  - 50+ is noteworthy
  - 100+ is very hot
  - 200+ is likely breaking soon

- **▲ Score** = Upvotes/points
  - Quality indicator
  - 100+ is decent
  - 500+ is significant

- **💬 Comments** = Discussion depth
  - Weighted 2× because engagement
  - High comments = controversial or complex topic

## Command Cheat Sheet

```bash
# Basic
npm run scan                          # Default scan (24h, all sources)

# Time Windows
npm run scan -- --hours 6             # Last 6 hours
npm run scan -- --hours 48            # Last 48 hours

# Quality Filters
npm run scan -- --min-score 100       # Higher quality
npm run scan -- --min-score 500       # Top tier only

# Keywords
npm run scan -- --keywords "AI"       # Single keyword
npm run scan -- --keywords "AI,ML,LLM"  # Multiple keywords

# Sources
npm run scan -- --sources hackernews  # HN only
npm run scan -- --sources reddit      # Reddit only

# Display
npm run scan -- --max-results 5       # Top 5 only
npm run scan -- --max-results 30      # Show more

# Combinations
npm run scan -- --hours 12 --keywords "climate" --min-score 200
```

---

**You're all set! Start scanning for tomorrow's news today! 🚀**
