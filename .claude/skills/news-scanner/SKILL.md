cl# News Scanner Skill

Automates the process of scanning news sources for emerging stories with high engagement velocity.

## Purpose

This skill helps you quickly identify trending stories across HackerNews, Reddit, and other sources that might become breaking news in the next 24 hours.

## When to Use

- Daily morning routine to catch up on emerging trends
- Before writing newsletter/blog posts to find timely topics
- When researching a specific keyword or topic
- To track anomalous engagement patterns

## Workflow

### 1. Determine Scan Parameters
- Ask user for time window (default: 24 hours)
- Ask for sources (hackernews, reddit, or both)
- Ask for keywords to filter (optional)
- Ask for minimum engagement score (default: 50)

### 2. Execute Scan
Run the CLI command:
```bash
npm run scan -- --hours {hours} --sources {sources} --min-score {score} --keywords "{keywords}"
```

### 3. Analyze Results
- Review top stories by velocity
- Identify anomalies (unusual engagement)
- Extract top keywords across all stories

### 4. Generate Summary
Create a markdown summary with:
- Total stories scanned
- Number of anomalies detected
- Top 5 keywords
- Links to top 10 stories
- Suggested topics for further research

### 5. Optional: Deep Dive
If user wants more details on specific story:
- Fetch full article content
- Extract key points
- Find related stories
- Suggest angles for writing

## Configuration

### Default Settings
- Hours: 24
- Sources: hackernews,reddit
- Min Score: 50
- Max Results: 15

### Adjustable Parameters
- Increase min score (100+) for higher quality
- Narrow time window (12h) for very recent stories
- Use keywords for topic-specific research
- Single source for platform-specific trends

## Output Format

The skill generates a summary like:

```markdown
# News Radar Scan - {Date}

## Summary
- **Total Stories**: 45
- **Anomalies**: 3
- **Top Keywords**: AI, climate, election, technology, research

## 🚨 Breaking Soon (Anomalies)
1. [Story Title](url) - Velocity: 234, HackerNews
2. [Story Title](url) - Velocity: 189, Reddit

## 📰 Top Stories
1. [Story Title](url) - 450 points, 89 comments
2. [Story Title](url) - 380 points, 67 comments
...

## 🔑 Insights
- "AI" mentioned in 8 stories - trending topic
- Unusual spike in climate-related posts
- Election coverage gaining momentum

## 💡 Suggested Topics
Based on trending keywords:
- Write about AI model breakthroughs
- Cover climate policy developments
- Analyze election polling data
```

## Example Usage

### Morning News Briefing
```
User: "Run my morning news scan"
Skill: Executes scan with default params (24h, both sources)
Output: Summary markdown with top stories and anomalies
```

### Topic Research
```
User: "Find stories about AI and climate change from last 48 hours"
Skill: Runs scan with --hours 48 --keywords "AI,climate,climate change"
Output: Filtered results + suggested angles
```

### Quality Filter
```
User: "Show me only high-quality stories (200+ points)"
Skill: Runs scan with --min-score 200
Output: Curated list of top-tier content
```

## Integration Points

### With Other Skills
- **Voice Generator**: Use scan results to generate analysis drafts
- **Newsletter Builder**: Auto-populate newsletter with top stories
- **Citation Manager**: Track sources for later reference

### With External Tools
- Export to Notion/Obsidian
- Share to Slack/Discord
- Post to social media

## Error Handling

### Source Unavailable
If a source fails:
- Log error but continue with other sources
- Notify user of partial results
- Suggest retry later

### No Results Found
If scan returns 0 stories:
- Lower minimum score threshold
- Expand time window
- Remove keyword filters
- Check source availability

### Rate Limiting
If rate limited:
- Wait and retry after delay
- Use cached results if available
- Notify user of delay

## Maintenance

Update this skill when:
- Adding new scrapers/sources
- Changing default parameters
- Improving anomaly detection algorithm
- Adding new output formats

## Success Criteria

Skill is working correctly when:
- Scans complete in < 30 seconds
- Finds 10-50 stories per scan
- Detects 1-5 anomalies typically
- Generates actionable summary
