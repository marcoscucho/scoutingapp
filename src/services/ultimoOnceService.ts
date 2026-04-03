import { supabase } from '@/lib/supabase'

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
  formation: string
  matchDate: string
  opponent: string
  result: string
}

export async function fetchUltimoOnce(): Promise<LineupData | null> {
  const { data, error } = await supabase
    .from('ultimo_once')
    .select('*')
    .order('id', { ascending: true })

  if (error || !data || data.length === 0) {
    console.warn('ultimo_once fetch failed:', error?.message)
    return null
  }

  return {
    players: data,
    formation: data[0].formation,
    matchDate: data[0].match_date,
    opponent: data[0].opponent,
    result: data[0].result,
  }
}

/** Maps FotMob position string to x/y pitch coordinates.
 *  Positions come ordered: GK, RB, CB, CB, LB, MF, MF, MF, FW, FW, FW (for 4-3-3) */
export function mapPlayersToPositions(players: {
  name: string; number: number; position: string
}[]): Omit<UltimoOncePlayer, 'formation' | 'match_date' | 'opponent' | 'result'>[] {
  // Fixed x/y grid for 11 positions based on role order as returned by FotMob
  // Field: viewBox "0 0 100 140", team attacks upward (y=5), defends bottom (y≈133)
  const coords: [number, number][] = [
    [50, 126], // GK
    [82, 107], // RB
    [63, 108], // CB right
    [37, 108], // CB left
    [18, 107], // LB
    [76,  77], // MF right
    [50,  81], // MF center
    [24,  77], // MF left
    [78,  43], // FW right
    [50,  28], // CF
    [22,  43], // FW left
  ]

  return players.slice(0, 11).map((p, i) => ({
    number: p.number,
    name: p.name,
    position: p.position,
    x: coords[i][0],
    y: coords[i][1],
  }))
}
