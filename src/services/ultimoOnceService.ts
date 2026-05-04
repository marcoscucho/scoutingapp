import { fetchLastLineup, type APILineupPlayer, type APIFixture } from './apiFootballService'

export interface UltimoOncePlayer {
  number: number
  name: string
  position: string
  x: number
  y: number
  formation: string
  match_date: string
  opponent: string
  result: string
}

export interface LineupData {
  players: UltimoOncePlayer[]
  startXI: APILineupPlayer[]
  formation: string
  matchDate: string
  opponent: string
  result: string
}

const POSITION_COORDS: Record<string, [number, number][]> = {
  '4-2-3-1': [
    [50, 131],  // GK
    [82, 113], [62, 114], [38, 114], [18, 113],  // RB CB CB LB
    [65, 92], [35, 92],  // DM DM
    [76, 68], [50, 65], [24, 68],  // RAM CAM LAM
    [50, 35],  // ST
  ],
  '4-3-3': [
    [50, 131],
    [82, 113], [62, 114], [38, 114], [18, 113],
    [70, 85], [50, 88], [30, 85],
    [78, 43], [50, 28], [22, 43],
  ],
  '4-4-2': [
    [50, 131],
    [82, 113], [62, 114], [38, 114], [18, 113],
    [78, 85], [58, 88], [42, 88], [22, 85],
    [62, 38], [38, 38],
  ],
  '3-5-2': [
    [50, 131],
    [70, 114], [50, 116], [30, 114],
    [85, 88], [65, 82], [50, 85], [35, 82], [15, 88],
    [62, 38], [38, 38],
  ],
  '5-3-2': [
    [50, 131],
    [85, 108], [68, 114], [50, 116], [32, 114], [15, 108],
    [70, 82], [50, 85], [30, 82],
    [62, 38], [38, 38],
  ],
}

const DEFAULT_COORDS: [number, number][] = [
  [50, 131],
  [82, 108], [63, 112], [37, 112], [18, 108],
  [76, 77], [50, 81], [24, 77],
  [78, 43], [50, 28], [22, 43],
]

function inferFormation(players: APILineupPlayer[]): string {
  const counts = { D: 0, M: 0, F: 0 }
  for (const p of players) {
    if (p.pos !== 'G') counts[p.pos as 'D' | 'M' | 'F']++
  }
  return `${counts.D}-${counts.M}-${counts.F}`
}

function getResult(fixture: APIFixture): string {
  if (fixture.goalsHome === null || fixture.goalsAway === null) return ''
  if (fixture.isHome) return `${fixture.goalsHome}-${fixture.goalsAway}`
  return `${fixture.goalsAway}-${fixture.goalsHome}`
}

function getOpponent(fixture: APIFixture): string {
  return fixture.isHome ? fixture.awayTeam.name : fixture.homeTeam.name
}

export async function fetchUltimoOnce(): Promise<LineupData | null> {
  try {
    const result = await fetchLastLineup()
    if (!result) return null

    const { lineup, fixture } = result
    const formation = lineup.formation ?? inferFormation(lineup.startXI)
    const coords = POSITION_COORDS[formation] ?? DEFAULT_COORDS
    const opponent = getOpponent(fixture)
    const matchResult = getResult(fixture)
    const matchDate = fixture.date.split('T')[0]

    const players: UltimoOncePlayer[] = lineup.startXI.map((p, i) => ({
      number: p.number,
      name: p.name.split(' ').pop() ?? p.name,
      position: p.pos === 'G' ? 'GK' : p.pos,
      x: coords[i]?.[0] ?? 50,
      y: coords[i]?.[1] ?? 70,
      formation,
      match_date: matchDate,
      opponent,
      result: matchResult,
    }))

    return { players, startXI: lineup.startXI, formation, matchDate, opponent, result: matchResult }
  } catch (err) {
    console.warn('API-Football lineup fetch failed:', err)
    return null
  }
}

export function mapPlayersToPositions(players: {
  name: string; number: number; position: string
}[]): Omit<UltimoOncePlayer, 'formation' | 'match_date' | 'opponent' | 'result'>[] {
  const coords = DEFAULT_COORDS
  return players.slice(0, 11).map((p, i) => ({
    number: p.number,
    name: p.name,
    position: p.position,
    x: coords[i][0],
    y: coords[i][1],
  }))
}
