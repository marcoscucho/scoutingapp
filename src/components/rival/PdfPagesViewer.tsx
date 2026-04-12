// ─── PdfPagesViewer ────────────────────────────────────────────────────────────
// Muestra los insights tácticos de cada página del PDF analizada por Claude.
// NO muestra las imágenes de las páginas (se usan dentro de RivalComprehensiveReport).

import type { PdfPageInsight } from '@/services/rivalAnalysisService'

interface Props {
  insights: PdfPageInsight[]
  loadingInsights?: boolean
  sectionLabel?: string
}

const SECTION_ICONS: Record<string, string> = {
  shots: '🎯',
  heatmap: '🔥',
  duels: '⚔️',
  setpiece: '⚑',
  stats: '📊',
  formation: '🧩',
  other: '📋',
}

function InsightSkeleton() {
  return (
    <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex gap-2 items-center">
        <div className="w-6 h-6 rounded-lg bg-apple-gray-200 dark:bg-apple-gray-800" />
        <div className="h-3 w-36 bg-apple-gray-200 dark:bg-apple-gray-800 rounded" />
      </div>
      <div className="h-2.5 w-full bg-apple-gray-100 dark:bg-apple-gray-800 rounded" />
      <div className="h-2.5 w-4/5 bg-apple-gray-100 dark:bg-apple-gray-800 rounded" />
      <div className="space-y-1.5 pt-1">
        <div className="h-2 w-full bg-apple-gray-100 dark:bg-apple-gray-800 rounded" />
        <div className="h-2 w-3/4 bg-apple-gray-100 dark:bg-apple-gray-800 rounded" />
      </div>
    </div>
  )
}

function InsightCard({ item }: { item: PdfPageInsight }) {
  const { insight, sectionType } = item
  const icon = SECTION_ICONS[sectionType ?? 'other'] ?? '📋'
  const hasNumbers = insight.keyNumbers.length > 0
  const hasBullets = insight.bullets.length > 0

  return (
    <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl p-4 flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5 flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-apple-gray-900 dark:text-white leading-tight">
            {insight.title}
          </h4>
          {insight.description && (
            <p className="text-[11px] text-apple-gray-500 dark:text-apple-gray-400 mt-0.5 leading-relaxed line-clamp-2">
              {insight.description}
            </p>
          )}
        </div>
      </div>

      {/* Bullets */}
      {hasBullets && (
        <ul className="space-y-1.5 flex-1">
          {insight.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="w-1 h-1 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
              <span className="text-[11px] text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Key numbers */}
      {hasNumbers && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-apple-gray-100 dark:border-apple-gray-800">
          {insight.keyNumbers.map((kn, i) => (
            <div key={i} className="bg-apple-gray-50 dark:bg-[#0f1923] border border-apple-gray-200 dark:border-apple-gray-800 rounded-lg px-2.5 py-1.5 text-center min-w-[52px]">
              <p className="text-sm font-black text-apple-gray-900 dark:text-white tabular-nums leading-tight">{kn.value}</p>
              <p className="text-[9px] text-apple-gray-500 uppercase tracking-wider leading-tight mt-0.5">{kn.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PdfPagesViewer({ insights, loadingInsights, sectionLabel }: Props) {
  const visible = insights.filter(i =>
    i.insight.bullets.length > 0 || i.insight.keyNumbers.length > 0 || i.insight.description
  )

  if (!loadingInsights && visible.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-violet-500 rounded-full" />
        <h3 className="text-xs font-bold tracking-widest uppercase text-apple-gray-600 dark:text-apple-gray-300">
          {sectionLabel ?? 'Análisis por sección'}
        </h3>
        {visible.length > 0 && (
          <span className="text-xs text-apple-gray-500">{visible.length} sección{visible.length !== 1 ? 'es' : ''}</span>
        )}
        {loadingInsights && (
          <span className="flex items-center gap-1.5 text-xs text-violet-400">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analizando…
          </span>
        )}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loadingInsights && visible.length === 0 && (
          <>
            <InsightSkeleton />
            <InsightSkeleton />
            <InsightSkeleton />
          </>
        )}
        {visible.map(item => (
          <InsightCard key={item.pageNum} item={item} />
        ))}
      </div>
    </div>
  )
}
