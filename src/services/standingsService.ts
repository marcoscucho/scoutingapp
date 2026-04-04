// ─── Standings Service ────────────────────────────────────────────────────────
// Uses ESPN public API (no auth needed) for Liga Pro + Copa Libertadores.
// Tabla Anual from Promiedos.

const LANUS_ESPN_ID = '1737'  // ESPN team ID for Lanús
const LANUS_NAME_HINT = 'lan'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLanusName(name: string): boolean {
  return name.toLowerCase().includes(LANUS_NAME_HINT) &&
    (name.toLowerCase().includes('us') || name.toLowerCase().includes('ús'))
}

const isDev = import.meta.env.DEV

function espnUrl(path: string): string {
  return isDev ? `/espn-proxy${path}` : `https://site.api.espn.com${path}`
}

function fotmobUrl(path: string): string {
  return isDev ? `/fotmob-www${path}` : `/fotmob-www${path}`
}

// ─── ESPN standings parser ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function statVal(stats: any[], key: string): number {
  return stats?.find((s: { name: string }) => s.name === key)?.value ?? 0
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEspnEntry(entry: any, idx: number): StandingsEntry {
  const team = entry.team ?? {}
  const stats = entry.stats ?? []
  const name = team.displayName ?? team.name ?? '—'
  const gf = statVal(stats, 'pointsFor') || statVal(stats, 'goalsFor')
  const ga = statVal(stats, 'pointsAgainst') || statVal(stats, 'goalsAgainst')
  return {
    id: String(team.id ?? idx),
    name,
    played:  statVal(stats, 'gamesPlayed'),
    wins:    statVal(stats, 'wins'),
    draws:   statVal(stats, 'ties') || statVal(stats, 'draws'),
    losses:  statVal(stats, 'losses'),
    goalsFor: gf,
    goalsAgainst: ga,
    pts:  statVal(stats, 'points'),
    pos:  statVal(stats, 'rank') || idx + 1,
    isLanus: team.id === LANUS_ESPN_ID || isLanusName(name),
  }
}

function sortAndRank(entries: StandingsEntry[]): StandingsEntry[] {
  return entries
    .sort((a, b) => b.pts - a.pts || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor)
    .map((e, i) => ({ ...e, pos: i + 1 }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEspnStandings(data: any): StandingsGroup[] {
  const groups: StandingsGroup[] = []

  // League with sub-groups (e.g. Libertadores group stage)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = data?.children ?? []
  if (children.length > 0) {
    for (const child of children) {
      const entries = child?.standings?.entries ?? []
      if (entries.length) {
        groups.push({
          title: child.name ?? child.abbreviation ?? 'Grupo',
          entries: sortAndRank(entries.map(mapEspnEntry)),
        })
      }
    }
  }

  // Flat league (no sub-groups)
  if (groups.length === 0) {
    const entries = data?.standings?.entries ?? data?.entries ?? []
    if (entries.length) {
      groups.push({ title: 'Tabla', entries: sortAndRank(entries.map(mapEspnEntry)) })
    }
  }

  return groups
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchLigaProStandings(): Promise<StandingsGroup[]> {
  // ESPN slug for Argentina Liga Profesional: arg.1
  const res = await fetch(espnUrl('/apis/v2/sports/soccer/arg.1/standings'), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`ESPN Liga Pro HTTP ${res.status}`)
  const data = await res.json()
  return parseEspnStandings(data)
}

export async function fetchLibertadoresStandings(): Promise<StandingsGroup[]> {
  // ESPN slug for Copa Libertadores: conmebol.libertadores
  const res = await fetch(espnUrl('/apis/v2/sports/soccer/conmebol.libertadores/standings'), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`ESPN Libertadores HTTP ${res.status}`)
  const data = await res.json()
  return parseEspnStandings(data)
}

export async function fetchTablaAnual(): Promise<StandingsEntry[]> {
  // Promiedos for annual table (specific to Argentine football)
  try {
    const baseUrl = isDev ? '/promiedos-proxy' : '/promiedos-proxy'
    const res = await fetch(`${baseUrl}/league/liga-profesional/hc`, {
      headers: { Accept: 'text/html,*/*' },
    })
    if (!res.ok) throw new Error(`Promiedos HTTP ${res.status}`)
    const html = await res.text()

    // Try __NEXT_DATA__ first
    const ndMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/)
    if (ndMatch) {
      try {
        const nd = JSON.parse(ndMatch[1])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = nd?.props?.pageProps as any
        const raw =
          p?.table ??
          p?.tables?.[0]?.rows ??
          p?.standings ??
          p?.anualTable ??
          []
        if (Array.isArray(raw) && raw.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return raw.map((r: any, i: number): StandingsEntry => {
            const name = r.team ?? r.nombre ?? r.name ?? r.teamName ?? '—'
            return {
              id: String(r.id ?? i),
              name,
              played: r.pj ?? r.played ?? 0,
              wins:   r.pg ?? r.wins ?? 0,
              draws:  r.pe ?? r.draws ?? 0,
              losses: r.pp ?? r.losses ?? 0,
              goalsFor: r.gf ?? r.goalsFor ?? 0,
              goalsAgainst: r.gc ?? r.goalsAgainst ?? 0,
              pts: r.pts ?? r.points ?? r.puntos ?? 0,
              pos: r.pos ?? r.rank ?? i + 1,
              isLanus: isLanusName(name),
            }
          })
        }
      } catch { /* fall through */ }
    }

    // HTML table fallback
    return parseHtmlTable(html)
  } catch (err) {
    console.warn('Promiedos tabla anual failed:', err)
    return []
  }
}

function parseHtmlTable(html: string): StandingsEntry[] {
  const entries: StandingsEntry[] = []
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch: RegExpExecArray | null
  let rowIdx = 0
  while ((trMatch = trRegex.exec(html)) !== null) {
    const row = trMatch[1]
    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 0)
    if (tds.length >= 8) {
      const pos = parseInt(tds[0]) || rowIdx + 1
      const name = tds[1]
      if (!name || /^(pos|equipo|team|pj)/i.test(name)) continue
      const pts = parseInt(tds[tds.length - 1]) || 0
      if (pts === 0 && parseInt(tds[0]) === 0) continue
      entries.push({
        id: String(rowIdx), name,
        played: parseInt(tds[2]) || 0,
        wins:   parseInt(tds[3]) || 0,
        draws:  parseInt(tds[4]) || 0,
        losses: parseInt(tds[5]) || 0,
        goalsFor:     parseInt(tds[6]) || 0,
        goalsAgainst: parseInt(tds[7]) || 0,
        pts, pos,
        isLanus: isLanusName(name),
      })
      rowIdx++
    }
  }
  return entries.slice(0, 30)
}

export async function fetchLanusTopStats(): Promise<{
  scorers: LanusTopStat[]
  assisters: LanusTopStat[]
}> {
  try {
    const url = isDev
      ? `/fotmob-www/api/teams?id=10082`
      : `/.netlify/functions/fotmob-team?teamId=10082`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      scorers:   extractStat(members, 'goals'),
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
