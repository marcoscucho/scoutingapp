interface PitchZone { x: number; y: number; w: number; h: number }

const PITCH_ZONES: Record<string, PitchZone> = {
  'Portero':          { x: 1,  y: 21, w: 17, h: 26 },
  'Defensor Central': { x: 5,  y: 10, w: 26, h: 48 },
  'Lateral':          { x: 4,  y: 4,  w: 28, h: 28 },
  'Volante central':  { x: 26, y: 14, w: 33, h: 40 },
  'Volante interno':  { x: 38, y: 8,  w: 34, h: 52 },
  'Extremo':          { x: 44, y: 3,  w: 38, h: 26 },
  'Delantero':        { x: 65, y: 13, w: 32, h: 42 },
}

function getZoneForPosition(posKey: string, rawPos: string): PitchZone | null {
  const z = PITCH_ZONES[posKey]
  if (!z) return null
  const raw = rawPos.toLowerCase()
  if (posKey === 'Lateral') {
    if (raw.includes('derecho'))   return { ...z, y: 36, h: 28 }
    if (raw.includes('izquierdo')) return { ...z, y: 4,  h: 28 }
    return { ...z, y: 4, h: 60 }
  }
  if (posKey === 'Extremo') {
    if (raw.includes('derecho'))   return { ...z, y: 39, h: 26 }
    if (raw.includes('izquierdo')) return { ...z, y: 3,  h: 26 }
    return { ...z, y: 3, h: 62 }
  }
  return z
}

interface FootballPitchProps {
  posKey: string
  rawPosition: string
  positionLabel: string
  compact?: boolean
}

// CSS custom properties let us toggle line colors between dark / light mode
// using Tailwind's arbitrary property syntax: [--var:value] dark:[--var:value]

export default function FootballPitch({ posKey, rawPosition, positionLabel, compact }: FootballPitchProps) {
  const zone = getZoneForPosition(posKey, rawPosition)

  return (
    <div
      className={[
        'flex flex-col items-center w-full',
        compact ? 'gap-2' : 'gap-3',
        // Light mode: dark lines / Dark mode: white lines
        '[--pl:rgba(0,0,0,0.24)]   dark:[--pl:rgba(255,255,255,0.30)]',
        '[--pls:rgba(0,0,0,0.16)]  dark:[--pls:rgba(255,255,255,0.20)]',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 105 68"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full rounded-xl"
        style={{ maxWidth: compact ? 340 : 480 }}
        // No background — fully transparent so card bg shows through
      >
        {/* ── Position zone — the only colored element ── */}
        {zone && (
          <rect
            x={zone.x + 0.5} y={zone.y + 0.5}
            width={zone.w - 1} height={zone.h - 1}
            fill="rgba(140,20,48,0.28)"
            stroke="rgba(168,24,56,0.52)"
            strokeWidth="0.85"
            rx="2.5"
          />
        )}

        {/* ── Pitch lines — adaptive via CSS var ── */}

        {/* Outer boundary */}
        <rect x="2" y="2" width="101" height="64"
          fill="none" stroke="var(--pl)" strokeWidth="0.9" />

        {/* Halfway line */}
        <line x1="52.5" y1="2" x2="52.5" y2="66"
          stroke="var(--pl)" strokeWidth="0.8" />

        {/* Center circle + spot */}
        <circle cx="52.5" cy="34" r="9.15"
          fill="none" stroke="var(--pl)" strokeWidth="0.8" />
        <circle cx="52.5" cy="34" r="0.85" fill="var(--pl)" />

        {/* Left penalty area */}
        <rect x="2" y="14.5" width="17" height="39"
          fill="none" stroke="var(--pls)" strokeWidth="0.7" />
        {/* Left goal box */}
        <rect x="2" y="24" width="6" height="20"
          fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        {/* Left penalty arc */}
        <path d="M19,27.5 A9.15,9.15 0 0 1 19,40.5"
          fill="none" stroke="var(--pls)" strokeWidth="0.65" />

        {/* Right penalty area */}
        <rect x="86" y="14.5" width="17" height="39"
          fill="none" stroke="var(--pls)" strokeWidth="0.7" />
        {/* Right goal box */}
        <rect x="97" y="24" width="6" height="20"
          fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        {/* Right penalty arc */}
        <path d="M86,27.5 A9.15,9.15 0 0 0 86,40.5"
          fill="none" stroke="var(--pls)" strokeWidth="0.65" />

        {/* Goals */}
        <rect x="1"     y="29" width="1.5" height="10"
          fill="none" stroke="var(--pl)" strokeWidth="0.7" />
        <rect x="102.5" y="29" width="1.5" height="10"
          fill="none" stroke="var(--pl)" strokeWidth="0.7" />

        {/* Penalty spots */}
        <circle cx="12" cy="34" r="0.75" fill="var(--pls)" />
        <circle cx="93" cy="34" r="0.75" fill="var(--pls)" />

        {/* Corner arcs */}
        <path d="M2,5   A3,3 0 0 1 5,2"   fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        <path d="M100,2 A3,3 0 0 1 103,5" fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        <path d="M2,63  A3,3 0 0 0 5,66"  fill="none" stroke="var(--pls)" strokeWidth="0.6" />
        <path d="M100,66 A3,3 0 0 0 103,63" fill="none" stroke="var(--pls)" strokeWidth="0.6" />
      </svg>

      <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 font-medium uppercase tracking-widest">
        {positionLabel}
      </p>
    </div>
  )
}
