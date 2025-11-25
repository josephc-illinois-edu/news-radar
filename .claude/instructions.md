# Project Instructions for Claude Code

## Git Workflow Best Practices

### Feature Branch Strategy

**When to create a feature branch:**
- Starting work on a new roadmap item (e.g., v0.2.0, v0.3.0)
- Adding a significant new feature
- Making breaking changes
- Starting multi-file refactoring

**Branch naming convention:**
- `feature/X.X.X-description` - For version-specific features
- `feature/description` - For standalone features
- `fix/description` - For bug fixes
- `refactor/description` - For code refactoring

**Prompt user to create feature branch when:**
1. User mentions "next step", "next phase", "start working on"
2. User references roadmap items (e.g., "let's add Supabase", "implement the dashboard")
3. Beginning work on multiple related files
4. After completing a major commit to master

**Example prompts:**
- "We're starting work on v0.2.0. Should I create a feature branch like `feature/0.2.0-database-layer`?"
- "This looks like a new feature. Want to create a feature branch before we start?"
- "Ready to merge this feature? Let's create a PR back to master."

### Commit Message Guidelines

Follow conventional commits format:
```
<type>: <description>

[optional body]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Development Workflow

### Before starting new features

1. ✅ Ensure current work is committed
2. ✅ Create feature branch from master
3. ✅ Reference roadmap/CHANGELOG for scope
4. ✅ Break work into small commits

### After completing features

1. ✅ Run tests (if available)
2. ✅ Update CHANGELOG.md
3. ✅ Create PR or merge to master
4. ✅ Tag release if completing version milestone

## Project-Specific Guidelines

### News Radar Development

**Architecture decisions:**
- Use TypeScript strict mode
- Keep scrapers modular (one per source)
- AI generators in `src/generators/`
- Utilities in `src/utils/`
- Follow existing patterns for consistency

**Testing before commit:**
```bash
# Test scan command
npm run scan -- --sources hackernews --hours 24

# Test write command
npm run write -- --url [url] --preview
```

**API Cost Awareness:**
- Always mention cost implications for AI features
- Remind about preview mode for testing
- Track API usage in development

## Roadmap Tracking

Current version: **0.1.0**

Next milestone: **0.2.0 - Database & Storage Layer**

When starting work on roadmap items:
1. Create feature branch: `feature/0.X.X-name`
2. Check CHANGELOG.md for planned features
3. Update CHANGELOG.md as features complete
4. Mark items as completed: `- [x]` instead of `- [ ]`

## Context Efficiency

**Use agents for exploration:**
- Codebase questions → Use Explore agent, not direct file reads
- Multi-file searches → Use Explore agent with thoroughness level
- Example: "Explore how variations are generated" not "Read write-command.ts"

**Key files (read these directly when needed):**
- `src/write-command.ts` - Main article generation CLI
- `src/services/database.ts` - Supabase database operations
- `src/utils/voice-analyzer.ts` - Voice profile analysis
- `src/generators/article-generator.ts` - AI article generation

**Background tasks:**
- Use `run_in_background` for scans and long operations
- Check status with BashOutput tool

**Batch changes:**
- Combine related fixes into single prompts
- "Fix X, handle any TypeScript errors, and test" > multiple prompts

---

**Note:** These instructions help Claude Code provide better, more consistent assistance aligned with your development workflow and Git practices.
