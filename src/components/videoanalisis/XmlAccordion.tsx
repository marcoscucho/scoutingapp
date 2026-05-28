import { useState, useMemo } from 'react'
import type { ParsedCategory, ParsedEvent } from '@/services/videoAnalysisTypes'
import MiniPitch from './MiniPitch'
import type { ZoneData, PitchMode } from './MiniPitch'

/* ================================================================== */
/*  Category-type detection                                           */
/* ================================================================== */

type CategoryViz =
  | 'lateral'       // Ataque — 3 lateral zones on pitch
  | 'bar-chart'     // Salida desde el fondo — horizontal bars, no pitch
  | 'shots'         // Remates — shot zones near opponent goal
  | 'recovery'      // Defensa / Recuperaciones — heatmap zones
  | 'set-piece'     // Pelota parada — corner/tiro libre zones
  | 'table'         // Default fallback — plain data table

function detectCategoryViz(name: string): CategoryViz {
  const n = name.toLowerCase()
  if (/ataque/i.test(n)) return 'lateral'
  if (/salida|inicio/i.test(n)) return 'bar-chart'
  if (/remate|tiro|disparo/i.test(n)) return 'shots'
  if (/defensa|recuper/i.test(n)) return 'recovery'
  if (/pelota.parada|corner|set.piece/i.test(n)) return 'set-piece'
  return 'table'
}

/* ================================================================== */
/*  Helpers — build ZoneData from events                              */
/* ================================================================== */

function buildZones(events: ParsedEvent[], totalCount: number): ZoneData[] {
  const zones: ZoneData[] = events.map(e => ({
    label: e.name,
    count: e.count,
    pct: totalCount > 0 ? Math.round((e.count / totalCount) * 100) : 0,
    intensity: 0,
  }))

  const maxCount = Math.max(...zones.map(z => z.count), 1)
  for (const z of zones) {
    z.intensity = z.count / maxCount
  }
  return zones
}

/* ================================================================== */
/*  Aggregate player breakdown across events                          */
/* ================================================================== */

interface PlayerAgg { player: string; count: number }

function aggregatePlayers(events: ParsedEvent[]): PlayerAgg[] {
  const map = new Map<string, number>()
  for (const e of events) {
    if (e.player) {
      map.set(e.player, (map.get(e.player) || 0) + e.count)
    }
  }
  return [...map.entries()]
    .map(([player, count]) => ({ player, count }))
    .sort((a, b) => b.count - a.count)
}

/* ================================================================== */
/*  Aggregate half breakdown for an event                             */
/* ================================================================== */

interface HalfSplit { first: number; second: number }

function computeHalfSplit(events: ParsedEvent[]): HalfSplit | null {
  let first = 0
  let second = 0
  let hasHalf = false
  for (const e of events) {
    if (e.half === 1) { first += e.count; hasHalf = true }
    else if (e.half === 2) { second += e.count; hasHalf = true }
  }
  return hasHalf ? { first, second } : null
}

/* ================================================================== */
/*  Sub-component: Inline bar chart (for "Salida desde el fondo")     */
/* ================================================================== */

function InlineBarChart({ zones }: { zones: ZoneData[] }) {
  const total = zones.reduce((s, z) => s + z.count, 0)
  if (total === 0) return null

  return (
    <div className="px-5 py-4 space-y-3">
      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden bg-apple-gray-100 dark:bg-apple-gray-700/40">
        {zones.map((z, i) => {
          const width = total > 0 ? (z.count / total) * 100 : 0
          if (width === 0) return null
          // Vary opacity per zone for visual distinction
          const opacity = 0.5 + z.intensity * 0.5
          return (
            <div
              key={i}
              className="flex items-center justify-center text-white relative transition-all duration-500"
              style={{
                width: `${width}%`,
                backgroundColor: `rgba(111,25,41,${opacity})`,
                minWidth: width > 0 ? '32px' : undefined,
              }}
            >
              <span className="text-[10px] font-bold leading-none drop-shadow-sm">
                {z.count}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {zones.map((z, i) => {
          const opacity = 0.5 + z.intensity * 0.5
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: `rgba(111,25,41,${opacity})` }}
              />
              <span className="text-xs text-apple-gray-600 dark:text-apple-gray-300">
                {z.label}
              </span>
              <span className="text-xs font-semibold text-apple-gray-800 dark:text-white tabular-nums">
                {z.pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Sub-component: Set piece visual                                   */
/* ================================================================== */

function SetPieceVisual({ zones }: { zones: ZoneData[] }) {
  // Show zones as labelled blocks in a row — visual, not a pitch
  const total = zones.reduce((s, z) => s + z.count, 0)
  if (total === 0) return null

  return (
    <div className="px-5 py-4">
      <div className="flex gap-3">
        {zones.map((z, i) => {
          const opacity = z.count === 0 ? 0.1 : 0.25 + z.intensity * 0.55
          return (
            <div
              key={i}
              className="flex-1 rounded-xl p-4 text-center transition-all"
              style={{ backgroundColor: `rgba(111,25,41,${opacity})` }}
            >
              <div className="text-lg font-bold text-white drop-shadow-sm">{z.count}</div>
              <div className="text-[10px] font-medium text-white/70 mt-0.5 uppercase tracking-wider">
                {z.label}
              </div>
              <div className="text-xs font-semibold text-white/50 mt-0.5">{z.pct}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Sub-component: Player breakdown                                   */
/* ================================================================== */

function PlayerBreakdown({ players }: { players: PlayerAgg[] }) {
  if (players.length === 0) return null
  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 mt-1">
      {players.slice(0, 5).map((p, i) => (
        <span key={i} className="text-2xs text-apple-gray-400 dark:text-apple-gray-500">
          {p.player}{' '}
          <span className="font-semibold text-apple-gray-500 dark:text-apple-gray-400">({p.count})</span>
          {i < Math.min(players.length, 5) - 1 ? ',' : ''}
        </span>
      ))}
      {players.length > 5 && (
        <span className="text-2xs text-apple-gray-400">+{players.length - 5} más</span>
      )}
    </div>
  )
}

/* ================================================================== */
/*  Sub-component: Half split indicator                               */
/* ================================================================== */

function HalfIndicator({ split }: { split: HalfSplit }) {
  return (
    <span className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-500 dark:text-apple-gray-400 flex-shrink-0">
      <span className="font-semibold">1T:</span>{split.first}
      <span className="text-apple-gray-300 dark:text-apple-gray-600">|</span>
      <span className="font-semibold">2T:</span>{split.second}
    </span>
  )
}

/* ================================================================== */
/*  Props                                                             */
/* ================================================================== */

interface XmlAccordionProps {
  categories: ParsedCategory[]
}

/* ================================================================== */
/*  Main component                                                    */
/* ================================================================== */

export default function XmlAccordion({ categories }: XmlAccordionProps) {
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set(categories.map((_, i) => i)))

  function toggle(idx: number) {
    setOpenSet(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {categories.map((cat, idx) => {
        const isOpen = openSet.has(idx)
        const viz = detectCategoryViz(cat.name)

        return (
          <div key={idx} className="card-apple overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-apple-gray-50/50 dark:hover:bg-apple-gray-700/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-3.5 h-3.5 text-apple-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm font-semibold text-apple-gray-800 dark:text-white tracking-tight">
                  {cat.name}
                </span>
                {/* Viz type badge */}
                {viz !== 'table' && (
                  <span className="text-2xs px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green/70 font-medium">
                    {viz === 'lateral' ? 'Zonas' : viz === 'bar-chart' ? 'Distrib.' : viz === 'shots' ? 'Remates' : viz === 'recovery' ? 'Zonas' : 'Set piece'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-apple-gray-500">{cat.events.length} sub</span>
                <span className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-md bg-brand-green/10 text-brand-green">
                  {cat.totalCount}
                </span>
              </div>
            </button>

            {/* Content */}
            {isOpen && (
              <CategoryContent cat={cat} viz={viz} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ================================================================== */
/*  Category content — decides which visualization to render          */
/* ================================================================== */

function CategoryContent({ cat, viz }: { cat: ParsedCategory; viz: CategoryViz }) {
  const allCoords = useMemo(() => cat.events.flatMap(e => e.coordinates || []), [cat.events])
  const hasCoords = allCoords.length > 0
  const sorted = useMemo(() => [...cat.events].sort((a, b) => b.count - a.count), [cat.events])
  const zones = useMemo(() => buildZones(sorted, cat.totalCount), [sorted, cat.totalCount])
  const players = useMemo(() => aggregatePlayers(cat.events), [cat.events])
  const halfSplit = useMemo(() => computeHalfSplit(cat.events), [cat.events])

  // Map viz type to MiniPitch mode
  const pitchMode: PitchMode | null =
    viz === 'lateral' ? 'lateral' :
    viz === 'shots' ? 'shots' :
    viz === 'recovery' ? 'recovery' :
    null

  // For bar-chart and set-piece, no pitch
  const showPitch = pitchMode !== null
  // If no specific viz matches but we have coordinates, fall back to heatmap
  const showHeatmap = !showPitch && viz === 'table' && hasCoords

  return (
    <div className="animate-fade-in border-t border-apple-gray-200/30 dark:border-apple-gray-700/30">
      {/* Category-level player + half info */}
      {(players.length > 0 || halfSplit) && (
        <div className="px-5 py-2 flex flex-wrap items-center gap-3 border-b border-apple-gray-200/15 dark:border-apple-gray-700/15">
          {players.length > 0 && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-apple-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <PlayerBreakdown players={players} />
            </div>
          )}
          {halfSplit && <HalfIndicator split={halfSplit} />}
        </div>
      )}

      {/* Specialized visualization */}
      {viz === 'bar-chart' && <InlineBarChart zones={zones} />}
      {viz === 'set-piece' && <SetPieceVisual zones={zones} />}

      {/* Pitch + Data table layout */}
      <div className={`${showPitch || showHeatmap ? 'flex flex-col lg:flex-row' : ''}`}>
        {/* Pitch — only for modes that use it */}
        {showPitch && (
          <div className="lg:w-72 flex-shrink-0 p-4 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-apple-gray-200/20 dark:border-apple-gray-700/20">
            <MiniPitch mode={pitchMode!} zones={zones} />
          </div>
        )}

        {/* Fallback heatmap for table viz with coords */}
        {showHeatmap && (
          <div className="lg:w-64 flex-shrink-0 p-4 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-apple-gray-200/20 dark:border-apple-gray-700/20">
            <MiniPitch coordinates={allCoords} />
          </div>
        )}

        {/* Data table */}
        <div className="flex-1 min-w-0">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_60px_50px_1fr] gap-2 px-5 py-2 text-2xs font-semibold text-apple-gray-400 dark:text-apple-gray-500 uppercase tracking-wider border-b border-apple-gray-200/20 dark:border-apple-gray-700/20">
            <span>Evento</span>
            <span className="text-right">Cant.</span>
            <span className="text-right">%</span>
            <span className="pl-3">Distribución</span>
          </div>

          {/* Rows */}
          {sorted.map((event, eIdx) => {
            const pct = cat.totalCount > 0 ? Math.round((event.count / cat.totalCount) * 100) : 0
            const barWidth = cat.totalCount > 0 ? (event.count / cat.totalCount) * 100 : 0

            return (
              <EventRow
                key={eIdx}
                event={event}
                pct={pct}
                barWidth={barWidth}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Event row — shows event name, count, %, distribution, extras      */
/* ================================================================== */

function EventRow({ event, pct, barWidth }: { event: ParsedEvent; pct: number; barWidth: number }) {
  return (
    <div className="grid grid-cols-[1fr_60px_50px_1fr] gap-2 items-start px-5 py-2.5 border-b border-apple-gray-200/10 dark:border-apple-gray-700/10 last:border-b-0 hover:bg-apple-gray-50/30 dark:hover:bg-apple-gray-700/10 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-apple-gray-700 dark:text-apple-gray-300 truncate">
            {event.name}
          </span>
          {event.half && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-500 flex-shrink-0">
              {event.half === 1 ? '1T' : '2T'}
            </span>
          )}
        </div>
        {/* Player info per event */}
        {event.player && (
          <span className="text-2xs text-apple-gray-400 dark:text-apple-gray-500 mt-0.5 block truncate">
            {event.player}
          </span>
        )}
      </div>
      <span className="text-sm font-bold text-apple-gray-800 dark:text-white tabular-nums text-right">
        {event.count}
      </span>
      <span className={`text-xs font-semibold tabular-nums text-right ${pct >= 50 ? 'text-brand-green' : 'text-apple-gray-500'}`}>
        {pct}%
      </span>
      <div className="pl-3 flex items-center gap-2">
        <div className="flex-1 h-2 bg-apple-gray-100 dark:bg-apple-gray-700/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barWidth}%`,
              background: pct >= 50
                ? 'linear-gradient(90deg, #6F1929, #A01A38)'
                : 'linear-gradient(90deg, rgba(111,25,41,0.4), rgba(111,25,41,0.6))',
            }}
          />
        </div>
      </div>
    </div>
  )
}
