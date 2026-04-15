import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import ContractBadge from '@/components/ui/ContractBadge'
import PlayerRadarChart from '@/components/charts/PlayerRadarChart'
import EvolutionChart from '@/components/charts/EvolutionChart'
import MarketValueChart from '@/components/charts/MarketValueChart'
import GaugeScore from '@/components/charts/GaugeScore'
import GPSTab from '@/components/charts/GPSTab'
import ExportPDFModal, { type PDFTheme } from '@/components/ui/ExportPDFModal'
import { exportPlayerToPdfFull } from '@/utils/pdfExport'
import AddToReportButton from '@/components/pdf/AddToReportButton'
import { normalizeName } from '@/utils/scoring'
import { getScoreHex } from '@/components/ui/ScoreBar'
import { POSITION_MAP, DISPLAY_POSITION_MAP, DISPLAY_METRICS, RADAR_METRICS } from '@/constants/scoring'
import { fetchPlayerEvaluations, fetchEvaluationsByName, type ScoutEvaluation } from '@/services/scoutEvaluationService'
import { addToSeguimiento, removeFromSeguimiento, isInSeguimiento } from '@/lib/supabase'
import PlantelLayout from '@/components/plantel/PlantelLayout'
import FootballPitch from '@/components/charts/FootballPitch'
import type { EnrichedPlayer, SubjectiveMetric } from '@/types'

// ─── PLAYER COMMENTS SYSTEM ───────────────────────────────────────────────────

interface PlayerComment {
  id: string
  playerKey: string
  sentiment: 'positive' | 'neutral' | 'negative'
  text: string
  author: string
  createdAt: string
}

function getCommentsKey(): string {
  return 'player_comments_v1'
}

function loadComments(): PlayerComment[] {
  try {
    return JSON.parse(localStorage.getItem(getCommentsKey()) || '[]')
  } catch {
    return []
  }
}

function saveComments(comments: PlayerComment[]): void {
  localStorage.setItem(getCommentsKey(), JSON.stringify(comments))
}

function getPlayerKey(player: EnrichedPlayer): string {
  return `${normalizeName(player.Jugador)}|${normalizeName(player.Equipo)}`
}

interface CommentsProps {
  player: EnrichedPlayer
}

function PlayerComments({ player }: CommentsProps) {
  const [comments, setComments] = useState<PlayerComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [newAuthor, setNewAuthor] = useState(() => {
    try { return localStorage.getItem('comment_author') || '' } catch { return '' }
  })
  const [newSentiment, setNewSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral')
  const [isAdding, setIsAdding] = useState(false)

  const playerKey = getPlayerKey(player)

  useEffect(() => {
    const all = loadComments()
    setComments(all.filter(c => c.playerKey === playerKey))
  }, [playerKey])

  const handleAddComment = useCallback(() => {
    if (!newComment.trim() || !newAuthor.trim()) return

    const comment: PlayerComment = {
      id: Date.now().toString(),
      playerKey,
      sentiment: newSentiment,
      text: newComment.trim(),
      author: newAuthor.trim(),
      createdAt: new Date().toISOString(),
    }

    const all = loadComments()
    const updated = [...all, comment]
    saveComments(updated)
    setComments(updated.filter(c => c.playerKey === playerKey))

    localStorage.setItem('comment_author', newAuthor.trim())
    setNewComment('')
    setNewSentiment('neutral')
    setIsAdding(false)
  }, [newComment, newAuthor, newSentiment, playerKey])

  const handleDeleteComment = useCallback((id: string) => {
    const all = loadComments()
    const updated = all.filter(c => c.id !== id)
    saveComments(updated)
    setComments(updated.filter(c => c.playerKey === playerKey))
  }, [playerKey])

  const sentimentConfig = {
    positive: { icon: '👍', label: 'Positivo', bg: 'bg-[#D4A843]/10', border: 'border-[#D4A843]/30', text: 'text-[#C47830] dark:text-[#D4A843]' },
    neutral: { icon: '➖', label: 'Neutral', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' },
    negative: { icon: '👎', label: 'Negativo', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400' },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-apple-gray-700 dark:text-apple-gray-300">
          Comentarios ({comments.length})
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="btn-apple-secondary text-sm px-3 py-1.5"
          >
            + Agregar
          </button>
        )}
      </div>

      {isAdding && (
        <div className="p-4 bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl border border-apple-gray-200 dark:border-apple-gray-700">
          <div className="mb-3">
            <label className="block text-xs font-medium text-apple-gray-500 dark:text-apple-gray-400 mb-2">
              Valoración
            </label>
            <div className="flex gap-2">
              {(['positive', 'neutral', 'negative'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setNewSentiment(s)}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    newSentiment === s
                      ? `${sentimentConfig[s].bg} ${sentimentConfig[s].border} ${sentimentConfig[s].text}`
                      : 'border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500'
                  }`}
                >
                  <span className="mr-1.5">{sentimentConfig[s].icon}</span>
                  {sentimentConfig[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Escribe tu observación..."
              className="input-apple w-full h-20 resize-none"
            />
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={newAuthor}
              onChange={e => setNewAuthor(e.target.value)}
              placeholder="Tu nombre..."
              className="input-apple w-full"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setIsAdding(false); setNewComment(''); setNewSentiment('neutral') }}
              className="btn-apple-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || !newAuthor.trim()}
              className="btn-apple-primary flex-1 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {comments.length === 0 && !isAdding ? (
        <div className="text-center py-6 text-apple-gray-400">
          <p className="text-sm">Sin comentarios</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(comment => {
              const config = sentimentConfig[comment.sentiment]
              const date = new Date(comment.createdAt)
              return (
                <div
                  key={comment.id}
                  className={`p-3 rounded-xl border ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-xs font-semibold ${config.text}`}>
                      {config.icon} {config.label}
                    </span>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-apple-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed mb-2">
                    {comment.text}
                  </p>
                  <div className="flex items-center justify-between text-2xs text-apple-gray-500">
                    <span className="font-medium">{comment.author}</span>
                    <span>{date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ─── SCORE SCOUT TIMELINE ─────────────────────────────────────────────────────

interface ScoreScoutTimelineProps {
  playerId: string | undefined
  playerName: string
}

function ScoreScoutTimeline({ playerId, playerName }: ScoreScoutTimelineProps) {
  const [evaluations, setEvaluations] = useState<ScoutEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function loadEvaluations() {
      setLoading(true)
      const allEvals: ScoutEvaluation[] = []
      const seenIds = new Set<string>()

      // Fetch by player ID if provided and not empty
      if (playerId && playerId.trim() !== '') {
        const byId = await fetchPlayerEvaluations(playerId)
        byId.forEach(e => {
          if (!seenIds.has(e.id)) {
            seenIds.add(e.id)
            allEvals.push(e)
          }
        })
      }

      // Also fetch by name (catches evaluations linked by name or not yet linked)
      if (playerName) {
        const byName = await fetchEvaluationsByName(playerName)
        byName.forEach(e => {
          if (!seenIds.has(e.id)) {
            seenIds.add(e.id)
            allEvals.push(e)
          }
        })

        // Also try fetching where player_id equals the player name
        // (this handles the case where external players use name as ID)
        const byNameAsId = await fetchPlayerEvaluations(playerName)
        byNameAsId.forEach(e => {
          if (!seenIds.has(e.id)) {
            seenIds.add(e.id)
            allEvals.push(e)
          }
        })
      }

      // Sort by match date
      allEvals.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())

      setEvaluations(allEvals)
      setLoading(false)
    }
    loadEvaluations()
  }, [playerId, playerName])

  if (loading) {
    return (
      <div className="card-apple p-5 animate-pulse space-y-3">
        <div className="h-4 bg-apple-gray-200 dark:bg-apple-gray-700 rounded w-1/3" />
        <div className="h-20 bg-apple-gray-100 dark:bg-apple-gray-800 rounded-xl" />
      </div>
    )
  }

  if (evaluations.length === 0) {
    return null // Don't show section if no evaluations
  }

  // Calculate average score
  const scores = evaluations
    .map(e => e.technical_score) // Using technical_score as the match performance score
    .filter((s): s is number => s !== null)
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null

  // Get score color — granate (club colors) instead of green
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-[#8C1430] dark:text-[#D45A72]'
    if (score >= 6) return 'text-[#D4A843]'
    if (score >= 4) return 'text-amber-500'
    return 'text-red-500'
  }

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-[#8C1430]/10 border-[#8C1430]/40 dark:bg-[#D45A72]/10 dark:border-[#D45A72]/30'
    if (score >= 6) return 'bg-[#D4A843]/10 border-[#D4A843]/30'
    if (score >= 4) return 'bg-amber-500/10 border-amber-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  const getRecommendationBadge = (rec: string | null) => {
    switch (rec) {
      case 'fichar':
        return { label: 'Fichar', color: 'bg-brand-green/10 text-brand-green border-brand-green/30' }
      case 'seguir_observando':
        return { label: 'Seguir observando', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' }
      case 'descartar':
        return { label: 'Descartar', color: 'bg-red-500/10 text-red-500 border-red-500/30' }
      default:
        return null
    }
  }

  const displayEvaluations = expanded ? evaluations : evaluations.slice(0, 3)

  return (
    <div className="card-apple p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-apple-gray-700 dark:text-apple-gray-300">
          Score Scout
        </h3>
        {avgScore !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-apple-gray-500">Promedio:</span>
            <span className={`text-lg font-bold ${getScoreColor(avgScore)}`}>
              {avgScore.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Average score bar */}
      {avgScore !== null && (
        <div className="relative h-2 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              avgScore >= 8 ? 'bg-[#8C1430] dark:bg-[#D45A72]' :
              avgScore >= 6 ? 'bg-[#D4A843]' :
              avgScore >= 4 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${avgScore * 10}%` }}
          />
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-apple-gray-200 dark:bg-apple-gray-700" />

        <div className="space-y-3">
          {displayEvaluations.map((evaluation, idx) => {
            const score = evaluation.technical_score
            const recBadge = getRecommendationBadge(evaluation.recommendation)
            const date = new Date(evaluation.match_date)

            return (
              <div key={evaluation.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className={`absolute left-2 top-3 w-4 h-4 rounded-full border-2 ${
                  score ? getScoreBg(score) : 'bg-apple-gray-100 border-apple-gray-300'
                } flex items-center justify-center`}>
                  {score && (
                    <div className={`w-2 h-2 rounded-full ${
                      score >= 8 ? 'bg-[#8C1430] dark:bg-[#D45A72]' :
                      score >= 6 ? 'bg-[#D4A843]' :
                      score >= 4 ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                  )}
                </div>

                {/* Evaluation card */}
                <div className={`p-3 rounded-xl border transition-all ${
                  score ? getScoreBg(score) : 'bg-apple-gray-50 dark:bg-apple-gray-800/50 border-apple-gray-200 dark:border-apple-gray-700'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {score && (
                          <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                            {score}
                          </span>
                        )}
                        <span className="text-xs text-apple-gray-500">
                          {date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {recBadge && (
                          <span className={`text-2xs font-medium px-2 py-0.5 rounded-full border ${recBadge.color}`}>
                            {recBadge.label}
                          </span>
                        )}
                      </div>
                      {(evaluation.competition || evaluation.rival) && (
                        <p className="text-xs text-apple-gray-500 mt-1">
                          {evaluation.competition && <span>{evaluation.competition}</span>}
                          {evaluation.competition && evaluation.rival && <span> vs </span>}
                          {evaluation.rival && <span>{evaluation.rival}</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {evaluation.notes && (
                    <p className="text-sm text-apple-gray-600 dark:text-apple-gray-400 leading-relaxed">
                      {evaluation.notes}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-2 text-2xs text-apple-gray-400">
                    <span>{evaluation.scout_name}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Show more/less */}
      {evaluations.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-sm text-brand-green hover:text-brand-green/80 font-medium py-2 transition-colors"
        >
          {expanded ? 'Ver menos' : `Ver ${evaluations.length - 3} evaluaciones más`}
        </button>
      )}

      <p className="text-2xs text-apple-gray-400 text-center">
        {evaluations.length} evaluacion{evaluations.length !== 1 ? 'es' : ''} de scouts
      </p>
    </div>
  )
}

// ─── SUBJECTIVE METRICS GROUPS ────────────────────────────────────────────────

function getSubjectiveGroups(metrics: SubjectiveMetric[], jsk: string) {
  const playerMetrics = metrics.filter(m => String(m.JugadorSK) === String(jsk))
  if (playerMetrics.length === 0) return []

  const grouped = new Map<string, number[]>()
  for (const m of playerMetrics) {
    const tipo = m['Tipo Atributo']
    const num = parseInt(m.numero, 10)
    if (!tipo || isNaN(num) || num < 1) continue
    if (!grouped.has(tipo)) grouped.set(tipo, [])
    grouped.get(tipo)!.push(num)
  }

  return [...grouped.entries()].map(([tipo, nums]) => {
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    return {
      tipo,
      averageScore: Math.round(avg * 20),
    }
  }).slice(0, 4)
}

// ─── POSITION DISPLAY ─────────────────────────────────────────────────────────

function getDisplayPosition(rawPosition: string | undefined): string {
  if (!rawPosition) return '—'
  const trimmed = rawPosition.trim()

  const separator = trimmed.includes(',') ? ',' : trimmed.includes('/') ? '/' : null
  if (separator) {
    const positions = trimmed.split(separator).map(p => p.trim())
    const displayPositions = positions
      .map(p => DISPLAY_POSITION_MAP[p] || p)
      .filter((v, i, arr) => arr.indexOf(v) === i)
    return displayPositions.join(' / ')
  }

  return DISPLAY_POSITION_MAP[trimmed] || trimmed
}

// ─── INFO COMPONENTS ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value || value === '-' || value === '') return null
  return (
    <div className="flex justify-between py-2 border-b border-apple-gray-200 dark:border-apple-gray-800/50 last:border-0">
      <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{label}</span>
      <span className="text-sm font-medium text-apple-gray-800 dark:text-white text-right ml-4">{value}</span>
    </div>
  )
}

// ─── CLEAR METRIC NAMES ───────────────────────────────────────────────────────
// Maps raw CSV column names → human-readable labels that make the unit explicit

const CLEAR_METRIC_NAMES: Record<string, string> = {
  'Gambetas completadas/90':          'Gambetas completadas por 90 min',
  'Gambetas completadas, %':          '% gambetas completadas (efectividad)',
  'Duelos defensivos ganados, %':     '% duelos defensivos ganados',
  'Duelos aéreos ganados, %':         '% duelos aéreos ganados',
  'Duelos ganados, %':                '% duelos totales ganados',
  'Duelos atacantes ganados/90':      'Duelos ofensivos ganados por 90 min',
  'Interceptaciones/90':              'Interceptaciones por 90 min',
  'Pases progresivos exitosos/90':    'Pases progresivos por 90 min',
  'Carreras en progresión/90':        'Carreras en progresión por 90 min',
  'Precisión pases largos, %':        '% pases largos precisos',
  'Precisión pases hacia adelante, %':'% pases hacia adelante precisos',
  'Pases hacia adelante/90':          'Pases hacia adelante por 90 min',
  'Acciones de ataque exitosas/90':   'Acciones de ataque exitosas por 90 min',
  'xA/90':                            'xA por 90 min (asistencias esperadas)',
  'xG':                               'xG total (goles esperados)',
  'xG/90':                            'xG por 90 min (goles esperados)',
  'Centros precisos/90':              'Centros precisos por 90 min',
  'Jugadas claves/90':                'Jugadas clave por 90 min',
  'Entradas/90':                      'Entradas por 90 min',
  'Acciones defensivas realizadas/90':'Acciones defensivas por 90 min',
  'Goles evitados/90':                'Goles evitados por 90 min (vs xG)',
  'Paradas, %':                       '% de paradas sobre remates al arco',
  'Porterías imbatidas en los 90':    'Porterías imbatidas por 90 min',
  'Goles recibidos/90':               'Goles recibidos por 90 min',
  'xG en contra/90':                  'xG en contra por 90 min',
  'Salidas/90':                       'Salidas del arquero por 90 min',
  'Duelos aéreos en los 90':          'Duelos aéreos por 90 min',
  'Remates/90':                       'Remates por 90 min',
  'Toques en el área de penalti/90':  'Toques en área rival por 90 min',
  'Faltas recibidas/90':              'Faltas recibidas por 90 min',
  'Ataque en profundidad/90':         'Ataques en profundidad por 90 min',
  'Pases al tercer tercio/90':        'Pases al último tercio por 90 min',
  'Pases precisos/90':                'Pases precisos por 90 min',
  'Asistencias/90':                   'Asistencias por 90 min',
  'Goles/90':                         'Goles por 90 min',
}

interface MetricWithPercentileProps {
  label: string
  value?: string | number | null
  percentile?: number | null
  avgPercentile?: number | null
}

function MetricRowWithPercentile({ label, value, percentile, avgPercentile }: MetricWithPercentileProps) {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'))
  const displayVal = isNaN(num) ? (value || '—') : (num % 1 === 0 ? num.toFixed(0) : num.toFixed(2))

  const getQualityInfo = (p: number | null | undefined) => {
    if (p === null || p === undefined) return { label: '', color: 'bg-apple-gray-300', textColor: 'text-apple-gray-800 dark:text-white' }
    if (p >= 80) return { label: 'Elite', color: 'bg-[#EFE0A0]', textColor: 'text-[#D4A843]' }
    if (p >= 60) return { label: 'Bueno', color: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400' }
    if (p >= 40) return { label: 'Promedio', color: 'bg-amber-500', textColor: 'text-amber-500' }
    if (p >= 20) return { label: 'Bajo', color: 'bg-orange-500', textColor: 'text-orange-500' }
    return { label: 'Crítico', color: 'bg-red-500', textColor: 'text-red-500' }
  }

  const quality = getQualityInfo(percentile)

  return (
    <div className="py-3 border-b border-apple-gray-200 dark:border-apple-gray-800/50 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold tabular-nums ${quality.textColor}`}>{displayVal}</span>
          {percentile !== null && percentile !== undefined && (
            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${quality.color}/15 ${quality.textColor}`}>
              {quality.label}
            </span>
          )}
        </div>
      </div>
      {percentile !== null && percentile !== undefined && (
        <div className="flex items-center gap-2">
          {/* Bar with avg marker at 50% */}
          <div className="flex-1 relative h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-visible">
            <div
              className={`h-full rounded-full transition-all duration-500 ${quality.color}`}
              style={{ width: `${Math.min(100, Math.max(0, percentile))}%` }}
            />
            {/* Average marker — real position of the mean in the distribution */}
            <div
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-px"
              style={{ left: `${Math.min(100, Math.max(0, avgPercentile ?? 50))}%`, transform: 'translate(-50%, -50%)' }}
              title="Promedio del grupo de comparación"
            >
              <div className="w-0.5 h-3.5 rounded-full bg-white dark:bg-white/80 shadow-[0_0_4px_rgba(255,255,255,0.8)] ring-1 ring-white/30" />
            </div>
          </div>
          <span className="text-2xs text-apple-gray-400 tabular-nums w-12 text-right">
            Top {100 - Math.round(percentile)}%
          </span>
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const source = (searchParams.get('source') ?? 'externo') as 'externo' | 'interno' | 'seguimiento'
  const overridePosition = searchParams.get('pos')
  const equipoParam = searchParams.get('equipo')
  const { external, internal, monitoring, normalized, evolution, subjectiveMetrics, marketValueHistory, gpsData, loading, error } = useData()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('General')
  const [comparisonLeague, setComparisonLeague] = useState<string>('all')
  const [showExportModal, setShowExportModal] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Seguimiento state
  const [isInSeguimientoState, setIsInSeguimientoState] = useState(false)
  const [seguimientoLoading, setSeguimientoLoading] = useState(false)

  // Evaluations for plantel layout
  const [plantelEvaluations, setPlantelEvaluations] = useState<ScoutEvaluation[]>([])

  const player: EnrichedPlayer | null = useMemo(() => {
    if (!id) return null
    const decodedId = decodeURIComponent(id)
    const normName = normalizeName(decodedId)

    if (source === 'interno') {
      return internal.find(p => String(p.id) === decodedId || normalizeName(p.Jugador) === normName) ?? null
    }

    if (source === 'seguimiento') {
      const monPlayer = monitoring.find(p =>
        normalizeName(p.Jugador) === normName ||
        normalizeName(p['Nombre jugador']) === normName
      )
      return monPlayer?.metricsPlayer ?? null
    }

    // External: if equipo param provided, match name + team exactly first
    if (equipoParam) {
      const normEquipo = normalizeName(equipoParam)
      const exact = external.find(p =>
        normalizeName(p.Jugador) === normName &&
        normalizeName(p.Equipo) === normEquipo
      )
      if (exact) return exact
    }
    // Fallback: name only (backward compat / abbreviated names)
    return external.find(p => normalizeName(p.Jugador) === normName) ?? null
  }, [id, source, equipoParam, external, internal, monitoring])

  const monitoringPlayer = useMemo(() => {
    if (source !== 'seguimiento' || !id) return null
    const decodedId = decodeURIComponent(id)
    return monitoring.find(p =>
      normalizeName(p.Jugador) === normalizeName(decodedId) ||
      normalizeName(p['Nombre jugador']) === normalizeName(decodedId)
    ) ?? null
  }, [id, source, monitoring])

  const rawPosition = useMemo(() => {
    if (overridePosition) return overridePosition
    if (!player) return ''
    const posEsp = player['Posición específica']?.trim()
    if (posEsp) return posEsp
    return player['Posición']?.trim() || ''
  }, [overridePosition, player])

  const posKey = useMemo(() => {
    const rawPos = rawPosition.trim()
    if (POSITION_MAP[rawPos]) return POSITION_MAP[rawPos]
    const separator = rawPos.includes(',') ? ',' : rawPos.includes('/') ? '/' : null
    if (separator) {
      for (const pos of rawPos.split(separator).map(p => p.trim())) {
        if (POSITION_MAP[pos]) return POSITION_MAP[pos]
      }
    }
    return ''
  }, [rawPosition])

  const displayPosition = getDisplayPosition(rawPosition)

  const subjectiveGroups = useMemo(() => {
    if (!player || source !== 'interno') return []
    const jsk = (player as EnrichedPlayer & { jugadorSK?: string }).jugadorSK ?? ''
    if (!jsk) return []
    return getSubjectiveGroups(subjectiveMetrics, jsk)
  }, [player, source, subjectiveMetrics])

  const playerJugadorSK = useMemo(() => {
    if (!player || source !== 'interno') return ''
    return (player as EnrichedPlayer & { jugadorSK?: string }).jugadorSK ?? ''
  }, [player, source])

  // Filter GPS data for the current player
  const playerGpsData = useMemo(() => {
    if (!player || source !== 'interno') return []
    const playerNameNorm = normalizeName(player.Jugador)
    return gpsData.filter(entry => {
      const entryNameNorm = normalizeName(entry.Jugador)
      // Match by exact name or partial name (handle abbreviated names)
      if (entryNameNorm === playerNameNorm) return true
      // Try matching by last name if one is abbreviated
      const playerParts = playerNameNorm.split(' ')
      const entryParts = entryNameNorm.split(' ')
      const playerLast = playerParts[playerParts.length - 1]
      const entryLast = entryParts[entryParts.length - 1]
      if (playerLast === entryLast && playerParts.length > 0 && entryParts.length > 0) {
        // Check if first initial matches
        const playerInit = playerParts[0]?.[0] ?? ''
        const entryInit = entryParts[0]?.[0] ?? ''
        return playerInit === entryInit
      }
      return false
    })
  }, [player, source, gpsData])

  // Calculate average score for same position (for comparison)
  const positionAverageScore = useMemo(() => {
    if (!player || !posKey) return null
    const allPlayers = [...external, ...internal]
    const samePosPlayers = allPlayers.filter(p => {
      const pPosKey = POSITION_MAP[p['Posición']?.trim() ?? ''] ?? ''
      return pPosKey === posKey && p.ggScore !== null && p.minutesPlayed >= 300
    })
    if (samePosPlayers.length < 5) return null
    const sum = samePosPlayers.reduce((s, p) => s + (p.ggScore ?? 0), 0)
    return sum / samePosPlayers.length
  }, [player, posKey, external, internal])

  // Calculate percentiles + average percentile position for each metric
  const { metricPercentiles, avgPercentiles, percentileLeague } = useMemo(() => {
    const empty = { metricPercentiles: {} as Record<string, number>, avgPercentiles: {} as Record<string, number>, percentileLeague: 'all' }
    if (!player || !posKey) return empty

    const allPlayers = [...external, ...internal]
    const byLeague = comparisonLeague !== 'all'
      ? allPlayers.filter(p => {
          const pPosKey = POSITION_MAP[p['Posición']?.trim() ?? ''] ?? ''
          return pPosKey === posKey && p.minutesPlayed >= 300 && p.Liga === comparisonLeague
        })
      : []
    const usedLeague = byLeague.length >= 5 ? comparisonLeague : 'all'
    const samePosList = usedLeague !== 'all'
      ? byLeague
      : allPlayers.filter(p => {
          const pPosKey = POSITION_MAP[p['Posición']?.trim() ?? ''] ?? ''
          return pPosKey === posKey && p.minutesPlayed >= 300
        })

    if (samePosList.length < 5) return { ...empty, percentileLeague: usedLeague }

    const percentiles: Record<string, number> = {}
    const avgPcts: Record<string, number> = {}
    const displayMetricsList = DISPLAY_METRICS[posKey] ?? DISPLAY_METRICS['_default']

    for (const metric of displayMetricsList) {
      if (metric === 'Partidos jugados' || metric === 'Minutos jugados') continue

      const values = samePosList
        .map(p => { const v = p[metric]; return typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.')) })
        .filter(v => !isNaN(v))
        .sort((a, b) => a - b)

      if (values.length < 5) continue

      // Player percentile
      const playerVal = player[metric]
      const playerNum = typeof playerVal === 'number' ? playerVal : parseFloat(String(playerVal ?? '').replace(',', '.'))
      if (!isNaN(playerNum)) {
        percentiles[metric] = (values.filter(v => v < playerNum).length / values.length) * 100
      }

      // Where the average value falls in the distribution
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      avgPcts[metric] = (values.filter(v => v < avg).length / values.length) * 100
    }

    return { metricPercentiles: percentiles, avgPercentiles: avgPcts, percentileLeague: usedLeague }
  }, [player, posKey, external, internal, comparisonLeague])

  const availableLeagues = useMemo(() => {
    const allPlayers = [...external, ...internal]
    const leagueSet = new Set<string>()
    for (const p of allPlayers) {
      if (p.Liga) leagueSet.add(p.Liga)
    }
    return [...leagueSet].sort()
  }, [external, internal])

  // Averages per metric filtered by league + position (for delta display)
  const leagueMetricAverages = useMemo(() => {
    if (!player || !posKey) return {} as Record<string, number>
    const displayMetricsList = DISPLAY_METRICS[posKey] ?? DISPLAY_METRICS['_default']
    const allPlayers = [...external, ...internal]
    const peers = allPlayers.filter(p => {
      const pPosKey = POSITION_MAP[p['Posición']?.trim() ?? ''] ?? ''
      const matchesLeague = comparisonLeague === 'all' || p.Liga === comparisonLeague
      return pPosKey === posKey && matchesLeague && p.minutesPlayed >= 300
    })
    if (peers.length < 3) return {} as Record<string, number>
    const avgs: Record<string, number> = {}
    for (const metric of displayMetricsList) {
      if (['Partidos jugados', 'Minutos jugados', 'Altura', 'Goles', 'Asistencias'].includes(metric)) continue
      const vals = peers
        .map(p => { const v = p[metric]; return typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.')) })
        .filter(v => !isNaN(v))
      if (vals.length >= 3) avgs[metric] = vals.reduce((a, b) => a + b, 0) / vals.length
    }
    return avgs
  }, [player, posKey, external, internal, comparisonLeague])

  // Internal squad players of same position for comparison
  const squadComparison = useMemo(() => {
    if (!player || !posKey) return [] as { player: EnrichedPlayer; scoreDiff: number }[]
    return internal
      .filter(p => {
        const pPosKey = POSITION_MAP[p['Posición']?.trim() ?? ''] ?? ''
        return pPosKey === posKey && p.minutesPlayed >= 200
      })
      .map(p => ({ player: p, scoreDiff: (player.ggScore ?? 0) - (p.ggScore ?? 0) }))
      .sort((a, b) => (b.player.ggScore ?? 0) - (a.player.ggScore ?? 0))
      .slice(0, 4)
  }, [player, posKey, internal])

  // Auto-insight text based on metrics
  const insightText = useMemo(() => {
    if (!player || !posKey) return null
    const displayMetricsList = DISPLAY_METRICS[posKey] ?? DISPLAY_METRICS['_default']

    // Positions where xG alone is NOT a virtue — what matters is Goles vs xG (finishing quality)
    const isFinisher = posKey === 'Delantero' || posKey === 'Extremo'

    // Metrics to skip from generic highlight/weakness logic (handled separately)
    const SKIP_GENERIC = new Set(['Partidos jugados', 'Minutos jugados', 'Goles', 'Asistencias'])
    // Also skip xG for finishers — we handle it via the Goles-xG delta instead
    if (isFinisher) {
      SKIP_GENERIC.add('xG')
      SKIP_GENERIC.add('Goles esperados')
      SKIP_GENERIC.add('xG/90')
      SKIP_GENERIC.add('Goles esperados/90')
    }

    const highlights: { key: string; name: string; pct: number }[] = []
    const weak: { key: string; name: string }[] = []
    for (const m of displayMetricsList) {
      if (SKIP_GENERIC.has(m)) continue
      const p = metricPercentiles[m]
      if (p === undefined) continue
      const name = CLEAR_METRIC_NAMES[m] ?? m
      if (p >= 75) highlights.push({ key: m, name, pct: p })
      else if (p <= 25) weak.push({ key: m, name })
    }

    const parts: string[] = []

    // ── xG insight: context-aware ──────────────────────────────────────────────
    const parseNum = (v: unknown) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
      return isNaN(n) ? null : n
    }
    const golesVal = parseNum(player['Goles'])
    // Try different column names for xG total
    const xgVal = parseNum(player['xG']) ?? parseNum(player['Goles esperados']) ?? parseNum(player['xG total'])

    if (isFinisher && golesVal !== null && xgVal !== null && xgVal > 0) {
      const delta = golesVal - xgVal
      const ratio = golesVal / xgVal
      if (delta >= 1 || ratio >= 1.25) {
        parts.push(
          `Definición elite: marcó ${golesVal} goles con un xG de ${xgVal.toFixed(1)} — convierte ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} por encima de lo esperado`
        )
      } else if (delta <= -1.5 || ratio <= 0.65) {
        parts.push(
          `Área de mejora: definición baja — marcó ${golesVal} goles con xG de ${xgVal.toFixed(1)} (${Math.abs(delta).toFixed(1)} por debajo de lo esperado)`
        )
      }
    } else if (!isFinisher && xgVal !== null) {
      // For midfielders/laterals, xG high = goal threat = positive
      const xgKey = displayMetricsList.find(m => ['xG', 'Goles esperados', 'xG/90', 'Goles esperados/90'].includes(m))
      if (xgKey) {
        const xgPct = metricPercentiles[xgKey]
        if (xgPct !== undefined && xgPct >= 75) {
          highlights.push({ key: xgKey, name: 'llegada al gol (xG)', pct: xgPct })
        }
      }
    }

    // ── Generic highlights ─────────────────────────────────────────────────────
    if (highlights.length > 0) {
      const top2 = highlights.sort((a, b) => b.pct - a.pct).slice(0, 2)
      const minPct = Math.min(...top2.map(h => h.pct))
      parts.push(`Destaca en ${top2.map(h => h.name).join(' y ')} (top ${Math.round(100 - minPct)}% de su posición)`)
    }
    if (weak.length > 0) parts.push(`Área de mejora: ${weak.slice(0, 2).map(w => w.name).join(' y ')}`)

    // ── Contract / market value ────────────────────────────────────────────────
    if (player.contractStatus === 'critical') parts.push(`Oportunidad de mercado: contrato vence en ${player.monthsRemaining} mes${player.monthsRemaining !== 1 ? 'es' : ''}`)
    else if (player.contractStatus === 'warning') parts.push(`Contrato vence en ${player.monthsRemaining} meses`)
    if (player.marketValueRaw > 0) parts.push(`Valor de mercado: ${player.marketValueFormatted}`)

    return parts.length > 0 ? parts : null
  }, [player, posKey, metricPercentiles])

  useEffect(() => {
    if (player) {
      const playerLeague = player.Liga
      if (playerLeague && availableLeagues.includes(playerLeague)) {
        setComparisonLeague(playerLeague)
      } else {
        setComparisonLeague('all')
      }
    }
  }, [player?.Jugador, player?.Liga, availableLeagues])

  // Check if player is in seguimiento
  useEffect(() => {
    if (player && source === 'externo') {
      const playerKey = `${normalizeName(player.Jugador)}|${normalizeName(player.Equipo)}`
      isInSeguimiento(playerKey).then(setIsInSeguimientoState)
    }
  }, [player?.Jugador, player?.Equipo, source])

  // Handle seguimiento toggle
  const handleSeguimientoToggle = useCallback(async () => {
    if (!player || !user) return

    setSeguimientoLoading(true)
    const playerKey = `${normalizeName(player.Jugador)}|${normalizeName(player.Equipo)}`

    try {
      if (isInSeguimientoState) {
        const result = await removeFromSeguimiento(playerKey)
        if (result.success) {
          setIsInSeguimientoState(false)
        }
      } else {
        const result = await addToSeguimiento({
          playerKey,
          playerName: player.Jugador,
          team: player.Equipo,
          league: player.Liga,
          position: player['Posición'] || player['Posición específica'],
          age: player.ageNum,
          imageUrl: player.Imagen,
        }, 'ficha')
        if (result.success) {
          setIsInSeguimientoState(true)
        }
      }
    } finally {
      setSeguimientoLoading(false)
    }
  }, [player, user, isInSeguimientoState])

  const playerMarketValueHistory = useMemo(() => {
    if (!player || source !== 'interno') return []
    const playerNameNorm = normalizeName(player.Jugador)
    return marketValueHistory.filter(entry => {
      const entryNameNorm = normalizeName(entry.Jugador)
      return entryNameNorm === playerNameNorm
    })
  }, [player, source, marketValueHistory])

  // Define tabs based on source
  // External: Radar+Métricas unified into 'Métricas'
  const tabs = source === 'interno'
    ? ['General', 'Radar', 'Físico', 'Valor', 'Evolución', 'Métricas']
    : ['General', 'Métricas']

  // Compute radar data for PDF export
  const computeRadarData = useMemo(() => {
    if (!player || !posKey) return []

    const radarMetrics = RADAR_METRICS[posKey] ?? RADAR_METRICS['_default'] ?? []
    const allPlayers = [...external, ...internal]

    // Get player's normalized values
    const normPlayer = normalized.find(n => normalizeName(n.Jugador) === normalizeName(player.Jugador))

    // Calculate position averages
    const posPlayers = normalized.filter(p => {
      const pPos = p['Posición']?.trim() ?? ''
      const pPosKey = POSITION_MAP[pPos] ?? ''
      return pPosKey === posKey
    })

    if (posPlayers.length === 0) return []

    const result: { metric: string; value: number; average: number }[] = []

    for (const metric of radarMetrics) {
      // Player value
      let playerVal = 50
      if (normPlayer) {
        const v = normPlayer[metric]
        playerVal = typeof v === 'number' ? v * 100 : 50
      }

      // Average value
      const avgSum = posPlayers.reduce((s, p) => {
        const v = p[metric]
        return s + (typeof v === 'number' ? v : 0)
      }, 0)
      const avgVal = (avgSum / posPlayers.length) * 100

      result.push({ metric, value: playerVal, average: avgVal })
    }

    return result
  }, [player, posKey, normalized, external, internal])

  // PDF Export handler
  const handleExportPdf = async (sections: string[], theme: PDFTheme) => {
    if (!player) return

    await exportPlayerToPdfFull({
      player,
      source,
      sections,
      theme,
      positionAverageScore,
      subjectiveGroups,
      marketValueHistory: playerMarketValueHistory,
      metricPercentiles,
      radarData: computeRadarData,
    })
  }

  // Fetch evaluations for plantel layout
  useEffect(() => {
    if (source !== 'interno' || !player) return
    async function load() {
      const results: ScoutEvaluation[] = []
      const seen = new Set<string>()
      const playerId = player!.id || player!.Jugador
      const byId = await fetchPlayerEvaluations(playerId)
      for (const e of byId) { if (!seen.has(e.id)) { seen.add(e.id); results.push(e) } }
      const byName = await fetchEvaluationsByName(player!.Jugador)
      for (const e of byName) { if (!seen.has(e.id)) { seen.add(e.id); results.push(e) } }
      results.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
      setPlantelEvaluations(results)
    }
    load()
  }, [player?.Jugador, player?.id, source])

  if (loading) return <LoadingSpinner fullScreen message="Cargando ficha del jugador..." />
  if (error) return <EmptyState title="Error" description={error} icon="error" />
  if (!player) return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
      <EmptyState title="Jugador no encontrado" description="No se encontró el jugador solicitado." icon="search" />
    </div>
  )

  // ── Plantel (interno) players use the new dedicated layout ──
  // Using cast to prevent TS from narrowing `source` type for the existing code below
  if ((source as string) === 'interno') {
    return (
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <PlantelLayout
          player={player}
          normalized={normalized}
          allPlayers={[...external, ...internal]}
          evolution={evolution}
          subjectiveMetrics={subjectiveMetrics}
          gpsData={gpsData}
          posKey={posKey}
          rawPosition={rawPosition}
          positionAverageScore={positionAverageScore}
          metricPercentiles={metricPercentiles}
          evaluations={plantelEvaluations}
          playerJugadorSK={playerJugadorSK}
          onExportPdf={() => setShowExportModal(true)}
        />
        <ExportPDFModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportPdf}
          player={player}
          source={source}
          availableEvolutionCharts={[]}
          selectedEvolutionCharts={[]}
        />
      </div>
    )
  }

  const displayMetrics = DISPLAY_METRICS[posKey] ?? DISPLAY_METRICS['_default']
  const contractColor =
    player.contractStatus === 'critical' ? 'text-orange-500'
    : player.contractStatus === 'warning' ? 'text-amber-500'
    : 'text-apple-gray-700 dark:text-apple-gray-300'

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 animate-fade-in" id="player-detail-container" ref={contentRef}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-apple-gray-500 dark:text-apple-gray-400 mb-5">
        <Link
          to={source === 'interno' ? '/plantel' : source === 'seguimiento' ? '/seguimiento' : '/'}
          className="hover:text-brand-green transition-colors"
        >
          {source === 'interno' ? 'Plantel' : source === 'seguimiento' ? 'Seguimiento' : 'Scout Externo'}
        </Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-apple-gray-800 dark:text-white font-medium">{player.Jugador}</span>
      </nav>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left sidebar - Player info & Score */}
        <div className="lg:col-span-4 space-y-5">
          {/* Player card */}
          <div className="card-apple overflow-hidden" id="player-header-card">
            {/* Header with gradient, pattern and logo */}
            <div className="relative h-28 overflow-hidden">
              {/* Base gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#8B1530]/18 via-[#6B1020]/10 to-apple-gray-100/50 dark:to-apple-gray-800/50" />
              {/* Radial glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(139,21,48,0.15),transparent_60%)]" />
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '12px 12px'
              }} />
              {/* Logo watermark - centered in header */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/lanus-escudo.png"
                  alt=""
                  className="w-28 h-28 object-contain opacity-20"
                />
              </div>
            </div>

            {/* Avatar positioned over header */}
            <div className="relative px-5 -mt-14">
              {player.Imagen ? (
                <div className="relative w-[104px] h-[104px]">
                  {/* Background for transparent images */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white to-apple-gray-100 dark:from-apple-gray-700 dark:to-apple-gray-800 shadow-lg border-4 border-white dark:border-apple-gray-800" />
                  {/* Player image */}
                  <img
                    src={player.Imagen}
                    alt={player.Jugador}
                    className="relative w-full h-full rounded-2xl object-cover border-4 border-white dark:border-apple-gray-800"
                    style={{
                      backgroundColor: 'transparent',
                      mixBlendMode: 'normal'
                    }}
                  />
                </div>
              ) : (
                <div className="w-[104px] h-[104px] bg-gradient-to-br from-apple-gray-100 to-apple-gray-200 dark:from-apple-gray-700 dark:to-apple-gray-800 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white dark:border-apple-gray-800">
                  <span className="text-2xl font-bold text-apple-gray-400 dark:text-apple-gray-500">
                    {player.Jugador.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </span>
                </div>
              )}
            </div>

            {/* Player info */}
            <div className="p-5 pt-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-apple-gray-800 dark:text-white tracking-tight">
                    {player.Jugador}
                  </h1>
                  <p className="text-sm text-apple-gray-500 dark:text-apple-gray-400 mt-0.5">
                    {player.Equipo || '—'}
                  </p>
                </div>
                <ContractBadge status={player.contractStatus} monthsRemaining={player.monthsRemaining} />
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex px-2.5 py-1 bg-apple-gray-100 dark:bg-apple-gray-700 rounded-lg text-xs font-medium text-apple-gray-600 dark:text-apple-gray-300">
                  {displayPosition}
                </span>
                {player.Liga && (
                  <span className="text-xs text-apple-gray-500 dark:text-apple-gray-400">
                    {player.Liga}
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-apple-gray-100 dark:border-apple-gray-700/50">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-apple-gray-800 dark:text-white">{player.Edad}</p>
                    <p className="text-2xs text-apple-gray-500">años</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-apple-gray-800 dark:text-white">{player.Altura || '—'}</p>
                    <p className="text-2xs text-apple-gray-500">cm</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-apple-gray-800 dark:text-white">
                      {player.Pie?.toLowerCase() === 'derecho' || player.Pie?.toLowerCase() === 'right' ? 'Diestro' :
                       player.Pie?.toLowerCase() === 'izquierdo' || player.Pie?.toLowerCase() === 'left' ? 'Zurdo' :
                       player.Pie?.toLowerCase() === 'ambos' || player.Pie?.toLowerCase() === 'both' ? 'Ambos' :
                       player.Pie || '—'}
                    </p>
                    <p className="text-2xs text-apple-gray-500">pie</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scoring datos - THE HERO */}
          <div className="card-apple p-6" id="player-score-card">
            <div className="text-center mb-4">
              <h2 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">
                Scoring datos
              </h2>
            </div>
            <GaugeScore
              score={player.ggScore}
              percentile={player.ggScorePercentile}
              size="lg"
              comparisonScore={positionAverageScore}
              comparisonLabel={`Promedio ${posKey || 'posición'}`}
            />
            {subjectiveGroups.length > 0 && (
              <div className="mt-6 pt-5 border-t border-apple-gray-100 dark:border-apple-gray-700/50">
                <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-4 text-center">
                  Evaluación Scout
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {subjectiveGroups.map(group => {
                    const score = group.averageScore
                    const color = score >= 70 ? '#22C55E' : score >= 50 ? '#EAB308' : score >= 30 ? '#F97316' : '#EF4444'
                    const circumference = 2 * Math.PI * 28
                    const progress = (score / 100) * circumference

                    return (
                      <div
                        key={group.tipo}
                        className="flex flex-col items-center"
                      >
                        {/* Circular progress */}
                        <div className="relative w-20 h-20">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                            {/* Background circle */}
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              className="stroke-apple-gray-200 dark:stroke-apple-gray-700"
                              strokeWidth="6"
                            />
                            {/* Progress circle */}
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              fill="none"
                              stroke={color}
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeDasharray={`${progress} ${circumference}`}
                              style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
                            />
                          </svg>
                          {/* Score in center */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className="text-lg font-bold tabular-nums"
                              style={{ color }}
                            >
                              {score}
                            </span>
                          </div>
                        </div>
                        {/* Label */}
                        <p className="text-2xs text-apple-gray-600 dark:text-apple-gray-400 font-medium mt-2 text-center capitalize">
                          {group.tipo}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Football pitch — position zone */}
          {posKey && (
            <div className="card-apple p-4">
              <FootballPitch
                posKey={posKey}
                rawPosition={rawPosition}
                positionLabel={displayPosition}
                compact
              />
            </div>
          )}

          {/* Score Scout Timeline - self-contained, renders its own card if evaluations exist */}
          <ScoreScoutTimeline playerId={player.id || player.Jugador} playerName={player.Jugador} />

          {/* Quick links & actions */}
          <div className="card-apple p-4 space-y-2">
            {player.Transfermkt && (
              <a
                href={player.Transfermkt}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-apple-gray-50 dark:bg-apple-gray-800/50 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700/50 transition-colors group"
              >
                <span className="text-sm text-apple-gray-700 dark:text-apple-gray-300">Transfermarkt</span>
                <svg className="w-4 h-4 text-apple-gray-400 group-hover:text-brand-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {monitoringPlayer?.WyscoutVideo && (
              <a
                href={monitoringPlayer.WyscoutVideo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
              >
                <span className="text-sm text-red-600 dark:text-red-400">Video Wyscout</span>
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </a>
            )}
            <AddToReportButton
              type="player-card"
              title={`Ficha: ${player.Jugador}`}
              description={`${player.Equipo} - ${player['Posición'] || player['Posicion']} - ${player.ageNum} años`}
              captureId="player-detail-container"
              source={source === 'interno' ? 'Scout Interno' : 'Scout Externo'}
              variant="menu-item"
              players={[player.Jugador]}
            />
            <Link
              to={`/comparacion?player=${encodeURIComponent(player.Jugador)}`}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-apple-gray-100 dark:bg-apple-gray-800 hover:bg-apple-gray-200 dark:hover:bg-apple-gray-700 transition-colors group"
            >
              <span className="text-sm font-medium text-apple-gray-700 dark:text-apple-gray-200">Comparar jugador</span>
              <svg className="w-4 h-4 text-apple-gray-500 dark:text-apple-gray-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </Link>
            {/* Seguimiento button - only for external players */}
            {source === 'externo' && user && (
              <button
                onClick={handleSeguimientoToggle}
                disabled={seguimientoLoading}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-colors ${
                  isInSeguimientoState
                    ? 'bg-amber-500/10 hover:bg-amber-500/20'
                    : 'bg-blue-500/10 hover:bg-blue-500/20'
                } ${seguimientoLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`text-sm font-medium ${isInSeguimientoState ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {seguimientoLoading ? 'Cargando...' : isInSeguimientoState ? 'En seguimiento' : 'Agregar a seguimiento'}
                </span>
                <svg className={`w-4 h-4 ${isInSeguimientoState ? 'text-amber-500' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isInSeguimientoState ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  )}
                </svg>
              </button>
            )}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-brand-green/10 hover:bg-brand-green/20 transition-colors"
            >
              <span className="text-sm text-brand-green font-medium">
                Exportar PDF
              </span>
              <svg className="w-4 h-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>

          {/* Comments - on sidebar */}
          <div className="card-apple p-5">
            <PlayerComments player={player} />
          </div>
        </div>

        {/* Main content area */}
        <div className="lg:col-span-8 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 bg-apple-gray-100/50 dark:bg-apple-gray-800/50 rounded-xl p-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                data-tab={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-apple whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white dark:bg-apple-gray-700 text-apple-gray-800 dark:text-white shadow-apple dark:shadow-apple-dark'
                    : 'text-apple-gray-500 dark:text-apple-gray-400 hover:text-apple-gray-700 dark:hover:text-apple-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="card-apple p-6" id="player-tab-content">

            {/* GENERAL TAB */}
            {activeTab === 'General' && (
              <div className="space-y-6 animate-fade-in" id="tab-content-general">
                {/* Key info cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-apple-gray-50 to-white dark:from-apple-gray-800/50 dark:to-apple-gray-800 rounded-xl p-4 border border-apple-gray-100 dark:border-apple-gray-700">
                    <p className="text-2xs text-apple-gray-500 uppercase tracking-wider mb-1">Partidos</p>
                    <p className="text-2xl font-bold text-apple-gray-800 dark:text-white tabular-nums">
                      {player['Partidos jugados'] || '—'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-apple-gray-50 to-white dark:from-apple-gray-800/50 dark:to-apple-gray-800 rounded-xl p-4 border border-apple-gray-100 dark:border-apple-gray-700">
                    <p className="text-2xs text-apple-gray-500 uppercase tracking-wider mb-1">Minutos</p>
                    <p className="text-2xl font-bold text-apple-gray-800 dark:text-white tabular-nums">
                      {player.minutesPlayed?.toLocaleString() || '—'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-apple-gray-50 to-white dark:from-apple-gray-800/50 dark:to-apple-gray-800 rounded-xl p-4 border border-apple-gray-100 dark:border-apple-gray-700">
                    <p className="text-2xs text-apple-gray-500 uppercase tracking-wider mb-1">Valor</p>
                    <p className="text-2xl font-bold text-brand-green tabular-nums">
                      {player.marketValueFormatted || '—'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-apple-gray-50 to-white dark:from-apple-gray-800/50 dark:to-apple-gray-800 rounded-xl p-4 border border-apple-gray-100 dark:border-apple-gray-700">
                    <p className="text-2xs text-apple-gray-500 uppercase tracking-wider mb-1">Contrato</p>
                    <p className={`text-2xl font-bold tabular-nums ${contractColor}`}>
                      {player['Vencimiento contrato']?.slice(-4) || '—'}
                    </p>
                  </div>
                </div>

                {/* Personal info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-3">
                      Información Personal
                    </h3>
                    <div className="bg-apple-gray-50/50 dark:bg-apple-gray-800/30 rounded-xl p-4">
                      <InfoRow label="Edad" value={player.Edad ? `${player.Edad} años` : null} />
                      <InfoRow label="Nacionalidad" value={player['País de nacimiento']} />
                      <InfoRow label="Altura" value={player.Altura ? `${player.Altura} cm` : null} />
                      <InfoRow label="Pie dominante" value={
                        player.Pie?.toLowerCase() === 'derecho' || player.Pie?.toLowerCase() === 'right' ? 'Diestro' :
                        player.Pie?.toLowerCase() === 'izquierdo' || player.Pie?.toLowerCase() === 'left' ? 'Zurdo' :
                        player.Pie?.toLowerCase() === 'ambos' || player.Pie?.toLowerCase() === 'both' ? 'Ambos' :
                        player.Pie
                      } />
                      <InfoRow label="Posición específica" value={getDisplayPosition(player['Posición específica'])} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-3">
                      Contrato
                    </h3>
                    <div className="bg-apple-gray-50/50 dark:bg-apple-gray-800/30 rounded-xl p-4">
                      <div className="flex justify-between py-2 border-b border-apple-gray-100 dark:border-apple-gray-700/50">
                        <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">Vencimiento</span>
                        <span className={`text-sm font-medium ${contractColor}`}>
                          {player['Vencimiento contrato'] || '—'}
                          {player.monthsRemaining !== null && (
                            <span className="ml-1.5 text-xs font-normal text-apple-gray-400">
                              ({player.monthsRemaining}m)
                            </span>
                          )}
                        </span>
                      </div>
                      <InfoRow label="Valor de mercado" value={player.marketValueFormatted} />
                      {player.Representante && <InfoRow label="Representante" value={player.Representante} />}
                    </div>
                  </div>
                </div>

                {/* What makes this player stand out */}
                <div>
                  <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-3">
                    Resumen Rápido
                  </h3>
                  <div className="bg-gradient-to-br from-[#8B1530]/5 to-[#6B1020]/5 dark:from-[#8B1530]/10 dark:to-[#6B1020]/8 rounded-xl p-5 border border-[#8B1530]/10">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed">
                          <span className="font-semibold text-apple-gray-800 dark:text-white">{player.Jugador}</span>
                          {' '}es un <span className="font-medium">{displayPosition}</span>
                          {' '}de <span className="font-medium">{player.Edad} años</span>
                          {player.Liga && <> que juega en <span className="font-medium">{player.Liga}</span></>}.
                          {player.ggScore !== null && (
                            <> Su Scoring datos de <span className="font-bold" style={{ color: getScoreHex(player.ggScore, player.ggScorePercentile) }}>{player.ggScore.toFixed(1)}</span>
                            {positionAverageScore && player.ggScore > positionAverageScore ? (
                              <> está <span className="text-[#D4A843] font-medium">por encima</span> del promedio de su posición</>
                            ) : positionAverageScore && player.ggScore < positionAverageScore ? (
                              <> está por debajo del promedio de su posición</>
                            ) : null}.
                            </>
                          )}
                          {player.contractStatus === 'critical' && (
                            <> <span className="text-orange-500 font-medium">Contrato por vencer pronto.</span></>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RADAR TAB */}
            {activeTab === 'Radar' && (
              <div className="animate-fade-in" id="tab-content-radar">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-semibold text-apple-gray-700 dark:text-apple-gray-300">
                      Radar — {displayPosition}
                    </h3>
                    <p className="text-xs text-apple-gray-400 mt-0.5">
                      Comparando vs {comparisonLeague === 'all' ? 'promedio general' : `promedio de ${comparisonLeague}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-apple-gray-500 dark:text-apple-gray-400">
                      Comparar vs:
                    </label>
                    <select
                      value={comparisonLeague}
                      onChange={e => setComparisonLeague(e.target.value)}
                      className="input-apple text-sm py-1.5 px-3 min-w-[160px]"
                    >
                      <option value="all">Todas las ligas</option>
                      {availableLeagues.map(league => (
                        <option key={league} value={league}>{league}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!posKey ? (
                  <EmptyState title="Posición no reconocida" description="No se puede generar el radar para esta posición." />
                ) : (
                  <PlayerRadarChart
                    player={player}
                    allNormalized={normalized}
                    allPlayers={[...external, ...internal]}
                    comparisonLeague={comparisonLeague}
                    overridePosition={rawPosition}
                  />
                )}

                <div className="mt-4 p-4 bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-lg">
                  <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 leading-relaxed">
                    El gráfico muestra las métricas normalizadas del jugador (0-100) comparadas contra el promedio
                    de jugadores de la misma posición ({posKey})
                    {comparisonLeague !== 'all' ? ` en ${comparisonLeague}` : ' en toda la base de datos'}.
                  </p>
                </div>
              </div>
            )}

            {/* FÍSICO / GPS TAB */}
            {activeTab === 'Físico' && source === 'interno' && (
              <div className="animate-fade-in" id="tab-content-gps">
                <GPSTab
                  gpsEntries={playerGpsData}
                  playerName={player.Jugador}
                />
              </div>
            )}

            {/* VALOR DE MERCADO TAB */}
            {activeTab === 'Valor' && source === 'interno' && (
              <div className="animate-fade-in" id="tab-content-valor">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-semibold text-apple-gray-700 dark:text-apple-gray-300">
                      Evolución del Valor de Mercado
                    </h3>
                    <p className="text-xs text-apple-gray-400 mt-0.5">
                      Historial según Transfermarkt
                    </p>
                  </div>
                </div>
                <MarketValueChart data={playerMarketValueHistory} playerName={player.Jugador} />
              </div>
            )}

            {/* EVOLUCIÓN TAB */}
            {activeTab === 'Evolución' && source === 'interno' && (
              <div className="animate-fade-in" id="tab-content-evolution">
                <h3 className="text-sm font-semibold text-apple-gray-700 dark:text-apple-gray-300 mb-5">
                  Evolución por partido
                </h3>
                {playerJugadorSK ? (
                  <EvolutionChart evolution={evolution} playerSK={playerJugadorSK} />
                ) : (
                  <EmptyState
                    title="Sin datos de evolución"
                    description="No se encontraron datos de evolución para este jugador."
                    icon="search"
                  />
                )}
              </div>
            )}

            {/* MÉTRICAS TAB */}
            {activeTab === 'Métricas' && (
              <div className="animate-fade-in" id="tab-content-metrics">
                {source === 'externo' ? (
                  /* ── EXTERNAL: Radar + Métricas unificados ── */
                  <div className="space-y-6">

                    {/* Header + selector de liga */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-apple-gray-700 dark:text-apple-gray-300">
                          Métricas · {displayPosition}
                        </h3>
                        <p className="text-xs text-apple-gray-400 mt-0.5">Radar y percentiles vs jugadores de su posición con +300 min</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-apple-gray-500 whitespace-nowrap">Comparar vs:</label>
                        <select
                          value={comparisonLeague}
                          onChange={e => setComparisonLeague(e.target.value)}
                          className="input-apple text-sm py-1.5 px-3 min-w-[150px]"
                        >
                          <option value="all">Todas las ligas</option>
                          {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Radar — ancho completo */}
                    <div>
                      {!posKey ? (
                        <EmptyState title="Posición no reconocida" description="No se puede generar el radar para esta posición." />
                      ) : (
                        <PlayerRadarChart
                          player={player}
                          allNormalized={normalized}
                          allPlayers={[...external, ...internal]}
                          comparisonLeague={comparisonLeague}
                          overridePosition={rawPosition}
                        />
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-apple-gray-200 dark:border-apple-gray-800" />

                    {/* Todas las métricas */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold text-apple-gray-400 uppercase tracking-widest">Métricas</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-0.5 h-3.5 rounded-full bg-apple-gray-400 dark:bg-apple-gray-400 shadow-sm ring-1 ring-apple-gray-300/50 dark:ring-apple-gray-600/50" />
                          <p className="text-[10px] text-apple-gray-400">
                            Promedio de {posKey?.toLowerCase() ?? 'su posición'} en{' '}
                            {percentileLeague === 'all' ? 'todas las ligas' : percentileLeague}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-apple-gray-400 mb-4">
                        Percentil vs {posKey?.toLowerCase() ?? 'su posición'} ·{' '}
                        {percentileLeague === 'all' ? 'todas las ligas' : percentileLeague}
                        {percentileLeague !== comparisonLeague && comparisonLeague !== 'all' && (
                          <span className="text-apple-gray-300 dark:text-apple-gray-600"> (sin suficientes datos en {comparisonLeague})</span>
                        )}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        {displayMetrics.map(metric => {
                          const isBasic = metric === 'Partidos jugados' || metric === 'Minutos jugados'
                          const clearLabel = CLEAR_METRIC_NAMES[metric] ?? metric
                          if (isBasic) {
                            const val = player[metric]
                            const num = typeof val === 'number' ? val : parseFloat(String(val ?? '').replace(',', '.'))
                            return (
                              <div key={metric} className="flex justify-between py-3 border-b border-apple-gray-200 dark:border-apple-gray-800/50">
                                <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{clearLabel}</span>
                                <span className="text-sm font-semibold text-apple-gray-800 dark:text-white tabular-nums">
                                  {isNaN(num) ? '—' : num.toFixed(0)}
                                </span>
                              </div>
                            )
                          }
                          return (
                            <MetricRowWithPercentile
                              key={metric}
                              label={clearLabel}
                              value={player[metric]}
                              percentile={metricPercentiles[metric]}
                              avgPercentile={avgPercentiles[metric]}
                            />
                          )
                        })}
                      </div>
                    </div>

                    {/* vs Plantel */}
                    {squadComparison.length > 0 && (
                      <>
                        <div className="border-t border-apple-gray-200 dark:border-apple-gray-800" />
                        <div>
                          <p className="text-[10px] font-semibold text-apple-gray-400 uppercase tracking-widest mb-3">
                            vs Plantel Lanús · {posKey ?? displayPosition}
                          </p>
                          <div className="space-y-2">
                            {squadComparison.map(({ player: sp, scoreDiff }) => {
                              const extScore = player.ggScore ?? 0
                              const intScore = sp.ggScore ?? 0
                              const maxScore = Math.max(extScore, intScore, 1)
                              const isAhead = scoreDiff > 2
                              const isBehind = scoreDiff < -2
                              return (
                                <div key={sp.Jugador} className="p-3 rounded-xl bg-apple-gray-50 dark:bg-apple-gray-800/50 border border-apple-gray-100 dark:border-apple-gray-800">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-sm font-medium text-apple-gray-800 dark:text-white truncate">{sp.Jugador}</span>
                                      <span className="text-[10px] text-apple-gray-400 whitespace-nowrap">Lanús</span>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-3 ${
                                      isAhead  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                      : isBehind ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                               : 'bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-500'
                                    }`}>
                                      {scoreDiff > 0 ? '+' : ''}{Math.round(scoreDiff)} pts
                                    </span>
                                  </div>
                                  {/* Score bars */}
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-apple-gray-400 w-20 truncate">{player.Jugador.split(' ').pop()}</span>
                                      <div className="flex-1 h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-green rounded-full transition-all duration-500" style={{ width: `${(extScore / maxScore) * 100}%` }} />
                                      </div>
                                      <span className="text-[10px] font-semibold text-brand-green w-7 text-right tabular-nums">{Math.round(extScore)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-apple-gray-400 w-20 truncate">{sp.Jugador.split(' ').pop()}</span>
                                      <div className="flex-1 h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-apple-gray-400 dark:bg-apple-gray-500 rounded-full transition-all duration-500" style={{ width: `${(intScore / maxScore) * 100}%` }} />
                                      </div>
                                      <span className="text-[10px] font-semibold text-apple-gray-500 w-7 text-right tabular-nums">{Math.round(intScore)}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Insight en viñetas */}
                    {insightText && (
                      <>
                        <div className="border-t border-apple-gray-200 dark:border-apple-gray-800" />
                        <div className="p-4 bg-brand-green/5 dark:bg-brand-green/10 rounded-xl border border-brand-green/20">
                          <p className="text-[10px] font-semibold text-brand-green uppercase tracking-widest mb-2">Insight</p>
                          <ul className="space-y-1.5">
                            {(Array.isArray(insightText) ? insightText : [insightText]).filter(Boolean).map((point, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-green flex-shrink-0" />
                                <span className="text-sm text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed">
                                  {String(point).endsWith('.') ? point : `${point}.`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* ── INTERNAL: métricas existentes ── */
                  <div>
                    <div className="mb-5">
                      <h3 className="text-sm font-semibold text-apple-gray-700 dark:text-apple-gray-300">
                        Métricas Detalladas — {posKey || 'General'}
                      </h3>
                      <p className="text-xs text-apple-gray-400 mt-0.5">
                        Comparado vs jugadores de su posición con +300 minutos
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                      {displayMetrics.map(metric => {
                        const isBasicStat = metric === 'Partidos jugados' || metric === 'Minutos jugados'
                        const percentile = metricPercentiles[metric]
                        if (isBasicStat) {
                          const val = player[metric]
                          const num = typeof val === 'number' ? val : parseFloat(String(val ?? '').replace(',', '.'))
                          return (
                            <div key={metric} className="flex justify-between py-3 border-b border-apple-gray-200 dark:border-apple-gray-800/50">
                              <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{metric}</span>
                              <span className="text-sm font-semibold text-apple-gray-800 dark:text-white tabular-nums">
                                {isNaN(num) ? '—' : num.toFixed(0)}
                              </span>
                            </div>
                          )
                        }
                        return (
                          <MetricRowWithPercentile
                            key={metric}
                            label={metric}
                            value={player[metric]}
                            percentile={percentile}
                            avgPercentile={avgPercentiles[metric]}
                          />
                        )
                      })}
                    </div>
                    {!posKey && (
                      <p className="mt-4 text-xs text-apple-gray-400">
                        Posición no reconocida para mostrar métricas específicas.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export PDF Modal */}
      <ExportPDFModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportPdf}
        player={player}
        source={source}
        availableEvolutionCharts={[]}
        selectedEvolutionCharts={[]}
      />
    </div>
  )
}
