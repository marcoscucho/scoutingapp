import { useState } from 'react'
import type { ParsedCategory } from '@/services/videoAnalysisTypes'
import MiniPitch from './MiniPitch'

interface XmlAccordionProps {
  categories: ParsedCategory[]
}

export default function XmlAccordion({ categories }: XmlAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="card-apple overflow-hidden divide-y divide-apple-gray-200/50 dark:divide-apple-gray-700/50">
      {categories.map((cat, idx) => {
        const isOpen = openIndex === idx
        return (
          <div key={idx}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-apple-gray-50/50 dark:hover:bg-apple-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-apple-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm font-semibold text-apple-gray-800 dark:text-white">
                  {cat.name}
                </span>
              </div>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-600 dark:text-apple-gray-300">
                {cat.totalCount} eventos
              </span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 animate-fade-in">
                <div className="space-y-3">
                  {cat.events.map((event, eIdx) => {
                    const maxCount = Math.max(...cat.events.map(e => e.count))
                    const barWidth = maxCount > 0 ? (event.count / maxCount) * 100 : 0

                    return (
                      <div key={eIdx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-apple-gray-700 dark:text-apple-gray-300">
                            {event.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {event.half && (
                              <span className="text-2xs px-1.5 py-0.5 rounded bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-500">
                                {event.half === 1 ? '1T' : '2T'}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-apple-gray-800 dark:text-white tabular-nums">
                              {event.count}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-apple-gray-100 dark:bg-apple-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-green rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>

                        {event.descriptors && Object.keys(event.descriptors).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {Object.entries(event.descriptors).map(([key, val]) => (
                              <span
                                key={key}
                                className="text-2xs px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green dark:bg-brand-green/20"
                              >
                                {key}: {val}
                              </span>
                            ))}
                          </div>
                        )}

                        {event.coordinates && event.coordinates.length > 0 && (
                          <div className="mt-2" style={{ maxWidth: 280 }}>
                            <MiniPitch coordinates={event.coordinates} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
