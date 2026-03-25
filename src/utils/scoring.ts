import { POSITION_MAP, SCORING_CONFIG } from '@/constants/scoring'
import type { RawExternalPlayer, RawInternalPlayer, EnrichedPlayer } from '@/types'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function parseMarketValue(raw: string): number {
  if (!raw || raw === '-' || raw === '') return 0

  const str = raw.trim().toLowerCase()

  // Handle Spanish format: "900 mil €", "1,5 mill €"
  const milMatch = str.match(/([\d.,]+)\s*mil+\s*€?/i)
  if (milMatch) {
    const numStr = milMatch[1].replace(',', '.')
    const num = parseFloat(numStr)
    if (!isNaN(num)) return num * 1_000
  }

  // Handle plain number with comma thousands separator: "3,000,000 €", "1,500,000 €"
  const plainMillions = str.match(/^([\d,]+)\s*€?$/)
  if (plainMillions) {
    const n = parseFloat(plainMillions[1].replace(/,/g, ''))
    if (!isNaN(n)) return n
  }

  // Handle Transfermarkt format: €200k, €2.80m, €1.5M, etc.
  const match = str.match(/[€$]?\s*([\d.,]+)\s*(k|m)?/i)
  if (match) {
    const numStr = match[1].replace(',', '.')
    const num = parseFloat(numStr)
    if (isNaN(num)) return 0

    const suffix = match[2]?.toLowerCase()
    if (suffix === 'm') return num * 1_000_000
    if (suffix === 'k') return num * 1_000
    return num
  }

  // Fallback: remove currency symbols and parse
  const cleaned = raw.replace(/[€$\s]/g, '').replace(/\./g, '').replace(/,/g, '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function formatMarketValue(value: number): string {
  if (!value || value === 0) return '-'
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `€${Math.round(value / 1_000)}K`
  return `€${value}`
}

export function parseContractDate(raw: string): Date | null {
  if (!raw || raw === '-' || raw === '') return null
  // Try DD/MM/YYYY
  const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]))
  }
  // Try YYYY-MM-DD
  const yyyymmdd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]))
  }
  return null
}

export function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

export function getNumericValue(player: Record<string, string>, column: string): number {
  const raw = player[column] ?? ''
  if (!raw || raw === '-') return 0
  const num = parseFloat(raw.replace(',', '.'))
  return isNaN(num) ? 0 : num
}

export function normalizeName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ─── ENRICHMENT ───────────────────────────────────────────────────────────────

// Rank-based normalization: value → 0-100 based on position within sorted array.
// More robust than min-max — an outlier only takes rank 1st, not distorts everyone else.
function rankNormalize(value: number, sortedAsc: number[]): number {
  const N = sortedAsc.length
  if (N <= 1) return 50
  const below = sortedAsc.filter(v => v < value).length
  const equal = sortedAsc.filter(v => v === value).length
  const rank = below + (equal - 1) / 2  // average rank for ties
  return Math.min(100, Math.max(0, (rank / (N - 1)) * 100))
}

function enrichPlayer(
  player: Record<string, string>,
  ggScore: number | null,
  ggScorePercentile: number | null,
  source: 'externo' | 'interno'
): EnrichedPlayer {
  const rawValue = player['Valor de mercado (Transfermarkt)'] ?? ''
  const marketValueRaw = parseMarketValue(rawValue)
  const contractDate = parseContractDate(player['Vencimiento contrato'] ?? '')
  const now = new Date()
  const monthsRemaining = contractDate ? monthsBetween(now, contractDate) : null
  // For internal players, use "Posición específica" as main position
  const posEspecifica = player['Posición específica'] ?? ''
  const posGeneral = player['Posición'] ?? ''

  return {
    Jugador: player['Jugador'] ?? '',
    Liga: player['Liga'] ?? '',
    Equipo: player['Equipo'] ?? '',
    'Posición': posEspecifica || posGeneral,
    Edad: player['Edad'] ?? '',
    'País de nacimiento': player['País de nacimiento'] ?? '',
    Pie: player['Pie'] ?? '',
    Altura: player['Altura'] ?? '',
    'Valor de mercado (Transfermarkt)': rawValue,
    'Vencimiento contrato': player['Vencimiento contrato'] ?? '',
    'Partidos jugados': player['Partidos jugados'] ?? '',
    'Minutos jugados': player['Minutos jugados'] ?? '',
    Goles: player['Goles'] ?? '',
    xG: player['xG'] ?? '',
    Asistencias: player['Asistencias'] ?? '',
    xA: player['xA'] ?? '',
    'Posición específica': player['Posición específica'] ?? '',
    id: player['id'] ?? '',
    Transfermkt: player['Transfermkt'] ?? '',
    'Nombre Completo': '',
    Representante: player['Representante'] ?? '',
    Imagen: player['Imagen'] ?? '',
    ggScore,
    source,
    contractStatus:
      monthsRemaining === null ? 'ok'
      : monthsRemaining < 7   ? 'critical'
      : monthsRemaining < 12  ? 'warning'
      : 'ok',
    monthsRemaining,
    marketValueFormatted: formatMarketValue(marketValueRaw),
    marketValueRaw,
    minutesPlayed: getNumericValue(player, 'Minutos jugados'),
    ageNum: parseInt(player['Edad'] ?? '0', 10) || 0,
    ggScorePercentile,
    // Spread all raw columns for stat access
    ...player,
  }
}

// ─── MAIN SCORING FUNCTION ────────────────────────────────────────────────────

function getPositionKey(player: Record<string, string>): string | null {
  // Internal uses "Posición específica", external uses "Posición"
  const rawPos = (player['Posición específica'] || player['Posición'])?.trim() ?? ''
  return POSITION_MAP[rawPos] ?? null
}

export function computeGGScores(
  players: (RawExternalPlayer | RawInternalPlayer)[],
  source: 'externo' | 'interno',
  precomputedScores?: Map<string, number | null>,
  precomputedPercentiles?: Map<string, number | null>
): EnrichedPlayer[] {
  // If we have precomputed scores, just use those
  if (precomputedScores) {
    return players.map(player => {
      const key = (player['Jugador'] ?? '') + '|' + (player['Equipo'] ?? '')
      const score = precomputedScores.get(key) ?? null
      const percentile = precomputedPercentiles?.get(key) ?? null
      return enrichPlayer(player as Record<string, string>, score, percentile, source)
    })
  }

  // Group players by normalized position key
  const byPosition = new Map<string, (RawExternalPlayer | RawInternalPlayer)[]>()
  for (const p of players) {
    const posKey = getPositionKey(p as Record<string, string>)
    if (!posKey) continue
    if (!byPosition.has(posKey)) byPosition.set(posKey, [])
    byPosition.get(posKey)!.push(p)
  }

  // Compute sorted values per metric per position group (for rank-based normalization)
  const positionSortedValues = new Map<string, Map<string, number[]>>()
  for (const [posKey, group] of byPosition) {
    const config = SCORING_CONFIG[posKey]
    if (!config) continue
    const sortedMap = new Map<string, number[]>()
    for (const { column } of config) {
      const values = group.map(p => getNumericValue(p as Record<string, string>, column))
      sortedMap.set(column, [...values].sort((a, b) => a - b))
    }
    positionSortedValues.set(posKey, sortedMap)
  }

  // First pass: compute ggScore for each player using rank-based normalization
  const playerKey = (p: RawExternalPlayer | RawInternalPlayer) =>
    ((p['Jugador'] ?? '') + '|' + (p['Equipo'] ?? '')) as string

  const rawScores = new Map<string, number | null>()
  for (const player of players) {
    const posKey = getPositionKey(player as Record<string, string>)
    const key = playerKey(player)

    if (!posKey || !SCORING_CONFIG[posKey]) {
      rawScores.set(key, null)
      continue
    }

    const config = SCORING_CONFIG[posKey]
    const sortedMap = positionSortedValues.get(posKey)!
    let score = 0
    for (const { column, weight } of config) {
      const raw = getNumericValue(player as Record<string, string>, column)
      const normalized = rankNormalize(raw, sortedMap.get(column)!)
      score += normalized * (weight / 100)
    }
    rawScores.set(key, Math.round(score * 10) / 10)
  }

  // Second pass: compute percentile rank within each position group
  const playerPercentiles = new Map<string, number | null>()
  for (const [posKey, group] of byPosition) {
    const groupWithScores = group
      .map(p => ({ key: playerKey(p), score: rawScores.get(playerKey(p)) ?? null }))
      .filter((x): x is { key: string; score: number } => x.score !== null)

    const N = groupWithScores.length
    if (N === 0) continue
    if (N === 1) {
      playerPercentiles.set(groupWithScores[0].key, 50)
      continue
    }

    const sorted = [...groupWithScores].sort((a, b) => a.score - b.score)
    sorted.forEach((x, i) => {
      playerPercentiles.set(x.key, Math.round((i / (N - 1)) * 100 * 10) / 10)
    })
    // Handle position key usage to avoid unused warning
    void posKey
  }

  // Build enriched players with score + percentile
  return players.map(player => {
    const key = playerKey(player)
    return enrichPlayer(
      player as Record<string, string>,
      rawScores.get(key) ?? null,
      playerPercentiles.get(key) ?? null,
      source
    )
  })
}

// ─── NORMALIZATION FOR RADAR (internal players) ───────────────────────────────

export interface PositionMinMax {
  [column: string]: { min: number; max: number }
}

export function computePositionMinMax(
  players: EnrichedPlayer[],
  posKey: string,
  metrics: string[]
): PositionMinMax {
  const posPlayers = players.filter(p => {
    const rawPos = (p['Posición específica'] || p['Posición'])?.trim() ?? ''
    const pk = POSITION_MAP[rawPos] ?? ''
    return pk === posKey
  })

  const result: PositionMinMax = {}
  for (const metric of metrics) {
    const values = posPlayers.map(p => {
      const v = p[metric]
      if (typeof v === 'number') return v
      const num = parseFloat(String(v ?? '').replace(',', '.'))
      return isNaN(num) ? 0 : num
    })
    result[metric] = {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 1,
    }
  }
  return result
}
