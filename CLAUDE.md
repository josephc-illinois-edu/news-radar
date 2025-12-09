# News Radar Studio

AI-powered news research and content creation platform.

## Quick Start

```bash
/dev          # Start dev server on port 3005
/dev-stop     # Stop all node processes
```

**Dev URL:** http://localhost:3005

## Architecture

```
news-radar/
├── web/                    # Next.js 16 frontend (port 3005)
│   ├── src/app/           # App Router pages
│   ├── src/components/    # React components
│   ├── src/hooks/         # React Query hooks
│   ├── src/lib/           # Utilities (supabase, utils)
│   └── src/types/         # TypeScript definitions
├── src/                   # Backend services
│   └── services/          # Image generation, costs
├── supabase/              # Database migrations
└── scripts/               # Utility scripts
```

## Modules & Routes

| Module | Dashboard URL | API Base | Purpose |
|--------|--------------|----------|---------|
| Dashboard | `/dashboard` | - | Home/overview |
| Articles | `/dashboard/articles` | `/api/articles` | Article management |
| Scanner | `/dashboard/scanner` | `/api/scanner` | Multi-source news scanning |
| Research | `/dashboard/research` | `/api/research` | Article discovery |
| Compare | `/dashboard/research/compare` | `/api/research/compare` | Side-by-side analysis |
| Create | `/dashboard/create` | `/api/create` | AI content generation |
| Graphics | `/dashboard/graphics` | `/api/graphics` | DALL-E image generation |
| Publish | `/dashboard/publish` | `/api/publish` | Multi-platform publishing |
| Engage | `/dashboard/engage` | `/api/engage` | Social interaction |
| Analytics | `/dashboard/analytics` | `/api/analytics` | Performance metrics |

## Key Files by Feature

### Scanner (news aggregation)
- `web/src/types/scanner.ts` - Types, RSS presets, trending algorithm
- `web/src/app/api/scanner/route.ts` - Main scanner API (HN, Lobsters, Guardian)
- `web/src/hooks/use-scanner.ts` - React Query hooks
- `web/src/app/dashboard/scanner/page.tsx` - Scanner UI

### Research & Comparison
- `web/src/types/research.ts` - Research + comparison types
- `web/src/app/api/research/compare/route.ts` - AI diff analysis
- `web/src/hooks/use-research.ts` - Selection, notes, comparison hooks
- `web/src/app/dashboard/research/compare/page.tsx` - Comparison workspace

### Content Creation & Synthesis
- `web/src/types/synthesis.ts` - Synthesis result types, angles
- `web/src/app/api/create/synthesize/route.ts` - AI synthesis API
- `web/src/hooks/use-synthesis.ts` - Research context, angle selection
- `web/src/app/dashboard/create/page.tsx` - Create UI (supports `?mode=synthesis`)

### Graphics (DALL-E)
- `web/src/types/graphics.ts` - Image generation types
- `web/src/app/api/graphics/generate/route.ts` - DALL-E API
- `src/services/dalle-costs.ts` - Cost tracking
- `web/src/components/articles/featured-image-generator.tsx` - Image UI

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| React | React 19 |
| State | TanStack Query (React Query) |
| Database | Supabase (optional - has demo mode) |
| AI | Anthropic Claude API |
| Images | OpenAI DALL-E |
| Styling | Tailwind CSS 4, shadcn/ui |
| Auth | Supabase Auth |

## Environment Variables

```env
# Required for full functionality
ANTHROPIC_API_KEY=         # Claude AI
OPENAI_API_KEY=            # DALL-E images
GUARDIAN_API_KEY=          # Guardian news

# Supabase (optional - app works in demo mode without)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Common Patterns

### API Route Structure
```typescript
// web/src/app/api/[feature]/route.ts
export async function GET/POST(request: NextRequest) {
  // Check for API key, return mock data if missing
  // Call external API or AI
  // Return { success: true, data } or { success: false, error }
}
```

### Hook Pattern
```typescript
// web/src/hooks/use-[feature].ts
export const featureKeys = { all: ['feature'] as const };
export function useFeature() {
  return useQuery({ queryKey: featureKeys.all, queryFn });
}
export function useFeatureMutation() {
  return useMutation({ mutationFn });
}
```

### Demo Mode
All features work without API keys - mock data is returned when keys are missing.

## User Flow

```
Scanner → Select Articles → Compare → Take Notes → Create (synthesis mode)
   │                           │                        │
   │   Scan HN/Lobsters/       │   AI diff analysis     │   Select angle
   │   Guardian RSS            │   Side-by-side view    │   Generate content
   │   See trending topics     │   Note-taking          │   Source attribution
```

## Sidebar Navigation

Defined in `web/src/components/dashboard/sidebar.tsx` - icons must be defined BEFORE the navigation array (no hoisting).
