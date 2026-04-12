// ─── FormationPitchCard ───────────────────────────────────────────────────────
// Canchita SVG compacta con titulares, cambios, tarjetas, goles y asistencias.
// Análisis táctico del partido debajo de cada canchita.

import type { MatchFormation, FormationPlayer } from '@/services/rivalAnalysisService'

// ─── Coordenadas por formación ────────────────────────────────────────────────

function getFormationCoords(formation: string): { x: number; y: number }[] {
  const lines = formation
    .split('-')
    .map(n => parseInt(n.trim()))
    .filter(n => !isNaN(n) && n > 0)

  const coords: { x: number; y: number }[] = []
  coords.push({ x: 35, y: 93 }) // GK

  if (lines.length === 0) return coords

  const defY = 76
  const atkY = 16
  const n = lines.length
  const margin = 9

  lines.forEach((count, lineIdx) => {
    const y = n === 1
      ? (defY + atkY) / 2
      : defY - (lineIdx / (n - 1)) * (defY - atkY)

    for (let j = 0; j < count; j++) {
      const x = count === 1 ? 35 : margin + j * (70 - 2 * margin) / (count - 1)
      coords.push({ x, y })
    }
  })

  return coords
}

function shortName(name: string): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  const token = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  return token.length > 9 ? token.slice(0, 8) + '.' : token
}

// ─── Token de jugador ─────────────────────────────────────────────────────────
const R = 4.2

function PlayerToken({ p, x, y }: { p: FormationPlayer; x: number; y: number }) {
  const name = shortName(p.name)
  const fs = name.length > 8 ? 2.3 : name.length > 6 ? 2.5 : 2.7
  const pillW = Math.max(name.length * fs * 0.6, 9)
  const hasGoal = p.goals > 0
  const hasAssist = p.assists > 0
  const hasYellow = p.yellowCard && !p.redCard
  const hasRed = p.redCard

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Sombra */}
      <circle r={R + 0.5} fill="rgba(0,0,0,0.4)" cx="0.3" cy="0.7" />
      {/* Base */}
      <circle r={R} fill="#1a2f48" stroke="rgba(120,180,255,0.65)" strokeWidth="0.65" />
      {/* Número */}
      <text textAnchor="middle" dominantBaseline="middle" fontSize="3.0" fontWeight="800"
        fill="white" y="0.2" letterSpacing="-0.2">
        {p.number ?? ''}
      </text>
      {/* Nombre */}
      <rect x={-pillW / 2} y={R + 1.0} width={pillW} height={4.8} rx={2.4} fill="rgba(0,0,0,0.75)" />
      <text textAnchor="middle" dominantBaseline="middle" fontSize={fs} fontWeight="600"
        fill="rgba(220,235,255,0.95)" y={R + 3.5}>
        {name}
      </text>

      {/* Tarjeta */}
      {hasRed
        ? <rect x={R - 0.3} y={-R - 3.4} width={2.0} height={2.8} rx="0.35" fill="#ef4444" />
        : hasYellow
        ? <rect x={R - 0.3} y={-R - 3.4} width={2.0} height={2.8} rx="0.35" fill="#fbbf24" />
        : null}

      {/* Gol */}
      {hasGoal && (
        <g transform={`translate(${-R - 2.0}, ${-R - 0.6})`}>
          <circle r="2.0" fill="#16a34a" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" />
          <text textAnchor="middle" dominantBaseline="middle" fontSize="2.0" fill="white" fontWeight="800" y="0.1">
            {p.goals > 1 ? p.goals : 'G'}
          </text>
        </g>
      )}

      {/* Asistencia */}
      {hasAssist && (
        <g transform={`translate(${-R - 2.0}, ${hasGoal ? R + 0.8 : -R - 0.6})`}>
          <circle r="2.0" fill="#d97706" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
          <text textAnchor="middle" dominantBaseline="middle" fontSize="1.9" fill="white" fontWeight="700" y="0.1">A</text>
        </g>
      )}

      {/* Salió */}
      {p.subbedOff && (
        <g transform={`translate(${R + 1.6}, ${-R + 0.3})`}>
          <text textAnchor="middle" fontSize="4.0" fill="#f87171" y="0">↓</text>
          {p.subbedOffAt != null && (
            <text textAnchor="middle" fontSize="1.9" fill="#f87171" fontWeight="700" y="3.6">{p.subbedOffAt}'</text>
          )}
        </g>
      )}

      {/* Entró */}
      {p.subbedIn && !p.subbedOff && (
        <g transform={`translate(${R + 1.6}, ${-R + 0.3})`}>
          <text textAnchor="middle" fontSize="4.0" fill="#4ade80" y="0">↑</text>
          {p.subbedInAt != null && (
            <text textAnchor="middle" fontSize="1.9" fill="#4ade80" fontWeight="700" y="3.6">{p.subbedInAt}'</text>
          )}
        </g>
      )}
    </g>
  )
}

// ─── Cancha SVG ───────────────────────────────────────────────────────────────

function PitchSVG({ formation, players }: { formation: string; players: FormationPlayer[] }) {
  const coords = getFormationCoords(formation)
  const pl  = 'rgba(255,255,255,0.25)'
  const pls = 'rgba(255,255,255,0.12)'

  return (
    <svg viewBox="0 0 70 105" xmlns="http://www.w3.org/2000/svg" className="w-full rounded-lg">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c2e1b" />
          <stop offset="100%" stopColor="#0a2418" />
        </linearGradient>
        <pattern id="ps" x="0" y="0" width="70" height="10" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="70" height="5" fill="#0e3020" />
          <rect x="0" y="5" width="70" height="5" fill="#0b2a1a" />
        </pattern>
      </defs>

      <rect width="70" height="105" rx="4" fill="url(#pg)" />
      <rect width="70" height="105" rx="4" fill="url(#ps)" opacity="0.5" />
      <rect width="70" height="105" rx="4" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="0.5" />

      {/* Líneas */}
      <rect x="2.5" y="2.5" width="65" height="100" fill="none" stroke={pl} strokeWidth="0.7" rx="1" />
      <line x1="2.5" y1="52.5" x2="67.5" y2="52.5" stroke={pl} strokeWidth="0.6" />
      <circle cx="35" cy="52.5" r="8.5" fill="none" stroke={pl} strokeWidth="0.6" />
      <circle cx="35" cy="52.5" r="0.7" fill={pl} />

      {/* Área arriba */}
      <rect x="15" y="2.5" width="40" height="14.5" fill="rgba(255,255,255,0.02)" stroke={pls} strokeWidth="0.55" />
      <rect x="25" y="2.5" width="20" height="5" fill="none" stroke={pls} strokeWidth="0.45" />
      <rect x="30.5" y="0.5" width="9" height="2.3" rx="0.4" fill="rgba(255,255,255,0.09)" stroke={pl} strokeWidth="0.6" />
      <circle cx="35" cy="11" r="0.65" fill={pls} />
      <path d="M15,17 A8,8 0 0 1 55,17" fill="none" stroke={pls} strokeWidth="0.45" />

      {/* Área abajo */}
      <rect x="15" y="88" width="40" height="14.5" fill="rgba(255,255,255,0.02)" stroke={pls} strokeWidth="0.55" />
      <rect x="25" y="97.5" width="20" height="5" fill="none" stroke={pls} strokeWidth="0.45" />
      <rect x="30.5" y="102.2" width="9" height="2.3" rx="0.4" fill="rgba(255,255,255,0.09)" stroke={pl} strokeWidth="0.6" />
      <circle cx="35" cy="94" r="0.65" fill={pls} />
      <path d="M15,88 A8,8 0 0 0 55,88" fill="none" stroke={pls} strokeWidth="0.45" />

      {/* Jugadores */}
      {players.slice(0, 11).map((p, i) => {
        const coord = coords[i]
        if (!coord) return null
        return <PlayerToken key={i} p={p} x={coord.x} y={coord.y} />
      })}
    </svg>
  )
}

// ─── Conclusiones del partido (debajo de la canchita) ────────────────────────

function MatchConclusions({ match }: { match: MatchFormation }) {
  const scorers   = match.players.filter(p => p.goals > 0)
  const yellows   = match.players.filter(p => p.yellowCard && !p.redCard)
  const reds      = match.players.filter(p => p.redCard)
  const subbedOff = match.players.filter(p => p.subbedOff && p.subbedOffAt != null)
  const subbedIn  = match.players.filter(p => p.subbedIn && !p.subbedOff && p.subbedInAt != null)
  const injured   = match.injured ?? []
  const suspended = match.suspended ?? []

  const hasAny = scorers.length || yellows.length || reds.length ||
    subbedOff.length || injured.length || suspended.length

  if (!hasAny) return null

  return (
    <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2.5">

      {/* Goles */}
      {scorers.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">⚽</span>
          {scorers.map((p, i) => (
            <span key={i} className="text-[9px] text-white/80 font-medium">
              {shortName(p.name)}{p.goals > 1 ? ` ×${p.goals}` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Tarjetas */}
      {(yellows.length > 0 || reds.length > 0) && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {yellows.map((p, i) => (
            <span key={i} className="text-[9px] text-yellow-300">🟨 {shortName(p.name)}</span>
          ))}
          {reds.map((p, i) => (
            <span key={i} className="text-[9px] text-red-400">🟥 {shortName(p.name)}</span>
          ))}
        </div>
      )}

      {/* Cambios */}
      {subbedOff.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {subbedOff.map((p, i) => {
            const sub = subbedIn[i]
            return (
              <div key={i} className="flex items-center gap-1 text-[9px]">
                <span className="text-red-400 font-medium">{p.subbedOffAt}'</span>
                <span className="text-red-300">{shortName(p.name)}</span>
                {sub && <span className="text-apple-gray-600">→</span>}
                {sub && <span className="text-emerald-300">{shortName(sub.name)}</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Lesionados / suspendidos */}
      {injured.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {injured.map((n, i) => (
            <span key={i} className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5">
              🏥 {n}
            </span>
          ))}
        </div>
      )}
      {suspended.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suspended.map((n, i) => (
            <span key={i} className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5">
              🚫 {n}
            </span>
          ))}
        </div>
      )}

    </div>
  )
}

// ─── FormationPitchCard ───────────────────────────────────────────────────────

interface FormationPitchCardProps {
  match: MatchFormation
}

export default function FormationPitchCard({ match }: FormationPitchCardProps) {
  const resColor =
    match.result === 'W' ? 'bg-emerald-500 text-white' :
    match.result === 'D' ? 'bg-amber-400 text-black' :
    'bg-red-500 text-white'

  const resLabel = match.result === 'W' ? 'G' : match.result === 'D' ? 'E' : 'P'

  return (
    <div className="bg-[#0e1c2b] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg">

      {/* Header compacto */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${resColor}`}>
            {resLabel} {match.goalsFor}–{match.goalsAgainst}
          </span>
          <span className="text-xs font-semibold text-white/90 truncate">
            {match.isHome ? 'vs' : 'en'} {match.opponent}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-white/35">
          <span>{match.date}</span>
          {match.competition && <><span>·</span><span className="truncate max-w-[90px]">{match.competition}</span></>}
          {match.formation && (
            <span className="ml-auto font-bold text-blue-400/80 tracking-wider">{match.formation}</span>
          )}
        </div>
      </div>

      {/* Canchita */}
      <div className="px-2 pb-1.5">
        <PitchSVG formation={match.formation} players={match.players} />
      </div>

      {/* Conclusiones */}
      <MatchConclusions match={match} />
    </div>
  )
}

// ─── FormationsGrid ───────────────────────────────────────────────────────────

interface FormationsGridProps {
  formations: MatchFormation[]
  maxShow?: number
}

export function FormationsGrid({ formations, maxShow = 5 }: FormationsGridProps) {
  if (formations.length === 0) return null

  const count = Math.min(formations.length, maxShow)
  const sorted = formations.slice(0, count)

  // Scroll horizontal en móvil, máximo 3 por fila en desktop
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {sorted.map((f, i) => (
        <div key={i}>
          <FormationPitchCard match={f} />
        </div>
      ))}
    </div>
  )
}
