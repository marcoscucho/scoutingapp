const IS_DEV = import.meta.env.DEV
const LANUS_ID = 446
const CURRENT_SEASON = 2026

export interface APIFixture {
  id: number
  date: string
  venue: string | null
  status: 'FT' | 'PEN' | 'AET' | 'NS' | 'LIVE' | string
  league: { id: number; name: string; round: string }
  homeTeam: { id: number; name: string; logo: string }
  awayTeam: { id: number; name: string; logo: string }
  goalsHome: number | null
  goalsAway: number | null
  isHome: boolean
}

export interface APILineupPlayer {
  id: number
  name: string
  number: number
  pos: 'G' | 'D' | 'M' | 'F'
}

export interface APILineup {
  formation: string | null
  startXI: APILineupPlayer[]
  substitutes: APILineupPlayer[]
}

function mapFixture(raw: any): APIFixture {
  return {
    id: raw.fixture.id,
    date: raw.fixture.date,
    venue: raw.fixture.venue?.name ?? null,
    status: raw.fixture.status.short,
    league: {
      id: raw.league.id,
      name: raw.league.name,
      round: raw.league.round,
    },
    homeTeam: {
      id: raw.teams.home.id,
      name: raw.teams.home.name,
      logo: raw.teams.home.logo,
    },
    awayTeam: {
      id: raw.teams.away.id,
      name: raw.teams.away.name,
      logo: raw.teams.away.logo,
    },
    goalsHome: raw.goals.home,
    goalsAway: raw.goals.away,
    isHome: raw.teams.home.id === LANUS_ID,
  }
}

async function apiFetch<T>(endpoint: string): Promise<T[]> {
  let url: string
  if (IS_DEV) {
    url = `/apifootball-proxy${endpoint}`
  } else {
    const [path, qs] = endpoint.split('?')
    const params = new URLSearchParams(qs ?? '')
    params.set('endpoint', path)
    url = `/.netlify/functions/apifootball?${params.toString()}`
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API-Football ${res.status}`)
  const json = await res.json()
  return json.response ?? []
}

export async function fetchLastFixtures(count = 5): Promise<APIFixture[]> {
  const raw = await apiFetch<any>(`/fixtures?team=${LANUS_ID}&season=${CURRENT_SEASON}&last=${count}`)
  return raw.map(mapFixture).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function fetchNextFixtures(count = 5): Promise<APIFixture[]> {
  const raw = await apiFetch<any>(`/fixtures?team=${LANUS_ID}&season=${CURRENT_SEASON}&next=${count}`)
  return raw.map(mapFixture).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export async function fetchAllFixtures(): Promise<APIFixture[]> {
  const raw = await apiFetch<any>(`/fixtures?team=${LANUS_ID}&season=${CURRENT_SEASON}`)
  return raw.map(mapFixture).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export async function fetchLineup(fixtureId: number): Promise<APILineup | null> {
  const raw = await apiFetch<any>(`/fixtures/lineups?fixture=${fixtureId}`)
  const lanusLineup = raw.find((l: any) => l.team.id === LANUS_ID)
  if (!lanusLineup) return null
  return {
    formation: lanusLineup.formation ?? null,
    startXI: lanusLineup.startXI.map((p: any) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      pos: p.player.pos,
    })),
    substitutes: lanusLineup.substitutes.map((p: any) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      pos: p.player.pos,
    })),
  }
}

export interface FotmobMatchCompat {
  id: string
  date: Date
  summary: string
  homeTeam: string
  awayTeam: string
  location: string
  isHome: boolean
  competition: 'liga' | 'copa' | 'libertadores' | 'sudamericana' | 'other'
}

function detectCompetition(leagueId: number, leagueName: string): FotmobMatchCompat['competition'] {
  if (leagueId === 13) return 'libertadores'
  if (leagueId === 11) return 'sudamericana'
  if (leagueId === 130) return 'copa'
  if (leagueId === 128) return 'liga'
  const n = leagueName.toLowerCase()
  if (n.includes('libertadores')) return 'libertadores'
  if (n.includes('sudamericana')) return 'sudamericana'
  if (n.includes('copa argentina')) return 'copa'
  if (n.includes('liga') || n.includes('profesional')) return 'liga'
  return 'other'
}

function fixtureToFotmobCompat(f: APIFixture): FotmobMatchCompat {
  return {
    id: String(f.id),
    date: new Date(f.date),
    summary: `${f.homeTeam.name} - ${f.awayTeam.name}`,
    homeTeam: f.homeTeam.name,
    awayTeam: f.awayTeam.name,
    location: f.venue ?? '',
    isHome: f.isHome,
    competition: detectCompetition(f.league.id, f.league.name),
  }
}

export async function fetchCalendarCompat(): Promise<FotmobMatchCompat[]> {
  const fixtures = await fetchAllFixtures()
  return fixtures.map(fixtureToFotmobCompat)
}

export interface FormResult {
  id: number
  match_date: string
  opponent: string
  was_home: boolean
  goals_for: number
  goals_against: number
  result: 'W' | 'D' | 'L'
  competition: string
}

function getMatchResult(f: APIFixture): 'W' | 'D' | 'L' {
  if (f.goalsHome === null || f.goalsAway === null) return 'D'
  const lanusGoals = f.isHome ? f.goalsHome : f.goalsAway
  const oppGoals = f.isHome ? f.goalsAway : f.goalsHome
  if (lanusGoals > oppGoals) return 'W'
  if (lanusGoals < oppGoals) return 'L'
  return 'D'
}

export async function fetchFormGuideFromAPI(count = 5): Promise<FormResult[]> {
  const fixtures = await fetchLastFixtures(count)
  return fixtures.map(f => ({
    id: f.id,
    match_date: f.date.split('T')[0],
    opponent: f.isHome ? f.awayTeam.name : f.homeTeam.name,
    was_home: f.isHome,
    goals_for: f.isHome ? (f.goalsHome ?? 0) : (f.goalsAway ?? 0),
    goals_against: f.isHome ? (f.goalsAway ?? 0) : (f.goalsHome ?? 0),
    result: getMatchResult(f),
    competition: f.league.name,
  }))
}

export interface MatchEvent {
  minute: number
  extraMinute: number | null
  team: 'lanus' | 'rival'
  teamName: string
  playerName: string
  assistName: string | null
  type: 'goal' | 'card' | 'subst'
  detail: string
}

export interface MatchEventsData {
  fixture: APIFixture
  lineup: APILineup | null
  events: MatchEvent[]
  rivalLineup: APILineup | null
}

export async function fetchLastMatchEvents(): Promise<MatchEventsData | null> {
  const lastMatches = await fetchLastFixtures(3)
  const finished = lastMatches.filter(m => m.status === 'FT' || m.status === 'PEN' || m.status === 'AET')
  if (finished.length === 0) return null
  const fixture = finished[0]

  const [eventsRaw, lineupsRaw] = await Promise.all([
    apiFetch<any>(`/fixtures/events?fixture=${fixture.id}`),
    apiFetch<any>(`/fixtures/lineups?fixture=${fixture.id}`),
  ])

  const events: MatchEvent[] = eventsRaw.map((e: any) => ({
    minute: e.time.elapsed ?? 0,
    extraMinute: e.time.extra ?? null,
    team: e.team.id === LANUS_ID ? 'lanus' : 'rival',
    teamName: e.team.name,
    playerName: e.player?.name ?? '',
    assistName: e.assist?.name ?? null,
    type: e.type === 'Goal' ? 'goal' : e.type === 'Card' ? 'card' : 'subst',
    detail: e.detail ?? '',
  }))

  const lanusRaw = lineupsRaw.find((l: any) => l.team.id === LANUS_ID)
  const rivalRaw = lineupsRaw.find((l: any) => l.team.id !== LANUS_ID)

  const mapLineup = (raw: any): APILineup | null => {
    if (!raw) return null
    return {
      formation: raw.formation ?? null,
      startXI: raw.startXI.map((p: any) => ({
        id: p.player.id,
        name: p.player.name,
        number: p.player.number,
        pos: p.player.pos,
      })),
      substitutes: raw.substitutes.map((p: any) => ({
        id: p.player.id,
        name: p.player.name,
        number: p.player.number,
        pos: p.player.pos,
      })),
    }
  }

  return {
    fixture,
    lineup: mapLineup(lanusRaw),
    events,
    rivalLineup: mapLineup(rivalRaw),
  }
}

export async function fetchLastLineup(): Promise<{ lineup: APILineup; fixture: APIFixture } | null> {
  const lastMatches = await fetchLastFixtures(3)
  const finished = lastMatches.filter(m => m.status === 'FT' || m.status === 'PEN' || m.status === 'AET')
  if (finished.length === 0) return null

  for (const match of finished) {
    const lineup = await fetchLineup(match.id)
    if (lineup && lineup.startXI.length === 11) {
      return { lineup, fixture: match }
    }
  }
  return null
}
