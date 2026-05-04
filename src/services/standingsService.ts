const BASE = '/apifootball-proxy'
const LANUS_ID = 446
const CURRENT_SEASON = 2026

export interface StandingsEntry {
  id: string
  name: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  pts: number
  pos: number
  isLanus: boolean
  form?: string
  qualColor?: string
}

export interface StandingsGroup {
  title: string
  entries: StandingsEntry[]
}

export interface LanusTopStat {
  id: string
  name: string
  value: number
  imageUrl: string
}

function mapEntry(raw: any): StandingsEntry {
  const team = raw.team ?? {}
  const all = raw.all ?? {}
  const goals = all.goals ?? {}
  return {
    id: String(team.id ?? ''),
    name: team.name ?? '—',
    played: all.played ?? 0,
    wins: all.win ?? 0,
    draws: all.draw ?? 0,
    losses: all.lose ?? 0,
    goalsFor: goals.for ?? 0,
    goalsAgainst: goals.against ?? 0,
    pts: raw.points ?? 0,
    pos: raw.rank ?? 0,
    isLanus: team.id === LANUS_ID,
    form: raw.form ?? undefined,
  }
}

function groupTitle(raw: string): string {
  return raw
    .replace(/CONMEBOL Libertadores \d+,\s*/i, '')
    .replace(/Apertura,\s*/i, 'Apertura · ')
    .replace(/Clausura,\s*/i, 'Clausura · ')
    .trim()
}

async function fetchStandings(leagueId: number): Promise<StandingsGroup[]> {
  const res = await fetch(`${BASE}/standings?league=${leagueId}&season=${CURRENT_SEASON}`)
  if (!res.ok) throw new Error(`API-Football standings HTTP ${res.status}`)
  const json = await res.json()
  const league = json.response?.[0]?.league
  if (!league) return []

  const standingsArrays: any[][] = league.standings ?? []
  const groups: StandingsGroup[] = []

  for (const arr of standingsArrays) {
    if (!arr.length) continue
    const rawGroup = arr[0].group ?? 'Tabla'
    const entries = arr.map(mapEntry)
    groups.push({ title: groupTitle(rawGroup), entries })
  }

  return groups
}

export async function fetchLigaProStandings(): Promise<StandingsGroup[]> {
  return fetchStandings(128)
}

export async function fetchLibertadoresStandings(): Promise<StandingsGroup[]> {
  return fetchStandings(13)
}

export async function fetchTablaAnual(): Promise<StandingsEntry[]> {
  const groups = await fetchLigaProStandings()
  const all: StandingsEntry[] = []
  for (const g of groups) {
    for (const e of g.entries) {
      const existing = all.find(x => x.id === e.id)
      if (existing) {
        existing.played += e.played
        existing.wins += e.wins
        existing.draws += e.draws
        existing.losses += e.losses
        existing.goalsFor += e.goalsFor
        existing.goalsAgainst += e.goalsAgainst
        existing.pts += e.pts
      } else {
        all.push({ ...e })
      }
    }
  }
  return all
    .sort((a, b) => b.pts - a.pts || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
    .map((e, i) => ({ ...e, pos: i + 1 }))
}

export async function fetchLanusTopStats(): Promise<{
  scorers: LanusTopStat[]
  assisters: LanusTopStat[]
}> {
  try {
    const isDev = import.meta.env.DEV
    const url = isDev
      ? `/fotmob-www/api/teams?id=10082`
      : `/.netlify/functions/fotmob-team?teamId=10082`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: any = await res.json()

    function extractStat(members: any[], key: string): LanusTopStat[] {
      return members
        .map(m => {
          let value = 0
          if (Array.isArray(m.stats)) {
            value = m.stats.find((s: { key: string }) => s.key === key)?.value ?? 0
          } else if (m.stats && typeof m.stats === 'object') {
            value = m.stats[key] ?? 0
          }
          const id = String(m.id ?? '')
          return {
            id,
            name: m.name ?? m.shortName ?? '—',
            value,
            imageUrl: id ? `/fotmob-images/image_resources/logo/playerimages/${id}.png` : '',
          }
        })
        .filter(p => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    }

    const members = data?.squad?.members ?? data?.players ?? []
    return {
      scorers: extractStat(members, 'goals'),
      assisters: extractStat(members, 'assists'),
    }
  } catch (err) {
    console.warn('Lanús top stats failed:', err)
    return { scorers: [], assisters: [] }
  }
}

export function findGroup(groups: StandingsGroup[], keyword: string): StandingsGroup | null {
  const kw = keyword.toLowerCase()
  return groups.find(g => g.title.toLowerCase().includes(kw)) ?? null
}
