import type { EventCoordinate } from '@/services/videoAnalysisTypes'

/* ------------------------------------------------------------------ */
/*  Zone data used by all pitch modes                                 */
/* ------------------------------------------------------------------ */

export interface ZoneData {
  label: string
  count: number
  pct: number          // 0-100
  intensity: number    // 0-1 (for colour opacity)
}

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export type PitchMode = 'heatmap' | 'lateral' | 'shots' | 'recovery'

interface MiniPitchProps {
  /** Legacy: raw coordinates for the generic heatmap */
  coordinates?: EventCoordinate[]
  /** New: pre-computed zone data (lateral / shots / recovery) */
  zones?: ZoneData[]
  /** Which overlay to draw. Default = 'heatmap' (backward compat) */
  mode?: PitchMode
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Shared pitch SVG elements                                         */
/* ------------------------------------------------------------------ */

/** Pitch background + lines (shared by every mode) */
function PitchBase() {
  return (
    <>
      {/* Grass */}
      <rect x="0" y="0" width="105" height="68" rx="4" fill="#0d3310" />

      {/* Pitch outline + centre */}
      <rect x="2" y="2" width="101" height="64" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.7" rx="1" />
      <line x1="52.5" y1="2" x2="52.5" y2="66" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
      <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
      <circle cx="52.5" cy="34" r="0.7" fill="rgba(255,255,255,0.2)" />

      {/* Penalty areas */}
      <rect x="2" y="14.5" width="17" height="39" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <rect x="2" y="24" width="6" height="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
      <rect x="86" y="14.5" width="17" height="39" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <rect x="97" y="24" width="6" height="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />

      {/* Goals */}
      <rect x="0.5" y="29" width="1.5" height="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" rx="0.3" />
      <rect x="103" y="29" width="1.5" height="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" rx="0.3" />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Zone label (count + %)  — rendered inside zone overlays           */
/* ------------------------------------------------------------------ */

function ZoneLabel({ x, y, count, pct }: { x: number; y: number; count: number; pct: number }) {
  return (
    <g>
      <text
        x={x} y={y - 3}
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontWeight="700"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
      >
        {count}
      </text>
      <text
        x={x} y={y + 6}
        textAnchor="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize="4.5"
        fontWeight="500"
      >
        {pct}%
      </text>
    </g>
  )
}

/* ------------------------------------------------------------------ */
/*  MODE: heatmap (legacy — coordinate-based grid)                    */
/* ------------------------------------------------------------------ */

const COLS = 10
const ROWS = 6

function buildHeatmap(coordinates: EventCoordinate[]) {
  const cellW = 101 / COLS
  const cellH = 64 / ROWS
  const grid: number[][] = Array.from({ length: COLS }, () => Array(ROWS).fill(0))

  for (const c of coordinates) {
    const col = Math.min(Math.floor(c.x * COLS), COLS - 1)
    const row = Math.min(Math.floor(c.y * ROWS), ROWS - 1)
    grid[col][row]++
  }

  const cells: { x: number; y: number; w: number; h: number; intensity: number }[] = []
  let max = 0
  for (let col = 0; col < COLS; col++)
    for (let row = 0; row < ROWS; row++)
      if (grid[col][row] > max) max = grid[col][row]

  if (max === 0) return cells

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (grid[col][row] === 0) continue
      cells.push({
        x: 2 + col * cellW,
        y: 2 + row * cellH,
        w: cellW,
        h: cellH,
        intensity: grid[col][row] / max,
      })
    }
  }
  return cells
}

function HeatmapOverlay({ coordinates }: { coordinates: EventCoordinate[] }) {
  const cells = buildHeatmap(coordinates)
  return (
    <>
      {cells.map((cell, i) => (
        <rect
          key={i}
          x={cell.x} y={cell.y}
          width={cell.w} height={cell.h}
          rx="1"
          fill="#6F1929"
          opacity={0.15 + cell.intensity * 0.65}
        />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  MODE: lateral  — 3 horizontal bands (Izq / Centro / Der)         */
/* ------------------------------------------------------------------ */

function LateralOverlay({ zones }: { zones: ZoneData[] }) {
  const padded = [
    zones[0] ?? { label: 'Izq', count: 0, pct: 0, intensity: 0 },
    zones[1] ?? { label: 'Centro', count: 0, pct: 0, intensity: 0 },
    zones[2] ?? { label: 'Der', count: 0, pct: 0, intensity: 0 },
  ]

  const bandH = 64 / 3

  return (
    <>
      {padded.map((z, i) => {
        const y = 2 + i * bandH
        const centerY = y + bandH / 2
        const opacity = z.count === 0 ? 0 : 0.15 + z.intensity * 0.55
        return (
          <g key={i}>
            {/* Zone highlight — only attacking half */}
            <rect
              x={52.5} y={y}
              width={50.5} height={bandH}
              fill="#6F1929"
              opacity={opacity}
              rx="1"
            />
            {/* Horizontal separator */}
            {i > 0 && (
              <line
                x1={2} y1={y} x2={103} y2={y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.4"
                strokeDasharray="2,2"
              />
            )}
            {/* Label on the right side — compact single line */}
            {z.count > 0 && (
              <text
                x={78} y={centerY + 1.5}
                textAnchor="middle"
                fill="white"
                fontSize="5"
                fontWeight="700"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
              >
                {z.count} — {z.pct}%
              </text>
            )}
            {/* Zone name on the left (defensive half) */}
            <text
              x={27} y={centerY + 1.5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize="3.5"
              fontWeight="500"
              letterSpacing="0.5"
            >
              {z.label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  MODE: shots  — zones near the opponent goal                       */
/* ------------------------------------------------------------------ */

function ShotsOverlay({ zones }: { zones: ZoneData[] }) {
  // Expect up to 3 zones: dentro del area, fuera del area, gol
  // We map them onto the attacking third of the pitch

  // Inside area zone: x 86 to 103, y 14.5 to 53.5
  // Outside area zone: x 70 to 86, full height
  // Goal zone: small zone at the goal mouth
  const zoneRects: Array<{ x: number; y: number; w: number; h: number; cx: number; cy: number }> = [
    { x: 86, y: 14.5, w: 17, h: 39, cx: 94.5, cy: 34 },     // dentro del area
    { x: 68, y: 6,    w: 18, h: 56, cx: 77,   cy: 34 },      // fuera del area
    { x: 97, y: 27,   w: 6,  h: 14, cx: 100,  cy: 34 },      // gol (goal mouth area)
  ]

  return (
    <>
      {zones.map((z, i) => {
        if (i >= zoneRects.length || z.count === 0) return null
        const r = zoneRects[i]
        const opacity = 0.2 + z.intensity * 0.5
        return (
          <g key={i}>
            <rect
              x={r.x} y={r.y}
              width={r.w} height={r.h}
              fill="#6F1929"
              opacity={opacity}
              rx="2"
            />
            <ZoneLabel x={r.cx} y={r.cy} count={z.count} pct={z.pct} />
          </g>
        )
      })}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  MODE: recovery  — 6-zone grid (2 halves x 3 lateral bands)       */
/* ------------------------------------------------------------------ */

function RecoveryOverlay({ zones }: { zones: ZoneData[] }) {
  // Expect up to 6 zones arranged in a 2x3 grid:
  //   [0] own-half left    [3] opp-half left
  //   [1] own-half centre  [4] opp-half centre
  //   [2] own-half right   [5] opp-half right
  // But often only 2 zones (recuperacion, falta) — we render each in a
  // different region to distinguish them visually.

  const halfW = 101 / 2
  const bandH = 64 / 3

  // If we have <= 3 zones, spread them across the own-half bands
  // If we have > 3, spread across both halves
  const cells: Array<{ x: number; y: number; w: number; h: number; cx: number; cy: number }> = []

  if (zones.length <= 3) {
    // Spread across own half, 3 lateral bands
    for (let row = 0; row < Math.min(zones.length, 3); row++) {
      const x = 2
      const y = 2 + row * bandH
      cells.push({ x, y, w: halfW, h: bandH, cx: x + halfW / 2, cy: y + bandH / 2 })
    }
  } else {
    // Full 6-zone grid
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 3; row++) {
        const x = 2 + col * halfW
        const y = 2 + row * bandH
        cells.push({ x, y, w: halfW, h: bandH, cx: x + halfW / 2, cy: y + bandH / 2 })
      }
    }
  }

  return (
    <>
      {zones.map((z, i) => {
        if (i >= cells.length || z.count === 0) return null
        const c = cells[i]
        const opacity = 0.15 + z.intensity * 0.55
        return (
          <g key={i}>
            <rect
              x={c.x} y={c.y}
              width={c.w} height={c.h}
              fill="#6F1929"
              opacity={opacity}
              rx="1.5"
            />
            <ZoneLabel x={c.cx} y={c.cy - 2} count={z.count} pct={z.pct} />
            <text
              x={c.cx} y={c.cy + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.45)"
              fontSize="3"
              fontWeight="500"
            >
              {z.label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main exported component                                           */
/* ------------------------------------------------------------------ */

export default function MiniPitch({
  coordinates = [],
  zones = [],
  mode = 'heatmap',
  className = '',
}: MiniPitchProps) {
  // Nothing to render when there's no data at all
  const hasData = mode === 'heatmap' ? coordinates.length > 0 : zones.length > 0
  if (!hasData) return null

  return (
    <div className={className}>
      <svg viewBox="0 0 105 68" xmlns="http://www.w3.org/2000/svg" className="w-full rounded-xl overflow-hidden">
        <PitchBase />

        {mode === 'heatmap' && <HeatmapOverlay coordinates={coordinates} />}
        {mode === 'lateral' && <LateralOverlay zones={zones} />}
        {mode === 'shots' && <ShotsOverlay zones={zones} />}
        {mode === 'recovery' && <RecoveryOverlay zones={zones} />}
      </svg>
    </div>
  )
}
