import { useState, useCallback, useRef, useMemo } from 'react'
import { useData } from '@/context/DataContext'
import type { EnrichedPlayer } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'primera' | 'clave' | 'desarrollar' | 'talento'
type TeamCategory = 'primera_div' | 'reserva' | '4ta' | '5ta' | '6ta' | '7ma' | '8va' | '9na' | 'pre9na'

// Contract status — only for primera_div players
type ContractStatus = 'baja' | 'prestamo' | 'renovacion' | 'continua' | 'refuerzo' | 'venta' | 'promesa'
// Double classification: primer_contrato applies to primera_div + inferiores; renovacion_contrato only to primera_div
type ContractType = 'primer_contrato' | 'renovacion_contrato' | null

interface InfPlayer {
  id: string
  name: string
  category: Category
  birthDate?: string
  categoryYear?: string
  notes?: string
  // Extended fields for primera_div
  contractStatus?: ContractStatus
  contractType?: ContractType
  // Plantel link (primera_div)
  plantelKey?: string
  plantelImagen?: string
}

type FormationKey = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2'

interface SavedFormation {
  id: string
  name: string
  formation: FormationKey
  positions: Record<string, InfPlayer[]>
  createdAt: string
}

type TeamState = { formation: FormationKey; positions: Record<string, InfPlayer[]> }
type AllTeamStates = Record<TeamCategory, TeamState>

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_CATEGORIES: { key: TeamCategory; label: string; isPrimera?: boolean; hasContractType?: boolean }[] = [
  { key: 'primera_div', label: 'Primera',  isPrimera: true, hasContractType: true },
  { key: 'reserva',     label: 'Reserva',  hasContractType: true },
  { key: '4ta',         label: '4ta',      hasContractType: true },
  { key: '5ta',         label: '5ta',      hasContractType: true },
  { key: '6ta',         label: '6ta',      hasContractType: true },
  { key: '7ma',         label: '7ma',      hasContractType: true },
  { key: '8va',         label: '8va'       },
  { key: '9na',         label: '9na'       },
  { key: 'pre9na',      label: 'Pre 9na'   },
]

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; bg: string; dot: string }> = {
  primera:    { label: 'Primera opción',        color: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-100 dark:bg-blue-900/40',    dot: 'bg-blue-500'   },
  clave:      { label: 'Jugador clave',          color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40', dot: 'bg-orange-500' },
  desarrollar:{ label: 'Jugador a desarrollar', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40',  dot: 'bg-yellow-400' },
  talento:    { label: 'Joven talento',         color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', dot: 'bg-purple-500' },
}

// Contract status config — used only for primera_div players
const CONTRACT_STATUS_CONFIG: Record<ContractStatus, { label: string; dot: string; textColor: string }> = {
  baja:       { label: 'Baja',             dot: '#ef4444', textColor: 'text-red-500'    },
  prestamo:   { label: 'Sale a préstamo',  dot: '#eab308', textColor: 'text-yellow-500' },
  renovacion: { label: 'Renovación',       dot: '#6f1929', textColor: 'text-rose-800 dark:text-rose-300' },
  continua:   { label: 'Continúa',         dot: '#3b82f6', textColor: 'text-blue-500'   },
  refuerzo:   { label: 'Posible refuerzo', dot: '#06b6d4', textColor: 'text-cyan-500'   },
  venta:      { label: 'Posible venta',    dot: '#e5e7eb', textColor: 'text-gray-400'   },
  promesa:    { label: 'Promesa',          dot: '#ec4899', textColor: 'text-pink-500'   },
}

const FORMATIONS: Record<FormationKey, { label: string; positions: { key: string; label: string; x: number; y: number }[] }> = {
  '4-3-3': {
    label: '4-3-3',
    positions: [
      { key: 'GK',  label: 'POR', x: 50, y: 89 },
      { key: 'LB',  label: 'LI',  x: 13, y: 72 },
      { key: 'CB1', label: 'DFC', x: 35, y: 74 },
      { key: 'CB2', label: 'DFC', x: 65, y: 74 },
      { key: 'RB',  label: 'LD',  x: 87, y: 72 },
      { key: 'CM1', label: 'MC',  x: 28, y: 50 },
      { key: 'CM2', label: 'MC',  x: 50, y: 54 },
      { key: 'CM3', label: 'MC',  x: 72, y: 50 },
      { key: 'LW',  label: 'EI',  x: 16, y: 24 },
      { key: 'ST',  label: 'DC',  x: 50, y: 18 },
      { key: 'RW',  label: 'ED',  x: 84, y: 24 },
    ],
  },
  '4-4-2': {
    label: '4-4-2',
    positions: [
      { key: 'GK',  label: 'POR', x: 50, y: 89 },
      { key: 'LB',  label: 'LI',  x: 13, y: 72 },
      { key: 'CB1', label: 'DFC', x: 35, y: 74 },
      { key: 'CB2', label: 'DFC', x: 65, y: 74 },
      { key: 'RB',  label: 'LD',  x: 87, y: 72 },
      { key: 'LM',  label: 'MI',  x: 13, y: 48 },
      { key: 'CM1', label: 'MC',  x: 37, y: 51 },
      { key: 'CM2', label: 'MC',  x: 63, y: 51 },
      { key: 'RM',  label: 'MD',  x: 87, y: 48 },
      { key: 'ST1', label: 'DC',  x: 36, y: 21 },
      { key: 'ST2', label: 'DC',  x: 64, y: 21 },
    ],
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    positions: [
      { key: 'GK',  label: 'POR', x: 50, y: 89 },
      { key: 'LB',  label: 'LI',  x: 13, y: 72 },
      { key: 'CB1', label: 'DFC', x: 35, y: 74 },
      { key: 'CB2', label: 'DFC', x: 65, y: 74 },
      { key: 'RB',  label: 'LD',  x: 87, y: 72 },
      { key: 'DM1', label: 'MCD', x: 36, y: 57 },
      { key: 'DM2', label: 'MCD', x: 64, y: 57 },
      { key: 'LW',  label: 'MCO', x: 18, y: 37 },
      { key: 'AM',  label: 'MCO', x: 50, y: 34 },
      { key: 'RW',  label: 'MCO', x: 82, y: 37 },
      { key: 'ST',  label: 'DC',  x: 50, y: 18 },
    ],
  },
  '3-5-2': {
    label: '3-5-2',
    positions: [
      { key: 'GK',  label: 'POR', x: 50, y: 89 },
      { key: 'CB1', label: 'DFC', x: 25, y: 74 },
      { key: 'CB2', label: 'DFC', x: 50, y: 76 },
      { key: 'CB3', label: 'DFC', x: 75, y: 74 },
      { key: 'LWB', label: 'CI',  x: 10, y: 53 },
      { key: 'CM1', label: 'MC',  x: 32, y: 50 },
      { key: 'CM2', label: 'MC',  x: 50, y: 54 },
      { key: 'CM3', label: 'MC',  x: 68, y: 50 },
      { key: 'RWB', label: 'CD',  x: 90, y: 53 },
      { key: 'ST1', label: 'DC',  x: 36, y: 21 },
      { key: 'ST2', label: 'DC',  x: 64, y: 21 },
    ],
  },
  '5-3-2': {
    label: '5-3-2',
    positions: [
      { key: 'GK',  label: 'POR', x: 50, y: 89 },
      { key: 'LB',  label: 'CI',  x: 10, y: 70 },
      { key: 'CB1', label: 'DFC', x: 28, y: 74 },
      { key: 'CB2', label: 'DFC', x: 50, y: 76 },
      { key: 'CB3', label: 'DFC', x: 72, y: 74 },
      { key: 'RB',  label: 'CD',  x: 90, y: 70 },
      { key: 'CM1', label: 'MC',  x: 28, y: 49 },
      { key: 'CM2', label: 'MC',  x: 50, y: 52 },
      { key: 'CM3', label: 'MC',  x: 72, y: 49 },
      { key: 'ST1', label: 'DC',  x: 36, y: 21 },
      { key: 'ST2', label: 'DC',  x: 64, y: 21 },
    ],
  },
}

const MAX_PER_POSITION = 4

function uid() { return Math.random().toString(36).slice(2, 9) }

function defaultAllStates(): AllTeamStates {
  return Object.fromEntries(
    TEAM_CATEGORIES.map(c => [c.key, { formation: '4-3-3' as FormationKey, positions: {} as Record<string, InfPlayer[]> }])
  ) as AllTeamStates
}

function loadAllStates(): AllTeamStates {
  const defaults = defaultAllStates()
  try {
    const saved = localStorage.getItem('inf_all_states')
    if (saved) return { ...defaults, ...JSON.parse(saved) }
  } catch { /* */ }
  return defaults
}

function persistAllStates(states: AllTeamStates) {
  localStorage.setItem('inf_all_states', JSON.stringify(states))
}

function loadSaved(): SavedFormation[] {
  try { return JSON.parse(localStorage.getItem('inf_formations') ?? '[]') }
  catch { return [] }
}

function saveToDisk(formations: SavedFormation[]) {
  localStorage.setItem('inf_formations', JSON.stringify(formations))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerChip({
  player,
  onRemove,
  plantelPlayers,
  onLink,
}: {
  player: InfPlayer
  onRemove: () => void
  plantelPlayers?: EnrichedPlayer[]
  onLink?: (plantelKey: string, plantelImagen: string) => void
}) {
  const cfg = CATEGORY_CONFIG[player.category]
  const displayYear = player.categoryYear ?? (player.birthDate ? player.birthDate.slice(0, 4) : null)
  const statusCfg = player.contractStatus ? CONTRACT_STATUS_CONFIG[player.contractStatus] : null
  const [showLinkSearch, setShowLinkSearch] = useState(false)
  const [linkQuery, setLinkQuery] = useState('')

  const linkSuggestions = useMemo(() => {
    if (!plantelPlayers || !linkQuery.trim()) return []
    const q = linkQuery.toLowerCase()
    return plantelPlayers.filter(p =>
      p.Jugador.toLowerCase().includes(q) ||
      (p['Nombre Completo'] || '').toLowerCase().includes(q)
    ).slice(0, 5)
  }, [linkQuery, plantelPlayers])

  return (
    <div className={`relative flex flex-col gap-0.5 px-2 py-1 rounded-lg text-xs ${cfg.bg} ${cfg.color} group`}>
      <div className="flex items-center gap-1.5">
        {/* Avatar or status dot */}
        {player.plantelImagen ? (
          <img src={player.plantelImagen} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0 border border-white/30" />
        ) : statusCfg ? (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusCfg.dot }} />
        ) : (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
        )}
        {/* Status dot alongside photo */}
        {player.plantelImagen && statusCfg && (
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 -ml-1" style={{ background: statusCfg.dot }} />
        )}
        <span className="font-medium truncate max-w-[80px]">{player.name}</span>
        {displayYear && <span className="opacity-60 text-[10px]">{displayYear}</span>}
        {/* Link button — shown on hover for unlinked primera players */}
        {plantelPlayers && !player.plantelKey && onLink && (
          <button
            onClick={e => { e.stopPropagation(); setShowLinkSearch(v => !v); setLinkQuery('') }}
            className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-current leading-none"
            title="Vincular con plantel"
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 9.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h.098A2 2 0 0 1 9 8.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg>
          </button>
        )}
        {/* Linked indicator */}
        {player.plantelKey && (
          <span className="opacity-40 leading-none" title={`Vinculado: ${player.plantelKey}`}>
            <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-current"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 9.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h.098A2 2 0 0 1 9 8.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg>
          </span>
        )}
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-0 group-hover:opacity-70 hover:opacity-100 text-current leading-none"
          title="Quitar"
        >×</button>
      </div>
      {/* Contract type badge (subtle) */}
      {player.contractType && (
        <span className="text-[9px] font-semibold opacity-70 pl-3.5 leading-none">
          {player.contractType === 'primer_contrato' ? '● Primer contrato' : '● Renovación ctto.'}
        </span>
      )}
      {/* Inline link search dropdown */}
      {showLinkSearch && plantelPlayers && onLink && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-apple-gray-900 rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 shadow-xl w-56 p-2"
          onClick={e => e.stopPropagation()}
        >
          <input
            autoFocus
            value={linkQuery}
            onChange={e => setLinkQuery(e.target.value)}
            placeholder="Buscar en plantel..."
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-apple-gray-200 dark:border-apple-gray-700 bg-apple-gray-50 dark:bg-apple-gray-800 text-apple-gray-900 dark:text-white focus:outline-none mb-1"
          />
          {linkQuery && linkSuggestions.length === 0 && (
            <p className="text-[10px] text-apple-gray-400 px-1 py-1">Sin resultados</p>
          )}
          {!linkQuery && (
            <p className="text-[10px] text-apple-gray-400 px-1 py-1">Escribí el apellido del jugador</p>
          )}
          {linkSuggestions.map(p => (
            <button
              key={p.Jugador}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onLink(p.Jugador, p.Imagen || ''); setShowLinkSearch(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800 text-left transition-colors"
            >
              {p.Imagen
                ? <img src={p.Imagen} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                : <span className="w-6 h-6 rounded-full bg-apple-gray-200 dark:bg-apple-gray-700 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-apple-gray-900 dark:text-white truncate">{p.Jugador}</p>
                <p className="text-[9px] text-apple-gray-400">{p['Posición específica'] || p['Posición']}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface AddPlayerModalProps {
  positionKey: string
  positionLabel: string
  teamCategory: TeamCategory
  plantelPlayers?: EnrichedPlayer[]
  onAdd: (player: Omit<InfPlayer, 'id'>) => void
  onClose: () => void
}

function AddPlayerModal({ positionKey, positionLabel, teamCategory, plantelPlayers, onAdd, onClose }: AddPlayerModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('primera')
  const [birthDate, setBirthDate] = useState('')
  const [categoryYear, setCategoryYear] = useState('')
  const [notes, setNotes] = useState('')
  const [contractStatus, setContractStatus] = useState<ContractStatus | undefined>(undefined)
  const [contractType, setContractType] = useState<ContractType>(null)
  const [linkedPlantel, setLinkedPlantel] = useState<EnrichedPlayer | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const isPrimera  = teamCategory === 'primera_div'
  const isReserva  = teamCategory === 'reserva'
  const hasContractStatus = isPrimera || isReserva
  const hasBothContractTypes = isPrimera || isReserva
  const hasContractType = TEAM_CATEGORIES.find(t => t.key === teamCategory)?.hasContractType ?? false

  const suggestions = useMemo(() => {
    if (!plantelPlayers || !isPrimera || !name.trim() || linkedPlantel) return []
    const q = name.toLowerCase().trim()
    return plantelPlayers.filter(p =>
      p.Jugador.toLowerCase().includes(q) ||
      (p['Nombre Completo'] || '').toLowerCase().includes(q)
    ).slice(0, 6)
  }, [name, plantelPlayers, isPrimera, linkedPlantel])

  function handleAdd() {
    if (!name.trim()) return
    onAdd({
      name: name.trim(),
      category,
      birthDate: birthDate || undefined,
      categoryYear: categoryYear.trim() || undefined,
      notes: notes.trim() || undefined,
      contractStatus: hasContractStatus ? contractStatus : undefined,
      contractType: hasContractType ? contractType : null,
      plantelKey: linkedPlantel?.Jugador,
      plantelImagen: linkedPlantel?.Imagen || undefined,
    })
    onClose()
  }

  function selectPlantelPlayer(p: EnrichedPlayer) {
    setLinkedPlantel(p)
    setName(p.Jugador)
    setShowSuggestions(false)
    // Auto-fill contract status from plantel data
    if (!contractStatus && p.contractStatus === 'critical') setContractStatus('baja')
  }

  const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 bg-apple-gray-50 dark:bg-apple-gray-800 text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-apple-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-apple-gray-900 dark:text-white mb-1">Agregar jugador</h3>
        <p className="text-xs text-apple-gray-400 mb-4">Posición: <span className="font-semibold">{positionLabel} ({positionKey})</span></p>

        <div className="space-y-3">
          {/* Nombre + Plantel autocomplete */}
          <div>
            <label className="text-xs font-medium text-apple-gray-500 mb-1 block">
              Nombre *
              {isPrimera && plantelPlayers && (
                <span className="ml-1.5 text-[10px] text-apple-gray-400 font-normal">· sugerencias del plantel al escribir</span>
              )}
            </label>

            {/* Linked player card */}
            {linkedPlantel ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                {linkedPlantel.Imagen
                  ? <img src={linkedPlantel.Imagen} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/40 shadow" />
                  : <span className="w-9 h-9 rounded-full bg-emerald-200 dark:bg-emerald-800 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-apple-gray-900 dark:text-white truncate">{linkedPlantel.Jugador}</p>
                  <p className="text-[10px] text-apple-gray-400">{linkedPlantel['Posición específica'] || linkedPlantel['Posición']}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full">PLANTEL</span>
                  <button onClick={() => { setLinkedPlantel(null); setName('') }} className="text-[10px] text-apple-gray-400 hover:text-red-500 transition-colors">cambiar</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  autoFocus
                  value={name}
                  onChange={e => { setName(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                  placeholder="Apellido, Nombre"
                  className={inputCls}
                />
                {isPrimera && plantelPlayers && !showSuggestions && name.trim() && !linkedPlantel && (
                  <p className="text-[10px] text-apple-gray-400 mt-1">
                    Sin vínculo al plantel — podés vincular después desde el chip.
                  </p>
                )}
                {/* Autocomplete dropdown */}
                {isPrimera && plantelPlayers && showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-white dark:bg-apple-gray-900 rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 shadow-xl overflow-hidden">
                    {suggestions.map(p => (
                      <button
                        key={p.Jugador}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectPlantelPlayer(p)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800 text-left transition-colors border-b border-apple-gray-100 dark:border-apple-gray-800 last:border-0"
                      >
                        {p.Imagen
                          ? <img src={p.Imagen} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          : <span className="w-7 h-7 rounded-full bg-apple-gray-200 dark:bg-apple-gray-700 flex-shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-apple-gray-900 dark:text-white">{p.Jugador}</p>
                          <p className="text-[10px] text-apple-gray-400">{p['Posición específica'] || p['Posición']}</p>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 opacity-70">PLANTEL</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rol en el equipo */}
          <div>
            <label className="text-xs font-medium text-apple-gray-500 mb-2 block">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][])
              .filter(([key]) => !isPrimera || key === 'primera' || key === 'clave')
              .map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-colors ${
                    category === key ? `border-current ${cfg.color} ${cfg.bg}` : 'border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500 dark:text-apple-gray-400'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estado contractual — Primera División y Reserva */}
          {hasContractStatus && (
            <div>
              <label className="text-xs font-medium text-apple-gray-500 mb-2 block">Estado</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(CONTRACT_STATUS_CONFIG) as [ContractStatus, typeof CONTRACT_STATUS_CONFIG[ContractStatus]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setContractStatus(contractStatus === key ? undefined : key)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      contractStatus === key
                        ? 'border-white/20 bg-apple-gray-100 dark:bg-apple-gray-700 ' + cfg.textColor
                        : 'border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500 dark:text-apple-gray-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clasificación de contrato — Primera (ambas) + Inferiores (solo primer contrato) */}
          {hasContractType && (
            <div>
              <label className="text-xs font-medium text-apple-gray-500 mb-2 block">
                Clasificación de contrato
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setContractType(contractType === 'primer_contrato' ? null : 'primer_contrato')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    contractType === 'primer_contrato'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500 dark:text-apple-gray-400'
                  }`}
                >
                  Primer contrato
                </button>
                {hasBothContractTypes && (
                  <button
                    onClick={() => setContractType(contractType === 'renovacion_contrato' ? null : 'renovacion_contrato')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      contractType === 'renovacion_contrato'
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500 dark:text-apple-gray-400'
                    }`}
                  >
                    Renovación ctto.
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fecha nacimiento + Categoría año */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-apple-gray-500 mb-1 block">Fecha de nacimiento</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => {
                  setBirthDate(e.target.value)
                  if (e.target.value) setCategoryYear(e.target.value.slice(0, 4))
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-apple-gray-500 mb-1 block">Categoría (año)</label>
              <input
                value={categoryYear}
                onChange={e => setCategoryYear(e.target.value)}
                placeholder="ej. 2007"
                maxLength={4}
                className={inputCls}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-apple-gray-500 mb-1 block">Notas</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Opcional"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500 dark:text-apple-gray-400 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SquadRosterList ─────────────────────────────────────────────────────────
// Lista del plantel completa — muestra todos los jugadores del equipo activo

function SquadRosterList({
  allStates,
  activeTeam,
  onSetActiveTeam,
  currentPositions,
  onRemove,
}: {
  allStates: AllTeamStates
  activeTeam: TeamCategory
  onSetActiveTeam: (t: TeamCategory) => void
  currentPositions: { key: string; label: string; x: number; y: number }[]
  onRemove: (posKey: string, playerId: string) => void
}) {
  // Build flat list of players for the active team, ordered by position
  const positions = allStates[activeTeam].positions
  const allPlayers = currentPositions.flatMap(pos =>
    (positions[pos.key] ?? []).map(p => ({ ...p, posKey: pos.key, posLabel: pos.label }))
  )

  // Total across all teams for the header tabs
  function teamCount(tk: TeamCategory) {
    return Object.values(allStates[tk].positions).flat().length
  }

  if (TEAM_CATEGORIES.every(tc => teamCount(tc.key) === 0)) return null

  return (
    <div className="mt-6 bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-200 dark:border-apple-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-apple-gray-200 dark:border-apple-gray-800 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-bold text-apple-gray-800 dark:text-white">Lista de plantel</p>
          <p className="text-[10px] text-apple-gray-500 mt-0.5">
            {allPlayers.length} jugador{allPlayers.length !== 1 ? 'es' : ''} · {TEAM_CATEGORIES.find(t => t.key === activeTeam)?.label}
          </p>
        </div>
        {/* Category tabs */}
        <div className="flex gap-1 flex-wrap">
          {TEAM_CATEGORIES.filter(tc => teamCount(tc.key) > 0).map(tc => (
            <button
              key={tc.key}
              onClick={() => onSetActiveTeam(tc.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTeam === tc.key
                  ? 'bg-brand-green/15 text-brand-green border border-brand-green/40'
                  : 'text-apple-gray-500 border border-transparent hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800'
              }`}
            >
              {tc.label} <span className="opacity-60">({teamCount(tc.key)})</span>
            </button>
          ))}
        </div>
      </div>

      {allPlayers.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-apple-gray-400">
          Agregá jugadores al plantel desde el campo arriba
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-apple-gray-100 dark:border-apple-gray-800">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-apple-gray-400 uppercase tracking-wider w-8">#</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-apple-gray-400 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-apple-gray-400 uppercase tracking-wider">Posición</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-apple-gray-400 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-apple-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-apple-gray-400 uppercase tracking-wider">Contrato</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-apple-gray-400 uppercase tracking-wider">Cat.</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-apple-gray-400 uppercase tracking-wider">Notas</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-gray-100 dark:divide-apple-gray-800">
              {allPlayers.map((p, i) => {
                const catCfg = CATEGORY_CONFIG[p.category]
                const contractCfg = p.contractStatus ? CONTRACT_STATUS_CONFIG[p.contractStatus] : null
                return (
                  <tr key={p.id} className="hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-apple-gray-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {p.plantelImagen && (
                          <img src={p.plantelImagen} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-apple-gray-900 dark:text-white">{p.name}</p>
                          {p.birthDate && (
                            <p className="text-[10px] text-apple-gray-400">{p.birthDate}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-apple-gray-700 dark:text-apple-gray-300">
                        <span className="text-[9px] font-bold text-apple-gray-400 bg-apple-gray-100 dark:bg-apple-gray-800 px-1.5 py-0.5 rounded">{p.posLabel}</span>
                        <span className="text-[10px] text-apple-gray-400">{p.posKey}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${catCfg.color} ${catCfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${catCfg.dot}`} />
                        {catCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {contractCfg ? (
                        <span className={`text-xs font-medium ${contractCfg.textColor} flex items-center gap-1`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: contractCfg.dot }} />
                          {contractCfg.label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-apple-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.contractType ? (
                        <span className={`text-[10px] font-medium ${p.contractType === 'primer_contrato' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          {p.contractType === 'primer_contrato' ? 'Primer ctto.' : 'Renovación'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-apple-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-apple-gray-500">
                      {p.categoryYear || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-apple-gray-500 max-w-[160px] truncate">
                      {p.notes || ''}
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        onClick={() => onRemove(p.posKey, p.id)}
                        className="text-apple-gray-300 hover:text-red-500 transition-colors text-base leading-none px-1"
                        title="Quitar jugador"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArmadoEquiposPage() {
  const { plantelPrimera } = useData()
  const [activeTeam, setActiveTeam] = useState<TeamCategory>('primera_div')
  const [hoveredPos, setHoveredPos] = useState<string | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [allStates, setAllStates] = useState<AllTeamStates>(loadAllStates)
  const [modal, setModal] = useState<{ key: string; label: string } | null>(null)
  const [savedFormations, setSavedFormations] = useState<SavedFormation[]>(loadSaved)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [activeTab, setActiveTab] = useState<'editor' | 'saved'>('editor')

  // Derived from active team state
  const formation = allStates[activeTeam].formation
  const positions = allStates[activeTeam].positions
  const currentPositions = FORMATIONS[formation].positions

  function setFormation(f: FormationKey) {
    setAllStates(prev => {
      const next = { ...prev, [activeTeam]: { ...prev[activeTeam], formation: f } }
      persistAllStates(next)
      return next
    })
  }

  const addPlayer = useCallback((posKey: string, player: Omit<InfPlayer, 'id'>) => {
    setAllStates(prev => {
      const state = prev[activeTeam]
      const existing = state.positions[posKey] ?? []
      if (existing.length >= MAX_PER_POSITION) return prev
      const next = {
        ...prev,
        [activeTeam]: {
          ...state,
          positions: { ...state.positions, [posKey]: [...existing, { ...player, id: uid() }] },
        },
      }
      persistAllStates(next)
      return next
    })
  }, [activeTeam])

  const removePlayer = useCallback((posKey: string, playerId: string) => {
    setAllStates(prev => {
      const state = prev[activeTeam]
      const next = {
        ...prev,
        [activeTeam]: {
          ...state,
          positions: {
            ...state.positions,
            [posKey]: (state.positions[posKey] ?? []).filter(p => p.id !== playerId),
          },
        },
      }
      persistAllStates(next)
      return next
    })
  }, [activeTeam])

  const linkPlayer = useCallback((posKey: string, playerId: string, plantelKey: string, plantelImagen: string) => {
    setAllStates(prev => {
      const state = prev[activeTeam]
      const next = {
        ...prev,
        [activeTeam]: {
          ...state,
          positions: {
            ...state.positions,
            [posKey]: (state.positions[posKey] ?? []).map(p =>
              p.id === playerId ? { ...p, plantelKey, plantelImagen } : p
            ),
          },
        },
      }
      persistAllStates(next)
      return next
    })
  }, [activeTeam])

  function clearPositions() {
    setAllStates(prev => {
      const next = { ...prev, [activeTeam]: { ...prev[activeTeam], positions: {} } }
      persistAllStates(next)
      return next
    })
  }

  function handleSave() {
    if (!saveName.trim()) return
    const f: SavedFormation = {
      id: uid(),
      name: saveName.trim(),
      formation,
      positions,
      createdAt: new Date().toISOString(),
    }
    const next = [...savedFormations, f]
    setSavedFormations(next)
    saveToDisk(next)
    setSaveModalOpen(false)
    setSaveName('')
  }

  function loadFormation(saved: SavedFormation) {
    setAllStates(prev => {
      const next = {
        ...prev,
        [activeTeam]: { formation: saved.formation, positions: saved.positions },
      }
      persistAllStates(next)
      return next
    })
    setActiveTab('editor')
  }

  function deleteFormation(id: string) {
    const next = savedFormations.filter(f => f.id !== id)
    setSavedFormations(next)
    saveToDisk(next)
  }

  const totalPlayers = Object.values(positions).flat().length

  // Total players across all teams (for sidebar badge)
  function teamCount(tk: TeamCategory) {
    return Object.values(allStates[tk].positions).flat().length
  }

  return (
    <div className="min-h-screen bg-apple-gray-50 dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-apple-gray-900 dark:text-white">Armado de Equipos</h1>
            <p className="text-sm text-apple-gray-500 mt-0.5">
              {activeTeam === 'primera_div' ? 'Primera División · Planificación y estado contractual' : 'Inferiores · Planificación por posición'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'editor' ? 'saved' : 'editor')}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-600 dark:text-apple-gray-300 hover:bg-white dark:hover:bg-apple-gray-800 transition-colors"
            >
              {activeTab === 'editor' ? `Guardadas (${savedFormations.length})` : 'Volver al editor'}
            </button>
            {activeTab === 'editor' && (
              <button
                onClick={() => setSaveModalOpen(true)}
                disabled={totalPlayers === 0}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Guardar
              </button>
            )}
          </div>
        </div>

        {activeTab === 'saved' ? (
          /* ── Saved formations ── */
          <div>
            {savedFormations.length === 0 ? (
              <div className="text-center py-16 text-apple-gray-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-medium">No hay formaciones guardadas</p>
                <p className="text-sm mt-1">Armá una formación y guardala desde el editor</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {savedFormations.map(f => (
                  <div key={f.id} className="bg-white dark:bg-apple-gray-900 rounded-2xl border-2 border-apple-gray-200 dark:border-apple-gray-800 transition-colors p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-apple-gray-900 dark:text-white">{f.name}</p>
                        <p className="text-xs text-apple-gray-400">{f.formation} · {new Date(f.createdAt).toLocaleDateString('es-AR')}</p>
                      </div>
                      <button onClick={() => deleteFormation(f.id)} className="text-apple-gray-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([cat, cfg]) => {
                        const count = Object.values(f.positions).flat().filter(p => p.category === cat).length
                        if (!count) return null
                        return <span key={cat} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>{count} {cfg.label.toLowerCase()}</span>
                      })}
                    </div>
                    <button
                      onClick={() => loadFormation(f)}
                      className="w-full py-2 rounded-xl text-sm font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      Cargar en {activeTeam}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Editor ── */
          <div className="flex gap-3">

            {/* ── Left sidebar: team categories ── */}
            <div className="flex-shrink-0 w-[88px]">
              <p className="text-[9px] font-semibold text-apple-gray-400 uppercase tracking-widest mb-2 px-1">Categoría</p>
              <div className="flex flex-col gap-1">
                {TEAM_CATEGORIES.map(tc => {
                  const count = teamCount(tc.key)
                  return (
                    <button
                      key={tc.key}
                      onClick={() => setActiveTeam(tc.key)}
                      className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all duration-150 flex items-center justify-between gap-1 ${
                        activeTeam === tc.key
                          ? 'bg-brand-green/15 dark:bg-brand-green/20 text-brand-green border border-brand-green/40'
                          : 'text-apple-gray-600 dark:text-apple-gray-400 hover:bg-apple-gray-100 dark:hover:bg-apple-gray-800 border border-transparent'
                      }`}
                    >
                      <span>{tc.label}</span>
                      {count > 0 && (
                        <span className={`text-[9px] font-bold px-1 rounded-full ${
                          activeTeam === tc.key ? 'bg-brand-green/20 text-brand-green' : 'bg-apple-gray-200 dark:bg-apple-gray-700 text-apple-gray-500'
                        }`}>{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Main editor area ── */}
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-4">

              {/* Pitch */}
              <div className="xl:col-span-3">
                {/* Formation selector */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs font-medium text-apple-gray-500">Formación:</span>
                  {(Object.keys(FORMATIONS) as FormationKey[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormation(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors ${
                        formation === f
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500 dark:text-apple-gray-400 hover:border-blue-400'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Pitch SVG — narrower than square */}
                <div className="relative rounded-2xl overflow-hidden mx-auto" style={{ width: '83%', paddingBottom: '100%', background: '#1e7a35' }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#1e7a35" />
                    {[0,1,2,3,4,5].map(i => (
                      <rect key={i} x="2" y={2 + i * 16} width="96" height="8" fill="#1a6b2e" opacity="0.45" />
                    ))}
                    <rect x="5" y="4" width="90" height="92" rx="2" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" />
                    <circle cx="50" cy="50" r="11" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" />
                    <rect x="25" y="4"  width="50" height="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
                    <rect x="37" y="4"  width="26" height="7"  fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                    <rect x="25" y="80" width="50" height="16" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
                    <rect x="37" y="89" width="26" height="7"  fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />

                    {/* Position markers */}
                    {currentPositions.map(pos => {
                      const players = positions[pos.key] ?? []
                      const cx = pos.x
                      const cy = pos.y
                      const hasPlayers = players.length > 0
                      const isHovered = hoveredPos === pos.key
                      const firstCat = players[0]?.category
                      const CAT_COLORS: Record<Category, string> = {
                        primera: '#3b82f6', clave: '#f97316', desarrollar: '#eab308', talento: '#a855f7',
                      }
                      const fillColor = isHovered ? '#6F1929' : (firstCat ? CAT_COLORS[firstCat] : 'rgba(255,255,255,0.18)')
                      const baseR = hasPlayers ? 3.8 : 3.2
                      const r = isHovered ? baseR + 0.6 : baseR

                      return (
                        <g
                          key={pos.key}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (players.length < MAX_PER_POSITION) setModal({ key: pos.key, label: pos.label })
                          }}
                          onMouseEnter={() => {
                            if (hoverTimer.current) clearTimeout(hoverTimer.current)
                            setHoveredPos(pos.key)
                          }}
                          onMouseLeave={() => {
                            hoverTimer.current = setTimeout(() => setHoveredPos(null), 80)
                          }}
                        >
                          {/* Hover glow ring */}
                          {isHovered && (
                            <circle cx={cx} cy={cy} r={r + 1.8} fill="rgba(111,25,41,0.25)" />
                          )}
                          {/* Drop shadow */}
                          <circle cx={cx + 0.2} cy={cy + 0.5} r={r} fill="rgba(0,0,0,0.3)" />
                          {/* Main circle */}
                          <circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={isHovered ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.85)'} strokeWidth={isHovered ? '0.9' : '0.7'} />
                          {/* Inner highlight for occupied */}
                          {hasPlayers && !isHovered && (
                            <circle cx={cx - 0.8} cy={cy - 0.8} r={r * 0.45} fill="rgba(255,255,255,0.15)" />
                          )}
                          {/* Count badge */}
                          {players.length > 1 && (
                            <g>
                              <circle cx={cx + r - 0.2} cy={cy - r + 0.2} r="2.1" fill="#1e1e2e" stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
                              <text x={cx + r - 0.2} y={cy - r + 0.7} textAnchor="middle" dominantBaseline="middle" fontSize="2.2" fontWeight="bold" fill="white">{players.length}</text>
                            </g>
                          )}
                          {/* Position label */}
                          <text x={cx} y={cy + 0.7} textAnchor="middle" dominantBaseline="middle" fontSize="2.3" fontWeight="500" fill="rgba(255,255,255,0.92)">{pos.label}</text>
                          {/* Player name tag */}
                          {players[0] && (() => {
                            const lastName = players[0].name.split(/[\s,]+/).slice(-1)[0].slice(0, 9)
                            const yr = players[0].categoryYear ?? players[0].birthDate?.slice(0, 4) ?? null
                            return (
                              <>
                                <rect x={cx - 8} y={cy + r + 1.2} width="16" height={yr ? 6.5 : 3.8} rx="1.5" fill="rgba(0,0,0,0.72)" />
                                <text x={cx} y={cy + r + 3.3} textAnchor="middle" dominantBaseline="middle" fontSize="2.1" fontWeight="600" fill="white">{lastName}</text>
                                {yr && <text x={cx} y={cy + r + 6.2} textAnchor="middle" dominantBaseline="middle" fontSize="1.8" fill="rgba(255,255,255,0.6)">{yr}</text>}
                              </>
                            )
                          })()}
                          {/* Add hint */}
                          {players.length < MAX_PER_POSITION && !hasPlayers && (
                            <text x={cx} y={cy + r + 3} textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.5)">+</text>
                          )}
                        </g>
                      )
                    })}
                  </svg>
                </div>
              </div>

              {/* Right: position detail / players list */}
              <div className="xl:col-span-2 space-y-4">

                {/* Legend */}
                <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-200 dark:border-apple-gray-800 p-4">
                  <p className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-3">Categorías de rol</p>
                  <div className="space-y-1.5">
                    {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][])
                    .filter(([cat]) => activeTeam !== 'primera_div' || cat === 'primera' || cat === 'clave')
                    .map(([cat, cfg]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-xs text-apple-gray-700 dark:text-apple-gray-300">{cfg.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Contract status legend — Primera División y Reserva */}
                  {(activeTeam === 'primera_div' || activeTeam === 'reserva') && (
                    <>
                      <p className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mt-4 mb-2">Estado</p>
                      <div className="space-y-1.5">
                        {(Object.entries(CONTRACT_STATUS_CONFIG) as [ContractStatus, typeof CONTRACT_STATUS_CONFIG[ContractStatus]][]).map(([key, cfg]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                            <span className={`text-xs ${cfg.textColor}`}>{cfg.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="text-[10px] text-apple-gray-400 mt-3 border-t border-apple-gray-200 dark:border-apple-gray-800 pt-2">
                    Máx. {MAX_PER_POSITION} por posición · Click en el círculo para agregar
                  </p>
                </div>

                {/* Players by position */}
                <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-200 dark:border-apple-gray-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-apple-gray-200 dark:border-apple-gray-800 flex items-center justify-between">
                    <p className="text-sm font-semibold text-apple-gray-800 dark:text-white">Jugadores — {TEAM_CATEGORIES.find(t => t.key === activeTeam)?.label}</p>
                    <span className="text-xs text-apple-gray-400">{totalPlayers} total</span>
                  </div>
                  <div className="px-4 py-3 max-h-72 overflow-y-auto space-y-3">
                    {currentPositions.map(pos => {
                      const players = positions[pos.key] ?? []
                      if (players.length === 0) return null
                      return (
                        <div key={pos.key}>
                          <p className="text-[10px] font-bold text-apple-gray-400 uppercase tracking-wider mb-1.5">{pos.label} — {pos.key}</p>
                          <div className="flex flex-wrap gap-1">
                            {players.map(p => (
                              <PlayerChip
                                key={p.id}
                                player={p}
                                onRemove={() => removePlayer(pos.key, p.id)}
                                plantelPlayers={activeTeam === 'primera_div' ? plantelPrimera : undefined}
                                onLink={activeTeam === 'primera_div' ? (key, img) => linkPlayer(pos.key, p.id, key, img) : undefined}
                              />
                            ))}
                            {players.length < MAX_PER_POSITION && (
                              <button
                                onClick={() => setModal({ key: pos.key, label: pos.label })}
                                className="text-[10px] text-apple-gray-400 hover:text-blue-500 px-2 py-1 rounded-lg border border-dashed border-apple-gray-200 dark:border-apple-gray-700 hover:border-blue-400 transition-colors"
                              >
                                + agregar
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {totalPlayers === 0 && (
                      <p className="text-sm text-apple-gray-400 text-center py-4">
                        Hacé click en una posición del campo para agregar jugadores
                      </p>
                    )}
                  </div>
                </div>

                {totalPlayers > 0 && (
                  <button
                    onClick={clearPositions}
                    className="w-full py-2 text-sm text-red-500 hover:text-red-600 border border-red-200 dark:border-red-900/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    Limpiar {TEAM_CATEGORIES.find(t => t.key === activeTeam)?.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Lista del plantel — todos los equipos ── */}
        {activeTab === 'editor' && (
          <SquadRosterList
            allStates={allStates}
            activeTeam={activeTeam}
            onSetActiveTeam={setActiveTeam}
            currentPositions={currentPositions}
            onRemove={removePlayer}
          />
        )}
      </div>

      {/* Add player modal */}
      {modal && (
        <AddPlayerModal
          positionKey={modal.key}
          positionLabel={modal.label}
          teamCategory={activeTeam}
          plantelPlayers={activeTeam === 'primera_div' ? plantelPrimera : undefined}
          onAdd={p => addPlayer(modal.key, p)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Save formation modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSaveModalOpen(false)}>
          <div className="bg-white dark:bg-apple-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-apple-gray-900 dark:text-white mb-1">Guardar formación</h3>
            <p className="text-xs text-apple-gray-400 mb-4">Categoría: <span className="font-semibold">{TEAM_CATEGORIES.find(t => t.key === activeTeam)?.label}</span></p>
            <input
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="Ej: Sub-20 Apertura, Mejor XI 2026..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 bg-apple-gray-50 dark:bg-apple-gray-800 text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setSaveModalOpen(false)} className="flex-1 py-2 rounded-xl text-sm font-medium border border-apple-gray-200 dark:border-apple-gray-700 text-apple-gray-500 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={!saveName.trim()} className="flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
