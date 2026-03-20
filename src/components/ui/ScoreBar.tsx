interface ScoreBarProps {
  score: number | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

// Lanús palette: lighter = best, darker = worst. No green.
const SCORE_PALETTE = [
  { min: 80, hex: '#EFE0A0', isElite: true  },  // champagne
  { min: 65, hex: '#D4A843', isElite: false },  // gold
  { min: 50, hex: '#C47830', isElite: false },  // amber
  { min: 35, hex: '#B04828', isElite: false },  // burnt orange
  { min: 20, hex: '#943030', isElite: false },  // medium red
  { min: -1, hex: '#7B1830', isElite: false },  // dark granate
]

export function getScoreHex(score: number | null): string {
  if (score === null) return '#6b7280'
  return SCORE_PALETTE.find(c => score >= c.min)?.hex ?? '#7B1830'
}

// Legacy exports — return inline-safe values using hex
export function getScoreColorClass(_score: number | null): string { return '' }
export function getScoreBgClass(_score: number | null): string { return '' }

export default function ScoreBar({ score, size = 'md', showLabel = true }: ScoreBarProps) {
  if (score === null) {
    return <span className="text-apple-gray-400 text-sm">—</span>
  }

  const entry = SCORE_PALETTE.find(c => score >= c.min) ?? SCORE_PALETTE[SCORE_PALETTE.length - 1]
  const hex = entry.hex
  const clampedScore = Math.max(0, Math.min(100, score))

  if (size === 'sm') {
    return (
      <span
        className="font-semibold text-sm tabular-nums"
        style={{ color: hex }}
      >
        {score.toFixed(1)}
        {entry.isElite && <span className="ml-0.5 text-2xs">★</span>}
      </span>
    )
  }

  if (size === 'lg') {
    return (
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">Scoring datos</span>
          <span className="text-4xl font-bold tabular-nums" style={{ color: hex }}>
            {score.toFixed(1)}
          </span>
        </div>
        <div className="relative">
          <div className="w-full h-2 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-apple"
              style={{ width: `${clampedScore}%`, backgroundColor: hex }}
            />
          </div>
          <div className="absolute inset-x-0 top-0 h-2 flex justify-between pointer-events-none">
            <div className="w-px h-full bg-apple-gray-300 dark:bg-apple-gray-600 opacity-50" />
            <div className="w-px h-full bg-apple-gray-300 dark:bg-apple-gray-600 opacity-50" />
            <div className="w-px h-full bg-apple-gray-300 dark:bg-apple-gray-600 opacity-50" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-apple-gray-400">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[110px]">
      {showLabel && (
        <span className="text-sm font-semibold w-10 text-right tabular-nums" style={{ color: hex }}>
          {score.toFixed(1)}
        </span>
      )}
      <div className="flex-1 h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-apple"
          style={{ width: `${clampedScore}%`, backgroundColor: hex }}
        />
      </div>
    </div>
  )
}
