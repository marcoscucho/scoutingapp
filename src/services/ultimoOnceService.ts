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

// ─── Último 11 hardcodeado (vs Banfield, Liga · 2026-04-14) ─────────────────
// Actualizar partido a partido. Formación: 4-2-3-1
// Orden para PitchVisualization: GK, RB, CB, CB, LB, DM, DM, RAM, CAM, LAM, ST
const HARDCODED_LINEUP: LineupData = {
  formation: '4-2-3-1',
  matchDate: '2026-04-14',
  opponent:  'Banfield',
  result:    '1-0',
  players: [
    { number: 26, name: 'Losada',     position: 'GK',  x: 50,  y: 131, formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number: 33, name: 'Guidara',    position: 'RB',  x: 82,  y: 113, formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number: 24, name: 'Izquierdoz', position: 'CB',  x: 62,  y: 114, formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number: 13, name: 'Canale',     position: 'CB',  x: 38,  y: 114, formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number:  6, name: 'Marcich',    position: 'LB',  x: 18,  y: 113, formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number: 17, name: 'Medina',     position: 'DM',  x: 65,  y: 92,  formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number: 30, name: 'Cardozo',    position: 'DM',  x: 35,  y: 92,  formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number: 16, name: 'Sepúlveda',  position: 'RAM', x: 76,  y: 68,  formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number:  8, name: 'Watson',     position: 'CAM', x: 50,  y: 65,  formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number: 23, name: 'Carrera',    position: 'LAM', x: 24,  y: 68,  formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
    { number: 11, name: 'Salvio',     position: 'ST',  x: 50,  y: 35,  formation: '4-2-3-1', match_date: '2026-04-14', opponent: 'Banfield', result: '1-0' },
  ],
}

// Usa el hardcoded directamente — la fuente de verdad es este archivo.
// Actualizar HARDCODED_LINEUP partido a partido.
export async function fetchUltimoOnce(): Promise<LineupData | null> {
  return HARDCODED_LINEUP
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
