// ─── Rival Analysis Service ───────────────────────────────────────────────────
// Procesa múltiples archivos (PDF, imagen, CSV) y los fusiona en un único
// objeto RivalData usando Wyscout parser para PDFs y Claude AI para análisis.

import { parseWyscoutPdf, extractRawPdfText, type ZoneCellData, type CornerKicker, type PlayerStat, type RecentMatch, type TeamStats } from './wyscoutParser'
import Papa from 'papaparse'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type FileSourceType = 'pdf' | 'image' | 'csv' | 'excel'

export interface FileSource {
  name: string
  type: FileSourceType
}

// ─── Formaciones por partido ──────────────────────────────────────────────────

export interface FormationPlayer {
  number: number | null
  name: string
  role: string  // GK | CB | LB | RB | LWB | RWB | DM | CM | AM | LM | RM | LW | RW | CF | SS
  goals: number
  assists: number
  yellowCard: boolean
  redCard: boolean
  minutesPlayed: number
  subbedOff: boolean
  subbedOffAt: number | null
  subbedIn: boolean
  subbedInAt: number | null
  subbedFor: string | null
}

export interface MatchFormation {
  date: string          // DD.MM.YYYY
  opponent: string
  isHome: boolean
  goalsFor: number
  goalsAgainst: number
  result: 'W' | 'D' | 'L'
  competition: string
  formation: string     // ej: "4-3-3"
  players: FormationPlayer[]
  injured: string[]
  suspended: string[]
}

// ─── Análisis completo Wyscout ────────────────────────────────────────────────

export interface DuelPlayer {
  name: string
  won: number
  lost: number
  pct: number
}

export interface CrossPlayer {
  name: string
  total: number
  successful: number
  pct: number
  xA?: number
}

export interface CrossReceiver {
  name: string
  received: number
  successful: number
}

export interface ShotPlayer {
  name: string
  shots: number
  onTarget: number
  goals: number
  xG?: number
  minutes?: number
}

export interface SetPieceKicker {
  name: string
  total: number
  left: number
  right: number
}

// Zonas del arco (perspectiva del arquero): 9 secciones + disparos afuera
export interface GoalSectionData { shots: number; goals: number }
export interface GoalSections {
  topLeft: GoalSectionData; topCenter: GoalSectionData; topRight: GoalSectionData
  midLeft: GoalSectionData; midCenter: GoalSectionData; midRight: GoalSectionData
  botLeft: GoalSectionData; botCenter: GoalSectionData; botRight: GoalSectionData
  missed: number  // disparos que salieron afuera del arco
}

// Mapa de zonas de cancha (3 columnas × 3 filas)
export interface PitchZoneCell { count: number; won?: number; lost?: number; goals?: number }
export interface PitchZoneMap {
  defLeft: PitchZoneCell; defCenter: PitchZoneCell; defRight: PitchZoneCell
  midLeft: PitchZoneCell; midCenter: PitchZoneCell; midRight: PitchZoneCell
  atkLeft: PitchZoneCell; atkCenter: PitchZoneCell; atkRight: PitchZoneCell
}

export interface WyscoutFullAnalysis {
  teamName: string
  recentFormations: MatchFormation[]
  formationUsage: { formation: string; pct: number }[]
  overallStats: {
    partidos?: number
    victorias?: number
    empates?: number
    derrotas?: number
    goles?: number
    golesContra?: number
    avgXG?: number
    avgPosesion?: number
    avgPPDA?: number
    shotsTotal?: number
    shotsOnTarget?: number
    shotsOnTargetPct?: number
  }
  defensiveDuels: {
    totalWon: number
    totalLost: number
    topPlayers: DuelPlayer[]
  }
  aerialDuels: {
    totalWon: number
    totalLost: number
    topPlayers: DuelPlayer[]
  }
  crosses: {
    total: number
    successful: number
    pct: number
    topCrossers: CrossPlayer[]
    topReceivers: CrossReceiver[]
  }
  dribbles: {
    total: number
    successful: number
    pct: number
    topDribblers: CrossPlayer[]
  }
  highRecoveries: { name: string; count: number }[]
  shots: {
    total: number
    onTarget: number
    pct: number
    xG?: number
    goals: number
    byType: { type: string; count: number; goals: number; xG?: number }[]
    byPlayer: ShotPlayer[]
  }
  corners: {
    total: number
    left: number
    right: number
    goals: number
    kickers: SetPieceKicker[]
  }
  freeKicks: {
    total: number
    left: number
    right: number
    goals: number
    kickers: SetPieceKicker[]
  }
  // Mapas de zona (opcionales — si el PDF los tiene)
  goalSections?: GoalSections
  shotPitchZones?: PitchZoneMap
  duelZones?: PitchZoneMap
  recoveryZones?: PitchZoneMap
  tacticalNotes: string[]
  strengths: string[]
  weaknesses: string[]
  keyPlayers: string[]
}

// ─── PDF Page Insights (IA visual) ───────────────────────────────────────────

export interface PageInsight {
  title: string
  description: string
  bullets: string[]
  keyNumbers: { label: string; value: string }[]
}

export interface PdfPageInsight {
  pageNum: number
  /** shots | heatmap | duels | setpiece | stats | formation | other */
  sectionType?: string
  insight: PageInsight
}

// ─── RivalData ────────────────────────────────────────────────────────────────

export interface RivalData {
  teamName: string
  // Formaciones de los últimos partidos
  recentFormations: MatchFormation[]
  // Análisis completo (Claude)
  fullAnalysis?: WyscoutFullAnalysis
  // Mapas de zona (del PDF Wyscout regex parser)
  recoveries: ZoneCellData[][] | null
  losses: ZoneCellData[][] | null
  // Córneres (regex parser)
  cornersLeft: number
  cornersRight: number
  cornersGoals: number
  cornersKickers: CornerKicker[]
  // Estadísticas (regex parser)
  teamStats: TeamStats
  players: PlayerStat[]
  recentMatches: RecentMatch[]
  // Análisis IA (legacy)
  tacticalNotes: string[]
  strengths: string[]
  weaknesses: string[]
  formation: string | null
  // Insights visuales de páginas PDF (persiste en localStorage, imágenes no)
  pdfPageInsights?: PdfPageInsight[]
  // Cantidad de partidos que cubre este análisis (input manual)
  matchesAnalyzed?: number
  // Meta
  sources: FileSource[]
  parsedAt: string
}

// Respuesta parcial de un solo archivo
export type PartialRivalData = Omit<RivalData, 'parsedAt'>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file, 'utf-8')
  })
}

// ─── Claude call (texto → JSON estructurado) ──────────────────────────────────

// Prompt A: formaciones + táctica (JSON más liviano)
const PROMPT_FORMATIONS = `Sos un analista de fútbol profesional especializado en Wyscout. Analizá este informe y extraé ÚNICAMENTE los datos de formaciones, partidos y análisis táctico.

Devolvé ÚNICAMENTE JSON válido con esta estructura exacta (null para campos sin datos, arrays vacíos si no hay):

{
  "teamName": "string",
  "recentFormations": [
    {
      "date": "DD.MM.YYYY",
      "opponent": "string",
      "isHome": boolean,
      "goalsFor": number,
      "goalsAgainst": number,
      "result": "W" | "D" | "L",
      "competition": "string",
      "formation": "string (ej: 4-4-2)",
      "players": [
        {
          "number": number | null,
          "name": "string (apellido abreviado)",
          "role": "GK|CB|LB|RB|LWB|RWB|DM|CM|AM|LM|RM|LW|RW|CF|SS",
          "goals": number,
          "assists": number,
          "yellowCard": boolean,
          "redCard": boolean,
          "minutesPlayed": number,
          "subbedOff": boolean,
          "subbedOffAt": number | null,
          "subbedIn": boolean,
          "subbedInAt": number | null,
          "subbedFor": string | null
        }
      ],
      "injured": [],
      "suspended": []
    }
  ],
  "formationUsage": [{"formation": "4-4-2", "pct": 70}],
  "overallStats": {
    "partidos": number | null,
    "victorias": number | null,
    "empates": number | null,
    "derrotas": number | null,
    "goles": number | null,
    "golesContra": number | null,
    "avgXG": number | null,
    "avgPosesion": number | null,
    "avgPPDA": number | null,
    "shotsTotal": number | null,
    "shotsOnTarget": number | null,
    "shotsOnTargetPct": number | null
  },
  "tacticalNotes": ["string (máx 5, observaciones concretas del sistema)"],
  "strengths": ["string (máx 4, concretos y tácticos)"],
  "weaknesses": ["string (máx 4, concretos y tácticos)"],
  "keyPlayers": ["string (3-5 jugadores más determinantes)"]
}

REGLAS:
- recentFormations: hasta 5 partidos más recientes, del más reciente al más antiguo
- Cada partido: exactamente 11 jugadores ordenados GK → DEF (izq→der) → MID (izq→der) → FWD (izq→der)
- result SIEMPRE desde la perspectiva de teamName
- isHome=true si teamName jugó de local
- subbedIn=true para sustitutos, subbedFor es el jugador que reemplazaron
- Respondé SOLO con JSON válido, sin markdown, sin texto antes ni después`

// Prompt B: estadísticas individuales y colectivas (datos tabulares)
const PROMPT_STATS = `Sos un analista de fútbol profesional especializado en Wyscout. Analizá este informe y extraé ÚNICAMENTE las estadísticas de duelos, centros, regates, tiros, córneres y tiros libres.

Devolvé ÚNICAMENTE JSON válido con esta estructura exacta (0 para números sin datos, arrays vacíos si no hay):

{
  "defensiveDuels": {
    "totalWon": number,
    "totalLost": number,
    "topPlayers": [{"name": "string", "won": number, "lost": number, "pct": number}]
  },
  "aerialDuels": {
    "totalWon": number,
    "totalLost": number,
    "topPlayers": [{"name": "string", "won": number, "lost": number, "pct": number}]
  },
  "crosses": {
    "total": number,
    "successful": number,
    "pct": number,
    "topCrossers": [{"name": "string", "total": number, "successful": number, "pct": number, "xA": number | null}],
    "topReceivers": [{"name": "string", "received": number, "successful": number}]
  },
  "dribbles": {
    "total": number,
    "successful": number,
    "pct": number,
    "topDribblers": [{"name": "string", "total": number, "successful": number, "pct": number}]
  },
  "highRecoveries": [{"name": "string", "count": number}],
  "shots": {
    "total": number,
    "onTarget": number,
    "pct": number,
    "xG": number | null,
    "goals": number,
    "byType": [{"type": "string", "count": number, "goals": number, "xG": number | null}],
    "byPlayer": [{"name": "string", "shots": number, "onTarget": number, "goals": number, "xG": number | null, "minutes": number | null}]
  },
  "corners": {
    "total": number,
    "left": number,
    "right": number,
    "goals": number,
    "kickers": [{"name": "string", "total": number, "left": number, "right": number}]
  },
  "freeKicks": {
    "total": number,
    "left": number,
    "right": number,
    "goals": number,
    "kickers": [{"name": "string", "total": number, "left": number, "right": number}]
  },
  "goalSections": {
    "topLeft":    {"shots": number, "goals": number},
    "topCenter":  {"shots": number, "goals": number},
    "topRight":   {"shots": number, "goals": number},
    "midLeft":    {"shots": number, "goals": number},
    "midCenter":  {"shots": number, "goals": number},
    "midRight":   {"shots": number, "goals": number},
    "botLeft":    {"shots": number, "goals": number},
    "botCenter":  {"shots": number, "goals": number},
    "botRight":   {"shots": number, "goals": number},
    "missed":     number
  },
  "shotPitchZones": {
    "defLeft":    {"count": number, "goals": number},
    "defCenter":  {"count": number, "goals": number},
    "defRight":   {"count": number, "goals": number},
    "midLeft":    {"count": number, "goals": number},
    "midCenter":  {"count": number, "goals": number},
    "midRight":   {"count": number, "goals": number},
    "atkLeft":    {"count": number, "goals": number},
    "atkCenter":  {"count": number, "goals": number},
    "atkRight":   {"count": number, "goals": number}
  },
  "duelZones": {
    "defLeft":    {"count": number, "won": number, "lost": number},
    "defCenter":  {"count": number, "won": number, "lost": number},
    "defRight":   {"count": number, "won": number, "lost": number},
    "midLeft":    {"count": number, "won": number, "lost": number},
    "midCenter":  {"count": number, "won": number, "lost": number},
    "midRight":   {"count": number, "won": number, "lost": number},
    "atkLeft":    {"count": number, "won": number, "lost": number},
    "atkCenter":  {"count": number, "won": number, "lost": number},
    "atkRight":   {"count": number, "won": number, "lost": number}
  },
  "recoveryZones": {
    "defLeft":    {"count": number},
    "defCenter":  {"count": number},
    "defRight":   {"count": number},
    "midLeft":    {"count": number},
    "midCenter":  {"count": number},
    "midRight":   {"count": number},
    "atkLeft":    {"count": number},
    "atkCenter":  {"count": number},
    "atkRight":   {"count": number}
  }
}

REGLAS:
- "pct" en duelos: porcentaje de duelos ganados sobre el total del jugador
- "pct" en centros: precisión (completados/total × 100)
- "pct" en regates: porcentaje de éxito (exitosos/total × 100)
- goalSections: distribución de los tiros AL ARCO por zona del arco (perspectiva del arquero). Si el informe tiene un "shot map" o "zona de tiro", extraé los números. Si no hay datos exactos por zona, estimá desde byType e inside/outside área
- shotPitchZones: zonas de la cancha DESDE DONDE se tiraron. "atk" = tercio ofensivo, "mid" = mediocampo, "def" = tercio defensivo. Izq/Centro/Der desde perspectiva del equipo
- duelZones: distribución geográfica de duelos defensivos en cancha
- recoveryZones: distribución de recuperaciones de balón en cancha
- Si no hay datos para un campo de zona, usá 0
- Respondé SOLO con JSON válido, sin markdown, sin texto antes ni después`

const PROMPT_ANALYZE_GENERIC = `Sos un analista de fútbol profesional. Analizá el contenido provisto sobre un equipo de fútbol y extraé TODA la información disponible.

Devolvé ÚNICAMENTE JSON válido con esta estructura (usá null para campos no encontrados, arrays vacíos si no hay datos):

{
  "teamName": "nombre del equipo o null",
  "teamStats": {
    "partidos": número o null,
    "victorias": número o null,
    "empates": número o null,
    "derrotas": número o null,
    "goles": número o null,
    "golesContra": número o null,
    "avgXG": número decimal o null,
    "avgPosesion": número (ej: 58.3) o null,
    "avgPPDA": número decimal o null
  },
  "players": [
    { "name": "apellido nombre", "position": "GK/CB/LB/RB/CMF/DMF/AMF/LW/RW/CF/SS", "goals": número, "assists": número, "matches": número, "number": número o null }
  ],
  "recentMatches": [
    { "homeTeam": "nombre", "homeScore": número, "awayScore": número, "awayTeam": "nombre", "competition": "nombre", "date": "DD.MM.YYYY", "isHome": boolean, "result": "W"|"D"|"L" }
  ],
  "tacticalNotes": ["nota táctica concisa"],
  "strengths": ["fortaleza observable"],
  "weaknesses": ["debilidad observable"],
  "formation": "4-3-3 o null"
}

Para recentMatches, "isHome" y "result" son desde la perspectiva del equipo analizado (teamName).
Respondé SOLO con JSON válido, sin markdown ni texto adicional.`

interface ClaudeGenericResponse {
  teamName?: string | null
  teamStats?: Partial<TeamStats> | null
  players?: PlayerStat[]
  recentMatches?: RecentMatch[]
  tacticalNotes?: string[]
  strengths?: string[]
  weaknesses?: string[]
  formation?: string | null
}

function repairTruncatedJson(jsonStr: string): string {
  // Intenta cerrar un JSON truncado rastreando brackets/braces abiertas
  const stack: string[] = []
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }

  // Si quedamos dentro de un string, cerrarlo
  let repaired = jsonStr
  if (inString) repaired += '"'

  // Quitar coma trailing si la hay antes de cerrar
  repaired = repaired.replace(/,\s*$/, '')

  // Cerrar todos los brackets/braces pendientes en orden inverso
  while (stack.length > 0) {
    repaired += stack.pop()
  }

  return repaired
}

function extractJson<T>(text: string): T {
  const m = text.match(/\{[\s\S]*/)
  if (!m) throw new Error('Claude no devolvió JSON válido')

  let jsonStr = m[0]
  // Recortar hasta el último } que cierra el objeto raíz
  const lastBrace = jsonStr.lastIndexOf('}')
  if (lastBrace !== -1) {
    jsonStr = jsonStr.slice(0, lastBrace + 1)
  }

  try {
    return JSON.parse(jsonStr) as T
  } catch {
    // JSON truncado: intentar reparar
    const repaired = repairTruncatedJson(jsonStr)
    try {
      return JSON.parse(repaired) as T
    } catch (e2) {
      throw new Error(`JSON inválido incluso tras reparación: ${String(e2)}`)
    }
  }
}

// ─── Llamada a Claude (texto o imagen) ───────────────────────────────────────

async function callClaude(
  messageContent: unknown,
  model = 'claude-sonnet-4-6',
  maxTokens = 8192
): Promise<string> {
  const endpoint = import.meta.env.DEV ? '/anthropic-proxy' : '/.netlify/functions/analyze-rival'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: messageContent }] }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error API Claude ${res.status}: ${err.slice(0, 300)}`)
  }
  const data = await res.json()
  return data?.content?.[0]?.text ?? ''
}

// ─── analyzePdfPages: imágenes de páginas → insights tácticos por Claude ─────

import type { PdfPage } from './pdfImageService'

export async function analyzePdfPages(pages: PdfPage[]): Promise<PdfPageInsight[]> {
  if (!pages.length) return []

  // Límite de 8 páginas para reducir latencia (las más relevantes están primero)
  const limited = pages.slice(0, 8)
  const n = limited.length

  const prompt = `Analista de fútbol. ${n} páginas de un informe de scouting.
Para CADA imagen, clasificá y extraé insights tácticos clave.

JSON array con exactamente ${n} objetos en orden:
[{"title":"título breve","description":"1 oración","bullets":["insight con dato concreto","patrón clave"],"keyNumbers":[{"label":"métrica","value":"número+unidad"}],"sectionType":"shots|heatmap|duels|setpiece|stats|formation|other"}]

- shots: zonas arco, lado preferido, goles, xG
- heatmap: zonas influencia, presión alta/baja
- duels: % ganados por zona, jugadores top
- setpiece: córner/tiro libre, lado, ejecutores
- stats: xG, posesión, PPDA, pases
- formation: sistema, variantes
- other: páginas sin visualización → bullets:[], keyNumbers:[]

Solo JSON, sin markdown.`

  const imageBlocks = limited.map(p => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/jpeg' as const,
      data: p.dataUrl.startsWith('data:') ? p.dataUrl.split(',')[1] ?? p.dataUrl : p.dataUrl,
    },
  }))

  try {
    // Haiku es mucho más rápido para clasificar/resumir imágenes visualmente
    const text = await callClaude(
      [...imageBlocks, { type: 'text', text: prompt }],
      'claude-haiku-4-5-20251001',
      3000,
    )
    const m = text.match(/\[[\s\S]*\]/)
    if (!m) return []

    const arr = JSON.parse(repairTruncatedJson(m[0])) as (PageInsight & { sectionType?: string })[]
    return arr.map((insight, j) => {
      const page = limited[j]
      if (!page) return null
      return {
        pageNum: page.pageNum,
        sectionType: insight.sectionType ?? 'other',
        insight: {
          title: insight.title ?? `Página ${page.pageNum}`,
          description: insight.description ?? '',
          bullets: Array.isArray(insight.bullets) ? insight.bullets : [],
          keyNumbers: Array.isArray(insight.keyNumbers) ? insight.keyNumbers : [],
        },
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null) as PdfPageInsight[]
  } catch (e) {
    console.warn('Error analizando páginas PDF:', e)
    return []
  }
}

// ─── analyzeWyscoutComprehensive: texto del PDF → 2 llamadas Claude paralelas ──

type FormationsResult = Pick<
  WyscoutFullAnalysis,
  'teamName' | 'recentFormations' | 'formationUsage' | 'overallStats' | 'tacticalNotes' | 'strengths' | 'weaknesses' | 'keyPlayers'
>

type StatsResult = Pick<
  WyscoutFullAnalysis,
  'defensiveDuels' | 'aerialDuels' | 'crosses' | 'dribbles' | 'highRecoveries' | 'shots' | 'corners' | 'freeKicks' | 'goalSections' | 'shotPitchZones' | 'duelZones' | 'recoveryZones'
>

function normalizeFormations(parsed: Partial<FormationsResult>): FormationsResult {
  return {
    teamName: parsed.teamName ?? '',
    recentFormations: (parsed.recentFormations ?? []).map(f => ({
      date: f.date ?? '',
      opponent: f.opponent ?? '',
      isHome: f.isHome ?? false,
      goalsFor: f.goalsFor ?? 0,
      goalsAgainst: f.goalsAgainst ?? 0,
      result: f.result ?? 'D',
      competition: f.competition ?? '',
      formation: f.formation ?? '',
      players: (f.players ?? []).map(p => ({
        number: p.number ?? null,
        name: p.name ?? '',
        role: p.role ?? '',
        goals: p.goals ?? 0,
        assists: p.assists ?? 0,
        yellowCard: p.yellowCard ?? false,
        redCard: p.redCard ?? false,
        minutesPlayed: p.minutesPlayed ?? 90,
        subbedOff: p.subbedOff ?? false,
        subbedOffAt: p.subbedOffAt ?? null,
        subbedIn: p.subbedIn ?? false,
        subbedInAt: p.subbedInAt ?? null,
        subbedFor: p.subbedFor ?? null,
      })),
      injured: f.injured ?? [],
      suspended: f.suspended ?? [],
    })),
    formationUsage: parsed.formationUsage ?? [],
    overallStats: parsed.overallStats ?? {},
    tacticalNotes: parsed.tacticalNotes ?? [],
    strengths: parsed.strengths ?? [],
    weaknesses: parsed.weaknesses ?? [],
    keyPlayers: parsed.keyPlayers ?? [],
  }
}

const EMPTY_ZONE_MAP: PitchZoneMap = {
  defLeft: { count: 0 }, defCenter: { count: 0 }, defRight: { count: 0 },
  midLeft: { count: 0 }, midCenter: { count: 0 }, midRight: { count: 0 },
  atkLeft: { count: 0 }, atkCenter: { count: 0 }, atkRight: { count: 0 },
}

const EMPTY_GOAL: GoalSections = {
  topLeft: { shots: 0, goals: 0 }, topCenter: { shots: 0, goals: 0 }, topRight: { shots: 0, goals: 0 },
  midLeft: { shots: 0, goals: 0 }, midCenter: { shots: 0, goals: 0 }, midRight: { shots: 0, goals: 0 },
  botLeft: { shots: 0, goals: 0 }, botCenter: { shots: 0, goals: 0 }, botRight: { shots: 0, goals: 0 },
  missed: 0,
}

function mergeZone(a?: PitchZoneCell): PitchZoneCell {
  return { count: a?.count ?? 0, won: a?.won, lost: a?.lost, goals: a?.goals }
}

function normalizeZoneMap(raw?: Partial<PitchZoneMap>): PitchZoneMap {
  if (!raw) return EMPTY_ZONE_MAP
  return {
    defLeft: mergeZone(raw.defLeft), defCenter: mergeZone(raw.defCenter), defRight: mergeZone(raw.defRight),
    midLeft: mergeZone(raw.midLeft), midCenter: mergeZone(raw.midCenter), midRight: mergeZone(raw.midRight),
    atkLeft: mergeZone(raw.atkLeft), atkCenter: mergeZone(raw.atkCenter), atkRight: mergeZone(raw.atkRight),
  }
}

function hasZoneData(m: PitchZoneMap): boolean {
  return Object.values(m).some(z => z.count > 0)
}

function normalizeGoalSections(raw?: Partial<GoalSections>): GoalSections | undefined {
  if (!raw) return undefined
  const g: GoalSections = {
    topLeft:   raw.topLeft   ?? { shots: 0, goals: 0 },
    topCenter: raw.topCenter ?? { shots: 0, goals: 0 },
    topRight:  raw.topRight  ?? { shots: 0, goals: 0 },
    midLeft:   raw.midLeft   ?? { shots: 0, goals: 0 },
    midCenter: raw.midCenter ?? { shots: 0, goals: 0 },
    midRight:  raw.midRight  ?? { shots: 0, goals: 0 },
    botLeft:   raw.botLeft   ?? { shots: 0, goals: 0 },
    botCenter: raw.botCenter ?? { shots: 0, goals: 0 },
    botRight:  raw.botRight  ?? { shots: 0, goals: 0 },
    missed:    raw.missed ?? 0,
  }
  const totalShots = Object.values(g).reduce((s, v) =>
    s + (typeof v === 'number' ? v : v.shots), 0)
  return totalShots > 0 ? g : undefined
}

function normalizeStats(parsed: Partial<StatsResult>): StatsResult {
  const duelZonesRaw = normalizeZoneMap(parsed.duelZones as Partial<PitchZoneMap> | undefined)
  const recoveryZonesRaw = normalizeZoneMap(parsed.recoveryZones as Partial<PitchZoneMap> | undefined)
  const shotPitchZonesRaw = normalizeZoneMap(parsed.shotPitchZones as Partial<PitchZoneMap> | undefined)

  return {
    defensiveDuels: {
      totalWon: parsed.defensiveDuels?.totalWon ?? 0,
      totalLost: parsed.defensiveDuels?.totalLost ?? 0,
      topPlayers: parsed.defensiveDuels?.topPlayers ?? [],
    },
    aerialDuels: {
      totalWon: parsed.aerialDuels?.totalWon ?? 0,
      totalLost: parsed.aerialDuels?.totalLost ?? 0,
      topPlayers: parsed.aerialDuels?.topPlayers ?? [],
    },
    crosses: {
      total: parsed.crosses?.total ?? 0,
      successful: parsed.crosses?.successful ?? 0,
      pct: parsed.crosses?.pct ?? 0,
      topCrossers: parsed.crosses?.topCrossers ?? [],
      topReceivers: parsed.crosses?.topReceivers ?? [],
    },
    dribbles: {
      total: parsed.dribbles?.total ?? 0,
      successful: parsed.dribbles?.successful ?? 0,
      pct: parsed.dribbles?.pct ?? 0,
      topDribblers: parsed.dribbles?.topDribblers ?? [],
    },
    highRecoveries: parsed.highRecoveries ?? [],
    shots: {
      total: parsed.shots?.total ?? 0,
      onTarget: parsed.shots?.onTarget ?? 0,
      pct: parsed.shots?.pct ?? 0,
      xG: parsed.shots?.xG ?? undefined,
      goals: parsed.shots?.goals ?? 0,
      byType: parsed.shots?.byType ?? [],
      byPlayer: parsed.shots?.byPlayer ?? [],
    },
    corners: {
      total: parsed.corners?.total ?? 0,
      left: parsed.corners?.left ?? 0,
      right: parsed.corners?.right ?? 0,
      goals: parsed.corners?.goals ?? 0,
      kickers: parsed.corners?.kickers ?? [],
    },
    freeKicks: {
      total: parsed.freeKicks?.total ?? 0,
      left: parsed.freeKicks?.left ?? 0,
      right: parsed.freeKicks?.right ?? 0,
      goals: parsed.freeKicks?.goals ?? 0,
      kickers: parsed.freeKicks?.kickers ?? [],
    },
    goalSections: normalizeGoalSections(parsed.goalSections as Partial<GoalSections> | undefined),
    shotPitchZones: hasZoneData(shotPitchZonesRaw) ? shotPitchZonesRaw : undefined,
    duelZones: hasZoneData(duelZonesRaw) ? duelZonesRaw : undefined,
    recoveryZones: hasZoneData(recoveryZonesRaw) ? recoveryZonesRaw : undefined,
  }
}

// Prompt combinado: formaciones + stats en una sola llamada para minimizar tiempo de ejecución
const PROMPT_COMBINED = `Sos un analista de fútbol profesional especializado en Wyscout. Analizá este informe y devolvé DOS secciones de análisis en un único JSON.

Devolvé ÚNICAMENTE JSON válido con esta estructura (sin markdown, sin texto adicional):

{
  "formations": {
    "teamName": "string",
    "recentFormations": [
      {
        "date": "DD.MM.YYYY",
        "opponent": "string",
        "isHome": boolean,
        "goalsFor": number,
        "goalsAgainst": number,
        "result": "W"|"D"|"L",
        "competition": "string",
        "formation": "string (ej: 4-4-2)",
        "players": [
          {
            "number": number|null,
            "name": "string (apellido)",
            "role": "GK|CB|LB|RB|LWB|RWB|DM|CM|AM|LM|RM|LW|RW|CF|SS",
            "goals": number,
            "assists": number,
            "yellowCard": boolean,
            "redCard": boolean,
            "minutesPlayed": number,
            "subbedOff": boolean,
            "subbedOffAt": number|null,
            "subbedIn": boolean,
            "subbedInAt": number|null,
            "subbedFor": string|null
          }
        ],
        "injured": [],
        "suspended": []
      }
    ],
    "formationUsage": [{"formation": "4-4-2", "pct": 70}],
    "overallStats": {
      "partidos": number|null,
      "victorias": number|null,
      "empates": number|null,
      "derrotas": number|null,
      "goles": number|null,
      "golesContra": number|null,
      "avgXG": number|null,
      "avgPosesion": number|null,
      "avgPPDA": number|null,
      "shotsTotal": number|null,
      "shotsOnTarget": number|null,
      "shotsOnTargetPct": number|null
    },
    "tacticalNotes": ["string (máx 5)"],
    "strengths": ["string (máx 4)"],
    "weaknesses": ["string (máx 4)"],
    "keyPlayers": ["string (3-5 jugadores)"]
  },
  "stats": {
    "defensiveDuels": {"totalWon": number, "totalLost": number, "topPlayers": [{"name": "string", "won": number, "lost": number, "pct": number}]},
    "aerialDuels": {"totalWon": number, "totalLost": number, "topPlayers": [{"name": "string", "won": number, "lost": number, "pct": number}]},
    "crosses": {"total": number, "successful": number, "pct": number, "topCrossers": [{"name": "string", "total": number, "successful": number, "pct": number, "xA": number|null}], "topReceivers": [{"name": "string", "received": number, "successful": number}]},
    "dribbles": {"total": number, "successful": number, "pct": number, "topDribblers": [{"name": "string", "total": number, "successful": number, "pct": number}]},
    "highRecoveries": [{"name": "string", "count": number}],
    "shots": {"total": number, "onTarget": number, "pct": number, "xG": number|null, "goals": number, "byType": [{"type": "string", "count": number, "goals": number, "xG": number|null}], "byPlayer": [{"name": "string", "shots": number, "onTarget": number, "goals": number, "xG": number|null, "minutes": number|null}]},
    "corners": {"total": number, "left": number, "right": number, "goals": number, "kickers": [{"name": "string", "total": number, "left": number, "right": number}]},
    "freeKicks": {"total": number, "left": number, "right": number, "goals": number, "kickers": [{"name": "string", "total": number, "left": number, "right": number}]},
    "goalSections": {"topLeft": {"shots": number, "goals": number}, "topCenter": {"shots": number, "goals": number}, "topRight": {"shots": number, "goals": number}, "midLeft": {"shots": number, "goals": number}, "midCenter": {"shots": number, "goals": number}, "midRight": {"shots": number, "goals": number}, "botLeft": {"shots": number, "goals": number}, "botCenter": {"shots": number, "goals": number}, "botRight": {"shots": number, "goals": number}, "missed": number},
    "shotPitchZones": {"defLeft": {"count": number, "goals": number}, "defCenter": {"count": number, "goals": number}, "defRight": {"count": number, "goals": number}, "midLeft": {"count": number, "goals": number}, "midCenter": {"count": number, "goals": number}, "midRight": {"count": number, "goals": number}, "atkLeft": {"count": number, "goals": number}, "atkCenter": {"count": number, "goals": number}, "atkRight": {"count": number, "goals": number}},
    "duelZones": {"defLeft": {"count": number, "won": number, "lost": number}, "defCenter": {"count": number, "won": number, "lost": number}, "defRight": {"count": number, "won": number, "lost": number}, "midLeft": {"count": number, "won": number, "lost": number}, "midCenter": {"count": number, "won": number, "lost": number}, "midRight": {"count": number, "won": number, "lost": number}, "atkLeft": {"count": number, "won": number, "lost": number}, "atkCenter": {"count": number, "won": number, "lost": number}, "atkRight": {"count": number, "won": number, "lost": number}},
    "recoveryZones": {"defLeft": {"count": number}, "defCenter": {"count": number}, "defRight": {"count": number}, "midLeft": {"count": number}, "midCenter": {"count": number}, "midRight": {"count": number}, "atkLeft": {"count": number}, "atkCenter": {"count": number}, "atkRight": {"count": number}}
  }
}

REGLAS:
- recentFormations: hasta 5 partidos más recientes, del más reciente al más antiguo
- Cada partido: exactamente 11 jugadores titulares ordenados GK → DEF → MID → FWD
- result SIEMPRE desde la perspectiva del teamName
- isHome=true si teamName jugó de local
- Respondé SOLO con JSON válido, sin markdown, sin texto antes ni después`

export async function analyzeWyscoutComprehensive(file: File): Promise<WyscoutFullAnalysis> {
  const rawText = await extractRawPdfText(file)
  // 20k chars: suficiente para formaciones + stats, garantiza respuesta dentro del timeout de Netlify
  const truncated = rawText.slice(0, 20000)
  const pdfSection = `\n\nTEXTO DEL PDF:\n${truncated}`

  // Una sola llamada Haiku con ambas secciones → ~5-8s en producción
  const combined = await callClaude(`${PROMPT_COMBINED}${pdfSection}`, 'claude-haiku-4-5-20251001', 6000)

  let parsedCombined: { formations?: Partial<FormationsResult>; stats?: Partial<StatsResult> } = {}
  try {
    parsedCombined = extractJson<typeof parsedCombined>(combined)
  } catch (e) {
    console.warn('analyzeWyscoutComprehensive: error parseando JSON combinado', e)
  }

  const formations = normalizeFormations(parsedCombined.formations ?? {})
  const stats = normalizeStats(parsedCombined.stats ?? {})

  return { ...formations, ...stats }
}

// ─── Llamada genérica para imágenes/CSV ──────────────────────────────────────

async function callAnalyzeGeneric(
  type: 'image' | 'text',
  content: string,
  mimeType?: string
): Promise<ClaudeGenericResponse> {
  let messageContent: unknown
  if (type === 'image') {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const mediaType = validTypes.includes(mimeType ?? '') ? mimeType : 'image/jpeg'
    messageContent = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: content } },
      { type: 'text', text: PROMPT_ANALYZE_GENERIC },
    ]
  } else {
    messageContent = `${PROMPT_ANALYZE_GENERIC}\n\nCONTENIDO:\n${content.slice(0, 50000)}`
  }
  const text = await callClaude(messageContent, 'claude-haiku-4-5-20251001', 2048)
  return extractJson<ClaudeGenericResponse>(text)
}

// ─── Convertir WyscoutData → PartialRivalData ─────────────────────────────────

function wyscoutToPartial(
  data: Awaited<ReturnType<typeof parseWyscoutPdf>>,
  fileName: string,
  fullAnalysis?: WyscoutFullAnalysis
): PartialRivalData {
  return {
    teamName: fullAnalysis?.teamName || data.teamName || '',
    recentFormations: fullAnalysis?.recentFormations ?? [],
    fullAnalysis,
    recoveries: data.recoveries,
    losses: data.losses,
    cornersLeft: data.cornersLeft,
    cornersRight: data.cornersRight,
    cornersGoals: data.cornersGoals,
    cornersKickers: data.cornersKickers,
    teamStats: data.teamStats,
    players: data.players,
    recentMatches: data.recentMatches,
    tacticalNotes: fullAnalysis?.tacticalNotes ?? [],
    strengths: fullAnalysis?.strengths ?? [],
    weaknesses: fullAnalysis?.weaknesses ?? [],
    formation: null,
    sources: [{ name: fileName, type: 'pdf' }],
    pdfPageInsights: undefined,
    matchesAnalyzed: undefined,
  }
}

// ─── Convertir respuesta genérica de Claude → PartialRivalData ───────────────

function claudeToPartial(data: ClaudeGenericResponse, source: FileSource): PartialRivalData {
  return {
    teamName: data.teamName ?? '',
    recentFormations: [],
    fullAnalysis: undefined,
    recoveries: null,
    losses: null,
    cornersLeft: 0,
    cornersRight: 0,
    cornersGoals: 0,
    cornersKickers: [],
    teamStats: data.teamStats ?? {},
    players: (data.players ?? []).map(p => ({
      number: p.number ?? 0,
      name: p.name ?? '',
      position: p.position ?? '',
      matches: p.matches ?? 0,
      totalMinutes: 0,
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
    })),
    recentMatches: (data.recentMatches ?? []).map(m => ({
      homeTeam: m.homeTeam ?? '',
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
      awayTeam: m.awayTeam ?? '',
      competition: m.competition ?? '',
      date: m.date ?? '',
      isHome: m.isHome ?? false,
      result: m.result ?? 'D',
    })),
    tacticalNotes: data.tacticalNotes ?? [],
    strengths: data.strengths ?? [],
    weaknesses: data.weaknesses ?? [],
    formation: data.formation ?? null,
    sources: [source],
    pdfPageInsights: undefined,
    matchesAnalyzed: undefined,
  }
}

// ─── Merge de múltiples resultados ────────────────────────────────────────────

function unique<T>(arr: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return arr.filter(item => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function mergeTeamStats(items: TeamStats[]): TeamStats {
  const merged: TeamStats = {}
  const keys: (keyof TeamStats)[] = [
    'partidos', 'victorias', 'empates', 'derrotas', 'goles', 'golesContra',
    'avgXG', 'avgPosesion', 'avgPPDA', 'avgPases', 'avgTiros', 'avgTirosPorteria',
    'ataquesPositionales', 'contraataques', 'balonParado', 'pasesProgresivos', 'interceptaciones',
  ]
  for (const k of keys) {
    const vals = items.map(s => s[k]).filter((v): v is number => v !== undefined && v !== null)
    if (vals.length > 0) {
      const isAvg = k.startsWith('avg')
      merged[k] = isAvg
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : Math.max(...vals)
    }
  }
  return merged
}

export function mergeRivalData(partials: PartialRivalData[]): RivalData {
  if (partials.length === 0) throw new Error('Sin datos para fusionar')

  const teamName = partials.find(p => p.teamName)?.teamName ?? ''

  const recoveries = partials.find(p => p.recoveries !== null)?.recoveries ?? null
  const losses = partials.find(p => p.losses !== null)?.losses ?? null

  const cornersLeft = partials.reduce((s, p) => s + p.cornersLeft, 0)
  const cornersRight = partials.reduce((s, p) => s + p.cornersRight, 0)
  const cornersGoals = partials.reduce((s, p) => s + p.cornersGoals, 0)
  const cornersKickers = unique(
    partials.flatMap(p => p.cornersKickers),
    k => k.name
  )

  const teamStats = mergeTeamStats(partials.map(p => p.teamStats))

  const allPlayers = partials.flatMap(p => p.players)
  const players = unique(allPlayers, p => p.name.toLowerCase())

  const allMatches = partials.flatMap(p => p.recentMatches)
  const recentMatches = unique(
    allMatches,
    m => `${m.date}-${m.homeTeam}-${m.awayTeam}`
  ).sort((a, b) => {
    const parseDate = (d: string) => {
      const [dd, mm, yyyy] = d.split('.')
      return `${yyyy}-${mm}-${dd}`
    }
    return parseDate(b.date).localeCompare(parseDate(a.date))
  })

  const tacticalNotes = unique(partials.flatMap(p => p.tacticalNotes), s => s.toLowerCase().slice(0, 30))
  const strengths = unique(partials.flatMap(p => p.strengths), s => s.toLowerCase().slice(0, 30))
  const weaknesses = unique(partials.flatMap(p => p.weaknesses), s => s.toLowerCase().slice(0, 30))
  const formation = partials.find(p => p.formation)?.formation ?? null

  const allFormations = partials.flatMap(p => p.recentFormations ?? [])
  const recentFormations = unique(
    allFormations,
    f => `${f.date}-${f.opponent}`
  ).sort((a, b) => {
    const parseDate = (d: string) => {
      const [dd, mm, yyyy] = d.split('.')
      return `${yyyy ?? '0000'}-${mm ?? '00'}-${dd ?? '00'}`
    }
    return parseDate(b.date).localeCompare(parseDate(a.date))
  })

  // fullAnalysis: usar el primero disponible (típicamente del PDF principal)
  const fullAnalysis = partials.find(p => p.fullAnalysis)?.fullAnalysis

  const sources = partials.flatMap(p => p.sources)

  // PDF page insights: merge all (keep all unique page insights from all partials)
  const allInsights = partials.flatMap(p => p.pdfPageInsights ?? [])
  const pdfPageInsights = allInsights.length > 0
    ? unique(allInsights, ins => String(ins.pageNum))
    : undefined

  // matchesAnalyzed: take from the first partial that has it
  const matchesAnalyzed = partials.find(p => p.matchesAnalyzed !== undefined)?.matchesAnalyzed

  return {
    teamName, recentFormations, fullAnalysis, recoveries, losses,
    cornersLeft, cornersRight, cornersGoals, cornersKickers,
    teamStats, players, recentMatches,
    tacticalNotes, strengths, weaknesses, formation,
    pdfPageInsights, matchesAnalyzed,
    sources, parsedAt: new Date().toISOString(),
  }
}

// ─── Procesar un archivo individual ──────────────────────────────────────────

export interface FileProcessResult {
  file: File
  status: 'processing' | 'ok' | 'err'
  error?: string
  data?: PartialRivalData
}

export async function processFile(file: File): Promise<PartialRivalData> {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''

  // PDF → Wyscout regex parser + Claude comprehensive analysis en paralelo
  if (ext === 'pdf') {
    const [wyscoutResult, comprehensiveResult] = await Promise.allSettled([
      parseWyscoutPdf(file),
      analyzeWyscoutComprehensive(file),
    ])
    const wyscoutData = wyscoutResult.status === 'fulfilled' ? wyscoutResult.value : null
    const fullAnalysis = comprehensiveResult.status === 'fulfilled' ? comprehensiveResult.value : undefined

    if (comprehensiveResult.status === 'rejected') {
      console.warn('analyzeWyscoutComprehensive falló:', comprehensiveResult.reason)
    }

    if (wyscoutData) {
      return wyscoutToPartial(wyscoutData, file.name, fullAnalysis)
    }

    // Si falla wyscout pero tenemos fullAnalysis, construir partial desde fullAnalysis
    if (fullAnalysis) {
      return {
        teamName: fullAnalysis.teamName,
        recentFormations: fullAnalysis.recentFormations,
        fullAnalysis,
        recoveries: null,
        losses: null,
        cornersLeft: fullAnalysis.corners.left,
        cornersRight: fullAnalysis.corners.right,
        cornersGoals: fullAnalysis.corners.goals,
        cornersKickers: [],
        teamStats: {
          partidos: fullAnalysis.overallStats.partidos,
          victorias: fullAnalysis.overallStats.victorias,
          empates: fullAnalysis.overallStats.empates,
          derrotas: fullAnalysis.overallStats.derrotas,
          goles: fullAnalysis.overallStats.goles,
          golesContra: fullAnalysis.overallStats.golesContra,
          avgXG: fullAnalysis.overallStats.avgXG,
          avgPosesion: fullAnalysis.overallStats.avgPosesion,
          avgPPDA: fullAnalysis.overallStats.avgPPDA,
        },
        players: [],
        recentMatches: [],
        tacticalNotes: fullAnalysis.tacticalNotes,
        strengths: fullAnalysis.strengths,
        weaknesses: fullAnalysis.weaknesses,
        formation: fullAnalysis.recentFormations[0]?.formation ?? null,
        sources: [{ name: file.name, type: 'pdf' }],
        pdfPageInsights: undefined,
        matchesAnalyzed: undefined,
      }
    }

    return {
      teamName: '',
      recentFormations: [],
      fullAnalysis: undefined,
      recoveries: null,
      losses: null,
      cornersLeft: 0, cornersRight: 0, cornersGoals: 0, cornersKickers: [],
      teamStats: {}, players: [], recentMatches: [],
      tacticalNotes: [], strengths: [], weaknesses: [], formation: null,
      sources: [{ name: file.name, type: 'pdf' }],
      pdfPageInsights: undefined,
      matchesAnalyzed: undefined,
    }
  }

  // Imagen → Claude Vision
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
    const base64 = await fileToBase64(file)
    const result = await callAnalyzeGeneric('image', base64, file.type || 'image/jpeg')
    return claudeToPartial(result, { name: file.name, type: 'image' })
  }

  // CSV → detectar si es formato Wyscout team export (columna 0="Fecha", 1="Partido")
  // En ese caso parseamos directamente sin IA. Si no, mandamos a Claude.
  if (ext === 'csv') {
    const raw = await fileToText(file)
    if (isWyscoutTeamCsv(raw)) {
      return parseWyscoutTeamCsv(raw, file.name)
    }
    const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true })
    const preview = JSON.stringify(parsed.data.slice(0, 200), null, 2)
    const result = await callAnalyzeGeneric('text', preview, 'text/csv')
    return claudeToPartial(result, { name: file.name, type: 'csv' })
  }

  if (['xlsx', 'xls'].includes(ext)) {
    throw new Error('Excel no soportado directamente. Exportá el archivo como CSV desde Google Sheets o Excel.')
  }

  throw new Error(`Formato no soportado: .${ext}. Usá PDF, imagen (JPG/PNG) o CSV.`)
}

// ─── Wyscout team-stats CSV parser ────────────────────────────────────────────
// Detecta y parsea el CSV exportado de Wyscout para un equipo rival.
// Formato: fila 1 = headers, fila 2 = promedios del equipo, fila 3+ = partidos.

/** Índices de columnas en el CSV Wyscout export */
const W = {
  FECHA: 0, PARTIDO: 1, COMPETICION: 2, DURACION: 3, FORMACION: 4,
  GOLES: 5, XG: 6,
  TIROS: 7, TIROS_PORTERIA: 8, TIROS_PORTERIA_PCT: 9,
  PASES: 10, PASES_LOGRADOS: 11, PASES_PCT: 12,
  POSESION: 13,
  BALONES_PERDIDOS: 14,
  BALONES_RECUPERADOS: 18,
  DUELOS: 22, DUELOS_GANADOS: 23, DUELOS_PCT: 24,
  ATAQUES_POS: 28, ATAQUES_POS_REMATE: 29,
  CONTRAS: 31, CONTRAS_REMATE: 32,
  BALON_PARADO: 34,
  CORNERS: 37,
  CENTROS: 46, CENTROS_PRECISOS: 47,
  PASES_PROF: 49,
  DUELOS_OF: 53, DUELOS_OF_GANADOS: 54,
  FUERA_JUEGO: 56,
  GOLES_RECIBIDOS: 57,
  TIROS_CONTRA: 58, TIROS_CONTRA_PORTERIA: 59,
  DUELOS_DEF: 61, DUELOS_DEF_GANADOS: 62,
  DUELOS_AEREOS: 64, DUELOS_AEREOS_GANADOS: 65,
  INTERCEPTACIONES: 70,
  DESPEJES: 71,
  FALTAS: 72, AMARILLAS: 73, ROJAS: 74,
  PASES_ULTIMO_TERCIO: 87, PASES_ULTIMO_TERCIO_LOGRADOS: 88,
  PASES_PROGRESIVOS: 90, PASES_PROGRESIVOS_PRECISOS: 91,
  INTENSIDAD: 100,
  PPDA: 105,
} as const

/** Detecta si un texto CSV es el formato Wyscout team export */
export function isWyscoutTeamCsv(text: string): boolean {
  const firstLine = text.split('\n')[0] ?? ''
  const cols = firstLine.split(',')
  return (
    cols[0]?.trim().toLowerCase() === 'fecha' &&
    cols[1]?.trim().toLowerCase() === 'partido' &&
    cols[2]?.trim().toLowerCase().startsWith('competi')
  )
}

function n(row: string[], idx: number): number | undefined {
  const v = parseFloat(row[idx] ?? '')
  return isNaN(v) ? undefined : v
}

function parseFormation(raw: string): string {
  // "4-4-2 (100.0%)" → "4-4-2"
  return (raw ?? '').replace(/\s*\(.*\)/, '').trim()
}

/** Parsea el CSV Wyscout de un equipo rival y devuelve PartialRivalData */
export function parseWyscoutTeamCsv(text: string, fileName: string): PartialRivalData {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const rows = parsed.data as string[][]
  if (rows.length < 2) throw new Error('CSV vacío o formato incorrecto')

  // Fila 0 = headers (no la usamos con índices fijos)
  // Fila 1 = promedios del equipo (col 0 tiene el nombre del equipo, cols 1-4 vacías)
  // Fila 2+ = partidos individuales

  // Detectar fila de promedios (col 0 no es fecha YYYY-MM-DD)
  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  let avgRow: string[] | null = null
  const matchRows: string[][] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row[0]?.trim()) continue
    if (dateRe.test(row[0].trim())) {
      matchRows.push(row)
    } else if (!avgRow) {
      avgRow = row  // primera fila sin fecha = promedios
    }
  }

  const teamName = avgRow?.[W.FECHA]?.trim() ?? ''

  // ── Team stats desde la fila de promedios ──
  const teamStats: TeamStats = {}
  if (avgRow) {
    const r = avgRow
    const gf = n(r, W.GOLES) ?? 0
    const gc = n(r, W.GOLES_RECIBIDOS) ?? 0
    const totalMatchRows = matchRows.length

    teamStats.partidos    = totalMatchRows || undefined
    teamStats.victorias   = matchRows.filter(mr => {
      const g = parseInt(mr[W.GOLES] ?? '0')
      const gc2 = parseInt(mr[W.GOLES_RECIBIDOS] ?? '0')
      return g > gc2
    }).length || undefined
    teamStats.empates   = matchRows.filter(mr => {
      const g = parseInt(mr[W.GOLES] ?? '0')
      const gc2 = parseInt(mr[W.GOLES_RECIBIDOS] ?? '0')
      return g === gc2
    }).length || undefined
    teamStats.derrotas  = matchRows.filter(mr => {
      const g = parseInt(mr[W.GOLES] ?? '0')
      const gc2 = parseInt(mr[W.GOLES_RECIBIDOS] ?? '0')
      return g < gc2
    }).length || undefined
    teamStats.goles       = gf > 0 ? Math.round(gf * totalMatchRows) : undefined
    teamStats.golesContra = gc > 0 ? Math.round(gc * totalMatchRows) : undefined
    // Ataque
    teamStats.avgXG                    = n(r, W.XG)
    teamStats.avgTiros                 = n(r, W.TIROS)
    teamStats.avgTirosPorteria         = n(r, W.TIROS_PORTERIA)
    teamStats.avgTirosPorteria_pct     = n(r, W.TIROS_PORTERIA_PCT)
    teamStats.ataquesPositionales      = n(r, W.ATAQUES_POS)
    teamStats.ataquesPositionalesRemate = n(r, W.ATAQUES_POS_REMATE)
    teamStats.contraataques            = n(r, W.CONTRAS)
    teamStats.contraataquesRemate      = n(r, W.CONTRAS_REMATE)
    teamStats.balonParado              = n(r, W.BALON_PARADO)
    teamStats.avgCorners               = n(r, W.CORNERS)
    teamStats.avgCentros               = n(r, W.CENTROS)
    teamStats.avgCentros_pct           = n(r, W.CENTROS_PRECISOS) // col 47 = precisos, col 48 = pct
    // Posesión / pase
    teamStats.avgPosesion              = n(r, W.POSESION)
    teamStats.avgPases                 = n(r, W.PASES_PCT)
    teamStats.pasesProgresivos         = n(r, W.PASES_PROGRESIVOS)
    teamStats.avgPasesUltimoTercio_pct = n(r, W.PASES_ULTIMO_TERCIO_LOGRADOS)
    // Pressing
    teamStats.avgPPDA                  = n(r, W.PPDA)
    teamStats.avgBalonesRecuperados    = n(r, W.BALONES_RECUPERADOS)
    teamStats.avgBalonesPerdidos       = n(r, W.BALONES_PERDIDOS)
    teamStats.interceptaciones         = n(r, W.INTERCEPTACIONES)
    teamStats.avgDespejes              = n(r, W.DESPEJES)
    // Duelos
    teamStats.avgDuelos_pct            = n(r, W.DUELOS_PCT)
    teamStats.avgDuelosAereos_pct      = n(r, W.DUELOS_AEREOS_GANADOS)
    // Disciplina
    teamStats.avgFaltas                = n(r, W.FALTAS)
    teamStats.avgAmarillas             = n(r, W.AMARILLAS)
  }

  // ── Partidos recientes ──
  const recentMatches: RecentMatch[] = matchRows
    .sort((a, b) => b[W.FECHA].localeCompare(a[W.FECHA]))
    .map(row => {
      const date = row[W.FECHA]?.trim() ?? ''
      const partido = row[W.PARTIDO]?.trim() ?? ''  // "Equipo A - Equipo B 2:1"
      const competition = row[W.COMPETICION]?.trim() ?? ''
      const gf = parseInt(row[W.GOLES] ?? '0') || 0
      const gc = parseInt(row[W.GOLES_RECIBIDOS] ?? '0') || 0

      // Parsear "Team A - Team B N:N" → homeTeam, awayTeam, scores
      const matchPattern = /^(.+?)\s+-\s+(.+?)\s+(\d+):(\d+)$/
      const m = partido.match(matchPattern)
      let homeTeam = '', awayTeam = ''
      let homeScore = 0, awayScore = 0
      let isHome = true

      if (m) {
        homeTeam = m[1].trim()
        awayTeam = m[2].trim()
        homeScore = parseInt(m[3])
        awayScore = parseInt(m[4])
        // Determinar si el equipo analizado es local
        isHome = homeTeam.toLowerCase().includes(teamName.toLowerCase()) ||
                 teamName.toLowerCase().includes(homeTeam.toLowerCase())
      } else {
        homeTeam = teamName
        awayTeam = 'Desconocido'
        homeScore = gf
        awayScore = gc
      }

      const myScore = isHome ? homeScore : awayScore
      const theirScore = isHome ? awayScore : homeScore
      const result: 'W' | 'D' | 'L' = myScore > theirScore ? 'W' : myScore === theirScore ? 'D' : 'L'

      return { homeTeam, awayTeam, homeScore, awayScore, competition, date, isHome, result }
    })
    .slice(0, 20)

  // ── Formaciones recientes (desde match rows) ──
  const formationCounts: Record<string, number> = {}
  for (const row of matchRows) {
    const f = parseFormation(row[W.FORMACION] ?? '')
    if (f) formationCounts[f] = (formationCounts[f] ?? 0) + 1
  }
  const primaryFormation = Object.entries(formationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // ── Corners (total izq/der no disponible en este CSV, usamos total) ──
  const totalCorners = matchRows.reduce((s, r) => s + (parseInt(r[W.CORNERS] ?? '0') || 0), 0)

  return {
    teamName,
    recentFormations: [],
    fullAnalysis: undefined,
    recoveries: null,
    losses: null,
    cornersLeft: Math.round(totalCorners / 2),
    cornersRight: Math.round(totalCorners / 2),
    cornersGoals: 0,
    cornersKickers: [],
    teamStats,
    players: [],
    recentMatches,
    tacticalNotes: [],
    strengths: [],
    weaknesses: [],
    formation: primaryFormation,
    sources: [{ name: fileName, type: 'csv' }],
    pdfPageInsights: undefined,
    matchesAnalyzed: matchRows.length || undefined,
  }
}

// ─── Cargar datos del rival desde Google Sheets ───────────────────────────────
import { SHEET_URLS } from '@/constants/scoring'

export async function fetchRivalSheetData(): Promise<PartialRivalData> {
  const resp = await fetch(SHEET_URLS.rivalData)
  if (!resp.ok) throw new Error(`Error HTTP ${resp.status} al cargar Google Sheets`)
  const text = await resp.text()

  // Si Google devuelve HTML en vez de CSV = el sheet no está publicado en la web
  if (text.trim().startsWith('<') || text.trim().startsWith('<!')) {
    throw new Error('NEEDS_PUBLISH')
  }

  if (!isWyscoutTeamCsv(text)) {
    // Mostrar las primeras columnas para debug
    const preview = text.split('\n')[0]?.slice(0, 120) ?? ''
    throw new Error(`Formato inesperado. Primera línea: "${preview}"`)
  }

  return parseWyscoutTeamCsv(text, 'Google Sheets – Rival')
}

// ─── Tipos para "Último Partido" ──────────────────────────────────────────────

export interface UltimoPartidoStats {
  // Encabezado
  date: string
  match: string        // "Mirassol - Lanús 1:0"
  competition: string
  duration: number
  // Lanús
  lanus: {
    team: string
    formation: string
    goals: number
    golesContra: number
    xG: number
    tiros: number
    tirosPorteria: number
    tirosPorteria_pct: number
    posesion: number
    pases: number
    pasesPct: number
    duelos: number
    duelosGanados: number
    duelos_pct: number
    duelosAereos: number
    duelosAereosGanados: number
    duelosAereos_pct: number
    ataquesPos: number
    ataquePosRemate: number
    contras: number
    contrasRemate: number
    balonParado: number
    corners: number
    centros: number
    centrosPrecisos: number
    interceptaciones: number
    despejes: number
    faltas: number
    amarillas: number
    rojas: number
    ppda: number
    balonesRecuperados: number
    balonesPerdidos: number
    pasesProgresivos: number
    pasesUltimoTercio: number
    pasesUltimoTercio_pct: number
  }
  // Rival
  rival: {
    team: string
    formation: string
    goals: number
    golesContra: number
    xG: number
    tiros: number
    tirosPorteria: number
    tirosPorteria_pct: number
    posesion: number
    pases: number
    pasesPct: number
    duelos_pct: number
    duelosAereos_pct: number
    ataquesPos: number
    contras: number
    balonParado: number
    corners: number
    interceptaciones: number
    faltas: number
    amarillas: number
    ppda: number
  }
}

// Índices para el sheet "Ultimo partido" (tiene col extra "Equipo" en pos 4)
const WU = {
  FECHA: 0, PARTIDO: 1, COMPETICION: 2, DURACION: 3, EQUIPO: 4, FORMACION: 5,
  GOLES: 6, XG: 7,
  TIROS: 8, TIROS_PORTERIA: 9, TIROS_PORTERIA_PCT: 10,
  PASES: 11, PASES_LOGRADOS: 12, PASES_PCT: 13,
  POSESION: 14,
  BALONES_PERDIDOS: 15,
  BALONES_RECUPERADOS: 19,
  DUELOS: 23, DUELOS_GANADOS: 24, DUELOS_PCT: 25,
  ATAQUES_POS: 29, ATAQUES_POS_REMATE: 30,
  CONTRAS: 32, CONTRAS_REMATE: 33,
  BALON_PARADO: 35,
  CORNERS: 38,
  CENTROS: 47, CENTROS_PRECISOS: 48,
  GOLES_RECIBIDOS: 58,
  TIROS_CONTRA: 59,
  DUELOS_DEF: 62, DUELOS_DEF_GANADOS: 63, DUELOS_DEF_PCT: 64,
  DUELOS_AEREOS: 65, DUELOS_AEREOS_GANADOS: 66, DUELOS_AEREOS_PCT: 67,
  INTERCEPTACIONES: 71,
  DESPEJES: 72,
  FALTAS: 73, AMARILLAS: 74, ROJAS: 75,
  PASES_ULTIMO_TERCIO: 88, PASES_ULTIMO_TERCIO_PCT: 90,
  PASES_PROGRESIVOS: 91,
  PPDA: 106,
} as const

function nu(row: string[], idx: number): number {
  return parseFloat(row[idx] ?? '') || 0
}

export function parseUltimoPartidoCsv(text: string): UltimoPartidoStats | null {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false })
  const rows = parsed.data as string[][]
  if (rows.length < 3) return null  // need header + 2 data rows

  // Row 0 = headers, Row 1 = Lanús, Row 2 = rival
  const lanusRow = rows[1]
  const rivalRow = rows[2]
  if (!lanusRow || !rivalRow) return null

  const lanusTeam  = lanusRow[WU.EQUIPO]?.trim() ?? 'Lanús'
  const rivalTeam  = rivalRow[WU.EQUIPO]?.trim() ?? 'Rival'
  const lanusGoles = nu(lanusRow, WU.GOLES)
  const rivalGoles = nu(rivalRow, WU.GOLES)

  return {
    date:        lanusRow[WU.FECHA]?.trim() ?? '',
    match:       lanusRow[WU.PARTIDO]?.trim() ?? '',
    competition: lanusRow[WU.COMPETICION]?.trim() ?? '',
    duration:    nu(lanusRow, WU.DURACION),
    lanus: {
      team:               lanusTeam,
      formation:          (lanusRow[WU.FORMACION] ?? '').replace(/\s*\(.*\)/, '').trim(),
      goals:              lanusGoles,
      golesContra:        rivalGoles,
      xG:                 nu(lanusRow, WU.XG),
      tiros:              nu(lanusRow, WU.TIROS),
      tirosPorteria:      nu(lanusRow, WU.TIROS_PORTERIA),
      tirosPorteria_pct:  nu(lanusRow, WU.TIROS_PORTERIA_PCT),
      posesion:           nu(lanusRow, WU.POSESION),
      pases:              nu(lanusRow, WU.PASES),
      pasesPct:           nu(lanusRow, WU.PASES_PCT),
      duelos:             nu(lanusRow, WU.DUELOS),
      duelosGanados:      nu(lanusRow, WU.DUELOS_GANADOS),
      duelos_pct:         nu(lanusRow, WU.DUELOS_PCT),
      duelosAereos:       nu(lanusRow, WU.DUELOS_AEREOS),
      duelosAereosGanados: nu(lanusRow, WU.DUELOS_AEREOS_GANADOS),
      duelosAereos_pct:   nu(lanusRow, WU.DUELOS_AEREOS_PCT),
      ataquesPos:         nu(lanusRow, WU.ATAQUES_POS),
      ataquePosRemate:    nu(lanusRow, WU.ATAQUES_POS_REMATE),
      contras:            nu(lanusRow, WU.CONTRAS),
      contrasRemate:      nu(lanusRow, WU.CONTRAS_REMATE),
      balonParado:        nu(lanusRow, WU.BALON_PARADO),
      corners:            nu(lanusRow, WU.CORNERS),
      centros:            nu(lanusRow, WU.CENTROS),
      centrosPrecisos:    nu(lanusRow, WU.CENTROS_PRECISOS),
      interceptaciones:   nu(lanusRow, WU.INTERCEPTACIONES),
      despejes:           nu(lanusRow, WU.DESPEJES),
      faltas:             nu(lanusRow, WU.FALTAS),
      amarillas:          nu(lanusRow, WU.AMARILLAS),
      rojas:              nu(lanusRow, WU.ROJAS),
      ppda:               nu(lanusRow, WU.PPDA),
      balonesRecuperados: nu(lanusRow, WU.BALONES_RECUPERADOS),
      balonesPerdidos:    nu(lanusRow, WU.BALONES_PERDIDOS),
      pasesProgresivos:   nu(lanusRow, WU.PASES_PROGRESIVOS),
      pasesUltimoTercio:  nu(lanusRow, WU.PASES_ULTIMO_TERCIO),
      pasesUltimoTercio_pct: nu(lanusRow, WU.PASES_ULTIMO_TERCIO_PCT),
    },
    rival: {
      team:              rivalTeam,
      formation:         (rivalRow[WU.FORMACION] ?? '').replace(/\s*\(.*\)/, '').trim(),
      goals:             rivalGoles,
      golesContra:       lanusGoles,
      xG:                nu(rivalRow, WU.XG),
      tiros:             nu(rivalRow, WU.TIROS),
      tirosPorteria:     nu(rivalRow, WU.TIROS_PORTERIA),
      tirosPorteria_pct: nu(rivalRow, WU.TIROS_PORTERIA_PCT),
      posesion:          nu(rivalRow, WU.POSESION),
      pases:             nu(rivalRow, WU.PASES),
      pasesPct:          nu(rivalRow, WU.PASES_PCT),
      duelos_pct:        nu(rivalRow, WU.DUELOS_PCT),
      duelosAereos_pct:  nu(rivalRow, WU.DUELOS_AEREOS_PCT),
      ataquesPos:        nu(rivalRow, WU.ATAQUES_POS),
      contras:           nu(rivalRow, WU.CONTRAS),
      balonParado:       nu(rivalRow, WU.BALON_PARADO),
      corners:           nu(rivalRow, WU.CORNERS),
      interceptaciones:  nu(rivalRow, WU.INTERCEPTACIONES),
      faltas:            nu(rivalRow, WU.FALTAS),
      amarillas:         nu(rivalRow, WU.AMARILLAS),
      ppda:              nu(rivalRow, WU.PPDA),
    },
  }
}

export async function fetchUltimoPartidoData(): Promise<UltimoPartidoStats | null> {
  const resp = await fetch(SHEET_URLS.ultimoPartido)
  if (!resp.ok) throw new Error(`Error HTTP ${resp.status}`)
  const text = await resp.text()
  if (text.trim().startsWith('<')) throw new Error('NEEDS_PUBLISH')
  return parseUltimoPartidoCsv(text)
}
