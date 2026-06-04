import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getVideoAnalysisById, deleteVideoAnalysis, createVideoAnalysis } from '@/services/videoAnalysisSupabase'
import { parseXml } from '@/services/xmlParserService'
import { generateInsights } from '@/services/videoInsightsService'
import type { VideoAnalysis } from '@/services/videoAnalysisTypes'
import { CATEGORY_LABELS } from '@/services/videoAnalysisTypes'
import XmlAccordion from '@/components/videoanalisis/XmlAccordion'
import InsightsPanel from '@/components/videoanalisis/InsightsPanel'
import CommentThread from '@/components/videoanalisis/CommentThread'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

export default function VideoanalisisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [replacing, setReplacing] = useState(false)

  useEffect(() => {
    if (!id) return
    loadAnalysis()
  }, [id])

  async function loadAnalysis() {
    setLoading(true)
    const data = await getVideoAnalysisById(id!)
    setAnalysis(data)
    setLoading(false)
  }

  async function handleReplaceXml(file: File) {
    if (!analysis) return
    setReplacing(true)
    const content = await file.text()
    let parsedData
    try {
      parsedData = parseXml(content)
    } catch {
      setReplacing(false)
      return
    }
    await deleteVideoAnalysis(analysis.id)
    const result = await createVideoAnalysis({
      category: analysis.category,
      type: analysis.type,
      rival: analysis.rival,
      matchDay: analysis.match_day,
      description: analysis.description,
      date: analysis.date,
      parsedData,
    })
    setReplacing(false)
    if (result.success && result.id) {
      navigate(`/videoanalisis/${result.id}`, { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 flex justify-center">
        <div className="w-8 h-8 border-2 border-apple-gray-300 border-t-brand-green rounded-full animate-spin" />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-apple-gray-500">Análisis no encontrado</p>
        <button onClick={() => navigate('/videoanalisis')} className="mt-3 text-sm font-medium text-brand-green">
          Volver al listado
        </button>
      </div>
    )
  }

  const parsed = analysis.parsed_data
  const insights = generateInsights(parsed)
  const title = analysis.type === 'partido' ? `vs ${analysis.rival}` : analysis.description || 'Entrenamiento'

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/videoanalisis')}
          className="flex items-center gap-1.5 text-sm text-apple-gray-500 hover:text-apple-gray-700 dark:hover:text-apple-gray-300 transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-apple-gray-800 dark:text-white">{title}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-2xs px-2 py-0.5 rounded-full font-medium ${
                analysis.type === 'partido'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              }`}>
                {analysis.type === 'partido' ? 'Partido' : 'Entrenamiento'}
              </span>
              <span className="text-sm text-apple-gray-500">
                {CATEGORY_LABELS[analysis.category]}
              </span>
              {analysis.match_day && (
                <span className="text-sm text-apple-gray-500">· {analysis.match_day}</span>
              )}
              <span className="text-sm text-apple-gray-500">
                · {new Date(analysis.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-apple-gray-400 mt-1.5">
              Subido por <span className="font-medium text-apple-gray-600 dark:text-apple-gray-300">{analysis.user_name}</span> · {timeAgo(analysis.created_at)}
            </p>
          </div>
          <div className="flex-shrink-0">
            <input
              type="file"
              accept=".xml"
              className="hidden"
              id="replace-xml"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleReplaceXml(f)
                e.target.value = ''
              }}
            />
            <label
              htmlFor="replace-xml"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                replacing
                  ? 'bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-400 pointer-events-none'
                  : 'bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-200 dark:hover:bg-apple-gray-600'
              }`}
            >
              {replacing ? (
                <div className="w-3.5 h-3.5 border-2 border-apple-gray-300 border-t-brand-green rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              {replacing ? 'Reemplazando...' : 'Reemplazar XML'}
            </label>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="card-apple p-4 text-center">
          <div className="text-xl font-bold text-brand-green">{parsed.totalEvents}</div>
          <div className="text-2xs text-apple-gray-500 uppercase tracking-wider mt-0.5">Eventos</div>
        </div>
        {parsed.categories.slice(0, 4).map((cat, i) => (
          <div key={i} className="card-apple p-4 text-center">
            <div className="text-xl font-bold text-apple-gray-800 dark:text-white">{cat.totalCount}</div>
            <div className="text-2xs text-apple-gray-500 uppercase tracking-wider mt-0.5 truncate">{cat.name}</div>
          </div>
        ))}
      </div>

      {/* Insights */}
      <InsightsPanel insights={insights} />

      {/* Accordion */}
      <XmlAccordion categories={parsed.categories} />

      {/* Comments */}
      <CommentThread analysisId={analysis.id} />
    </div>
  )
}
