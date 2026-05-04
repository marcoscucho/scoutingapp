import type { APILineupPlayer } from '@/services/apiFootballService'

interface MatchPitchProps {
  homePlayers: APILineupPlayer[]
  awayPlayers: APILineupPlayer[]
  homeFormation: string | null
  awayFormation: string | null
  homeTeam: string
  awayTeam: string
  homeColor?: string
  awayColor?: string
}

const FORMATION_COORDS: Record<string, [number, number][]> = {
  '4-2-3-1': [
    [0.50, 0.93], [0.85, 0.82], [0.63, 0.83], [0.37, 0.83], [0.15, 0.82],
    [0.63, 0.71], [0.37, 0.71], [0.80, 0.60], [0.50, 0.58], [0.20, 0.60],
    [0.50, 0.53],
  ],
  '4-3-3': [
    [0.50, 0.93], [0.85, 0.82], [0.63, 0.83], [0.37, 0.83], [0.15, 0.82],
    [0.72, 0.70], [0.50, 0.72], [0.28, 0.70],
    [0.80, 0.57], [0.50, 0.53], [0.20, 0.57],
  ],
  '4-4-2': [
    [0.50, 0.93], [0.85, 0.82], [0.63, 0.83], [0.37, 0.83], [0.15, 0.82],
    [0.82, 0.69], [0.60, 0.71], [0.40, 0.71], [0.18, 0.69],
    [0.62, 0.56], [0.38, 0.56],
  ],
  '5-3-2': [
    [0.50, 0.93], [0.88, 0.80], [0.68, 0.83], [0.50, 0.84], [0.32, 0.83], [0.12, 0.80],
    [0.72, 0.68], [0.50, 0.70], [0.28, 0.68],
    [0.62, 0.56], [0.38, 0.56],
  ],
  '3-5-2': [
    [0.50, 0.93], [0.70, 0.83], [0.50, 0.84], [0.30, 0.83],
    [0.88, 0.72], [0.66, 0.69], [0.50, 0.71], [0.34, 0.69], [0.12, 0.72],
    [0.62, 0.56], [0.38, 0.56],
  ],
}

const DEFAULT_COORDS: [number, number][] = [
  [0.50, 0.93], [0.85, 0.82], [0.63, 0.83], [0.37, 0.83], [0.15, 0.82],
  [0.72, 0.70], [0.50, 0.72], [0.28, 0.70],
  [0.80, 0.57], [0.50, 0.53], [0.20, 0.57],
]

function mirrorCoords(coords: [number, number][]): [number, number][] {
  return coords.map(([x, y]) => [1 - x, 1 - y])
}

function getCoords(formation: string | null): [number, number][] {
  if (!formation) return DEFAULT_COORDS
  const key = formation.replace(/\s*\(.*\)/, '').trim()
  return FORMATION_COORDS[key] ?? DEFAULT_COORDS
}

function lastName(fullName: string): string {
  const parts = fullName.split(' ')
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

export default function MatchPitch({ homePlayers, awayPlayers, homeFormation, awayFormation, homeTeam, awayTeam, homeColor = '#6F1929', awayColor = '#2563eb' }: MatchPitchProps) {
  const homeCoords = getCoords(homeFormation)
  const awayCoords = mirrorCoords(getCoords(awayFormation))

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '140%' }}>
      <div className="absolute inset-0">
        {/* Grass background */}
        <svg viewBox="0 0 100 140" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Base grass */}
          <rect width="100" height="140" fill="#0f2a1a" />
          {/* Stripes */}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x="0" y={i * (140 / 6)} width="100" height={140 / 12} fill="#0a2316" opacity="0.5" />
          ))}
          {/* Vignette */}
          <defs>
            <radialGradient id="vignette">
              <stop offset="50%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
            </radialGradient>
          </defs>
          <rect width="100" height="140" fill="url(#vignette)" />

          {/* Field lines */}
          <rect x="3" y="3" width="94" height="134" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.5" />
          <line x1="3" y1="70" x2="97" y2="70" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <circle cx="50" cy="70" r="9" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <circle cx="50" cy="70" r="0.7" fill="rgba(255,255,255,0.4)" />
          {/* Top penalty */}
          <rect x="22" y="3" width="56" height="14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <rect x="34" y="3" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <circle cx="50" cy="12" r="0.7" fill="rgba(255,255,255,0.35)" />
          {/* Bottom penalty */}
          <rect x="22" y="123" width="56" height="14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <rect x="34" y="131" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <circle cx="50" cy="128" r="0.7" fill="rgba(255,255,255,0.35)" />
        </svg>

        {/* Team badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/15">
          <div className="w-2.5 h-2.5 rounded-full border border-white/80" style={{ background: awayColor }} />
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">{awayTeam}</span>
          {awayFormation && <span className="text-[8px] text-white/60 font-semibold border border-white/25 px-1 rounded">{awayFormation}</span>}
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/15">
          <div className="w-2.5 h-2.5 rounded-full border border-white/80" style={{ background: homeColor }} />
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">{homeTeam}</span>
          {homeFormation && <span className="text-[8px] text-white/60 font-semibold border border-white/25 px-1 rounded">{homeFormation}</span>}
        </div>

        {/* Away players (top half) */}
        {awayPlayers.slice(0, 11).map((p, i) => {
          const [x, y] = awayCoords[i] ?? [0.5, 0.3]
          return (
            <div key={`a-${p.id}`} className="absolute flex flex-col items-center" style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg border-2 border-white/80" style={{ background: awayColor }}>
                {p.number}
              </div>
              <span className="mt-0.5 text-[8px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">{lastName(p.name)}</span>
            </div>
          )
        })}

        {/* Home players (bottom half) */}
        {homePlayers.slice(0, 11).map((p, i) => {
          const [x, y] = homeCoords[i] ?? [0.5, 0.7]
          return (
            <div key={`h-${p.id}`} className="absolute flex flex-col items-center" style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg border-2 border-white/80" style={{ background: homeColor }}>
                {p.number}
              </div>
              <span className="mt-0.5 text-[8px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">{lastName(p.name)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
