import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import PlayerRadarChart from '@/components/charts/PlayerRadarChart'
import EvolutionChart from '@/components/charts/EvolutionChart'
import GPSTab from '@/components/charts/GPSTab'
import GaugeScore from '@/components/charts/GaugeScore'
import FootballPitch from '@/components/charts/FootballPitch'
import ContractBadge from '@/components/ui/ContractBadge'
import { normalizeName } from '@/utils/scoring'
import { getScoreHex } from '@/components/ui/ScoreBar'
import { POSITION_MAP, DISPLAY_POSITION_MAP, DISPLAY_METRICS } from '@/constants/scoring'
import type { EnrichedPlayer, NormalizedPlayer, EvolutionEntry, SubjectiveMetric, GPSEntry } from '@/types'
import type { ScoutEvaluation } from '@/services/scoutEvaluationService'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Injury {
  id: string
  zone: string
  type: string
  date: string
  status: 'recuperado' | 'en_tratamiento' | 'baja'
  description?: string
}

interface PlantelLayoutProps {
  player: EnrichedPlayer
  normalized: NormalizedPlayer[]
  allPlayers: EnrichedPlayer[]
  evolution: EvolutionEntry[]
  subjectiveMetrics: SubjectiveMetric[]
  gpsData: GPSEntry[]
  posKey: string
  rawPosition: string
  positionAverageScore: number | null
  metricPercentiles: Record<string, number>
  evaluations: ScoutEvaluation[]
  playerJugadorSK: string
  onExportPdf: () => void
}

// ─── INJURY ZONES ─────────────────────────────────────────────────────────────

const ALL_INJURY_ZONES = [
  'Cabeza', 'Cuello',
  'Hombro Izq.', 'Hombro Der.',
  'Pecho', 'Abdomen', 'Espalda Alta', 'Espalda Baja',
  'Cadera Izq.', 'Cadera Der.',
  'Ingle Izq.', 'Ingle Der.',
  'Glúteo Izq.', 'Glúteo Der.',
  'Muslo Izq.', 'Muslo Der.',
  'Isquiotibial Izq.', 'Isquiotibial Der.',
  'Rodilla Izq.', 'Rodilla Der.',
  'Gemelo Izq.', 'Gemelo Der.',
  'Tobillo Izq.', 'Tobillo Der.',
  'Pie Izq.', 'Pie Der.',
]

const INJURY_STATUS_CONFIG = {
  recuperado:     { label: 'Recuperado',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: '#22C55E' },
  en_tratamiento: { label: 'En tratamiento',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   dot: '#F59E0B' },
  baja:           { label: 'Baja',            color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',       dot: '#EF4444' },
}

// ─── SECTION ICONS ────────────────────────────────────────────────────────────

const icons = {
  general: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  metricas: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  fisico: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  nutricion: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  salud: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  psicologia: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  neurociencia: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  coach: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
}

const SECTIONS = [
  { id: 'general',      label: 'General',      icon: icons.general },
  { id: 'metricas',     label: 'Métricas',     icon: icons.metricas },
  { id: 'fisico',       label: 'Físico',       icon: icons.fisico },
  { id: 'nutricion',    label: 'Nutrición',    icon: icons.nutricion },
  { id: 'salud',        label: 'Medicina',     icon: icons.salud },
  { id: 'psicologia',   label: 'Psicología',   icon: icons.psicologia },
  { id: 'neurociencia', label: 'Neurociencia', icon: icons.neurociencia },
  { id: 'coach',        label: 'Coach',        icon: icons.coach },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

// ─── HELPER: display position ─────────────────────────────────────────────────

function getDisplayPos(raw?: string): string {
  if (!raw) return '—'
  const t = raw.trim()
  const sep = t.includes(',') ? ',' : t.includes('/') ? '/' : null
  if (sep) {
    return t.split(sep).map(p => DISPLAY_POSITION_MAP[p.trim()] || p.trim())
      .filter((v, i, a) => a.indexOf(v) === i).join(' / ')
  }
  return DISPLAY_POSITION_MAP[t] || t
}

// ─── MINI STAT CARD ───────────────────────────────────────────────────────────

function MiniStat({ label, value, accent }: { label: string; value: string | number | null | undefined; accent?: boolean }) {
  return (
    <div className="bg-apple-gray-50 dark:bg-apple-gray-800/60 rounded-xl p-3 border border-apple-gray-100 dark:border-apple-gray-700/50">
      <p className="text-2xs text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${accent ? 'text-brand-green' : 'text-apple-gray-800 dark:text-white'}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

// ─── PLACEHOLDER SECTION ──────────────────────────────────────────────────────

function PlaceholderSection({ title, description, fields }: {
  title: string
  description: string
  fields: string[]
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 pb-4 border-b border-apple-gray-100 dark:border-apple-gray-700/50">
        <div className="w-2 h-6 bg-brand-green rounded-full" />
        <div>
          <h2 className="text-base font-bold text-apple-gray-800 dark:text-white">{title}</h2>
          <p className="text-xs text-apple-gray-400 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map(field => (
          <div
            key={field}
            className="bg-apple-gray-50/50 dark:bg-apple-gray-800/30 rounded-xl p-4 border border-dashed border-apple-gray-200 dark:border-apple-gray-700"
          >
            <p className="text-2xs text-apple-gray-400 uppercase tracking-wider mb-1">{field}</p>
            <div className="h-5 w-24 bg-apple-gray-200 dark:bg-apple-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center py-8 gap-3 text-apple-gray-400 dark:text-apple-gray-500">
        <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm">Sin datos disponibles · Área en desarrollo</p>
      </div>
    </div>
  )
}

// ─── MEDICINA SECTION ─────────────────────────────────────────────────────────

function SaludSection() {
  const [injuries, setInjuries] = useState<Injury[]>([])
  const [selectedInjury, setSelectedInjury] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newInjury, setNewInjury] = useState<Omit<Injury, 'id'>>({
    zone: ALL_INJURY_ZONES[0],
    type: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'en_tratamiento',
    description: '',
  })

  const handleAddInjury = () => {
    if (!newInjury.type.trim()) return
    setInjuries(prev => [...prev, { ...newInjury, id: Date.now().toString() }])
    setNewInjury({ zone: ALL_INJURY_ZONES[0], type: '', date: new Date().toISOString().slice(0, 10), status: 'en_tratamiento', description: '' })
    setShowAddForm(false)
  }

  const handleRemoveInjury = (id: string) => {
    setInjuries(prev => prev.filter(i => i.id !== id))
    if (selectedInjury === id) setSelectedInjury(null)
  }

  const totalLesiones = injuries.length
  const enTratamiento = injuries.filter(i => i.status === 'en_tratamiento').length
  const recuperadas   = injuries.filter(i => i.status === 'recuperado').length
  const bajas         = injuries.filter(i => i.status === 'baja').length

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-apple-gray-100 dark:border-apple-gray-700/50">
        <div className="w-2 h-6 bg-brand-green rounded-full" />
        <div>
          <h2 className="text-base font-bold text-apple-gray-800 dark:text-white">Medicina</h2>
          <p className="text-xs text-apple-gray-400 mt-0.5">Historial de lesiones y estado físico del jugador</p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar lesión
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Lesiones totales', value: totalLesiones, color: 'text-apple-gray-800 dark:text-white' },
          { label: 'En tratamiento',   value: enTratamiento, color: 'text-amber-500' },
          { label: 'Recuperadas',      value: recuperadas,   color: 'text-emerald-500' },
          { label: 'Bajas',            value: bajas,         color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-apple-gray-50 dark:bg-apple-gray-800/60 rounded-xl p-3 border border-apple-gray-100 dark:border-apple-gray-700/50 text-center">
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-apple-gray-400 uppercase tracking-wider mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 bg-apple-gray-50 dark:bg-apple-gray-800/60 rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 space-y-3">
          <p className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Nueva Lesión</p>

          <div>
            <label className="block text-2xs text-apple-gray-400 mb-1">Zona del cuerpo</label>
            <select
              value={newInjury.zone}
              onChange={e => setNewInjury(p => ({ ...p, zone: e.target.value }))}
              className="input-apple w-full text-sm"
            >
              {ALL_INJURY_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs text-apple-gray-400 mb-1">Tipo de lesión</label>
              <input
                type="text"
                placeholder="Muscular, ligamentaria..."
                value={newInjury.type}
                onChange={e => setNewInjury(p => ({ ...p, type: e.target.value }))}
                className="input-apple w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-2xs text-apple-gray-400 mb-1">Fecha</label>
              <input
                type="date"
                value={newInjury.date}
                onChange={e => setNewInjury(p => ({ ...p, date: e.target.value }))}
                className="input-apple w-full text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs text-apple-gray-400 mb-1">Estado</label>
            <div className="flex gap-2">
              {(['recuperado', 'en_tratamiento', 'baja'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setNewInjury(p => ({ ...p, status: s }))}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${newInjury.status === s
                    ? INJURY_STATUS_CONFIG[s].bg + ' font-semibold'
                    : 'border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-400'
                  }`}
                >
                  {INJURY_STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-2xs text-apple-gray-400 mb-1">Descripción</label>
            <input
              type="text"
              placeholder="Descripción breve..."
              value={newInjury.description}
              onChange={e => setNewInjury(p => ({ ...p, description: e.target.value }))}
              className="input-apple w-full text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(false)} className="btn-apple-secondary flex-1 text-sm py-2">Cancelar</button>
            <button onClick={handleAddInjury} disabled={!newInjury.type.trim()} className="btn-apple-primary flex-1 text-sm py-2 disabled:opacity-50">Guardar</button>
          </div>
        </div>
      )}

      {/* Full injury list */}
      {injuries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Historial completo</p>
          {injuries.map(inj => {
            const cfg = INJURY_STATUS_CONFIG[inj.status]
            const isSelected = selectedInjury === inj.id
            return (
              <button
                key={inj.id}
                onClick={() => setSelectedInjury(isSelected ? null : inj.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${cfg.bg} ${isSelected ? 'ring-2 ring-brand-green/50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                    <span className="text-sm font-semibold text-apple-gray-800 dark:text-white">{inj.zone}</span>
                    <span className="text-xs text-apple-gray-500 dark:text-apple-gray-400">{inj.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveInjury(inj.id) }}
                      className="text-apple-gray-400 hover:text-red-500 transition-colors text-sm leading-none"
                      title="Eliminar"
                    >×</button>
                  </div>
                </div>
                {inj.description && (
                  <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 mt-1 pl-4.5">{inj.description}</p>
                )}
                <p className="text-2xs text-apple-gray-400 mt-1 pl-4.5">
                  {new Date(inj.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {injuries.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-apple-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm">Sin lesiones registradas</p>
          <p className="text-xs mt-1 opacity-60">Usá el botón "Registrar lesión" para agregar una</p>
        </div>
      )}
    </div>
  )
}

// ─── METRIC ROW ───────────────────────────────────────────────────────────────

function MetricRowWithPercentile({ label, value, percentile }: {
  label: string
  value?: string | number | null
  percentile?: number | null
}) {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'))
  const displayVal = isNaN(num) ? (value || '—') : (num % 1 === 0 ? num.toFixed(0) : num.toFixed(2))

  const getQ = (p?: number | null) => {
    if (p == null) return { label: '', color: 'bg-apple-gray-300', text: 'text-apple-gray-700 dark:text-white' }
    if (p >= 80) return { label: 'Elite',    color: 'bg-emerald-500', text: 'text-emerald-500' }
    if (p >= 60) return { label: 'Bueno',    color: 'bg-yellow-500',  text: 'text-yellow-500' }
    if (p >= 40) return { label: 'Promedio', color: 'bg-amber-500',   text: 'text-amber-500' }
    if (p >= 20) return { label: 'Bajo',     color: 'bg-orange-500',  text: 'text-orange-500' }
    return              { label: 'Crítico',  color: 'bg-red-500',     text: 'text-red-500' }
  }
  const q = getQ(percentile)

  return (
    <div className="py-2.5 border-b border-apple-gray-200 dark:border-apple-gray-800/50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold tabular-nums ${q.text}`}>{displayVal}</span>
          {percentile != null && (
            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${q.color}/15 ${q.text}`}>{q.label}</span>
          )}
        </div>
      </div>
      {percentile != null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${q.color}`} style={{ width: `${Math.min(100, Math.max(0, percentile))}%` }} />
          </div>
          <span className="text-2xs text-apple-gray-400 tabular-nums w-12 text-right">Top {100 - Math.round(percentile)}%</span>
        </div>
      )}
    </div>
  )
}

// ─── COACH SECTION ────────────────────────────────────────────────────────────

interface PlayerComment {
  id: string
  sentiment: 'positive' | 'neutral' | 'negative'
  text: string
  author: string
  createdAt: string
}

function CoachSection({ playerKey, evaluations }: { playerKey: string; evaluations: ScoutEvaluation[] }) {
  const storageKey = `plantel_comments_v1`

  const loadComments = (): PlayerComment[] => {
    try {
      const all = JSON.parse(localStorage.getItem(storageKey) || '[]') as (PlayerComment & { playerKey: string })[]
      return all.filter(c => c.playerKey === playerKey)
    } catch { return [] }
  }

  const [comments, setComments] = useState<PlayerComment[]>(loadComments)
  const [isAdding, setIsAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [newAuthor, setNewAuthor] = useState(() => { try { return localStorage.getItem('comment_author') || '' } catch { return '' } })
  const [newSentiment, setNewSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral')

  const sentConfig = {
    positive: { icon: '👍', label: 'Positivo', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-500' },
    neutral:  { icon: '➖', label: 'Neutral',  bg: 'bg-amber-500/10 border-amber-500/30',   text: 'text-amber-500' },
    negative: { icon: '👎', label: 'Negativo', bg: 'bg-red-500/10 border-red-500/30',       text: 'text-red-500' },
  }

  const handleAdd = () => {
    if (!newText.trim() || !newAuthor.trim()) return
    const comment: PlayerComment & { playerKey: string } = {
      id: Date.now().toString(),
      playerKey,
      sentiment: newSentiment,
      text: newText.trim(),
      author: newAuthor.trim(),
      createdAt: new Date().toISOString(),
    }
    const all = (() => { try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] } })()
    const updated = [...all, comment]
    localStorage.setItem(storageKey, JSON.stringify(updated))
    localStorage.setItem('comment_author', newAuthor.trim())
    setComments(updated.filter((c: { playerKey: string }) => c.playerKey === playerKey))
    setNewText(''); setNewSentiment('neutral'); setIsAdding(false)
  }

  const handleDelete = (id: string) => {
    const all = (() => { try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] } })()
    const updated = all.filter((c: { id: string }) => c.id !== id)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setComments(updated.filter((c: { playerKey: string }) => c.playerKey === playerKey))
  }

  const getScoreColor = (s?: number | null) => {
    if (!s) return 'text-apple-gray-400'
    if (s >= 8) return 'text-[#8C1430] dark:text-[#D45A72]'
    if (s >= 6) return 'text-yellow-500'
    if (s >= 4) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-apple-gray-100 dark:border-apple-gray-700/50">
        <div className="w-2 h-6 bg-brand-green rounded-full" />
        <h2 className="text-base font-bold text-apple-gray-800 dark:text-white">Coach</h2>
        <button onClick={() => setIsAdding(v => !v)} className="ml-auto text-xs font-medium px-3 py-1.5 bg-brand-green/10 hover:bg-brand-green/20 text-brand-green rounded-lg transition-colors">
          + Nota
        </button>
      </div>

      {/* Add comment form */}
      {isAdding && (
        <div className="p-4 bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 space-y-3">
          <div className="flex gap-2">
            {(['positive', 'neutral', 'negative'] as const).map(s => (
              <button key={s} onClick={() => setNewSentiment(s)}
                className={`flex-1 py-2 px-2 rounded-lg border-2 transition-all text-xs font-medium ${newSentiment === s ? sentConfig[s].bg + ' ' + sentConfig[s].text : 'border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500'}`}>
                {sentConfig[s].icon} {sentConfig[s].label}
              </button>
            ))}
          </div>
          <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Observación del coach..." className="input-apple w-full h-20 resize-none text-sm" />
          <input type="text" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="Tu nombre..." className="input-apple w-full text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setIsAdding(false)} className="btn-apple-secondary flex-1 text-sm py-2">Cancelar</button>
            <button onClick={handleAdd} disabled={!newText.trim() || !newAuthor.trim()} className="btn-apple-primary flex-1 text-sm py-2 disabled:opacity-50">Guardar</button>
          </div>
        </div>
      )}

      {/* Coach notes */}
      {comments.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-3">Notas del Coach</h3>
          <div className="space-y-2">
            {[...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(c => {
              const cfg = sentConfig[c.sentiment]
              return (
                <div key={c.id} className={`p-3 rounded-xl border ${cfg.bg}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-xs font-semibold ${cfg.text}`}>{sentConfig[c.sentiment].icon} {sentConfig[c.sentiment].label}</span>
                    <button onClick={() => handleDelete(c.id)} className="text-apple-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <p className="text-sm text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed mb-1.5">{c.text}</p>
                  <div className="flex justify-between text-2xs text-apple-gray-400">
                    <span className="font-medium">{c.author}</span>
                    <span>{new Date(c.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Scout evaluations */}
      {evaluations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-3">Evaluaciones Scout</h3>
          <div className="space-y-2">
            {evaluations.slice(0, 5).map(ev => {
              const date = new Date(ev.match_date)
              const recConfig: Record<string, { label: string; color: string }> = {
                fichar:           { label: 'Fichar',          color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' },
                seguir_observando:{ label: 'Seguir',          color: 'text-blue-500 border-blue-500/30 bg-blue-500/10' },
                descartar:        { label: 'Descartar',       color: 'text-red-500 border-red-500/30 bg-red-500/10' },
              }
              const rec = ev.recommendation ? recConfig[ev.recommendation] : null
              const score = ev.overall_score ?? ev.technical_score
              return (
                <div key={ev.id} className="p-3 rounded-xl border border-apple-gray-100 dark:border-apple-gray-700/50 bg-apple-gray-50/50 dark:bg-apple-gray-800/30">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {score != null && <span className={`text-base font-bold ${getScoreColor(score)}`}>{score}</span>}
                      <span className="text-xs text-apple-gray-500">{date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {rec && <span className={`text-2xs font-medium px-2 py-0.5 rounded-full border ${rec.color}`}>{rec.label}</span>}
                    </div>
                    <span className="text-2xs text-apple-gray-400">{ev.scout_name}</span>
                  </div>
                  {ev.notes && <p className="text-sm text-apple-gray-600 dark:text-apple-gray-400 leading-relaxed">{ev.notes}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {comments.length === 0 && evaluations.length === 0 && !isAdding && (
        <div className="text-center py-10 text-apple-gray-400">
          <p className="text-sm">Sin notas ni evaluaciones</p>
        </div>
      )}
    </div>
  )
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────────

export default function PlantelLayout({
  player,
  normalized,
  allPlayers,
  evolution,
  gpsData,
  posKey,
  rawPosition,
  positionAverageScore,
  metricPercentiles,
  evaluations,
  playerJugadorSK,
  onExportPdf,
}: PlantelLayoutProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('general')

  const displayPosition = getDisplayPos(rawPosition || player['Posición específica'] || player['Posición'])
  const displayMetrics = DISPLAY_METRICS[posKey] ?? DISPLAY_METRICS['_default']

  const playerGpsData = useMemo(() => {
    const norm = normalizeName(player.Jugador)
    return gpsData.filter(e => {
      const en = normalizeName(e.Jugador)
      if (en === norm) return true
      const pp = norm.split(' '); const ep = en.split(' ')
      return pp[pp.length - 1] === ep[ep.length - 1] && pp[0]?.[0] === ep[0]?.[0]
    })
  }, [player.Jugador, gpsData])

  const contractColor = player.contractStatus === 'critical' ? 'text-orange-500'
    : player.contractStatus === 'warning' ? 'text-amber-500'
    : 'text-apple-gray-800 dark:text-white'

  const playerKey = `plantel|${normalizeName(player.Jugador)}|${normalizeName(player.Equipo)}`

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ── Top breadcrumb ── */}
      <nav className="flex items-center gap-2 text-sm text-apple-gray-500 dark:text-apple-gray-400 mb-5">
        <Link to="/plantel" className="hover:text-brand-green transition-colors">Plantel</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-apple-gray-800 dark:text-white font-medium">{player.Jugador}</span>
      </nav>

      {/* ── Player header banner ── */}
      <div className="card-apple overflow-hidden mb-5">
        <div className="relative">
          {/* Gradient banner */}
          <div className="h-24 bg-gradient-to-r from-[#8B1530]/20 via-[#6B1020]/10 to-transparent dark:from-[#8B1530]/15 dark:via-[#6B1020]/8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-8 opacity-15">
              <img src="/lanus-escudo.png" alt="" className="h-20 w-20 object-contain" />
            </div>
          </div>

          <div className="px-5 pb-5 -mt-10 flex items-end gap-4">
            {/* Avatar */}
            {player.Imagen ? (
              <div className="relative flex-shrink-0 w-20 h-20">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white to-apple-gray-100 dark:from-apple-gray-700 dark:to-apple-gray-800 border-3 border-white dark:border-apple-gray-800 shadow-lg" />
                <img src={player.Imagen} alt={player.Jugador} className="relative w-full h-full rounded-xl object-cover border-3 border-white dark:border-apple-gray-800" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-[#8B1530]/20 to-[#6B1020]/20 rounded-xl flex items-center justify-center border-3 border-white dark:border-apple-gray-800 shadow-lg">
                <span className="text-xl font-bold text-brand-green">
                  {player.Jugador.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
              </div>
            )}

            {/* Name + info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-apple-gray-800 dark:text-white tracking-tight truncate flex items-center gap-1.5">
                    {player.Jugador}
                    <ContractBadge
                      status={player.contractStatus}
                      monthsRemaining={player.monthsRemaining}
                    />
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="inline-flex px-2 py-0.5 bg-brand-green/10 rounded-md text-xs font-semibold text-brand-green">
                      {displayPosition}
                    </span>
                    {player.Equipo && (
                      <span className="text-xs text-apple-gray-500 dark:text-apple-gray-400">{player.Equipo}</span>
                    )}
                  </div>
                </div>
                <button onClick={onExportPdf} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-apple-gray-100 dark:bg-apple-gray-700 hover:bg-apple-gray-200 dark:hover:bg-apple-gray-600 text-apple-gray-600 dark:text-apple-gray-300 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </button>
              </div>
              {/* Quick stats strip */}
              <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">
                  <span className="font-semibold text-apple-gray-800 dark:text-white">{player.Edad}</span> años
                </span>
                {player.Altura && (
                  <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">
                    <span className="font-semibold text-apple-gray-800 dark:text-white">{player.Altura}</span> cm
                  </span>
                )}
                {player.Pie && (
                  <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">
                    {player.Pie.toLowerCase().includes('derecho') || player.Pie.toLowerCase() === 'right' ? 'Diestro'
                      : player.Pie.toLowerCase().includes('izquierdo') || player.Pie.toLowerCase() === 'left' ? 'Zurdo'
                      : player.Pie.toLowerCase() === 'ambos' ? 'Ambidiestro'
                      : player.Pie}
                  </span>
                )}
                {player.ggScore !== null && (
                  <span className="text-sm font-bold" style={{ color: getScoreHex(player.ggScore, player.ggScorePercentile) }}>
                    Score: {player.ggScore?.toFixed(1)}
                  </span>
                )}
                <span className={`text-sm font-medium ${contractColor}`}>
                  Contrato: {player['Vencimiento contrato']?.slice(-4) || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout: sidebar + content ── */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0">
          <div className="card-apple p-2 sticky top-4">
            <p className="text-2xs font-semibold text-apple-gray-400 dark:text-apple-gray-500 uppercase tracking-wider px-3 py-2">Secciones</p>
            <nav className="space-y-0.5">
              {SECTIONS.map(section => {
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                      isActive
                        ? 'bg-brand-green text-white shadow-sm'
                        : 'text-apple-gray-600 dark:text-apple-gray-400 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700/50 hover:text-apple-gray-800 dark:hover:text-white'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-apple-gray-400 dark:text-apple-gray-500'}>
                      {section.icon}
                    </span>
                    {section.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Right content area */}
        <div className="flex-1 min-w-0">
          <div className="card-apple p-6">

            {/* ══ GENERAL ══ */}
            {activeSection === 'general' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-apple-gray-100 dark:border-apple-gray-700/50">
                  <div className="w-2 h-6 bg-brand-green rounded-full" />
                  <h2 className="text-base font-bold text-apple-gray-800 dark:text-white">Resumen General</h2>
                </div>

                {/* Stats overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniStat label="Partidos" value={player['Partidos jugados']} />
                  <MiniStat label="Minutos"  value={player.minutesPlayed?.toLocaleString()} />
                  {posKey === 'Arquero' ? (
                    <>
                      <MiniStat label="Goles recibidos"    value={player['Goles recibidos']} />
                      <MiniStat label="GR/90"              value={player['Goles recibidos/90']} />
                      <MiniStat label="Paradas %"          value={player['Paradas, %']}     accent />
                      <MiniStat label="Goles evitados"     value={player['Goles evitados']} accent />
                      <MiniStat label="Valor"  value={player.marketValueFormatted} accent />
                      <MiniStat label="Score"  value={player.ggScore?.toFixed(1)}  accent />
                    </>
                  ) : (
                    <>
                      <MiniStat label="Goles"       value={player.Goles} />
                      <MiniStat label="Asistencias" value={player.Asistencias} />
                      <MiniStat label="xG"          value={player.xG} />
                      <MiniStat label="xA"          value={player.xA} />
                      <MiniStat label="Valor"  value={player.marketValueFormatted} accent />
                      <MiniStat label="Score"  value={player.ggScore?.toFixed(1)}  accent />
                    </>
                  )}
                </div>

                {/* GG Score + mini areas grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Score */}
                  <div className="bg-apple-gray-50/50 dark:bg-apple-gray-800/30 rounded-xl p-5 border border-apple-gray-100 dark:border-apple-gray-700/50">
                    <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-4 text-center">Scoring Datos</h3>
                    <GaugeScore score={player.ggScore} percentile={player.ggScorePercentile} size="md" comparisonScore={positionAverageScore} comparisonLabel={`Promedio ${posKey || 'posición'}`} />
                  </div>

                  {/* Area previews with real quick data */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {(() => {
                      // Métricas: find player's highest-percentile metric and show quality
                      const topMetric = posKey ? (() => {
                        const entries = Object.entries(metricPercentiles)
                        if (entries.length === 0) return null
                        const best = entries.sort((a, b) => b[1] - a[1])[0]
                        if (!best) return null
                        const [metric, pct] = best
                        const quality = pct >= 80 ? 'Elite' : pct >= 60 ? 'Bueno' : pct >= 40 ? 'Promedio' : 'Bajo'
                        const short = metric.length > 16 ? metric.slice(0, 15) + '…' : metric
                        return `${quality} en ${short} (top ${100 - Math.round(pct)}%)`
                      })() : null

                      // GPS: last game distance
                      const lastGps = playerGpsData.length > 0 ? playerGpsData[playerGpsData.length - 1] : null
                      const gpsSnippet = lastGps
                        ? `Dist: ${(lastGps.Distancia / 1000).toFixed(1)}km`
                        : null

                      const areas: { label: string; id: SectionId; value: string; ok: boolean }[] = [
                        {
                          label: 'Métricas',
                          id: 'metricas',
                          value: topMetric ?? (posKey ? 'Ver radar' : 'Sin posición'),
                          ok: !!posKey,
                        },
                        {
                          label: 'Físico / GPS',
                          id: 'fisico',
                          value: gpsSnippet ?? (playerGpsData.length > 0 ? `${playerGpsData.length} partidos` : 'Sin datos'),
                          ok: playerGpsData.length > 0,
                        },
                        {
                          label: 'Salud',
                          id: 'salud',
                          value: 'Sin lesiones registradas',
                          ok: false,
                        },
                        {
                          label: 'Coach',
                          id: 'coach',
                          value: evaluations.length > 0 ? `${evaluations.length} evaluaciones` : '→ Agregar nota',
                          ok: evaluations.length > 0,
                        },
                        { label: 'Nutrición',    id: 'nutricion',    value: 'Sin datos', ok: false },
                        { label: 'Psicología',   id: 'psicologia',   value: 'Sin datos', ok: false },
                      ]

                      return areas.map(area => (
                        <button
                          key={area.id}
                          onClick={() => setActiveSection(area.id)}
                          className="text-left p-3 bg-apple-gray-50 dark:bg-apple-gray-800/50 rounded-xl border border-apple-gray-100 dark:border-apple-gray-700/50 hover:border-brand-green/30 hover:bg-brand-green/5 transition-all group"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-2xs text-apple-gray-400 uppercase tracking-wider">{area.label}</p>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${area.ok ? 'bg-brand-green' : 'bg-apple-gray-300 dark:bg-apple-gray-600'}`} />
                          </div>
                          <p className={`text-xs font-medium group-hover:text-brand-green transition-colors leading-tight ${area.ok ? 'text-apple-gray-700 dark:text-apple-gray-300' : 'text-apple-gray-400'}`}>
                            {area.value}
                          </p>
                        </button>
                      ))
                    })()}
                  </div>
                </div>

                {/* Football pitch with position zone */}
                {posKey && (
                  <div>
                    <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-3">Posición en el campo</h3>
                    <FootballPitch posKey={posKey} rawPosition={rawPosition} positionLabel={displayPosition} />
                  </div>
                )}

                {/* Personal info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-3">Información Personal</h3>
                    <div className="bg-apple-gray-50/50 dark:bg-apple-gray-800/30 rounded-xl divide-y divide-apple-gray-100 dark:divide-apple-gray-700/50">
                      {[
                        ['Edad', player.Edad ? `${player.Edad} años` : null],
                        ['Nacionalidad', player['País de nacimiento']],
                        ['Altura', player.Altura ? `${player.Altura} cm` : null],
                        ['Posición específica', getDisplayPos(player['Posición específica'])],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={String(k)} className="flex justify-between px-4 py-2.5">
                          <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{k}</span>
                          <span className="text-sm font-medium text-apple-gray-800 dark:text-white">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-3">Contrato & Valor</h3>
                    <div className="bg-apple-gray-50/50 dark:bg-apple-gray-800/30 rounded-xl divide-y divide-apple-gray-100 dark:divide-apple-gray-700/50">
                      {[
                        ['Vencimiento', player['Vencimiento contrato'] || null],
                        ['Valor mercado', player.marketValueFormatted || null],
                        ['Representante', player.Representante || null],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={String(k)} className="flex justify-between px-4 py-2.5">
                          <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{k}</span>
                          <span className={`text-sm font-medium ${k === 'Vencimiento' ? contractColor : 'text-apple-gray-800 dark:text-white'}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ MÉTRICAS ══ */}
            {activeSection === 'metricas' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-apple-gray-100 dark:border-apple-gray-700/50">
                  <div className="w-2 h-6 bg-brand-green rounded-full" />
                  <div>
                    <h2 className="text-base font-bold text-apple-gray-800 dark:text-white">Métricas</h2>
                    <p className="text-xs text-apple-gray-400 mt-0.5">Radar por posición + métricas comparadas</p>
                  </div>
                </div>

                {!posKey ? (
                  <div className="text-center py-10 text-apple-gray-400">
                    <p className="text-sm">Posición no reconocida para generar métricas.</p>
                  </div>
                ) : posKey === 'Arquero' ? (
                  /* ── Arquero: panel de métricas sin radar (no hay normalizados) ── */
                  <div className="space-y-4">
                    <p className="text-xs text-apple-gray-400 uppercase tracking-wider">Métricas de arquero</p>
                    {[
                      { label: 'Paradas %',                   key: 'Paradas, %',                      max: 100,  good: 75 },
                      { label: 'Goles evitados/90',           key: 'Goles evitados/90',               max: 0.5,  good: 0 },
                      { label: 'xG en contra/90',             key: 'xG en contra/90',                 max: 2,    good: null },
                      { label: 'Goles recibidos/90',          key: 'Goles recibidos/90',              max: 2,    good: null },
                      { label: 'Porterías imbatidas/90',      key: 'Porterías imbatidas en los 90',   max: 0.5,  good: 0.25 },
                      { label: 'Salidas/90',                  key: 'Salidas/90',                      max: 4,    good: 1.5 },
                      { label: 'Duelos aéreos/90',            key: 'Duelos aéreos en los 90',         max: 3,    good: 1 },
                      { label: 'Remates en contra/90',        key: 'Remates en contra/90',            max: 6,    good: null },
                    ].map(({ label, key, max }) => {
                      const raw = player[key]
                      const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(',', '.'))
                      if (isNaN(num)) return (
                        <div key={key} className="flex justify-between items-center py-2.5 border-b border-apple-gray-200 dark:border-apple-gray-800/50">
                          <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{label}</span>
                          <span className="text-sm text-apple-gray-400">—</span>
                        </div>
                      )
                      const pct = Math.min(100, Math.max(0, (num / max) * 100))
                      return (
                        <div key={key} className="py-2.5 border-b border-apple-gray-200 dark:border-apple-gray-800/50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{label}</span>
                            <span className="text-sm font-bold text-apple-gray-800 dark:text-white tabular-nums">{num.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-green rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <>
                    {/* Radar chart — solo para posiciones de campo */}
                    <PlayerRadarChart
                      player={player}
                      allNormalized={normalized}
                      allPlayers={allPlayers}
                      comparisonLeague="all"
                      overridePosition={rawPosition}
                    />

                    {/* Metrics list below radar */}
                    <div>
                      <h3 className="text-xs font-semibold text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider mb-4">
                        Métricas por posición — {posKey}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        {displayMetrics.map(metric => {
                          if (metric === 'Partidos jugados' || metric === 'Minutos jugados') {
                            const val = player[metric]
                            const num = typeof val === 'number' ? val : parseFloat(String(val ?? '').replace(',', '.'))
                            return (
                              <div key={metric} className="flex justify-between py-2.5 border-b border-apple-gray-200 dark:border-apple-gray-800/50">
                                <span className="text-sm text-apple-gray-500 dark:text-apple-gray-400">{metric}</span>
                                <span className="text-sm font-semibold text-apple-gray-800 dark:text-white tabular-nums">{isNaN(num) ? '—' : num.toFixed(0)}</span>
                              </div>
                            )
                          }
                          return (
                            <MetricRowWithPercentile key={metric} label={metric} value={player[metric]} percentile={metricPercentiles[metric]} />
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ FÍSICO ══ */}
            {activeSection === 'fisico' && (
              <div className="animate-fade-in space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-apple-gray-100 dark:border-apple-gray-700/50">
                  <div className="w-2 h-6 bg-brand-green rounded-full" />
                  <div>
                    <h2 className="text-base font-bold text-apple-gray-800 dark:text-white">Físico</h2>
                    <p className="text-xs text-apple-gray-400 mt-0.5">Datos GPS y carga física por partido</p>
                  </div>
                </div>
                <GPSTab gpsEntries={playerGpsData} playerName={player.Jugador} />
              </div>
            )}

            {/* ══ NUTRICIÓN ══ */}
            {activeSection === 'nutricion' && (
              <PlaceholderSection
                title="Nutrición"
                description="Control nutricional y composición corporal"
                fields={['Peso actual', 'Masa muscular', 'Masa grasa', '% Hidratación', 'Calorías diarias', 'Plan nutricional', 'Suplementación', 'Última evaluación']}
              />
            )}

            {/* ══ SALUD ══ */}
            {activeSection === 'salud' && <SaludSection />}

            {/* ══ PSICOLOGÍA ══ */}
            {activeSection === 'psicologia' && (
              <PlaceholderSection
                title="Psicología"
                description="Evaluación psicológica y bienestar mental"
                fields={['Nivel de estrés', 'Motivación', 'Concentración', 'Manejo presión', 'Trabajo en equipo', 'Liderazgo', 'Confianza', 'Última sesión']}
              />
            )}

            {/* ══ NEUROCIENCIA ══ */}
            {activeSection === 'neurociencia' && (
              <PlaceholderSection
                title="Neurociencia"
                description="Evaluación cognitiva y velocidad de procesamiento"
                fields={['Tiempo reacción', 'Velocidad cognitiva', 'Atención sostenida', 'Memoria de trabajo', 'Toma de decisiones', 'Visión periférica', 'Coordinación ojo-pie', 'Última evaluación']}
              />
            )}

            {/* ══ COACH ══ */}
            {activeSection === 'coach' && (
              <CoachSection playerKey={playerKey} evaluations={evaluations} />
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
