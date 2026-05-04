import type { APILineupPlayer } from '@/services/apiFootballService'

interface SingleTeamPitchProps {
  players: APILineupPlayer[]
  formation: string | null
  teamName?: string
  teamColor?: string
}

const FORMATION_COORDS: Record<string, [number, number][]> = {
  '4-2-3-1': [
    [0.50, 0.90],
    [0.85, 0.76], [0.63, 0.77], [0.37, 0.77], [0.15, 0.76],
    [0.63, 0.58], [0.37, 0.58],
    [0.80, 0.40], [0.50, 0.37], [0.20, 0.40],
    [0.50, 0.18],
  ],
  '4-3-3': [
    [0.50, 0.90],
    [0.85, 0.76], [0.63, 0.77], [0.37, 0.77], [0.15, 0.76],
    [0.72, 0.55], [0.50, 0.57], [0.28, 0.55],
    [0.80, 0.28], [0.50, 0.18], [0.20, 0.28],
  ],
  '4-4-2': [
    [0.50, 0.90],
    [0.85, 0.76], [0.63, 0.77], [0.37, 0.77], [0.15, 0.76],
    [0.82, 0.55], [0.60, 0.57], [0.40, 0.57], [0.18, 0.55],
    [0.62, 0.25], [0.38, 0.25],
  ],
  '5-3-2': [
    [0.50, 0.90],
    [0.88, 0.73], [0.68, 0.77], [0.50, 0.78], [0.32, 0.77], [0.12, 0.73],
    [0.72, 0.50], [0.50, 0.52], [0.28, 0.50],
    [0.62, 0.25], [0.38, 0.25],
  ],
  '3-5-2': [
    [0.50, 0.90],
    [0.70, 0.77], [0.50, 0.78], [0.30, 0.77],
    [0.88, 0.55], [0.66, 0.50], [0.50, 0.52], [0.34, 0.50], [0.12, 0.55],
    [0.62, 0.25], [0.38, 0.25],
  ],
}

const DEFAULT_COORDS: [number, number][] = FORMATION_COORDS['4-3-3']

function getCoords(formation: string | null): [number, number][] {
  if (!formation) return DEFAULT_COORDS
  const key = formation.replace(/\s*\(.*\)/, '').trim()
  return FORMATION_COORDS[key] ?? DEFAULT_COORDS
}

function lastName(fullName: string): string {
  const parts = fullName.split(' ').filter(w => w.length > 1)
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

export default function SingleTeamPitch({ players, formation, teamName = 'Lanús', teamColor = '#6F1929' }: SingleTeamPitchProps) {
  const coords = getCoords(formation)

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '140%' }}>
      <div className="absolute inset-0">
        <svg viewBox="0 0 100 140" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="140" fill="#0f2a1a" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x="0" y={i * (140 / 6)} width="100" height={140 / 12} fill="#0a2316" opacity="0.5" />
          ))}
          <defs>
            <radialGradient id="vignette-single">
              <stop offset="50%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
            </radialGradient>
          </defs>
          <rect width="100" height="140" fill="url(#vignette-single)" />

          <rect x="3" y="3" width="94" height="134" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="0.5" />
          <line x1="3" y1="70" x2="97" y2="70" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <circle cx="50" cy="70" r="9" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <circle cx="50" cy="70" r="0.7" fill="rgba(255,255,255,0.4)" />
          <rect x="22" y="3" width="56" height="14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <rect x="34" y="3" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <circle cx="50" cy="12" r="0.7" fill="rgba(255,255,255,0.35)" />
          <rect x="22" y="123" width="56" height="14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <rect x="34" y="131" width="32" height="6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
          <circle cx="50" cy="128" r="0.7" fill="rgba(255,255,255,0.35)" />
        </svg>

        {/* Team badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/15">
          <div className="w-2.5 h-2.5 rounded-full border border-white/80" style={{ background: teamColor }} />
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">{teamName}</span>
          {formation && <span className="text-[8px] text-white/60 font-semibold border border-white/25 px-1 rounded">{formation}</span>}
        </div>

        {/* Players across full pitch */}
        {players.slice(0, 11).map((p, i) => {
          const [x, y] = coords[i] ?? [0.5, 0.5]
          return (
            <div key={p.id} className="absolute flex flex-col items-center" style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-lg border-2 border-white/80" style={{ background: teamColor }}>
                {p.number}
              </div>
              <span className="mt-0.5 text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">{lastName(p.name)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
