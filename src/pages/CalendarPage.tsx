import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCalendarCompat, type FotmobMatchCompat as FotmobMatch } from '@/services/apiFootballService'
import { ShieldImg, CompBadge } from '@/components/ui/ShieldImg'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function opponent(match: FotmobMatch): string {
  return match.isHome ? match.awayTeam : match.homeTeam
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

/** Returns array of 42 cells (6 rows × 7 cols), null = empty padding */
function buildGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Monday-first: Sunday=0 in JS → index 6 in our system
  let startOffset = first.getDay()
  startOffset = startOffset === 0 ? 6 : startOffset - 1

  const cells: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
}

function MatchPill({ match, past }: { match: FotmobMatch; past: boolean }) {
  const isHome = match.isHome
  const opp = opponent(match)
  const shortOpp = opp.replace(/^(Club\s+)?(Atlético|Atletico|Deportivo|Deportes)\s+/i, '').split(' ')[0]
  return (
    <div
      title={`${isHome ? 'Lanús vs' : 'vs Lanús'} ${opp} — ${fmtTime(match.date)}`}
      className={`
        w-full text-left px-1 py-0.5 rounded-md text-[10px] font-semibold leading-tight flex items-center gap-1 overflow-hidden
        ${past
          ? 'bg-apple-gray-100 dark:bg-apple-gray-800 text-apple-gray-500 dark:text-apple-gray-400'
          : isHome
            ? 'bg-brand-green/15 dark:bg-brand-green/25 text-brand-green'
            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
        }
      `}
    >
      <span className="opacity-70 flex-shrink-0 font-bold">{isHome ? 'L' : 'V'}</span>
      <span className="truncate">{shortOpp}</span>
    </div>
  )
}

export default function CalendarPage() {
  const [matches, setMatches] = useState<FotmobMatch[]>([])
  const [loading, setLoading] = useState(true)
  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  useEffect(() => {
    fetchCalendarCompat().then(m => {
      setMatches(m)
      setLoading(false)
    })
  }, [])

  const grid = useMemo(() => buildGrid(year, month), [year, month])

  const matchesThisMonth = useMemo(
    () => matches.filter(m => m.date.getMonth() === month && m.date.getFullYear() === year),
    [matches, month, year]
  )

  const homeCount = matchesThisMonth.filter(m => m.isHome).length
  const awayCount = matchesThisMonth.filter(m => !m.isHome).length

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }
  function goToday()   { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)) }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <div className="min-h-screen bg-apple-gray-50 dark:bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-apple-gray-500 hover:text-apple-gray-800 dark:hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Inicio
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-apple-gray-900 dark:text-white">Calendario</h1>
            <p className="text-sm text-apple-gray-500 mt-0.5">Primera División · Temporada 2026</p>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-600 dark:text-apple-gray-300 hover:bg-white dark:hover:bg-apple-gray-800 transition-colors"
              >
                Hoy
              </button>
            )}

            <div className="flex items-center bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-700 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={prevMonth}
                className="px-3 py-2 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800 transition-colors text-apple-gray-500 dark:text-apple-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="px-4 py-2 text-sm font-semibold text-apple-gray-800 dark:text-white w-44 text-center border-x border-apple-gray-200 dark:border-apple-gray-800">
                {MONTH_NAMES[month]} {year}
              </span>

              <button
                onClick={nextMonth}
                className="px-3 py-2 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800 transition-colors text-apple-gray-500 dark:text-apple-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        {matchesThisMonth.length > 0 && (
          <div className="flex items-center gap-6 mb-5 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-brand-green/70" />
              <span className="text-xs text-apple-gray-500">{homeCount} de local</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/70" />
              <span className="text-xs text-apple-gray-500">{awayCount} de visitante</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-apple-gray-300 dark:bg-apple-gray-600" />
              <span className="text-xs text-apple-gray-500">jugado</span>
            </div>
          </div>
        )}

        {/* Calendar grid */}
        <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-200 dark:border-apple-gray-800 overflow-hidden shadow-sm">

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-apple-gray-200 dark:border-apple-gray-800 bg-apple-gray-50/50 dark:bg-apple-gray-800/30">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-3 text-center text-[11px] font-semibold text-apple-gray-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          {loading ? (
            <div className="py-24 flex justify-center">
              <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {grid.map((day, i) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="min-h-[120px] sm:min-h-[145px] border-b border-r border-apple-gray-50 dark:border-apple-gray-800/60 bg-apple-gray-50/30 dark:bg-apple-gray-900/30"
                    />
                  )
                }

                const dayMatches = matches.filter(m => sameDay(m.date, day))
                const isPast = day < today && !sameDay(day, today)
                const isToday = sameDay(day, today)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-[120px] sm:min-h-[145px] p-2 border-b border-r border-apple-gray-50 dark:border-apple-gray-800/60 transition-colors
                      ${isWeekend && !isToday ? 'bg-apple-gray-50/60 dark:bg-apple-gray-800/20' : ''}
                      ${dayMatches.length > 0 && !isPast ? 'bg-white dark:bg-apple-gray-900' : ''}
                    `}
                  >
                    {/* Day number */}
                    <div className="flex justify-end mb-1">
                      <span className={`
                        text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0
                        ${isToday
                          ? 'bg-brand-green text-white'
                          : isPast
                            ? 'text-apple-gray-300 dark:text-apple-gray-600'
                            : 'text-apple-gray-700 dark:text-apple-gray-300'
                        }
                      `}>
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Shield + competition label */}
                    {dayMatches.length > 0 && (
                      <div className="flex flex-col items-center mb-1.5 gap-1">
                        <ShieldImg
                          team={opponent(dayMatches[0])}
                          size={68}
                          fallbackInitials={true}
                          className={isPast ? 'opacity-35' : 'opacity-95'}
                        />
                        {dayMatches[0].competition !== 'other' && (() => {
                          const comp = dayMatches[0].competition
                          const label = comp === 'liga' ? 'Liga Pro' : comp === 'libertadores' ? 'Lib.' : comp === 'sudamericana' ? 'Suda.' : 'Copa'
                          const cls = comp === 'liga' ? 'bg-emerald-500/20 text-emerald-400 dark:text-emerald-300' : comp === 'libertadores' ? 'bg-blue-500/20 text-blue-400 dark:text-blue-300' : comp === 'sudamericana' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'
                          return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${cls} ${isPast ? 'opacity-40' : ''}`}>{label}</span>
                        })()}
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      {dayMatches.map(match => (
                        <MatchPill key={match.id} match={match} past={isPast} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Empty month state */}
        {!loading && matchesThisMonth.length === 0 && (
          <div className="mt-6 text-center py-8">
            <p className="text-sm text-apple-gray-400">Sin partidos programados en {MONTH_NAMES[month]}</p>
          </div>
        )}

        {/* Match list for the month */}
        {!loading && matchesThisMonth.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-3">
              Partidos de {MONTH_NAMES[month]}
            </h2>
            <div className="space-y-2">
              {matchesThisMonth.map(match => {
                const past = match.date < today
                const opp = opponent(match)
                return (
                  <div
                    key={match.id}
                    className={`
                      flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors
                      ${past
                        ? 'bg-white dark:bg-apple-gray-900 border-apple-gray-200 dark:border-apple-gray-800 opacity-60'
                        : match.isHome
                          ? 'bg-brand-green/5 border-brand-green/20 dark:bg-brand-green/10 dark:border-brand-green/20'
                          : 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30'
                      }
                    `}
                  >
                    {/* Date block */}
                    <div className="text-center w-10 flex-shrink-0">
                      <p className="text-[10px] font-semibold text-apple-gray-400 uppercase">
                        {match.date.toLocaleDateString('es-AR', { month: 'short' })}
                      </p>
                      <p className="text-lg font-bold text-apple-gray-800 dark:text-white leading-none">
                        {match.date.getDate()}
                      </p>
                    </div>

                    {/* Shield */}
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                      <ShieldImg team={opp} size={40} />
                    </div>

                    {/* Match info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {match.competition !== 'liga' && match.competition !== 'other' && (
                          <CompBadge competition={match.competition} size={14} className="opacity-80 flex-shrink-0" />
                        )}
                        <p className="text-sm font-semibold text-apple-gray-800 dark:text-white truncate">
                          {match.isHome ? `Lanús vs ${opp}` : `${opp} vs Lanús`}
                        </p>
                      </div>
                      <p className="text-xs text-apple-gray-500 truncate">
                        {match.location || '—'} · {fmtTime(match.date)}
                      </p>
                    </div>

                    {/* Badge */}
                    <span className={`
                      flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full
                      ${match.isHome
                        ? 'bg-brand-green/15 text-brand-green dark:bg-brand-green/20'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }
                    `}>
                      {match.isHome ? 'Local' : 'Visitante'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
