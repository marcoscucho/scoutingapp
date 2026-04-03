// ─── Rival Data Service ───────────────────────────────────────────────────────
// Primary source: Google Sheets CSV (updated manually by the club per match).
// Fallback: FotMob API via proxy.

import { SHEET_URLS } from '@/constants/scoring'

export interface RivalRecentMatch {
  date: string
  partido: string
  competicion: string
  result: 'W' | 'D' | 'L'
  goalsFor: number
  goalsAgainst: number
  isHome: boolean
  formation: string
}

export interface RivalLineupPlayer {
  number: number
  name: string
  x: number
  y: number
}

export interface RivalData {
  name: string
  teamId?: number
  // Team averages (from first CSV row)
  avgXG?: number
  avgPosesion?: number
  avgGoles?: number
  avgGolesEnContra?: number
  avgPPDA?: number
  avgPases_pct?: number
  avgDuelos_pct?: number
  // Recent form (from match rows)
  recentForm: RivalRecentMatch[]
  // Lineup (from FotMob API, may be empty)
  lastLineup: RivalLineupPlayer[]
  lastFormation: string
  lastOpponent?: string
  lastResult?: string
}

// Formation coordinate maps (GK at bottom, attack toward top — FotMob standard order)
const FORMATION_COORDS: Record<string, [number, number][]> = {
  '4-3-3': [
    [50, 131], [82, 113], [62, 114], [38, 114], [18, 113],
    [76, 83], [50, 87], [24, 83],
    [76, 47], [50, 35], [24, 47],
  ],
  '4-4-2': [
    [50, 131], [82, 113], [62, 114], [38, 114], [18, 113],
    [78, 83], [56, 83], [44, 83], [22, 83],
    [65, 42], [35, 42],
  ],
  '4-2-3-1': [
    [50, 131], [82, 113], [62, 114], [38, 114], [18, 113],
    [65, 92], [35, 92],
    [76, 68], [50, 65], [24, 68],
    [50, 35],
  ],
  '3-5-2': [
    [50, 131], [70, 112], [50, 115], [30, 112],
    [82, 88], [62, 88], [50, 85], [38, 88], [18, 88],
    [65, 42], [35, 42],
  ],
  '4-1-4-1': [
    [50, 131], [82, 113], [62, 114], [38, 114], [18, 113],
    [50, 95],
    [78, 72], [57, 72], [43, 72], [22, 72],
    [50, 35],
  ],
}

function getFormationCoords(formation: string): [number, number][] {
  if (FORMATION_COORDS[formation]) return FORMATION_COORDS[formation]
  const base = formation.split(/[\s(]/)[0]
  return FORMATION_COORDS[base] ?? FORMATION_COORDS['4-3-3']
}

// Parse score string like "Botafogo - Mirassol 3:2" or "Mirassol - Santos 2:2"
// Returns { goalsFor, goalsAgainst, isHome, result }
function parseMatchScore(
  partido: string,
  teamName: string
): { goalsFor: number; goalsAgainst: number; isHome: boolean; result: 'W' | 'D' | 'L' } {
  // Match pattern: "Team A - Team B X:Y"
  const m = partido.match(/^(.+?)\s+-\s+(.+?)\s+(\d+):(\d+)$/)
  if (!m) return { goalsFor: 0, goalsAgainst: 0, isHome: false, result: 'D' }

  const [, homeTeam, , homeGoals, awayGoals] = m
  const hg = parseInt(homeGoals, 10)
  const ag = parseInt(awayGoals, 10)

  // Check if our team is home (team name appears in first part)
  const normTeam = teamName.toLowerCase().replace(/\s+fc$/i, '').trim()
  const normHome = homeTeam.toLowerCase().replace(/\s+fc$/i, '').trim()
  const isHome = normHome.includes(normTeam) || normTeam.includes(normHome)

  const goalsFor = isHome ? hg : ag
  const goalsAgainst = isHome ? ag : hg
  const result: 'W' | 'D' | 'L' = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D'

  return { goalsFor, goalsAgainst, isHome, result }
}

// Strip formation percentage like "4-2-3-1 (100.0%)" → "4-2-3-1"
function cleanFormation(raw: string): string {
  return (raw ?? '').split(/[\s(]/)[0].trim() || '4-3-3'
}

export async function fetchRivalDataFromCSV(teamName: string): Promise<RivalData | null> {
  try {
    const res = await fetch(SHEET_URLS.rivalData)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()

    // Parse CSV manually (PapaParse dependency avoided here for simplicity)
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return null

    const headers = parseCSVLine(lines[0])

    // First data row = team aggregate (no date/partido)
    const teamRow = parseCSVLine(lines[1])
    const rowObj = Object.fromEntries(headers.map((h, i) => [h.trim(), (teamRow[i] ?? '').trim()]))

    const avgXG = parseFloat(rowObj['xG'] ?? '') || undefined
    const avgGoles = parseFloat(rowObj['Goles'] ?? '') || undefined
    const avgPosesion = parseFloat(rowObj['Posesión del balón, %'] ?? rowObj['Posesi\u00f3n del bal\u00f3n, %'] ?? '') || undefined
    const avgPPDA = parseFloat(rowObj['PPDA'] ?? '') || undefined
    const avgPases_pct = parseFloat(rowObj['Pases / logrados']?.split('/')[1] ?? '') || undefined
    const avgGolesEnContra = parseFloat(rowObj['Goles recibidos'] ?? '') || undefined

    // Remaining rows = individual matches (most recent first in CSV)
    const recentForm: RivalRecentMatch[] = []
    for (let i = 2; i < Math.min(lines.length, 8); i++) {
      const cols = parseCSVLine(lines[i])
      const r = Object.fromEntries(headers.map((h, j) => [h.trim(), (cols[j] ?? '').trim()]))

      const fecha = r['Fecha'] ?? ''
      const partido = r['Partido'] ?? ''
      const competicion = r['Competición'] ?? r['Competici\u00f3n'] ?? ''
      if (!fecha || !partido) continue

      const formation = cleanFormation(r['Seleccionar esquema'] ?? '')
      const golesStr = r['Goles'] ?? ''
      const { goalsFor, goalsAgainst, isHome, result } = parseMatchScore(partido, teamName)

      recentForm.push({
        date: fecha,
        partido,
        competicion,
        result,
        goalsFor,
        goalsAgainst,
        isHome,
        formation,
      })
    }

    // Last formation used (most recent match)
    const lastFormation = recentForm[0]?.formation ?? '4-2-3-1'

    return {
      name: teamName,
      avgXG,
      avgGoles,
      avgGolesEnContra,
      avgPosesion,
      avgPPDA,
      recentForm,
      lastLineup: [],
      lastFormation,
    }
  } catch (e) {
    console.warn('fetchRivalDataFromCSV error:', e)
    return null
  }
}

// Try to get rival last lineup from FotMob API (best-effort)
function buildTeamUrl(teamId: number): string {
  if (import.meta.env.DEV) return `/fotmob-www/api/teams?id=${teamId}`
  return `/.netlify/functions/fotmob-team?teamId=${teamId}`
}
function buildMatchUrl(matchId: string): string {
  if (import.meta.env.DEV) return `/fotmob-www/api/matchDetails?matchId=${matchId}`
  return `/.netlify/functions/fotmob-match?matchId=${matchId}`
}

export async function fetchRivalLineup(teamId: number): Promise<{ lineup: RivalLineupPlayer[]; formation: string; opponent?: string; result?: string } | null> {
  try {
    const res = await fetch(buildTeamUrl(teamId), { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()

    const overview = data?.overview ?? {}
    const recentRaw: any[] = overview?.recentResults ?? overview?.recentMatches ?? []
    if (!recentRaw.length) return null

    const last = recentRaw[0]
    const matchId = String(last?.id ?? '')
    if (!matchId) return null

    const homeId = last?.home?.id ?? last?.homeTeamId
    const awayId = last?.away?.id ?? last?.awayTeamId
    const isHome = homeId === teamId
    const homeScore = parseInt(String(last?.home?.score ?? last?.homeScore ?? 0), 10)
    const awayScore = parseInt(String(last?.away?.score ?? last?.awayScore ?? 0), 10)
    const gf = isHome ? homeScore : awayScore
    const ga = isHome ? awayScore : homeScore
    const opponent = isHome
      ? (last?.away?.name ?? last?.opponentName ?? '')
      : (last?.home?.name ?? last?.opponentName ?? '')

    const matchRes = await fetch(buildMatchUrl(matchId), { headers: { Accept: 'application/json' } })
    if (!matchRes.ok) return null
    const matchData = await matchRes.json()

    const lineupGroups: any[] =
      matchData?.content?.lineup?.lineup ??
      matchData?.lineup?.lineup ??
      []

    const teamLineup = lineupGroups.find((l: any) => l.teamId === teamId || l.teamId === String(teamId))
    if (!teamLineup) return null

    const rawFormation = teamLineup.formation ?? '4-3-3'
    const starters: any[] = teamLineup.lineup ?? teamLineup.starters ?? []
    const coords = getFormationCoords(rawFormation)

    const lineup: RivalLineupPlayer[] = starters.slice(0, 11).map((p: any, i: number) => {
      const [x, y] = coords[i] ?? [50, 50]
      return {
        number: p.shirtNumber ?? p.jerseyNumber ?? i + 1,
        name: p.name?.shortName ?? p.name?.lastName ?? (typeof p.name === 'string' ? p.name.split(' ').pop() ?? '' : `#${i + 1}`),
        x,
        y,
      }
    })

    return { lineup, formation: rawFormation, opponent, result: `${gf}-${ga}` }
  } catch {
    return null
  }
}

// Minimal CSV line parser (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
