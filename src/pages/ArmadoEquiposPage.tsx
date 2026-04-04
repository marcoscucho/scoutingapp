import { useState, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'primera' | 'clave' | 'desarrollar' | 'talento'
type TeamCategory = 'reserva' | '4ta' | '5ta' | '6ta' | '7ma' | '8va' | '9na' | 'pre9na'

interface InfPlayer {
  id: string
  name: string
  category: Category
  birthDate?: string    // ISO date e.g. "2007-03-15"
  categoryYear?: string // e.g. "2007", "2008"
  notes?: string
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

const TEAM_CATEGORIES: { key: TeamCategory; label: string }[] = [
  { key: 'reserva', label: 'Reserva' },
  { key: '4ta',    label: '4ta'     },
  { key: '5ta',    label: '5ta'     },
  { key: '6ta',    label: '6ta'     },
  { key: '7ma',    label: '7ma'     },
  { key: '8va',    label: '8va'     },
  { key: '9na',    label: '9na'     },
  { key: 'pre9na', label: 'Pre 9na' },
]

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; bg: string; dot: string }> = {
  primera:    { label: 'Primera opción',       color: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-100 dark:bg-blue-900/40',    dot: 'bg-blue-500'   },
  clave:      { label: 'Clave',                color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40', dot: 'bg-orange-500' },
  desarrollar:{ label: 'Jugador a desarrollar', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/40',  dot: 'bg-yellow-400' },
  talento:    { label: 'Joven talento',        color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', dot: 'bg-purple-500' },
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

function PlayerChip({ player, onRemove }: { player: InfPlayer; onRemove: () => void }) {
  const cfg = CATEGORY_CONFIG[player.category]
  const displayYear = player.categoryYear ?? (player.birthDate ? player.birthDate.slice(0, 4) : null)
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${cfg.bg} ${cfg.color} group`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className="font-medium truncate max-w-[80px]">{player.name}</span>
      {displayYear && <span className="opacity-60 text-[10px]">{displayYear}</span>}
      <button
        onClick={onRemove}
        className="ml-0.5 opacity-0 group-hover:opacity-70 hover:opacity-100 text-current leading-none"
        title="Quitar"
      >×</button>
    </div>
  )
}

interface AddPlayerModalProps {
  positionKey: string
  positionLabel: string
  onAdd: (player: Omit<InfPlayer, 'id'>) => void
  onClose: () => void
}

function AddPlayerModal({ positionKey, positionLabel, onAdd, onClose }: AddPlayerModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('primera')
  const [birthDate, setBirthDate] = useState('')
  const [categoryYear, setCategoryYear] = useState('')
  const [notes, setNotes] = useState('')

  function handleAdd() {
    if (!name.trim()) return
    onAdd({
      name: name.trim(),
      category,
      birthDate: birthDate || undefined,
      categoryYear: categoryYear.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-apple-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-apple-gray-900 dark:text-white mb-1">Agregar jugador</h3>
        <p className="text-xs text-apple-gray-400 mb-4">Posición: <span className="font-semibold">{positionLabel} ({positionKey})</span></p>

        <div className="space-y-3">
          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-apple-gray-500 mb-1 block">Nombre *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="Apellido, Nombre"
              className="w-full px-3 py-2 text-sm rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 bg-apple-gray-50 dark:bg-apple-gray-800 text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Rol en el equipo */}
          <div>
            <label className="text-xs font-medium text-apple-gray-500 mb-2 block">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([key, cfg]) => (
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

          {/* Fecha nacimiento + Categoría año */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-apple-gray-500 mb-1 block">Fecha de nacimiento</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => {
                  setBirthDate(e.target.value)
                  // Auto-fill category year from birth year
                  if (e.target.value) setCategoryYear(e.target.value.slice(0, 4))
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 bg-apple-gray-50 dark:bg-apple-gray-800 text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-apple-gray-500 mb-1 block">Categoría (año)</label>
              <input
                value={categoryYear}
                onChange={e => setCategoryYear(e.target.value)}
                placeholder="ej. 2007"
                maxLength={4}
                className="w-full px-3 py-2 text-sm rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 bg-apple-gray-50 dark:bg-apple-gray-800 text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-apple-gray-200 dark:border-apple-gray-700 bg-apple-gray-50 dark:bg-apple-gray-800 text-apple-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArmadoEquiposPage() {
  const [activeTeam, setActiveTeam] = useState<TeamCategory>('reserva')
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
            <p className="text-sm text-apple-gray-500 mt-0.5">Inferiores · Planificación por posición</p>
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
                  <div key={f.id} className="bg-white dark:bg-apple-gray-900 rounded-2xl border-2 border-apple-gray-100 dark:border-apple-gray-800 transition-colors p-4">
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
                <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 p-4">
                  <p className="text-xs font-semibold text-apple-gray-400 uppercase tracking-widest mb-3">Categorías</p>
                  <div className="space-y-2">
                    {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([cat, cfg]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-xs text-apple-gray-700 dark:text-apple-gray-300">{cfg.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-apple-gray-400 mt-3 border-t border-apple-gray-100 dark:border-apple-gray-800 pt-2">
                    Máx. {MAX_PER_POSITION} por posición · Click en el círculo para agregar
                  </p>
                </div>

                {/* Players by position */}
                <div className="bg-white dark:bg-apple-gray-900 rounded-2xl border border-apple-gray-100 dark:border-apple-gray-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-apple-gray-100 dark:border-apple-gray-800 flex items-center justify-between">
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
                              <PlayerChip key={p.id} player={p} onRemove={() => removePlayer(pos.key, p.id)} />
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
      </div>

      {/* Add player modal */}
      {modal && (
        <AddPlayerModal
          positionKey={modal.key}
          positionLabel={modal.label}
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
