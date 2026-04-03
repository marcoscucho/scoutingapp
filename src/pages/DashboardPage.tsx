import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'
import { fetchLanusCalendar, FotmobMatch } from '@/services/fotmobService'
import { fetchUltimoOnce, LineupData } from '@/services/ultimoOnceService'
import { computeStreak } from '@/services/formGuideService'
import { fetchRivalDataFromCSV, fetchRivalLineup, RivalData } from '@/services/rivalService'
import { getSeguimientoList } from '@/lib/supabase'
import { LANUS_2026 } from '@/data/lanus2026'
import { ShieldImg, CompBadge } from '@/components/ui/ShieldImg'
import type { EnrichedPlayer } from '@/types'

// Derive last-5 form directly from LANUS_2026 — single source of truth, no Supabase needed
const COMP_LABEL: Record<string, string> = { liga: 'Liga Profesional', copa: 'Copa Argentina', internacional: 'Internacional' }
const FORM = [...LANUS_2026]
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 5)
  .map(m => ({
    id: m.id,
    match_date: m.date,
    opponent: m.rival,
    was_home: m.isHome,
    goals_for: m.golesAFavor,
    goals_against: m.golesEnContra,
    result: m.result,
    competition: COMP_LABEL[m.competition] ?? m.competition,
  }))

// ─── Helpers ────────────────────────────────────────────────────────────────

function greeting(): string {
  return 'Hola'
}

function fmtDate(d: Date, opts?: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString('es-AR', opts ?? { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function monthsLabel(months: number | undefined): string {
  if (months === undefined) return '—'
  if (months < 1) return 'Vence este mes'
  if (months === 1) return '1 mes'
  return `${months} meses`
}

function initials(name: string): string {
  return name
    .split(/[\s-]/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function opponent(match: FotmobMatch): string {
  return match.isHome ? match.awayTeam : match.homeTeam
}


// ─── Sub-components ──────────────────────────────────────────────────────────

function MatchCard({
  match,
  label,
  accent = 'brand',
  isTravel = false,
}: {
  match: FotmobMatch | undefined
  label: string
  accent?: 'brand' | 'blue' | 'neutral'
  isTravel?: boolean
}) {
  const accentCls = {
    brand: 'from-brand-green to-brand-greenHover text-white',
    blue: 'from-blue-600 to-blue-700 text-white',
    neutral: 'from-apple-gray-700 to-apple-gray-800 text-white',
  }[accent]

  if (!match) {
    return (
      <div className="rounded-2xl bg-apple-gray-100 dark:bg-apple-gray-800 p-5 flex flex-col gap-3 min-h-[160px] justify-center items-center">
        <span className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm text-apple-gray-400">Sin datos disponibles</span>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${accentCls} p-5 flex flex-col gap-3 min-h-[160px] shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</span>
          {isTravel && <span className="text-sm opacity-60">✈️</span>}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${match.isHome ? 'bg-white/20' : 'bg-black/20'}`}>
          {match.isHome ? 'Local' : 'Visitante'}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-1">
        {(() => {
          const opp = opponent(match)
          return (
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center flex-shrink-0 p-1">
              <ShieldImg team={opp} size={32} />
            </div>
          )
        })()}
        <div>
          <p className="font-semibold text-base leading-tight">{opponent(match)}</p>
          <p className="text-xs opacity-70 mt-0.5 flex items-center gap-1">
            {isTravel && <span className="text-sm leading-none">🇦🇷</span>}
            <span>{match.location || 'Estadio por confirmar'}</span>
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between text-xs opacity-80">
        <span>{fmtDate(match.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <span>{fmtTime(match.date)}</span>
      </div>
    </div>
  )
}

function ContractRow({ player, urgency }: { player: EnrichedPlayer; urgency: 'critical' | 'warning' | 'watch' }) {
  const colors = {
    critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    warning: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    watch: 'text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  }[urgency]

  const name = (player as any).Jugador ?? (player as any)['Nombre'] ?? '—'
  const pos = (player as any)['Posición específica'] ?? (player as any)['Posición'] ?? '—'
  const months = (player as any).monthsRemaining as number | undefined

  const imagen = (player as any).Imagen as string | undefined

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-apple-gray-100 dark:border-apple-gray-800 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-apple-gray-200 dark:bg-apple-gray-700 flex items-center justify-center text-xs font-semibold text-apple-gray-600 dark:text-apple-gray-300 flex-shrink-0 overflow-hidden">
          {imagen
            ? <img src={imagen} alt={name} className="w-full h-full object-cover" onError={e => { const el = e.target as HTMLImageElement; el.style.display = 'none'; el.parentElement!.innerHTML = `<span class="text-xs font-semibold">${initials(name)}</span>` }} />
            : initials(name)
          }
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-apple-gray-800 dark:text-white truncate">{name}</p>
          <p className="text-xs text-apple-gray-500 truncate">{pos}</p>
        </div>
      </div>
      <span className={`text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 ml-2 ${colors}`}>
        {monthsLabel(months)}
      </span>
    </div>
  )
}

function UpcomingMatchRow({ match, index }: { match: FotmobMatch; index: number }) {
  const isAway = !match.isHome
  const opp = match.isHome ? match.awayTeam : match.homeTeam
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-apple-gray-100 dark:border-apple-gray-800 last:border-0 ${index === 0 ? 'opacity-100' : 'opacity-90'}`}>
      <div className="text-center w-12 flex-shrink-0">
        <p className="text-xs font-semibold text-apple-gray-500 uppercase">
          {fmtDate(match.date, { month: 'short' })}
        </p>
        <p className="text-lg font-bold text-apple-gray-800 dark:text-white leading-none">
          {match.date.getDate()}
        </p>
        <p className="text-xs text-apple-gray-400">{fmtTime(match.date)}</p>
      </div>

      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        <ShieldImg team={opp} size={28} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-apple-gray-800 dark:text-white truncate">
          {match.isHome ? `Lanús vs ${match.awayTeam}` : `${match.homeTeam} vs Lanús`}
        </p>
        <p className="text-xs text-apple-gray-500 truncate mt-0.5">{match.location || '—'}</p>
      </div>

      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
        isAway
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'bg-brand-green/10 text-brand-green'
      }`}>
        {isAway ? 'Visita' : 'Local'}
      </span>
    </div>
  )
}

// ─── Pitch (Último 11) ───────────────────────────────────────────────────────

interface PitchPlayer {
  number: number
  name: string
  x: number
  y: number
}

// Formation coordinate maps — indexed by lineup position order.
// FotMob order: GK → RB → CB → CB → LB → RM → CM → LM → RW → ST → LW
// SVG: x increases LEFT→RIGHT, y increases TOP→BOTTOM.
// Team defends bottom goal (y≈144), attacks toward top (y≈4).
const FORMATION_COORDS: Record<string, [number, number][]> = {
  '4-3-3': [
    [50, 131], // 0 GK
    [82, 113], // 1 RB  — right side
    [62, 114], // 2 CB-R
    [38, 114], // 3 CB-L
    [18, 113], // 4 LB  — left side
    [76,  83], // 5 RM
    [50,  87], // 6 CM (pivot)
    [24,  83], // 7 LM
    [76,  47], // 8 RW  — right wing
    [50,  35], // 9 ST  — striker
    [24,  47], // 10 LW — left wing
  ],
  '4-4-2': [
    [50, 131],
    [82, 113], [62, 114], [38, 114], [18, 113],
    [78,  83], [56,  83], [44,  83], [22,  83],
    [65,  42], [35,  42],
  ],
  '4-2-3-1': [
    [50, 131],
    [82, 113], [62, 114], [38, 114], [18, 113],
    [65,  92], [35,  92],
    [76,  68], [50,  65], [24,  68],
    [50,  35],
  ],
}

// Default placeholder uses 4-3-3 coordinates
const PLACEHOLDER_11: PitchPlayer[] = FORMATION_COORDS['4-3-3'].map(([x, y], i) => ({
  number: [1,2,4,5,3,8,6,10,7,9,11][i],
  name: '—',
  x, y,
}))

function PitchVisualization({ players = PLACEHOLDER_11, isPlaceholder = true, formation = '4-3-3' }: {
  players?: PitchPlayer[]
  isPlaceholder?: boolean
  formation?: string
}) {
  // Always compute positions from formation map (ignores stored x/y from DB).
  // FotMob order: GK, RB, CB, CB, LB, RM, CM, LM, RW, ST, LW
  const coords = FORMATION_COORDS[formation] ?? FORMATION_COORDS['4-3-3']
  const positioned: PitchPlayer[] = isPlaceholder
    ? players
    : players.map((p, i) => ({ ...p, x: coords[i]?.[0] ?? p.x, y: coords[i]?.[1] ?? p.y }))
  return (
    <div className="relative w-full" style={{ paddingBottom: '148%' }}>
      <svg
        viewBox="0 0 100 148"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Grass base */}
        <rect width="100" height="148" rx="6" fill="#1e7a35" />
        {/* Alternating stripes */}
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x="2" y={2 + i * 18} width="96" height="9" rx="0" fill="#1a6b2e" opacity="0.45" />
        ))}

        {/* Outer boundary */}
        <rect x="5" y="6" width="90" height="136" rx="2" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
        {/* Halfway line */}
        <line x1="5" y1="74" x2="95" y2="74" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
        {/* Center circle */}
        <circle cx="50" cy="74" r="12" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
        <circle cx="50" cy="74" r="1.2" fill="rgba(255,255,255,0.8)" />

        {/* Top penalty area */}
        <rect x="25" y="6" width="50" height="19" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        {/* Top 6-yard box */}
        <rect x="37" y="6" width="26" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
        {/* Top goal */}
        <rect x="41" y="2.5" width="18" height="4.5" rx="0.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
        {/* Top penalty spot */}
        <circle cx="50" cy="22" r="0.9" fill="rgba(255,255,255,0.65)" />

        {/* Bottom penalty area */}
        <rect x="25" y="123" width="50" height="19" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        {/* Bottom 6-yard box */}
        <rect x="37" y="134" width="26" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
        {/* Bottom goal */}
        <rect x="41" y="141" width="18" height="4.5" rx="0.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
        {/* Bottom penalty spot */}
        <circle cx="50" cy="126" r="0.9" fill="rgba(255,255,255,0.65)" />

        {/* Corner arcs */}
        {[[5,6],[95,6],[5,142],[95,142]].map(([cx,cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
        ))}

        {/* Players */}
        {positioned.map((p) => {
          // Full last name — no truncation. Adjust font size for long names.
          const lastName = p.name !== '—'
            ? p.name.split(' ').filter(w => w.length > 1).slice(-1)[0] ?? p.name
            : ''
          const displayName = lastName
          const fontSize = displayName.length > 9 ? 2.2 : displayName.length > 7 ? 2.4 : 2.6
          const pillW = Math.max(displayName.length * (fontSize * 0.72), 9)

          return (
            <g key={p.number} transform={`translate(${p.x}, ${p.y})`}>
              {/* Drop shadow */}
              <circle r="5.8" fill="rgba(0,0,0,0.3)" cx="0.4" cy="0.8" />
              {/* Player circle — Lanús granate */}
              <circle r="5.8" fill="#6F1929" stroke="rgba(255,255,255,0.92)" strokeWidth="0.9" />
              {/* Jersey number */}
              <text
                x="0" y="0.6"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="3.4"
                fontWeight="bold"
                fill="white"
                stroke="#4a0f1a"
                strokeWidth="0.5"
                paintOrder="stroke fill"
              >
                {p.number}
              </text>
              {/* Name pill — always readable */}
              {displayName && (
                <>
                  <rect
                    x={-pillW / 2} y="7.2"
                    width={pillW} height="4.8"
                    rx="2"
                    fill="rgba(0,0,0,0.68)"
                  />
                  <text
                    x="0" y="9.7"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight="600"
                    fill="white"
                    letterSpacing="0.03"
                  >
                    {displayName}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>

      {isPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center">
            <p className="text-white text-xs font-semibold">Sin datos</p>
            <p className="text-white/65 text-[10px] mt-0.5">Presioná "Actualizar 11"</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Rival Section ───────────────────────────────────────────────────────────

function RivalSection({
  rivalData,
  loading,
  nextMatch,
}: {
  rivalData: RivalData | null
  loading: boolean
  nextMatch: FotmobMatch
}) {
  const oppName = nextMatch.isHome ? nextMatch.awayTeam : nextMatch.homeTeam

  if (loading) {
    return (
      <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 p-6 flex items-center justify-center min-h-[120px]">
        <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const formDots = rivalData?.recentForm ?? []
  const hasLineup = rivalData && rivalData.lastLineup.length > 0

  return (
    <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-apple-gray-100 dark:border-apple-gray-800 flex items-center gap-3">
        <ShieldImg team={oppName} size={32} className="flex-shrink-0" />
        <div>
          <h2 className="font-semibold text-apple-gray-800 dark:text-white">{oppName}</h2>
          <p className="text-xs text-apple-gray-500 mt-0.5">
            Datos del próximo rival · {nextMatch.isHome ? 'Visitante' : 'Local'}
            {rivalData?.recentForm[0]?.competicion ? ` · ${rivalData.recentForm[0].competicion}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-apple-gray-100 dark:divide-apple-gray-800">

        {/* Left: Stats & Form */}
        <div className="p-5 space-y-5">
          {/* Key metrics from CSV */}
          {rivalData && (
            <div className="grid grid-cols-3 gap-3">
              {rivalData.avgXG !== undefined && (
                <div className="bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{rivalData.avgXG.toFixed(2)}</p>
                  <p className="text-2xs text-apple-gray-400 uppercase tracking-wide mt-0.5">xG/partido</p>
                </div>
              )}
              {rivalData.avgGoles !== undefined && (
                <div className="bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-apple-gray-800 dark:text-white">{rivalData.avgGoles.toFixed(1)}</p>
                  <p className="text-2xs text-apple-gray-400 uppercase tracking-wide mt-0.5">Goles/partido</p>
                </div>
              )}
              {rivalData.avgPosesion !== undefined && (
                <div className="bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-apple-gray-800 dark:text-white">{rivalData.avgPosesion.toFixed(0)}%</p>
                  <p className="text-2xs text-apple-gray-400 uppercase tracking-wide mt-0.5">Posesión</p>
                </div>
              )}
              {rivalData.avgGolesEnContra !== undefined && (
                <div className="bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{rivalData.avgGolesEnContra.toFixed(1)}</p>
                  <p className="text-2xs text-apple-gray-400 uppercase tracking-wide mt-0.5">Goles recibidos</p>
                </div>
              )}
              {rivalData.avgPPDA !== undefined && (
                <div className="bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-apple-gray-800 dark:text-white">{rivalData.avgPPDA.toFixed(1)}</p>
                  <p className="text-2xs text-apple-gray-400 uppercase tracking-wide mt-0.5">PPDA</p>
                </div>
              )}
              {rivalData.recentForm.length > 0 && (() => {
                const w = rivalData.recentForm.filter(m => m.result === 'W').length
                const d = rivalData.recentForm.filter(m => m.result === 'D').length
                const l = rivalData.recentForm.filter(m => m.result === 'L').length
                return (
                  <div className="bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-apple-gray-800 dark:text-white">{w}G·{d}E·{l}P</p>
                    <p className="text-2xs text-apple-gray-400 uppercase tracking-wide mt-0.5">Últ. {rivalData.recentForm.length}</p>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Recent form */}
          {formDots.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-2">
                Forma reciente
              </p>
              <div className="flex items-center gap-2">
                {[...formDots].reverse().map((m, i) => {
                  const dot = m.result === 'W'
                    ? 'bg-emerald-500 text-white'
                    : m.result === 'L'
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-400 text-white'
                  return (
                    <div key={i} className="relative group">
                      <div className={`w-8 h-8 rounded-full ${dot} flex items-center justify-center text-xs font-bold shadow-sm`}>
                        {m.result}
                      </div>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-apple-gray-900 dark:bg-black text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap text-center shadow-xl">
                          <p className="font-semibold">{m.goalsFor}-{m.goalsAgainst}</p>
                          <p className="opacity-70">{m.isHome ? 'Local' : 'Visitante'} · {m.partido}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!rivalData && !loading && (
            <p className="text-sm text-apple-gray-400 text-center py-4">
              No se pudieron cargar los datos del rival
            </p>
          )}
        </div>

        {/* Right: Last lineup */}
        <div className="p-5">
          <p className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-3">
            {hasLineup ? `Último 11 · vs ${rivalData!.lastOpponent ?? '—'} · ${rivalData!.lastResult ?? ''}` : 'Último 11 inicial'}
          </p>
          {hasLineup ? (
            <div className="max-w-[260px] mx-auto">
              <RivalPitchVisualization
                players={rivalData!.lastLineup}
                formation={rivalData!.lastFormation}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 rounded-xl bg-apple-gray-50 dark:bg-apple-gray-800/50">
              <p className="text-sm text-apple-gray-400">Sin datos de formación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Rival pitch visualization — mirrored (attacks upward from our perspective)
function RivalPitchVisualization({ players, formation }: { players: { number: number; name: string; x: number; y: number }[]; formation: string }) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '148%' }}>
      <svg viewBox="0 0 100 148" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Grass */}
        <rect width="100" height="148" rx="6" fill="#1e7a35" />
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x="2" y={2 + i * 18} width="96" height="9" fill="#1a6b2e" opacity="0.45" />
        ))}
        <rect x="5" y="6" width="90" height="136" rx="2" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
        <line x1="5" y1="74" x2="95" y2="74" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
        <circle cx="50" cy="74" r="12" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.7" />
        <circle cx="50" cy="74" r="1.2" fill="rgba(255,255,255,0.8)" />
        <rect x="25" y="6" width="50" height="19" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        <rect x="37" y="6" width="26" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
        <rect x="41" y="2.5" width="18" height="4.5" rx="0.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
        <rect x="25" y="123" width="50" height="19" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        <rect x="37" y="134" width="26" height="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
        <rect x="41" y="141" width="18" height="4.5" rx="0.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
        {players.map((p) => {
          const lastName = p.name.split(' ').filter(w => w.length > 1).slice(-1)[0] ?? p.name
          const fontSize = lastName.length > 9 ? 2.2 : lastName.length > 7 ? 2.4 : 2.6
          const pillW = Math.max(lastName.length * (fontSize * 0.72), 9)
          return (
            <g key={p.number} transform={`translate(${p.x}, ${p.y})`}>
              <circle r="5.8" fill="rgba(0,0,0,0.3)" cx="0.4" cy="0.8" />
              <circle r="5.8" fill="#1a3a6b" stroke="rgba(255,255,255,0.92)" strokeWidth="0.9" />
              <text x="0" y="0.6" textAnchor="middle" dominantBaseline="middle" fontSize="3.4" fontWeight="bold" fill="white" stroke="#0d1f3c" strokeWidth="0.5" paintOrder="stroke fill">{p.number}</text>
              {lastName && (
                <>
                  <rect x={-pillW / 2} y="7.2" width={pillW} height="4.8" rx="2" fill="rgba(0,0,0,0.68)" />
                  <text x="0" y="9.7" textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fontWeight="600" fill="white" letterSpacing="0.03">{lastName}</text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, to, color = 'default' }: {
  label: string
  value: number | string
  sub?: string
  to?: string
  color?: 'default' | 'red' | 'green' | 'blue'
}) {
  const colorCls = {
    default: 'text-apple-gray-800 dark:text-white',
    red: 'text-red-600 dark:text-red-400',
    green: 'text-brand-green dark:text-brand-green',
    blue: 'text-blue-600 dark:text-blue-400',
  }[color]

  const inner = (
    <div className="bg-white dark:bg-apple-gray-900 rounded-2xl p-5 border border-apple-gray-100 dark:border-apple-gray-800 hover:shadow-md transition-shadow">
      <p className="text-xs font-semibold text-apple-gray-500 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-bold ${colorCls}`}>{value}</p>
      {sub && <p className="text-xs text-apple-gray-400 mt-1">{sub}</p>}
    </div>
  )

  return to ? <Link to={to}>{inner}</Link> : inner
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, userDisplayName } = useAuth()
  const { internal, external, loading } = useData()
  const [matches, setMatches] = useState<FotmobMatch[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [lineup, setLineup] = useState<LineupData | null>(null)
  const [loadingLineup, setLoadingLineup] = useState(true)
  const [updatingLineup, setUpdatingLineup] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [seguimientoCount, setSeguimientoCount] = useState<number | null>(null)
  const [rivalData, setRivalData] = useState<RivalData | null>(null)
  const [loadingRival, setLoadingRival] = useState(false)

  useEffect(() => {
    fetchLanusCalendar().then(m => {
      setMatches(m)
      setLoadingMatches(false)
    })
  }, [])

  const loadLineup = useCallback(async () => {
    setLoadingLineup(true)
    const data = await fetchUltimoOnce()
    setLineup(data)
    setLoadingLineup(false)
  }, [])

  useEffect(() => { loadLineup() }, [loadLineup])
  useEffect(() => {
    getSeguimientoList().then(list => setSeguimientoCount(list.length))
  }, [])

  // Fetch rival data when next match is known — CSV is primary, FotMob lineup is bonus
  useEffect(() => {
    if (loadingMatches) return
    const fut = matches.filter(m => m.date >= new Date())
    const next = fut[0]
    if (!next) return
    const oppName = next.isHome ? next.awayTeam : next.homeTeam
    setLoadingRival(true)
    fetchRivalDataFromCSV(oppName).then(async csvData => {
      if (!csvData) { setLoadingRival(false); return }
      setRivalData(csvData)
      setLoadingRival(false)
    })
  }, [matches, loadingMatches])

  const handleUpdateLineup = useCallback(async () => {
    setUpdatingLineup(true)
    setUpdateError(null)
    try {
      const res = await fetch('/.netlify/functions/update-lineup', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await loadLineup()
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Error al actualizar')
    }
    setUpdatingLineup(false)
  }, [loadLineup])

  const now = new Date()

  const lastMatch = useMemo(() => {
    const past = matches.filter(m => m.date < now)
    return past[past.length - 1]
  }, [matches])

  const futureMatches = useMemo(() => matches.filter(m => m.date >= now), [matches])
  const nextMatch = futureMatches[0]
  const nextAway = futureMatches.find(m => !m.isHome)

  const contractAlerts = useMemo(() => {
    const critical: EnrichedPlayer[] = []
    const warning: EnrichedPlayer[] = []
    const watch: EnrichedPlayer[] = []

    for (const p of internal) {
      const m = (p as any).monthsRemaining as number | undefined
      if (m === undefined) continue
      if (m < 6) critical.push(p)
      else if (m < 12) warning.push(p)
      else if (m < 24) watch.push(p)
    }

    return { critical, warning, watch }
  }, [internal])

  const totalContractAlerts = contractAlerts.critical.length + contractAlerts.warning.length

  const todayStr = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-apple-gray-50 dark:bg-[#0a0a0a]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-apple-gray-900 dark:text-white">
              {greeting()}{user ? `, ${userDisplayName}` : ''}
            </h1>
            <p className="text-sm text-apple-gray-500 capitalize mt-1">{todayStr}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-apple-gray-600 dark:text-apple-gray-300">Datos actualizados</span>
          </div>
        </div>

        {/* ── Match Cards ── */}
        <section>
          <h2 className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-3">Partidos</h2>
          {loadingMatches ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0,1,2].map(i => (
                <div key={i} className="rounded-2xl bg-apple-gray-200 dark:bg-apple-gray-800 h-40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MatchCard match={lastMatch} label="Último partido" accent="neutral" />
              <MatchCard match={nextMatch} label="Próximo partido" accent="brand" />
              <MatchCard match={nextAway} label="Próximo viaje" accent="blue" isTravel />
            </div>
          )}
        </section>

        {/* ── Forma reciente ── */}
        {(() => {
          const streak = computeStreak(FORM)
          const streakLabel = streak
            ? streak.type === 'W'
              ? streak.count === 1 ? '1 victoria' : `${streak.count} victorias seguidas`
              : streak.type === 'L'
                ? streak.count === 1 ? '1 derrota' : `${streak.count} derrotas seguidas`
                : streak.count === 1 ? '1 empate' : `${streak.count} empates seguidos`
            : ''
          const streakColor = streak?.type === 'W'
            ? 'text-emerald-600 dark:text-emerald-400'
            : streak?.type === 'L'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'

          return (
            <section className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Streak label */}
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-0.5">Racha actual</p>
                    <p className={`text-lg font-bold capitalize ${streakColor}`}>{streakLabel}</p>
                  </div>
                </div>

                {/* Form dots */}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-apple-gray-400 mr-1 hidden sm:block">Últimos {FORM.length}</p>
                  <div className="flex items-center gap-1.5">
                    {[...FORM].reverse().map((m, i) => {
                      const dot = m.result === 'W'
                        ? 'bg-emerald-500 text-white'
                        : m.result === 'L'
                          ? 'bg-red-500 text-white'
                          : 'bg-amber-400 text-white'
                      return (
                        <div key={i} className="relative group">
                          <div className={`w-8 h-8 rounded-full ${dot} flex items-center justify-center text-xs font-bold shadow-sm`}>
                            {m.result}
                          </div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                            <div className="bg-apple-gray-900 dark:bg-black text-white text-[10px] rounded-xl px-3 py-2 whitespace-nowrap text-center shadow-xl flex flex-col items-center gap-1">
                              <ShieldImg team={m.opponent} size={24} />
                              <p className="font-semibold text-[11px]">{m.was_home ? `Lanús ${m.goals_for}-${m.goals_against}` : `${m.goals_for}-${m.goals_against} Lanús`}</p>
                              <p className="opacity-70">{m.was_home ? 'vs' : 'en'} {m.opponent}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Stats compact */}
                  <div className="ml-3 pl-3 border-l border-apple-gray-100 dark:border-apple-gray-800 flex items-center gap-4 text-center">
                    {(['W','D','L'] as const).map(r => {
                      const count = FORM.filter(m => m.result === r).length
                      const cls = r === 'W' ? 'text-emerald-600 dark:text-emerald-400' : r === 'L' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                      const lbl = r === 'W' ? 'G' : r === 'D' ? 'E' : 'P'
                      return (
                        <div key={r}>
                          <p className={`text-lg font-bold leading-none ${cls}`}>{count}</p>
                          <p className="text-[10px] text-apple-gray-400 mt-0.5">{lbl}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          )
        })()}

        {/* ── Datos del próximo rival ── */}
        {!loadingMatches && nextMatch && (
          <section>
            <h2 className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-3">Próximo rival</h2>
            <RivalSection rivalData={rivalData} loading={loadingRival} nextMatch={nextMatch} />
          </section>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Calendar — upcoming matches */}
          <div className="lg:col-span-2 bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-apple-gray-100 dark:border-apple-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-apple-gray-800 dark:text-white">Calendario</h2>
                <p className="text-xs text-apple-gray-500 mt-0.5">Próximos partidos de primera división</p>
              </div>
              <Link
                to="/calendario"
                className="flex items-center gap-1.5 text-xs font-medium text-brand-green hover:text-brand-greenHover transition-colors"
              >
                Ver mes
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="divide-y divide-apple-gray-100 dark:divide-apple-gray-800">
              {loadingMatches ? (
                <div className="px-5 py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : futureMatches.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-apple-gray-400">
                  No hay partidos programados
                </div>
              ) : (
                <div className="px-5 divide-y divide-apple-gray-50 dark:divide-apple-gray-800/50 max-h-96 overflow-y-auto">
                  {futureMatches.slice(0, 12).map((m, i) => (
                    <UpcomingMatchRow key={m.id} match={m} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contract Alerts */}
          <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-apple-gray-100 dark:border-apple-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-apple-gray-800 dark:text-white">Contratos</h2>
                <p className="text-xs text-apple-gray-500 mt-0.5">Vencimientos del plantel</p>
              </div>
              <Link
                to="/plantel"
                className="text-xs text-brand-green hover:underline font-medium"
              >
                Ver plantel
              </Link>
            </div>

            <div className="px-5 py-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="py-6 flex justify-center">
                  <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (contractAlerts.critical.length + contractAlerts.warning.length + contractAlerts.watch.length) === 0 ? (
                <p className="text-sm text-apple-gray-400 py-6 text-center">Sin vencimientos próximos</p>
              ) : (
                <div>
                  {/* Critical */}
                  {contractAlerts.critical.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                          Crítico — menos de 6 meses
                        </span>
                      </div>
                      {contractAlerts.critical.map((p, i) => (
                        <ContractRow key={i} player={p} urgency="critical" />
                      ))}
                    </div>
                  )}

                  {/* Warning */}
                  {contractAlerts.warning.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                          Atención — 6 a 12 meses
                        </span>
                      </div>
                      {contractAlerts.warning.map((p, i) => (
                        <ContractRow key={i} player={p} urgency="warning" />
                      ))}
                    </div>
                  )}

                  {/* Watch */}
                  {contractAlerts.watch.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500 uppercase tracking-wide">
                          Seguimiento — 1 a 2 años
                        </span>
                      </div>
                      {contractAlerts.watch.map((p, i) => (
                        <ContractRow key={i} player={p} urgency="watch" />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom grid: Último 11 + Mensajes ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Último 11 */}
          <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-apple-gray-100 dark:border-apple-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-apple-gray-800 dark:text-white">Último 11 inicial</h2>
                {lineup ? (
                  <p className="text-xs text-apple-gray-500 mt-0.5">
                    {lineup.formation} · vs {lineup.opponent} · {lineup.result}
                  </p>
                ) : (
                  <p className="text-xs text-apple-gray-500 mt-0.5">Formación del último partido oficial</p>
                )}
              </div>
              <button
                onClick={handleUpdateLineup}
                disabled={updatingLineup}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-green hover:bg-brand-greenHover text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updatingLineup ? (
                  <>
                    <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                    Actualizando…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualizar 11
                  </>
                )}
              </button>
            </div>
            {updateError && (
              <div className="px-5 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
                <p className="text-xs text-red-600 dark:text-red-400">{updateError}</p>
              </div>
            )}
            <div className="p-3 sm:p-4 max-w-[420px] mx-auto">
              {loadingLineup ? (
                <div className="relative w-full" style={{ paddingBottom: '148%' }}>
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1e7a35] rounded-lg">
                    <div className="w-6 h-6 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  </div>
                </div>
              ) : (
                <PitchVisualization
                  players={lineup ? lineup.players.map(p => ({ number: p.number, name: p.name, x: p.x, y: p.y })) : PLACEHOLDER_11}
                  isPlaceholder={!lineup}
                  formation={lineup?.formation ?? '4-3-3'}
                />
              )}
            </div>
          </div>

          {/* Mensajes */}
          <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-apple-gray-100 dark:border-apple-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-apple-gray-800 dark:text-white">Mensajes</h2>
                <p className="text-xs text-apple-gray-500 mt-0.5">Bandeja de entrada del equipo</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-apple-gray-400 bg-apple-gray-100 dark:bg-apple-gray-800 px-2 py-1 rounded-lg">
                Próximamente
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-apple-gray-100 dark:bg-apple-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-apple-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-apple-gray-600 dark:text-apple-gray-400">Sin mensajes</p>
                <p className="text-xs text-apple-gray-400 dark:text-apple-gray-500 mt-0.5">Próximamente</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <section>
          <h2 className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-3">Resumen</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Base externa"
              value={loading ? '—' : external.length}
              sub="jugadores relevados"
              to="/scouting"
              color="default"
            />
            <StatCard
              label="Plantel"
              value={loading ? '—' : internal.length}
              sub="jugadores del club"
              to="/plantel"
              color="default"
            />
            <StatCard
              label="En seguimiento"
              value={seguimientoCount === null ? '—' : seguimientoCount}
              sub="jugadores monitoreados"
              to="/seguimiento"
              color="blue"
            />
            <StatCard
              label="Contratos urgentes"
              value={loading ? '—' : totalContractAlerts}
              sub={totalContractAlerts > 0 ? 'requieren atención' : 'todo en orden'}
              color={totalContractAlerts > 0 ? 'red' : 'green'}
            />
          </div>
        </section>

      </div>
    </div>
  )
}
