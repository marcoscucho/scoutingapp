import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVideoAnalyses } from '@/services/videoAnalysisSupabase'
import type { VideoAnalysis, AnalysisCategory, AnalysisType } from '@/services/videoAnalysisTypes'
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/services/videoAnalysisTypes'
import UploadXmlModal from '@/components/videoanalisis/UploadXmlModal'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

export default function VideoanalisisPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<AnalysisCategory>('primera')
  const [type, setType] = useState<AnalysisType>('partido')
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    loadAnalyses()
  }, [category, type])

  async function loadAnalyses() {
    setLoading(true)
    const data = await getVideoAnalyses(category, type)
    setAnalyses(data)
    setLoading(false)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-apple-gray-800 dark:text-white">Video Análisis</h1>
        <p className="text-sm text-apple-gray-500 mt-1">Análisis de partidos y entrenamientos por categoría</p>
      </div>

      {/* Category tabs (level 1) */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {ALL_CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
              category === c
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700/50'
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Type sub-tabs (level 2) */}
      <div className="flex gap-1 border-b border-apple-gray-200 dark:border-apple-gray-700">
        <button
          onClick={() => setType('partido')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            type === 'partido'
              ? 'border-brand-green text-brand-green'
              : 'border-transparent text-apple-gray-500 hover:text-apple-gray-700 dark:hover:text-apple-gray-300'
          }`}
        >
          Partidos
        </button>
        <button
          onClick={() => setType('entrenamiento')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            type === 'entrenamiento'
              ? 'border-brand-green text-brand-green'
              : 'border-transparent text-apple-gray-500 hover:text-apple-gray-700 dark:hover:text-apple-gray-300'
          }`}
        >
          Entrenamientos
        </button>
      </div>

      {/* Table */}
      <div className="card-apple overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-apple-gray-300 border-t-brand-green rounded-full animate-spin" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-apple-gray-300 dark:text-apple-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-apple-gray-500">No hay análisis en esta categoría</p>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-3 text-sm font-medium text-brand-green hover:text-brand-greenHover transition-colors"
            >
              Subir XML
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-apple-gray-200/50 dark:border-apple-gray-700/50 bg-apple-gray-50/80 dark:bg-apple-gray-800/50">
                  <th className="px-4 py-3 text-left text-2xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Análisis</th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-center text-2xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Eventos</th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Subido por</th>
                  <th className="px-4 py-3 text-right text-2xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Subido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-100 dark:divide-apple-gray-800/50">
                {analyses.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/videoanalisis/${a.id}`)}
                    className="hover:bg-brand-green/5 dark:hover:bg-brand-green/10 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-apple-gray-800 dark:text-white">
                          {a.type === 'partido' ? `vs ${a.rival}` : a.description}
                        </span>
                        {a.match_day && (
                          <span className="text-2xs px-2 py-0.5 rounded-full bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-500">
                            {a.match_day}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-apple-gray-600 dark:text-apple-gray-400">
                      {new Date(a.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-semibold text-brand-green">{a.total_events}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-apple-gray-600 dark:text-apple-gray-400">
                      {a.user_name}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-apple-gray-400">
                      {timeAgo(a.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setShowUpload(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-brand-green hover:bg-brand-green/5 transition-colors border-t border-apple-gray-100 dark:border-apple-gray-800/50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Subir nuevo XML
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadXmlModal
        isOpen={showUpload}
        onClose={() => { setShowUpload(false); loadAnalyses() }}
        defaultCategory={category}
        defaultType={type}
      />
    </div>
  )
}
