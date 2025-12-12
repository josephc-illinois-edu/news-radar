# Scanner Redesign Plan v1.0

## Design Goals

1. **User Control** - Let users configure what, when, and how to scan
2. **Transparency** - Show scan status, freshness, and progress clearly
3. **Persistence** - Store scan history for trend analysis over time
4. **Discoverability** - Surface all capabilities in the scanner UI itself
5. **Performance** - Minimize unnecessary API calls, enable background scanning

---

## New UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Scanner                                                   [? Help] [⚙ Settings] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Scan Controls ────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Preset: [Tech Focus ▾]  [Save] [Manage]                               │ │
│  │                                                                         │ │
│  │  Sources                           Filters                              │ │
│  │  ┌──────────────────────────┐     ┌────────────────────────────────┐   │ │
│  │  │ [✓] HackerNews     (API) │     │ Time: [6h] [12h] [●24h] [48h]  │   │ │
│  │  │ [✓] Lobsters       (API) │     │                                │   │ │
│  │  │ [✓] The Guardian   (RSS) │     │ Min Score: [────●────] 50      │   │ │
│  │  │ [ ] BBC News       (RSS) │     │                                │   │ │
│  │  │ [ ] TechCrunch     (RSS) │     │ Keywords: [AI ×] [+ Add]       │   │ │
│  │  │ [+ Add Source]           │     │                                │   │ │
│  │  └──────────────────────────┘     └────────────────────────────────┘   │ │
│  │                                                                         │ │
│  │  [▶ Scan Now]  [↻ Auto-refresh: ON ▾]     Last scan: 2 min ago        │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ Results ────────────────────────────────────────────────────────────────┐
│  │                                                                          │
│  │  [Trending Topics]  [All Stories]  [History]           Filter: [_____]  │
│  │  ─────────────────────────────────────────────────────────────────────  │
│  │                                                                          │
│  │  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  │                                                                     ││
│  │  │   (Tab content: Topics / Stories / History)                         ││
│  │  │                                                                     ││
│  │  └─────────────────────────────────────────────────────────────────────┘│
│  │                                                                          │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│  ┌─ Selection Bar (appears when articles selected) ─────────────────────────┐
│  │  3 articles selected    [Compare Selected]  [Clear]                      │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### New Components to Create

```
web/src/components/scanner/
├── scan-controls.tsx          # Main control panel (collapsible)
│   ├── source-selector.tsx    # Multi-select source list with categories
│   ├── time-range-picker.tsx  # Time range buttons/slider
│   ├── score-filter.tsx       # Min engagement score slider
│   ├── keyword-filter.tsx     # Keyword chip input
│   └── preset-selector.tsx    # Preset dropdown with save/manage
├── refresh-indicator.tsx      # Shows last update + countdown + manual refresh
├── results-tabs.tsx           # Tab container for Topics/Stories/History
│   ├── trending-tab.tsx       # Trending topics grid (enhanced)
│   ├── stories-tab.tsx        # All stories table/grid view
│   └── history-tab.tsx        # Past scans with comparison
├── source-quick-add.tsx       # Modal/drawer to add sources from library
└── scan-progress.tsx          # Progress indicator during active scan
```

### Modified Components

```
web/src/app/dashboard/scanner/page.tsx
  - Refactor to compose new components
  - Remove inline StatCard, TrendingTopicCard, etc.
  - Add state management for scan configuration
```

---

## State Management

### New Scanner State Shape

```typescript
// web/src/types/scanner.ts (additions)

interface ScanConfig {
  sources: string[];           // Selected source slugs
  hoursBack: number;           // 6, 12, 24, or 48
  minScore: number;            // 0-100 engagement threshold
  keywords: string[];          // Filter keywords
  maxStoriesPerSource: number; // Limit per source
}

interface ScanPreset {
  id: string;
  name: string;
  config: ScanConfig;
  isDefault?: boolean;
  createdAt: string;
}

interface ScanHistoryEntry {
  id: string;
  scannedAt: string;
  config: ScanConfig;
  topicsFound: number;
  storiesFound: number;
  topTopics: string[];         // Top 3 topic names for preview
}

interface ScannerState {
  config: ScanConfig;
  presets: ScanPreset[];
  activePresetId: string | null;
  isScanning: boolean;
  lastScanTime: string | null;
  autoRefresh: boolean;
  autoRefreshInterval: number; // seconds
  results: ScannerDashboard | null;
  history: ScanHistoryEntry[];
}
```

### New Hooks

```typescript
// web/src/hooks/use-scanner-config.ts

// Manages scan configuration with localStorage persistence
export function useScannerConfig() {
  // Returns: config, setConfig, resetToDefaults
}

// web/src/hooks/use-scanner-presets.ts

// Manages scan presets (localStorage or Supabase)
export function useScannerPresets() {
  // Returns: presets, activePreset, savePreset, deletePreset, applyPreset
}

// web/src/hooks/use-scan-history.ts

// Manages scan history (Supabase)
export function useScanHistory() {
  // Returns: history, isLoading, clearHistory
}

// web/src/hooks/use-auto-refresh.ts

// Manages auto-refresh with visible countdown
export function useAutoRefresh(enabled: boolean, intervalSeconds: number) {
  // Returns: secondsUntilRefresh, pause, resume, refreshNow
}
```

---

## API Changes

### Modified Endpoints

#### `POST /api/scanner` - Enhanced Scan Request

```typescript
// Request (expanded)
interface ScanRequest {
  sources?: string[];          // Source slugs (default: all enabled)
  hoursBack?: number;          // 6, 12, 24, 48 (default: 24)
  minScore?: number;           // Min engagement (default: 0)
  keywords?: string[];         // Filter to stories containing keywords
  limit?: number;              // Max stories per source (default: 20)
  saveToHistory?: boolean;     // Persist this scan (default: true)
}

// Response (expanded)
interface ScanResponse {
  id: string;                  // Scan ID for history reference
  stories: StoryResult[];
  topics: TrendingTopic[];
  sourceStats: SourceStat[];
  scanTime: string;
  totalFound: number;
  filteredCount: number;       // Stories after keyword filter
  errors: string[];
  config: ScanRequest;         // Echo back config used
}
```

### New Endpoints

#### `GET /api/scanner/history` - Scan History

```typescript
// Query params: ?limit=20&offset=0

// Response
interface ScanHistoryResponse {
  entries: ScanHistoryEntry[];
  total: number;
}
```

#### `GET /api/scanner/history/:id` - Single Scan Details

```typescript
// Response: Full ScanResponse for that scan
```

#### `GET /api/scanner/presets` - User Presets

```typescript
// Response
interface PresetsResponse {
  presets: ScanPreset[];
}
```

#### `POST /api/scanner/presets` - Save Preset

```typescript
// Request
interface SavePresetRequest {
  name: string;
  config: ScanConfig;
}
```

#### `DELETE /api/scanner/presets/:id` - Delete Preset

---

## Database Schema

### New Tables

```sql
-- Scan history for trend analysis
CREATE TABLE scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  scanned_at timestamptz DEFAULT now(),
  config jsonb NOT NULL,
  topics_found int NOT NULL,
  stories_found int NOT NULL,
  top_topics text[] NOT NULL,
  source_stats jsonb,
  errors text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scan_history_user_date ON scan_history(user_id, scanned_at DESC);

-- User scan presets
CREATE TABLE scan_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  config jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scan_presets_user ON scan_presets(user_id);

-- RLS policies
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scan history"
  ON scan_history FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own presets"
  ON scan_presets FOR ALL
  USING (auth.uid() = user_id);
```

---

## Implementation Phases

### Phase 1: Foundation (Scan Controls)
**Goal:** Give users control over scan parameters

| Task | File | Description |
|------|------|-------------|
| 1.1 | `types/scanner.ts` | Add `ScanConfig`, `ScanPreset` types |
| 1.2 | `hooks/use-scanner-config.ts` | Config state hook with localStorage |
| 1.3 | `components/scanner/source-selector.tsx` | Multi-select source list |
| 1.4 | `components/scanner/time-range-picker.tsx` | Time range buttons |
| 1.5 | `components/scanner/score-filter.tsx` | Min score slider |
| 1.6 | `components/scanner/scan-controls.tsx` | Compose all controls |
| 1.7 | `app/dashboard/scanner/page.tsx` | Integrate controls, wire to API |

**Deliverable:** Users can configure sources, time range, and min score before scanning.

### Phase 2: Visibility (Refresh & Progress)
**Goal:** Show users what's happening

| Task | File | Description |
|------|------|-------------|
| 2.1 | `hooks/use-auto-refresh.ts` | Auto-refresh hook with countdown |
| 2.2 | `components/scanner/refresh-indicator.tsx` | Last update + countdown UI |
| 2.3 | `components/scanner/scan-progress.tsx` | Progress bar during scan |
| 2.4 | `app/dashboard/scanner/page.tsx` | Integrate visibility components |

**Deliverable:** Users see when data was fetched, countdown to next refresh, and scan progress.

### Phase 3: Filtering (Keywords & Search)
**Goal:** Let users focus on what matters

| Task | File | Description |
|------|------|-------------|
| 3.1 | `components/scanner/keyword-filter.tsx` | Keyword chip input |
| 3.2 | `components/scanner/results-tabs.tsx` | Tab container |
| 3.3 | `components/scanner/stories-tab.tsx` | Filterable stories table |
| 3.4 | `api/scanner/route.ts` | Add keyword filtering to API |

**Deliverable:** Users can filter by keywords, view all stories in sortable table.

### Phase 4: Persistence (History & Presets)
**Goal:** Remember past scans and configurations

| Task | File | Description |
|------|------|-------------|
| 4.1 | `supabase/migrations/xxx_scan_history.sql` | Add history tables |
| 4.2 | `api/scanner/history/route.ts` | History API endpoints |
| 4.3 | `api/scanner/presets/route.ts` | Presets API endpoints |
| 4.4 | `hooks/use-scan-history.ts` | History query hook |
| 4.5 | `hooks/use-scanner-presets.ts` | Presets management hook |
| 4.6 | `components/scanner/history-tab.tsx` | History list UI |
| 4.7 | `components/scanner/preset-selector.tsx` | Preset dropdown UI |

**Deliverable:** Scan history persisted, users can save/load presets.

### Phase 5: Polish (Source Management)
**Goal:** Make source configuration seamless

| Task | File | Description |
|------|------|-------------|
| 5.1 | `components/scanner/source-quick-add.tsx` | Add source from library modal |
| 5.2 | `components/scanner/source-selector.tsx` | Enhance with categories, search |
| 5.3 | `api/scanner/route.ts` | Support custom RSS in scan |

**Deliverable:** Users can add/configure sources directly from scanner.

---

## Design Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Q1: Control Panel | **Collapsible accordion** | Saves space on mobile, collapses after first scan |
| Q2: Preset Storage | **Both (localStorage + Supabase)** | Works in demo mode, syncs when authenticated |
| Q3: Auto-refresh | **Smart (tab visibility)** | Saves API calls when user not looking |
| Q4: History Retention | **Auto-delete after 30 days** | Balances storage with usefulness |
| Q5: Scan Progress | **Progress bar with source count** | Shows meaningful progress without complexity |

### Implementation Details

**Collapsible Accordion:**
- Default expanded on first visit (no scan yet)
- Auto-collapse after successful scan
- User can manually toggle
- Persist collapse state in localStorage

**Dual Storage Strategy:**
```typescript
// Preset save flow
async function savePreset(preset: ScanPreset) {
  // Always save to localStorage first (instant)
  localStorage.setItem(`preset-${preset.id}`, JSON.stringify(preset));

  // If authenticated, sync to Supabase
  if (session?.user) {
    await supabase.from('scan_presets').upsert(preset);
  }
}

// Preset load flow
async function loadPresets(): Promise<ScanPreset[]> {
  const local = loadFromLocalStorage();

  if (session?.user) {
    const remote = await supabase.from('scan_presets').select();
    return mergePresets(local, remote); // Remote wins on conflict
  }

  return local;
}
```

**Smart Auto-refresh:**
```typescript
function useSmartAutoRefresh(intervalMs: number) {
  const [enabled, setEnabled] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Only refresh when enabled AND not paused
  const shouldRefresh = enabled && !paused;
  // ...
}
```

**30-Day History Cleanup:**
```sql
-- Run via Supabase scheduled function or cron
DELETE FROM scan_history
WHERE scanned_at < now() - interval '30 days';
```

**Progress Bar UX:**
```
Scanning sources... [████████░░░░░░░░] 3/5
                     HackerNews ✓ Lobsters ✓ Guardian ✓ BBC... Reuters...
```

---

## Success Metrics

After implementation, we should see:

| Metric | Current | Target |
|--------|---------|--------|
| User actions per scan session | 1-2 (scan, compare) | 4-6 (configure, scan, filter, compare) |
| Time to find relevant stories | ~2 min (manual scrolling) | ~30 sec (filtered) |
| Return visits to scanner | Unknown | Track via history usage |
| Preset usage | N/A | >50% of scans use preset |

---

## Next Steps

1. Review this plan and answer open questions
2. Finalize component designs
3. Begin Phase 1 implementation
4. Iterate based on feedback

---

*Plan created: 2024-12-12*
*Version: 1.1*
*Status: **Decisions Locked - Ready for Implementation***
