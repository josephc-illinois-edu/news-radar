# 📋 News Radar Studio - Development Action Plan

> **Last Updated:** December 2024  
> **Current Version:** 0.3.0  
> **Next Target:** 0.4.0 - Quality & Testing Foundation

---

## 📊 Project Assessment

### What's Built (✅ Complete)

| Module | CLI | Web | Tests | Docs |
|--------|-----|-----|-------|------|
| Scanner (HN, Lobsters, Guardian) | ✅ | ✅ | ❌ | ✅ |
| Article Generation | ✅ | ✅ | ❌ | ✅ |
| Voice Training | ✅ | ⚠️ | ❌ | ✅ |
| Multi-Platform Publishing | ✅ | ✅ | ❌ | ⚠️ |
| Image Generation (DALL-E) | ✅ | ✅ | ❌ | ⚠️ |
| Research & Comparison | — | ✅ | ❌ | ✅ |
| Synthesis Workflow | — | ✅ | ❌ | ⚠️ |
| Analytics Dashboard | — | ✅ | ❌ | ❌ |
| Engagement Module | — | ✅ | ❌ | ❌ |
| Database (Supabase) | ✅ | ✅ | ❌ | ✅ |

**Legend:** ✅ Complete | ⚠️ Partial | ❌ Missing | — Not Applicable

### Critical Gap: Zero Test Coverage

The project has **no test files** in `src/` or `web/src/`. This is the highest priority debt.

---

## 🎯 Phase 1: Testing Foundation (Current Sprint)

> **Goal:** Establish TDD workflow with critical path coverage  
> **Subagent:** `tdd-coach` → Use BEFORE writing any new code

### Week 1: Core API Route Tests

| Priority | File | Subagent Command |
|----------|------|------------------|
| P0 | `web/src/app/api/scanner/route.ts` | `"Use tdd-coach to write tests for the scanner API"` |
| P0 | `web/src/app/api/articles/route.ts` | `"Use tdd-coach to write tests for articles CRUD"` |
| P1 | `web/src/app/api/create/synthesize/route.ts` | `"Use tdd-coach to write tests for AI synthesis"` |
| P1 | `web/src/app/api/research/compare/route.ts` | `"Use tdd-coach to write tests for comparison API"` |

**Done When:**
- [ ] `npm test` runs without errors
- [ ] Scanner API has 80%+ coverage
- [ ] Articles CRUD has happy path + error tests
- [ ] Mock patterns established for Anthropic/Supabase

### Week 2: Hook Tests (React Query)

| Priority | Hook | Focus Areas |
|----------|------|-------------|
| P0 | `use-scanner.ts` | Query keys, refetch behavior, error states |
| P0 | `use-articles.ts` | Mutations, optimistic updates, cache invalidation |
| P1 | `use-research.ts` | Selection state, comparison flow |
| P1 | `use-synthesis.ts` | Context preservation, angle selection |

**Subagent Command:**
```
"Use tdd-coach to write React Query hook tests for use-scanner"
```

---

## 🔧 Phase 2: Type Safety Audit

> **Goal:** Eliminate all `any` types  
> **Subagent:** `type-enforcer`

### Type Files to Audit

| File | Status | Issues |
|------|--------|--------|
| `web/src/types/scanner.ts` | ✅ | Well-typed |
| `web/src/types/research.ts` | ✅ | Well-typed |
| `web/src/types/synthesis.ts` | ⚠️ | Check for implicit any |
| `web/src/types/database.ts` | ⚠️ | Verify Supabase types |
| `src/types.ts` | ⚠️ | Legacy CLI types - review |

**Subagent Command:**
```
"Use type-enforcer to audit web/src/types/ for any types"
```

### API Routes to Type-Check

```
"Use type-enforcer to review api/scanner/route.ts for strict typing"
```

**Done When:**
- [ ] `npm run type-check` passes with zero errors
- [ ] No `any` in production code
- [ ] All API responses have typed interfaces

---

## 🔌 Phase 3: New API Endpoints (v0.4.0)

> **Subagent:** `api-builder`

### Planned Endpoints

| Endpoint | Purpose | Subagent Command |
|----------|---------|------------------|
| `GET /api/voice/profiles` | List trained voices | `"Use api-builder to create voice profiles endpoint"` |
| `POST /api/voice/train` | Train new voice | `"Use api-builder to create voice training endpoint"` |
| `POST /api/articles/batch` | Batch operations | `"Use api-builder to create batch articles endpoint"` |
| `GET /api/analytics/export` | Export analytics | `"Use api-builder to create analytics export"` |

**Workflow:**
1. `task-breakdown` → Plan the endpoint
2. `tdd-coach` → Write tests first
3. `api-builder` → Implement endpoint
4. `type-enforcer` → Verify types

---

## 📝 Phase 4: Documentation Debt

> **Subagent:** `doc-writer`

### Missing Documentation

| Module | Priority | Command |
|--------|----------|---------|
| Analytics Dashboard | P0 | `"Use doc-writer to document the analytics module"` |
| Engagement Module | P0 | `"Use doc-writer to document the engage module"` |
| Synthesis Workflow | P1 | `"Use doc-writer to document the synthesis workflow"` |
| Voice Training (Web) | P1 | `"Use doc-writer to document web voice training"` |

**Output Requirements:**
- HTML for browser preview
- Markdown for repo
- 10th-grade reading level
- Code examples with TSDoc

---

## 🧠 ADHD-Optimized Workflow

> **Subagent:** `task-breakdown` → Use at the START of any new work

### Daily Pattern

```
Morning (15 min):
1. "Use task-breakdown to plan today's work on [feature]"
2. Review task list, pick first task
3. Set 25-minute timer

Per Task:
1. "Use tdd-coach to write tests for [task]"
2. Run tests (should fail - RED)
3. Implement to pass tests (GREEN)
4. "Use type-enforcer to review [file]"
5. Commit with conventional message

End of Day (10 min):
1. "Use doc-writer to document [completed feature]"
2. Update this ACTION-PLAN.md
```

### Context Preservation Tips

**Before switching tasks:**
```
"Summarize current state: what's done, what's next, which files are open"
```

**After returning:**
```
"Use task-breakdown to review where we left off on [feature]"
```

---

## 🚀 Quick Reference: Subagent Commands

### Starting New Work
```
"Use task-breakdown to plan [feature name]"
```

### Before Writing Code
```
"Use tdd-coach to write tests for [component/function]"
```

### During Code Review
```
"Use type-enforcer to review [file path]"
```

### Building API Endpoints
```
"Use api-builder to create [endpoint description]"
```

### After Completing Features
```
"Use doc-writer to document [feature name]"
```

### Chaining (Complex Tasks)
```
"First use task-breakdown to plan the bookmark feature, then use tdd-coach for the first task"
```

---

## 📁 Project Structure Reference

```
news-radar/
├── .claude/
│   ├── agents/              # 🆕 Your subagents
│   │   ├── tdd-coach.md
│   │   ├── type-enforcer.md
│   │   ├── api-builder.md
│   │   ├── doc-writer.md
│   │   └── task-breakdown.md
│   ├── commands/            # Slash commands
│   ├── skills/              # Domain knowledge
│   └── instructions.md      # Project context
├── src/                     # CLI backend
│   ├── services/            # Database, AI services
│   ├── generators/          # Article generation
│   ├── scrapers/            # News sources
│   └── types.ts             # CLI types
├── web/                     # Next.js frontend
│   └── src/
│       ├── app/api/         # API routes
│       ├── components/      # React components
│       ├── hooks/           # React Query hooks
│       └── types/           # TypeScript interfaces
└── supabase/               # Database migrations
```

---

## 🎯 Success Metrics

### This Week
- [ ] First test file created and passing
- [ ] `npm test` command working
- [ ] Scanner API has basic test coverage

### This Month
- [ ] 60%+ test coverage on API routes
- [ ] Zero `any` types in web/src/
- [ ] All modules have basic documentation

### This Quarter
- [ ] 80%+ overall test coverage
- [ ] CI/CD pipeline running tests
- [ ] v0.4.0 features complete

---

## 🔄 Git Workflow Reminder

### Before Starting Features
```bash
git checkout -b feature/0.4.0-testing-foundation
```

### Commit Messages
```
feat: add scanner API tests
test: add use-scanner hook tests  
docs: add analytics module documentation
refactor: eliminate any types in synthesis
```

### After Completing
```bash
git push origin feature/0.4.0-testing-foundation
# Create PR to main
```

---

## 📞 Getting Help

### If Stuck on Tests
```
"Use tdd-coach to help me understand why this test is failing: [paste error]"
```

### If Type Errors
```
"Use type-enforcer to fix this TypeScript error: [paste error]"
```

### If Overwhelmed
```
"Use task-breakdown to simplify [current task] into smaller steps"
```

---

## 🎉 Milestones

- [x] **v0.1.0** - CLI + AI Generation
- [x] **v0.2.0** - Database + Publishing
- [x] **v0.3.0** - Full Web Dashboard
- [ ] **v0.4.0** - Testing + Quality (← YOU ARE HERE)
- [ ] **v0.5.0** - Real-time + Collaboration

---

**Remember:** Test first, type strictly, document after. The subagents are here to help enforce this workflow. 🚀
