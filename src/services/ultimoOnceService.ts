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

// ─── Último 11 hardcodeado (vs Platense, J15 · 2026-04-05) ────────────────────
// Actualizar partido a partido. Formación: 4-4-2
const HARDCODED_LINEUP: LineupData = {
  formation: '4-4-2',
  matchDate: '2026-04-05',
  opponent:  'Platense',
  result:    '0-0',
  players: [
    // GK
    { number: 26, name: 'Losada',     position: 'GK', x: 50,  y: 126, formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    // DEF (L→R: Marcich LB, DeJesús CB, Izquierdoz CB, Guidara RB)
    { number:  6, name: 'Marcich',    position: 'LB', x: 18,  y: 107, formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    { number: 35, name: 'DeJesús',    position: 'CB', x: 37,  y: 107, formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    { number: 24, name: 'Izquierdoz', position: 'CB', x: 63,  y: 107, formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    { number: 33, name: 'Guidara',    position: 'RB', x: 82,  y: 107, formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    // MID (L→R: Watson, Sepúlveda, Cardozo, Sánchez)
    { number:  8, name: 'Watson',     position: 'LM', x: 18,  y: 75,  formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    { number: 16, name: 'Sepúlveda',  position: 'CM', x: 39,  y: 75,  formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    { number: 30, name: 'Cardozo',    position: 'CM', x: 61,  y: 75,  formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    { number: 27, name: 'Sánchez',    position: 'RM', x: 82,  y: 75,  formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    // FWD
    { number: 19, name: 'Valois',     position: 'ST', x: 33,  y: 35,  formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
    { number: 11, name: 'Salvio',     position: 'ST', x: 67,  y: 35,  formation: '4-4-2', match_date: '2026-04-05', opponent: 'Platense', result: '0-0' },
  ],
}

export async function fetchUltimoOnce(): Promise<LineupData | null> {
  const { data, error } = await supabase
    .from('ultimo_once')
    .select('*')
    .order('id', { ascending: true })

  if (error || !data || data.length === 0) {
    console.warn('ultimo_once fetch failed, using hardcoded lineup:', error?.message)
    return HARDCODED_LINEUP
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
