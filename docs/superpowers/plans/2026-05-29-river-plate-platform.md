# River Plate Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone River Plate institutional scouting platform by forking the Lanús project, rebranding, and configuring new data sources.

**Architecture:** Fork the existing `club-nombredelclub` project into `C:\Users\marcos\Desktop\club-riverplate`. Strip AI chat components, rebrand to River Plate identity (red/white/black), reconfigure Supabase and API-Football for River Plate data. The new project is fully independent — separate git repo, separate Supabase instance, separate Netlify deploy.

**Tech Stack:** React 18, TypeScript, Vite 7, Tailwind CSS, Recharts, Supabase, API-Football, Netlify Functions

---

## File Map

### Files to create (new)
- `C:\Users\marcos\Desktop\club-riverplate\.env.local` — environment variables
- `src/data/river2026.ts` — River Plate 2026 season match data (replaces `lanus2026.ts`)

### Files to delete (from the fork)
- `src/components/chat/AIAnalystChat.tsx` — AI chat component
- `src/services/rivalAnalysisService.ts` — Claude API rival analysis
- `netlify/functions/analyze-rival.js` — Netlify function for AI analysis

### Files to modify (rebrand + reconfigure)
- `tailwind.config.js` — `brand-green` → `brand-red`, color values
- `vite.config.ts` — remove Anthropic proxy, change port to 5173
- `package.json` — rename to `river-plate-platform`
- `index.html` — title to "Club Atlético River Plate Platform"
- `netlify.toml` — remove Anthropic from CSP, keep all other proxies
- `src/components/layout/Layout.tsx` — remove AIAnalystChat, rebrand login page
- `src/components/layout/Navbar.tsx` — logo + brand name
- `src/components/layout/Footer.tsx` — logo + brand name
- `src/components/auth/AuthModal.tsx` — brand name
- `src/services/apiFootballService.ts` — `LANUS_ID` → `RIVER_ID` (435)
- `src/services/fotmobService.ts` — FotMob team ID 10082 → River's ID (6033)
- `src/data/lanus2026.ts` → renamed to `src/data/river2026.ts`
- `src/utils/pdfExport.ts` — "Club Atlético Lanús" → "Club Atlético River Plate"
- `src/utils/smartPdfExport.ts` — same text replacements
- `src/pages/EquipoPage.tsx` — import `river2026.ts` instead of `lanus2026.ts`, remove rivalAnalysisService import
- `src/constants/scoring.ts` — comment update (Lanús → River)
- All 40 files with `brand-green` references — global find-replace to `brand-red`
- `public/river-escudo.png` — copy from `public/escudos/argentina/river.png`

---

## Task 1: Fork project to new directory

**Files:**
- Source: `C:\Users\marcos\Desktop\club-nombredelclub\`
- Destination: `C:\Users\marcos\Desktop\club-riverplate\`

- [ ] **Step 1: Copy the project**

```powershell
Copy-Item -Path "C:\Users\marcos\Desktop\club-nombredelclub" -Destination "C:\Users\marcos\Desktop\club-riverplate" -Recurse -Exclude @("node_modules", "dist", ".git", ".netlify", ".vercel", ".supabase", ".claude", ".superpowers", "memory", ".mcp.json", "docs")
```

This copies everything except node_modules, dist, git history, and Lanús-specific config directories.

- [ ] **Step 2: Initialize fresh git repo**

```powershell
cd C:\Users\marcos\Desktop\club-riverplate
git init
```

- [ ] **Step 3: Install dependencies**

```powershell
cd C:\Users\marcos\Desktop\club-riverplate
npm install
```

- [ ] **Step 4: Verify the copy works**

```powershell
cd C:\Users\marcos\Desktop\club-riverplate
ls src\pages\*.tsx | Measure-Object
# Expected: 17+ page files
ls src\components\ | Measure-Object
# Expected: 10+ component directories
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fork: initial copy from Lanús platform"
```

---

## Task 2: Remove AI Chat components

**Files:**
- Delete: `src/components/chat/AIAnalystChat.tsx`
- Delete: `src/services/rivalAnalysisService.ts`
- Delete: `netlify/functions/analyze-rival.js`
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/pages/EquipoPage.tsx`
- Modify: `src/components/rival/FormationPitchCard.tsx`
- Modify: `src/components/rival/PdfPagesViewer.tsx`
- Modify: `src/components/rival/RivalComprehensiveReport.tsx`
- Modify: `src/services/sharedAnalysisService.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Delete AI chat component and rival analysis service**

```powershell
Remove-Item "src/components/chat/AIAnalystChat.tsx" -Confirm:$false
Remove-Item "src/components/chat" -Recurse -Confirm:$false
Remove-Item "src/services/rivalAnalysisService.ts" -Confirm:$false
Remove-Item "netlify/functions/analyze-rival.js" -Confirm:$false
```

- [ ] **Step 2: Remove AIAnalystChat from Layout.tsx**

In `src/components/layout/Layout.tsx`, remove:
```tsx
// Line 4 — delete this import:
import AIAnalystChat from '@/components/chat/AIAnalystChat'

// Line 141 — delete this render:
      <AIAnalystChat />
```

The file should still have Navbar, Outlet, Footer in the authenticated layout.

- [ ] **Step 3: Remove Anthropic proxy from vite.config.ts**

In `vite.config.ts`, delete the entire `anthropic-proxy` plugin (lines 12-49). Keep only `react()` in the plugins array:

```ts
plugins: [
  react(),
],
```

Also delete the `import type { IncomingMessage, ServerResponse } from 'node:http'` line (line 4) since it's no longer needed.

- [ ] **Step 4: Fix EquipoPage.tsx imports**

In `src/pages/EquipoPage.tsx`, the import from `rivalAnalysisService` needs to be handled. The types and functions used from that service need to either be inlined or the rival analysis features disabled. Since the rival analysis depends on Claude AI:

Remove the import line:
```tsx
import { processFile, mergeRivalData, analyzePdfPages, fetchRivalSheetData, fetchUltimoPartidoData, type RivalData, type PartialRivalData, type FileSource, type PdfPageInsight, type UltimoPartidoStats } from '@/services/rivalAnalysisService'
```

Move the type definitions that are still needed by other components into a new types section in `src/types/rival.ts`:
```tsx
export interface MatchFormation {
  formation: string
  players: FormationPlayer[]
}
export interface FormationPlayer {
  name: string
  number: number
  position: string
  x: number
  y: number
}
export interface PdfPageInsight {
  pageNumber: number
  imageUrl: string
  analysis: string
}
export interface RivalData {
  teamName: string
  formation?: string
  formationPlayers?: FormationPlayer[]
  recentResults?: any[]
  keyPlayers?: any[]
}
```

Update `FormationPitchCard.tsx`, `PdfPagesViewer.tsx`, `RivalComprehensiveReport.tsx`, and `sharedAnalysisService.ts` to import from `@/types/rival` instead of `@/services/rivalAnalysisService`.

- [ ] **Step 5: Verify no broken imports**

```powershell
cd C:\Users\marcos\Desktop\club-riverplate
npx tsc --noEmit 2>&1 | Select-String "error" | Select-Object -First 20
```

Fix any remaining import errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "remove: AI chat and Claude API rival analysis"
```

---

## Task 3: Rebrand — Tailwind theme and global color swap

**Files:**
- Modify: `tailwind.config.js`
- Modify: All 40 files with `brand-green` references

- [ ] **Step 1: Update tailwind.config.js**

Replace the brand colors:

```js
// OLD:
brand: {
  green: '#6F1929',
  greenHover: '#8B2234',
  dark: '#111111',
},

// NEW:
brand: {
  red: '#CD1E2B',
  redHover: '#E02535',
  dark: '#111111',
},
```

- [ ] **Step 2: Global find-replace brand-green → brand-red in all src/ files**

Run across all `.tsx`, `.ts`, `.css` files:

```
brand-green → brand-red
brand-greenHover → brand-redHover
```

This affects ~40 files. Every instance of `bg-brand-green`, `text-brand-green`, `border-brand-green`, etc. becomes `bg-brand-red`, `text-brand-red`, `border-brand-red`.

Also in `src/index.css` if there are any hardcoded references.

- [ ] **Step 3: Replace hardcoded granate color values**

Search for any remaining hardcoded Lanús colors:

```
#6F1929 → #CD1E2B (primary red)
#8B2234 → #E02535 (hover red)
rgba(111,25,41, → rgba(205,30,43, (any alpha)
#9B3A4A → #E04050 (badge accent in Layout.tsx)
```

- [ ] **Step 4: Verify the theme compiles**

```powershell
cd C:\Users\marcos\Desktop\club-riverplate
npx tailwindcss --content "./src/**/*.{ts,tsx}" --output /dev/null 2>&1
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "rebrand: River Plate red/white theme"
```

---

## Task 4: Rebrand — Logos, titles, and text

**Files:**
- Modify: `index.html`
- Modify: `package.json`
- Create: `public/river-escudo.png` (copy from `public/escudos/argentina/river.png`)
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/auth/AuthModal.tsx`
- Modify: `src/utils/pdfExport.ts`
- Modify: `src/utils/smartPdfExport.ts`

- [ ] **Step 1: Copy River escudo to root public/**

```powershell
Copy-Item "public/escudos/argentina/river.png" "public/river-escudo.png"
```

- [ ] **Step 2: Update index.html**

```html
<title>Club Atlético River Plate Platform</title>
```

- [ ] **Step 3: Update package.json**

```json
"name": "river-plate-platform",
```

- [ ] **Step 4: Update Layout.tsx login page**

Replace all instances:
- `"Club Atlético Lanús Platform"` → `"Club Atlético River Plate Platform"`
- `"/lanus-escudo.png"` → `"/river-escudo.png"`
- `"Plataforma institucional del Club Atlético Lanús"` → `"Plataforma institucional del Club Atlético River Plate"`
- `rgba(111,25,41,0.18)` → `rgba(205,30,43,0.15)` (the glow on login page)
- `style={{ background: '#9B3A4A' }}` → `style={{ background: '#CD1E2B' }}`
- `"Club Atlético<br />Lanús Platform"` → `"Club Atlético<br />River Plate Platform"`
- `"Plataforma institucional del Club Atlético Lanús para la gestión, scouting y análisis integral de jugadores."` → `"Plataforma institucional del Club Atlético River Plate para la gestión, scouting y análisis integral de jugadores."`

- [ ] **Step 5: Update Footer.tsx**

```tsx
// Line 11:
src="/river-escudo.png"
// Line 12:
alt="Club Atlético River Plate Platform"
// Line 16:
Club Atlético River Plate Platform
```

- [ ] **Step 6: Update Navbar.tsx logo references**

Search for `lanus-escudo` or `lanus-logo` and replace with `river-escudo` / `river-logo`. Search for "Lanús" text and replace with "River Plate".

- [ ] **Step 7: Update AuthModal.tsx**

```tsx
// Line ~273:
'Ingresá con tu cuenta de Club Atlético River Plate Platform'
```

- [ ] **Step 8: Update PDF export utils**

In `src/utils/pdfExport.ts`:
```
"Club Atlético Lanús Platform" → "Club Atlético River Plate Platform"
```
(3 occurrences: lines 285, 290, 318)

In `src/utils/smartPdfExport.ts`:
```
"Club Atlético Lanús Platform" → "Club Atlético River Plate Platform"
"Informe generado con Club Atlético Lanús Platform" → "Informe generado con Club Atlético River Plate Platform"
```
(4 occurrences: lines 298, 363, 368, 540)

- [ ] **Step 9: Update scoring.ts comment**

In `src/constants/scoring.ts` line 24:
```
// OLD: Hoja "Ultimo partido" — stats Wyscout del partido más reciente de Lanús
// NEW: Hoja "Ultimo partido" — stats Wyscout del partido más reciente de River
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "rebrand: River Plate logos, titles, and text across all files"
```

---

## Task 5: Configure environment and Supabase

**Files:**
- Create: `.env.local`
- Modify: `src/lib/supabase.ts` (storageKey rename)

- [ ] **Step 1: Create .env.local**

```env
VITE_SUPABASE_URL=https://zetwitxcsqsrxrstfwls.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpldHdpdHhjc3Fzcnhyc3Rmd2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTE3MjMsImV4cCI6MjA5NTYyNzcyM30.pxKx2gi_FyHzTHv6Mi0s8O6Pdww4ZQRDjDXREU5461Y
API_FOOTBALL_KEY=0a19133a26e831fd2e61488b18e2a1d0
```

- [ ] **Step 2: Update Supabase storage key**

In `src/lib/supabase.ts` line 18:

```ts
// OLD:
storageKey: 'scout-platform-auth',
// NEW:
storageKey: 'river-platform-auth',
```

This prevents localStorage collisions if both platforms are open in the same browser.

- [ ] **Step 3: Create Supabase tables via SQL**

Connect to Supabase Dashboard (`https://zetwitxcsqsrxrstfwls.supabase.co`) and run:

```sql
-- seguimiento table
CREATE TABLE IF NOT EXISTS public.seguimiento (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_key text NOT NULL UNIQUE,
  player_name text NOT NULL,
  team text,
  league text,
  position text,
  age integer,
  image_url text,
  added_by uuid NOT NULL,
  added_by_name text,
  source text DEFAULT 'ficha' CHECK (source IN ('ficha', 'reporte', 'manual')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- formations table
CREATE TABLE IF NOT EXISTS public.formations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  formation_type text NOT NULL,
  players jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT false
);

-- comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_key text NOT NULL,
  text text NOT NULL,
  sentiment text DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_by uuid NOT NULL,
  created_by_name text,
  created_at timestamptz DEFAULT now()
);

-- video_analysis table
CREATE TABLE IF NOT EXISTS public.video_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  video_url text,
  match_date date,
  rival text,
  competition text,
  xml_data jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- scout_evaluations table
CREATE TABLE IF NOT EXISTS public.scout_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_key text NOT NULL,
  player_name text NOT NULL,
  evaluator_id uuid NOT NULL,
  evaluator_name text,
  scores jsonb NOT NULL DEFAULT '{}',
  notes text,
  recommendation text,
  created_at timestamptz DEFAULT now()
);

-- score_history table
CREATE TABLE IF NOT EXISTS public.score_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_key text NOT NULL,
  score numeric NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.seguimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read/write
CREATE POLICY "Authenticated users full access" ON public.seguimiento FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.formations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.comments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.video_analysis FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.scout_evaluations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.score_history FOR ALL USING (auth.role() = 'authenticated');
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "config: Supabase credentials and storage key for River"
```

Note: `.env.local` is in `.gitignore` so it won't be committed. The commit is for the `supabase.ts` change.

---

## Task 6: Configure API-Football for River Plate

**Files:**
- Modify: `src/services/apiFootballService.ts`

- [ ] **Step 1: Look up River Plate team ID**

River Plate's API-Football team ID is **435** (CA River Plate, Argentina).
The current season is **2025** (Argentine league runs Jan–Dec).

League IDs:
- Liga Profesional Argentina: **128**
- Copa Argentina: **130**
- Copa Libertadores: **13**

- [ ] **Step 2: Update apiFootballService.ts constants**

```ts
// OLD (line 2):
const LANUS_ID = 446

// NEW:
const RIVER_ID = 435
```

- [ ] **Step 3: Replace all LANUS_ID references with RIVER_ID**

In `src/services/apiFootballService.ts`, replace every occurrence:

```
LANUS_ID → RIVER_ID
```

Specific lines:
- Line 54: `isHome: raw.teams.home.id === RIVER_ID,`
- Line 75: `` `/fixtures?team=${RIVER_ID}&season=${CURRENT_SEASON}&last=${count}` ``
- Line 80: `` `/fixtures?team=${RIVER_ID}&season=${CURRENT_SEASON}&next=${count}` ``
- Line 85: `` `/fixtures?team=${RIVER_ID}&season=${CURRENT_SEASON}` ``
- Line 91: `const riverLineup = raw.find((l: any) => l.team.id === RIVER_ID)`
- Line 218: `team: e.team.id === RIVER_ID ? 'river' : 'rival',`
- Line 226: `const riverRaw = lineupsRaw.find((l: any) => l.team.id === RIVER_ID)`
- Line 227: `const rivalRaw = lineupsRaw.find((l: any) => l.team.id !== RIVER_ID)`
- Line 250: `lineup: mapLineup(riverRaw),`

Also rename variable names:
- `lanusLineup` → `riverLineup`
- `lanusGoals` → `riverGoals`
- `lanusRaw` → `riverRaw`

- [ ] **Step 4: Update team string references**

```
'lanus' → 'river'  (in team identifier strings, line 189 and 218)
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "config: API-Football team ID for River Plate (435)"
```

---

## Task 7: Configure FotMob for River Plate

**Files:**
- Modify: `src/services/fotmobService.ts`

- [ ] **Step 1: Update FotMob team ID**

River Plate's FotMob team ID is **6033**.

In `src/services/fotmobService.ts` line 102:

```ts
// OLD:
const res = await fetch('/fotmob-proxy/prod/pub/api/v2/calendar/team/10082.ics')

// NEW:
const res = await fetch('/fotmob-proxy/prod/pub/api/v2/calendar/team/6033.ics')
```

- [ ] **Step 2: Update team name detection**

In `src/services/fotmobService.ts` line ~53:

```ts
// OLD:
.includes('lanus')

// NEW:
.includes('river')
```

Update any comment referencing "Lanús" to "River Plate". Line ~37:

```ts
// OLD: FotMob: "Lanús - River Plate" | "Racing Club - Lanús"
// NEW: FotMob: "River Plate - Boca Juniors" | "Racing Club - River Plate"
```

Line ~69:

```ts
// OLD: return 'liga' // default for Lanús — most matches are liga
// NEW: return 'liga' // default for River — most matches are liga
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "config: FotMob team ID for River Plate (6033)"
```

---

## Task 8: Create river2026.ts match data

**Files:**
- Create: `src/data/river2026.ts` (replaces `src/data/lanus2026.ts`)
- Delete: `src/data/lanus2026.ts`
- Modify: all files importing from `lanus2026`

- [ ] **Step 1: Create river2026.ts with River Plate season data**

Create `src/data/river2026.ts` with the same `MatchData` interface and export `RIVER_2026`. Populate with River Plate's actual 2025/2026 season results. The data structure is identical to `lanus2026.ts`:

```ts
export type Competition = 'liga' | 'copa' | 'internacional'
export type Result = 'W' | 'D' | 'L'

export interface MatchData {
  id: number
  date: string
  rival: string
  isHome: boolean
  competition: Competition
  result: Result
  golesAFavor: number
  golesEnContra: number
  duration: number
  formation: string
  xG: number
  tiros: number
  tirosPorteria: number
  tirosPorteria_pct: number
  posesion: number
  pases: number
  pasesLogrados: number
  pases_pct: number
  duelos: number
  duelosGanados: number
  duelos_pct: number
  ataquesPositionales: number
  ataquesPositionalesRemate: number
  contraataques: number
  contraataquesRemate: number
  balonParado: number
  balonParadoRemate: number
  corners: number
  centros: number
  centrosPrecisos: number
  pasesEnProfundidad: number
  golesRecibidos: number
  tirosContra: number
  tirosContraPorteria: number
  duelosDefensivos: number
  duelosDefensivosGanados: number
  duelosDefensivos_pct: number
  duelosAereos: number
  duelosAereosGanados: number
  duelosAereos_pct: number
  interceptaciones: number
  despejes: number
  faltas: number
  amarillas: number
  rojas: number
  pasesUltimoTercio: number
  pasesUltimoTercioLogrados: number
  pasesUltimoTercio_pct: number
  pasesProgresivos: number
  pasesProgresivosLogrados: number
  pasesProgresivos_pct: number
  ppda: number
  intensidadPaso: number
  scorers?: string[]
  assisters?: string[]
  posesion_rival?: number
  amarillas_rival?: number
  faltas_rival?: number
  corners_rival?: number
}

export const RIVER_2026: MatchData[] = [
  // Populate with River Plate actual match data from the current season
  // Use API-Football or Wyscout data to fill this in
  // Placeholder with at least 5 matches to start
]
```

Populate with real River Plate 2025 season matches. Use web search or API-Football to get actual match stats.

- [ ] **Step 2: Delete lanus2026.ts**

```powershell
Remove-Item "src/data/lanus2026.ts" -Confirm:$false
```

- [ ] **Step 3: Update all imports**

Search for all files importing from `lanus2026`:

```
import { LANUS_2026 → import { RIVER_2026
from '@/data/lanus2026' → from '@/data/river2026'
```

Key files to update:
- `src/pages/EquipoPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/CalendarPage.tsx`
- Any other file referencing `LANUS_2026`

- [ ] **Step 4: Replace LANUS_2026 usage with RIVER_2026**

In every file that used `LANUS_2026`, replace with `RIVER_2026`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "data: River Plate 2026 season match data"
```

---

## Task 9: Update Vite config and Netlify

**Files:**
- Modify: `vite.config.ts`
- Modify: `netlify.toml`
- Modify: `netlify/functions/apifootball.js`

- [ ] **Step 1: Update Vite dev server port**

In `vite.config.ts` line 58:

```ts
// OLD:
port: 5180,

// NEW:
port: 5173,
```

- [ ] **Step 2: Update netlify.toml CSP**

In `netlify.toml` line 76, remove `https://api.anthropic.com` from the `connect-src` CSP directive:

```toml
# OLD:
connect-src 'self' https://*.supabase.co https://docs.google.com https://site.api.espn.com wss://*.supabase.co https://api.anthropic.com;

# NEW:
connect-src 'self' https://*.supabase.co https://docs.google.com https://site.api.espn.com wss://*.supabase.co;
```

- [ ] **Step 3: Verify apifootball.js Netlify function**

Check `netlify/functions/apifootball.js` — it should read the API key from environment variable `API_FOOTBALL_KEY`. This will be set in Netlify dashboard at deploy time. No code change needed if it already reads from `process.env.API_FOOTBALL_KEY`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "config: Vite port 5173, Netlify CSP cleanup"
```

---

## Task 10: Update DataContext tier list

**Files:**
- Modify: `src/context/DataContext.tsx`

- [ ] **Step 1: Update Argentina tier lists**

In `src/context/DataContext.tsx` line ~192, River Plate should NOT be in any tier list (since it's our own club, not a scouting target). Move `river` / `river plate` out if present, or just verify the tiers make sense from River's perspective.

Check if there are references like:
```ts
const ARGENTINA_TIER_3 = ['lanus', ...]
```

If `lanus` appears in a tier, that's fine — from River's perspective, Lanús is another Argentine club. No change needed unless River appears somewhere it shouldn't.

- [ ] **Step 2: Commit (if changes needed)**

```bash
git add -A
git commit -m "data: adjust tier list from River's perspective"
```

---

## Task 11: Create CLAUDE.md for new project

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write project documentation**

```markdown
# River Plate Platform

Plataforma institucional de scouting de River Plate.

## Ejecutar el proyecto

\`\`\`bash
npm install    # Instalar dependencias
npm run dev    # Servidor de desarrollo (http://localhost:5173)
\`\`\`

## Build para producción

\`\`\`bash
npm run build    # Compila TypeScript y genera bundle
npm run preview  # Previsualiza el build
\`\`\`

## Stack

- React 18 + TypeScript
- Vite 7
- Tailwind CSS
- Recharts (gráficos)
- Supabase (auth + DB)
- API-Football (datos del club)
- PapaParse (CSV)
- jsPDF + html2canvas (exportar PDF)

## Estructura

- \`src/pages/\` - Páginas principales
- \`src/components/\` - Componentes UI
- \`src/context/DataContext.tsx\` - Carga y provee datos de jugadores
- \`src/constants/scoring.ts\` - URLs de Google Sheets y configuración de métricas
- \`src/services/\` - Servicios de datos (API-Football, FotMob, CSV, Supabase)
- \`src/data/river2026.ts\` - Datos de partidos de la temporada

## Datos

- Scouting externo: Google Sheets publicados como CSV
- Datos del club: API-Football (team ID: 435)
- FotMob team ID: 6033
- Supabase: auth, seguimiento, formaciones, comentarios, video analysis

## Colores

- Rojo River: \`#CD1E2B\`
- Hover: \`#E02535\`
- Dark: \`#111111\`
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for River Plate platform"
```

---

## Task 12: Full verification

- [ ] **Step 1: Type check**

```powershell
cd C:\Users\marcos\Desktop\club-riverplate
npx tsc --noEmit
```

Fix any TypeScript errors.

- [ ] **Step 2: Start dev server**

```powershell
cd C:\Users\marcos\Desktop\club-riverplate
npm run dev
```

Verify it starts on port 5173.

- [ ] **Step 3: Visual verification checklist**

Open `http://localhost:5173` and verify:

1. Login page shows River Plate escudo, red branding, correct text
2. After login, Navbar shows River Plate branding
3. Dashboard loads with River Plate data
4. Footer shows River Plate escudo and name
5. No "Lanús" text anywhere visible
6. No AI chat bubble visible
7. Brand colors are red (#CD1E2B), not granate (#6F1929)
8. Dark mode works with red accents
9. Scouting pages load player data from Google Sheets
10. PDF export shows "Club Atlético River Plate Platform"

- [ ] **Step 4: Test key functionality**

1. External scouting page filters and search work
2. Player detail page loads with radar chart
3. Comparison page works
4. Calendar page attempts to load River fixtures
5. Formation builder renders

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "verified: River Plate platform fully operational"
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Fork project to new directory | 5 min |
| 2 | Remove AI Chat components | 10 min |
| 3 | Rebrand — Tailwind theme + colors | 5 min |
| 4 | Rebrand — Logos, titles, text | 10 min |
| 5 | Configure Supabase | 10 min |
| 6 | Configure API-Football | 5 min |
| 7 | Configure FotMob | 3 min |
| 8 | Create river2026.ts | 15 min |
| 9 | Update Vite + Netlify config | 5 min |
| 10 | Update DataContext tiers | 3 min |
| 11 | Create CLAUDE.md | 3 min |
| 12 | Full verification | 10 min |
| **Total** | | **~85 min** |
