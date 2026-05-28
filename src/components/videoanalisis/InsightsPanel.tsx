interface InsightsPanelProps {
  insights: string[]
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null

  return (
    <div className="rounded-apple-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 dark:from-purple-500/10 dark:to-indigo-500/10 p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
          Insights
        </h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-apple-gray-700 dark:text-apple-gray-300">
            <span className="text-purple-500 mt-0.5 flex-shrink-0">•</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  )
}
