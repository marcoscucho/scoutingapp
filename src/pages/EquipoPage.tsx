import { useState, useMemo, useRef, useEffect } from 'react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend, LineChart, Line, ReferenceLine,
} from 'recharts'
import { useData } from '@/context/DataContext'
import { LANUS_2026, DIVISIONS, avg, type MatchData, type Competition } from '@/data/lanus2026'
import { fetchLanusCalendar } from '@/services/fotmobService'

// ─── helpers ──────────────────────────────────────────────────────────────────
const COMP_LABELS: Record<Competition, string> = {
  liga: 'Liga Profesional',
  copa: 'Copa Argentina',
  internacional: 'Internacional',
}
const COMP_COLORS: Record<Competition, string> = {
  liga: '#16a34a',
  copa: '#2563eb',
  internacional: '#9333ea',
}
const resultColor = (r: 'W' | 'D' | 'L') =>
  r === 'W' ? 'bg-emerald-500' : r === 'D' ? 'bg-amber-400' : 'bg-red-500'
const resultText = (r: 'W' | 'D' | 'L') =>
  r === 'W' ? 'text-emerald-400' : r === 'D' ? 'text-amber-400' : 'text-red-400'

function fmt1(n: number) { return n.toFixed(1) }
function fmtPct(n: number) { return n.toFixed(0) + '%' }

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-4">
      <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-apple-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-apple-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── FormDot ──────────────────────────────────────────────────────────────────
function FormDot({ m }: { m: MatchData }) {
  const bg = resultColor(m.result)
  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center text-xs font-bold text-white shadow`}>
        {m.result}
      </div>
      <p className="text-[10px] text-apple-gray-400 max-w-[60px] text-center truncate">{m.rival}</p>
      <div className="absolute bottom-full mb-2 hidden group-hover:flex bg-apple-gray-100 dark:bg-apple-gray-800 text-apple-gray-900 dark:text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 flex-col items-center gap-0.5">
        <span className="font-semibold">{m.rival}</span>
        <span>{m.golesAFavor}:{m.golesEnContra} · {m.date}</span>
        <span className="text-apple-gray-400">{COMP_LABELS[m.competition]}</span>
      </div>
    </div>
  )
}

// ─── TabResumen ────────────────────────────────────────────────────────────────
function TabResumen({ matches }: { matches: MatchData[] }) {
  const { internal: internalPlayers } = useData()
  const last5 = [...matches].slice(-5)

  const wins = matches.filter(m => m.result === 'W').length
  const draws = matches.filter(m => m.result === 'D').length
  const losses = matches.filter(m => m.result === 'L').length
  const gf = matches.reduce((s, m) => s + m.golesAFavor, 0)
  const gc = matches.reduce((s, m) => s + m.golesEnContra, 0)

  const avgPosesion = avg(matches, 'posesion')
  const avgXG = avg(matches, 'xG')
  const avgPPDA = avg(matches, 'ppda')
  const avgPases = avg(matches, 'pases_pct')
  const avgDuelos = avg(matches, 'duelos_pct')
  const avgTirosPorteria = avg(matches, 'tirosPorteria_pct')
  const avgDuelDef = avg(matches, 'duelosDefensivos_pct')
  const avgAereos = avg(matches, 'duelosAereos_pct')

  // Team style radar (normalized 0–100)
  const pressingScore = Math.max(0, Math.min(100, ((20 - avgPPDA) / 15) * 100))
  const radarData = [
    { metric: 'Posesión', value: Math.round((avgPosesion / 70) * 100) },
    { metric: 'xG/partido', value: Math.round((avgXG / 3) * 100) },
    { metric: 'Pressing', value: Math.round(pressingScore) },
    { metric: 'Precisión pase', value: Math.round((avgPases / 95) * 100) },
    { metric: 'Duelos', value: Math.round((avgDuelos / 60) * 100) },
    { metric: 'Def. aéreo', value: Math.round((avgAereos / 65) * 100) },
    { metric: 'Tiros puerta', value: Math.round((avgTirosPorteria / 65) * 100) },
    { metric: 'Def. terrestre', value: Math.round((avgDuelDef / 80) * 100) },
  ]

  // Top scorers from internal players
  const topScorers = useMemo(() => {
    return [...internalPlayers]
      .filter(p => parseFloat(p.Goles) > 0)
      .sort((a, b) => parseFloat(b.Goles) - parseFloat(a.Goles))
      .slice(0, 5)
  }, [internalPlayers])

  const topAssisters = useMemo(() => {
    return [...internalPlayers]
      .filter(p => parseFloat(p.Asistencias) > 0)
      .sort((a, b) => parseFloat(b.Asistencias) - parseFloat(a.Asistencias))
      .slice(0, 5)
  }, [internalPlayers])

  return (
    <div className="space-y-6">
      {/* Season banner */}
      <div className="bg-gradient-to-r from-brand-green/20 to-transparent border border-brand-green/30 rounded-xl p-4 flex flex-wrap gap-6 items-center">
        <div className="text-center">
          <p className="text-3xl font-black text-apple-gray-900 dark:text-white">{wins}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Victorias</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-apple-gray-900 dark:text-white">{draws}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">Empates</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-apple-gray-900 dark:text-white">{losses}</p>
          <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider">Derrotas</p>
        </div>
        <div className="w-px h-10 bg-apple-gray-200 dark:bg-apple-gray-700 hidden sm:block" />
        <div className="text-center">
          <p className="text-3xl font-black text-apple-gray-900 dark:text-white">{gf}</p>
          <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Goles a favor</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-apple-gray-900 dark:text-white">{gc}</p>
          <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">En contra</p>
        </div>
        <div className="w-px h-10 bg-apple-gray-200 dark:bg-apple-gray-700 hidden sm:block" />
        <div className="text-center">
          <p className="text-3xl font-black text-brand-green">{fmt1(gf / matches.length)}</p>
          <p className="text-xs text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider">Goles/partido</p>
        </div>
        <div className="flex-1" />
        <p className="text-apple-gray-500 text-sm">{matches.length} partidos · 2026</p>
      </div>

      {/* Recent form */}
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-4">
        <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-4">Últimos 5 partidos</p>
        <div className="flex gap-4 flex-wrap">
          {last5.map(m => <FormDot key={m.id} m={m} />)}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Posesión media" value={fmtPct(avgPosesion)} sub={`${matches.filter(m => m.posesion > 50).length}/${matches.length} partidos dominados`} />
        <StatCard label="xG por partido" value={fmt1(avgXG)} sub={`${fmt1(gf / matches.length)} goles reales/pdo`} accent="text-brand-green" />
        <StatCard label="PPDA (presión)" value={fmt1(avgPPDA)} sub={avgPPDA < 9 ? 'Pressing alto' : avgPPDA < 12 ? 'Pressing moderado' : 'Bloque medio'} accent={avgPPDA < 9 ? 'text-emerald-400' : avgPPDA < 12 ? 'text-amber-400' : 'text-orange-400'} />
        <StatCard label="Precisión pase" value={fmtPct(avgPases)} sub={`${Math.round(avg(matches, 'pases'))} pases/partido`} />
      </div>

      {/* Radar + Goleadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team style radar */}
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-4">
          <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-2">Identidad de juego</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Radar name="Lanús" dataKey="value" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Top scorers / assisters */}
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-4 space-y-4">
          <div>
            <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-2">Goleadores</p>
            {topScorers.length > 0 ? (
              <div className="space-y-2">
                {topScorers.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-apple-gray-500 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-apple-gray-900 dark:text-white font-medium truncate">{p.Jugador}</span>
                        <span className="text-brand-green font-bold ml-2">{p.Goles}</span>
                      </div>
                      <div className="h-1.5 bg-apple-gray-200 dark:bg-apple-gray-800 rounded-full mt-1">
                        <div
                          className="h-full bg-brand-green rounded-full"
                          style={{ width: `${Math.min(100, (parseFloat(p.Goles) / parseFloat(topScorers[0]?.Goles ?? '1')) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-apple-gray-500 text-sm">Sin datos del plantel</p>
            )}
          </div>
          <div>
            <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-2">Asistidores</p>
            {topAssisters.length > 0 ? (
              <div className="space-y-2">
                {topAssisters.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-apple-gray-500 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-apple-gray-900 dark:text-white font-medium truncate">{p.Jugador}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold ml-2">{p.Asistencias}</span>
                      </div>
                      <div className="h-1.5 bg-apple-gray-200 dark:bg-apple-gray-800 rounded-full mt-1">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (parseFloat(p.Asistencias) / parseFloat(topAssisters[0]?.Asistencias ?? '1')) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-apple-gray-500 text-sm">Sin datos del plantel</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TabPartidos ───────────────────────────────────────────────────────────────
function TabPartidos({ matches }: { matches: MatchData[] }) {
  const [filter, setFilter] = useState<'all' | Competition>('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = filter === 'all' ? matches : matches.filter(m => m.competition === filter)
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-4">
      {/* Competition filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'liga', 'copa', 'internacional'] as const).map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === c
                ? 'bg-brand-green text-white'
                : 'bg-apple-gray-100 dark:bg-apple-gray-800 text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-200 dark:hover:bg-apple-gray-700'
            }`}
          >
            {c === 'all' ? 'Todos' : COMP_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Match table */}
      <div className="space-y-2">
        {sorted.map(m => (
          <div key={m.id} className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl overflow-hidden">
            {/* Row summary */}
            <button
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800/50 transition-colors text-left"
            >
              <div className={`w-7 h-7 rounded-full ${resultColor(m.result)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                {m.result}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-apple-gray-900 dark:text-white font-medium text-sm">{m.isHome ? '🏠' : '✈️'} {m.rival}</span>
                  <span className={`text-xs font-bold ${resultText(m.result)}`}>{m.golesAFavor}–{m.golesEnContra}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: COMP_COLORS[m.competition] + '30', color: COMP_COLORS[m.competition] }}>
                    {COMP_LABELS[m.competition]}
                  </span>
                </div>
                <p className="text-xs text-apple-gray-500">{m.date} · {m.formation} · {m.duration}'</p>
              </div>
              {/* Mini stats */}
              <div className="hidden sm:flex gap-4 text-xs text-apple-gray-400 flex-shrink-0">
                <span title="xG"><span className="text-apple-gray-900 dark:text-white font-medium">{m.xG}</span> xG</span>
                <span title="Posesión"><span className="text-apple-gray-900 dark:text-white font-medium">{fmtPct(m.posesion)}</span> pos</span>
                <span title="Tiros"><span className="text-apple-gray-900 dark:text-white font-medium">{m.tiros}</span> tiros</span>
                <span title="PPDA"><span className="text-apple-gray-900 dark:text-white font-medium">{fmt1(m.ppda)}</span> PPDA</span>
              </div>
              <svg className={`w-4 h-4 text-apple-gray-500 flex-shrink-0 transition-transform ${expanded === m.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded stats */}
            {expanded === m.id && (
              <div className="border-t border-apple-gray-100 dark:border-apple-gray-800 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-apple-gray-50 dark:bg-apple-gray-950/50">
                {[
                  ['xG', m.xG.toString()],
                  ['Tiros (portería)', `${m.tiros} (${m.tirosPorteria})`],
                  ['Posesión', fmtPct(m.posesion)],
                  ['Pases (%)', `${m.pases} (${fmtPct(m.pases_pct)})`],
                  ['Duelos (%)', `${m.duelos} (${fmtPct(m.duelos_pct)})`],
                  ['Ataques pos.', `${m.ataquesPositionales} (${m.ataquesPositionalesRemate} rem)`],
                  ['Contraataques', `${m.contraataques} (${m.contraataquesRemate} rem)`],
                  ['Balón parado', `${m.balonParado} (${m.balonParadoRemate} rem)`],
                  ['Centros (%)', `${m.centros} (${m.centrosPrecisos} prec)`],
                  ['Pases últ. tercio', `${m.pasesUltimoTercio} (${fmtPct(m.pasesUltimoTercio_pct)})`],
                  ['Pases progresivos', `${m.pasesProgresivos} (${fmtPct(m.pasesProgresivos_pct)})`],
                  ['Tiros en contra', `${m.tirosContra} (${m.tirosContraPorteria} p.)`],
                  ['Duelos def. (%)', fmtPct(m.duelosDefensivos_pct)],
                  ['Duelos aéreos (%)', fmtPct(m.duelosAereos_pct)],
                  ['Interceptaciones', m.interceptaciones.toString()],
                  ['Faltas / Tarj.', `${m.faltas} / ${m.amarillas}🟨${m.rojas > 0 ? ` ${m.rojas}🟥` : ''}`],
                  ['PPDA', fmt1(m.ppda)],
                  ['Corners', m.corners.toString()],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] text-apple-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-apple-gray-900 dark:text-white font-medium">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TabProximoPartido ─────────────────────────────────────────────────────────
function TabProximoPartido({ matches }: { matches: MatchData[] }) {
  const [inputMode, setInputMode] = useState<'form' | 'csv' | 'texto'>('form')
  const [rivalName, setRivalName] = useState('')
  const [nextMatch, setNextMatch] = useState<{ date: Date; summary: string } | null>(null)

  useEffect(() => {
    fetchLanusCalendar().then(calendar => {
      const now = new Date()
      const next = calendar.find(m => m.date >= now)
      if (next) {
        setRivalName(next.isHome ? next.awayTeam : next.homeTeam)
        setNextMatch({ date: next.date, summary: next.summary })
      }
    }).catch(() => {})
  }, [])
  const [rivalData, setRivalData] = useState({
    position: '', lastResults: ['', '', '', '', ''], golesAFavor: '', golesEnContra: '',
    posesion: '', ppda: '', xG: '', tiros: '', pases_pct: '',
    topScorer: '', topAssister: '', notes: '',
  })
  const [csvText, setCsvText] = useState('')
  const [freeText, setFreeText] = useState('')
  const [parsedRival, setParsedRival] = useState<Partial<MatchData> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const lanusAvg = {
    posesion: avg(matches, 'posesion'),
    xG: avg(matches, 'xG'),
    ppda: avg(matches, 'ppda'),
    pases_pct: avg(matches, 'pases_pct'),
    tiros: avg(matches, 'tiros'),
    duelosGanados: avg(matches, 'duelos_pct'),
  }

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCsvText(ev.target?.result as string)
    reader.readAsText(file)
  }

  const resultColors: Record<string, string> = { W: 'bg-emerald-500', D: 'bg-amber-400', L: 'bg-red-500', '': 'bg-apple-gray-700' }

  const insights = useMemo(() => {
    const ins: string[] = []
    if (rivalData.posesion) {
      const rPos = parseFloat(rivalData.posesion)
      if (rPos < 45 && lanusAvg.posesion > 48) ins.push('🟢 Ventaja en posesión: Lanús suele tener más el balón. El rival juega en bloque bajo.')
      else if (rPos > 58) ins.push('🟡 Rival posesionista: preparar presión alta y salidas rápidas ante pérdidas.')
    }
    if (rivalData.ppda) {
      const rPPDA = parseFloat(rivalData.ppda)
      if (rPPDA < 9) ins.push('🔴 Rival con pressing intenso (PPDA bajo). Atención en salida del balón.')
      else if (rPPDA > 14) ins.push('🟢 Rival con bloque bajo (PPDA alto). Espacio entre líneas para explotar.')
    }
    if (rivalData.golesEnContra && rivalData.golesAFavor) {
      const diff = parseInt(rivalData.golesAFavor) - parseInt(rivalData.golesEnContra)
      if (diff > 5) ins.push('⚠️ Rival con gran diferencia de gol positiva. Equipo ofensivamente sólido.')
      else if (diff < -3) ins.push('🟢 Rival con diferencia de gol negativa. Defensivamente comprometido.')
    }
    if (freeText.toLowerCase().includes('presión') || freeText.toLowerCase().includes('pressing'))
      ins.push('📋 Scout: rival activo en pressing según notas del análisis.')
    if (freeText.toLowerCase().includes('contra') || freeText.toLowerCase().includes('transición'))
      ins.push('📋 Scout: rival peligroso en transiciones. Cuidar las pérdidas.')
    if (ins.length === 0 && (rivalData.posesion || rivalData.ppda))
      ins.push('ℹ️ Completar más datos del rival para generar insights automáticos.')
    return ins
  }, [rivalData, freeText, lanusAvg])

  return (
    <div className="space-y-6">
      {/* Next match header */}
      <div className="bg-gradient-to-r from-blue-900/30 to-transparent border border-blue-500/30 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-900/50 flex items-center justify-center text-2xl flex-shrink-0">⚽</div>
        <div>
          <p className="text-xs text-blue-400 uppercase tracking-wider">Próximo partido</p>
          <p className="text-apple-gray-900 dark:text-white text-lg font-bold">Lanús vs {rivalName || '—'}</p>
          {nextMatch && (
            <p className="text-apple-gray-400 text-xs">
              {nextMatch.date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex-1" />
        <input
          value={rivalName}
          onChange={e => setRivalName(e.target.value)}
          className="bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-1.5 text-sm text-apple-gray-900 dark:text-white placeholder-apple-gray-500 focus:outline-none focus:border-brand-green"
          placeholder="Nombre del rival"
        />
      </div>

      {/* Input mode selector */}
      <div className="flex gap-1 bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-1 w-fit">
        {(['form', 'csv', 'texto'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setInputMode(mode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              inputMode === mode ? 'bg-brand-green text-white' : 'text-apple-gray-500 dark:text-apple-gray-400 hover:text-apple-gray-900 dark:hover:text-white'
            }`}
          >
            {mode === 'form' ? '📋 Formulario' : mode === 'csv' ? '📂 CSV Wyscout' : '✍️ Texto libre'}
          </button>
        ))}
      </div>

      {/* Input form */}
      {inputMode === 'form' && (
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Posición en la tabla</label>
            <input value={rivalData.position} onChange={e => setRivalData(d => ({ ...d, position: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
              placeholder="Ej: 3°, 12°..." />
          </div>
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Goleador principal</label>
            <input value={rivalData.topScorer} onChange={e => setRivalData(d => ({ ...d, topScorer: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
              placeholder="Nombre y goles" />
          </div>
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">GF / GC (temporada)</label>
            <div className="flex gap-2">
              <input value={rivalData.golesAFavor} onChange={e => setRivalData(d => ({ ...d, golesAFavor: e.target.value }))}
                className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
                placeholder="GF" type="number" />
              <input value={rivalData.golesEnContra} onChange={e => setRivalData(d => ({ ...d, golesEnContra: e.target.value }))}
                className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
                placeholder="GC" type="number" />
            </div>
          </div>
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Asistidor principal</label>
            <input value={rivalData.topAssister} onChange={e => setRivalData(d => ({ ...d, topAssister: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
              placeholder="Nombre y asistencias" />
          </div>
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Posesión media (%)</label>
            <input value={rivalData.posesion} onChange={e => setRivalData(d => ({ ...d, posesion: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
              placeholder="Ej: 54.2" type="number" />
          </div>
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">PPDA (presión)</label>
            <input value={rivalData.ppda} onChange={e => setRivalData(d => ({ ...d, ppda: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
              placeholder="Ej: 10.5" type="number" />
          </div>
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">xG por partido</label>
            <input value={rivalData.xG} onChange={e => setRivalData(d => ({ ...d, xG: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
              placeholder="Ej: 1.4" type="number" />
          </div>
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Precisión de pase (%)</label>
            <input value={rivalData.pases_pct} onChange={e => setRivalData(d => ({ ...d, pases_pct: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green"
              placeholder="Ej: 82" type="number" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Últimos 5 resultados</label>
            <div className="flex gap-2">
              {rivalData.lastResults.map((r, i) => (
                <select key={i} value={r} onChange={e => setRivalData(d => { const lr = [...d.lastResults]; lr[i] = e.target.value; return { ...d, lastResults: lr } })}
                  className="flex-1 bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-brand-green appearance-none text-center">
                  <option value="">—</option>
                  <option value="W">G</option>
                  <option value="D">E</option>
                  <option value="L">P</option>
                </select>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Notas de scout / contexto</label>
            <textarea value={rivalData.notes} onChange={e => setRivalData(d => ({ ...d, notes: e.target.value }))}
              rows={3}
              className="w-full bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-apple-gray-500 focus:outline-none focus:border-brand-green resize-none"
              placeholder="Estilo de juego, jugadores clave, esquema habitual, estado de forma, lesionados..." />
          </div>
        </div>
      )}

      {inputMode === 'csv' && (
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5 space-y-4">
          <p className="text-sm text-apple-gray-400">Subí el archivo Excel/CSV exportado de Wyscout del rival (mismo formato que Team Stats Lanús.xlsx).</p>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-apple-gray-200 dark:border-apple-gray-700 hover:border-brand-green rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <div className="text-4xl mb-2">📂</div>
            <p className="text-apple-gray-300 group-hover:text-white text-sm font-medium">Click para subir CSV / Excel</p>
            <p className="text-apple-gray-500 text-xs mt-1">Formato Wyscout Team Stats · .xlsx, .csv</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCSVFile} />
          </div>
          {csvText && (
            <div className="bg-apple-gray-100 dark:bg-apple-gray-800 rounded-lg p-3">
              <p className="text-xs text-brand-green mb-1">✓ Archivo cargado ({csvText.length} caracteres)</p>
              <p className="text-xs text-apple-gray-500">Procesamiento automático de métricas en desarrollo. Por ahora, copiá los datos clave al formulario.</p>
            </div>
          )}
        </div>
      )}

      {inputMode === 'texto' && (
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5 space-y-3">
          <p className="text-sm text-apple-gray-400">Escribí o pegá cualquier análisis, estadísticas, notas de scouting o contexto del rival. El sistema extrae insights automáticamente.</p>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            rows={8}
            className="w-full bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-apple-gray-500 focus:outline-none focus:border-brand-green resize-none"
            placeholder={`Ej: Argentinos Juniors viene de ganar 3 partidos consecutivos. Juegan en 4-3-3 con pressing alto. Su goleador es Rodríguez con 8 goles. Tienen la posesión media más alta de la liga con 61%. PPDA de 7.2, muy agresivos...`}
          />
          <p className="text-xs text-apple-gray-500">{freeText.length} caracteres · Los insights se generan abajo en tiempo real</p>
        </div>
      )}

      {/* Comparison table */}
      {(rivalData.posesion || rivalData.xG || rivalData.ppda || rivalData.pases_pct) && (
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5">
          <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-4">Comparación vs rival</p>
          <div className="space-y-3">
            {[
              { label: 'Posesión %', lanus: fmt1(lanusAvg.posesion), rival: rivalData.posesion, higherBetter: true },
              { label: 'xG / partido', lanus: fmt1(lanusAvg.xG), rival: rivalData.xG, higherBetter: true },
              { label: 'PPDA (↓ = más presión)', lanus: fmt1(lanusAvg.ppda), rival: rivalData.ppda, higherBetter: false },
              { label: 'Precisión de pase %', lanus: fmt1(lanusAvg.pases_pct), rival: rivalData.pases_pct, higherBetter: true },
            ].filter(r => r.rival).map(row => {
              const lv = parseFloat(row.lanus)
              const rv = parseFloat(row.rival)
           const lanusWins = row.higherBetter ? lv >= rv : lv <= rv
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <p className="text-xs text-apple-gray-400 w-36 flex-shrink-0">{row.label}</p>
                  <div className="flex-1 flex items-center gap-2">
                    <span className={`text-sm font-bold w-14 text-right ${lanusWins ? 'text-emerald-400' : 'text-apple-gray-300'}`}>{row.lanus}</span>
                    <div className="flex-1 h-2 bg-apple-gray-800 rounded-full relative">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-apple-gray-600" />
                      <div
                        className={`h-full rounded-full ${lanusWins ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: '40%', marginLeft: lanusWins ? '50%' : 'auto', marginRight: lanusWins ? 'auto' : '50%' }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-14 ${!lanusWins ? 'text-emerald-400' : 'text-apple-gray-300'}`}>{row.rival}</span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className="text-[10px] text-apple-gray-500">LAN</span>
                    <span className="text-[10px] text-apple-gray-500">RIV</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rival last 5 */}
      {rivalData.lastResults.some(r => r) && (
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5">
          <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-3">Últimos 5 resultados del rival</p>
          <div className="flex gap-3">
            {rivalData.lastResults.map((r, i) => (
              <div key={i} className={`w-9 h-9 rounded-full ${resultColors[r]} flex items-center justify-center text-xs font-bold text-white`}>
                {r || '—'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key players */}
      {(rivalData.topScorer || rivalData.topAssister) && (
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5 grid grid-cols-2 gap-4">
          {rivalData.topScorer && (
            <div>
              <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-1">⚽ Goleador</p>
              <p className="text-white font-medium">{rivalData.topScorer}</p>
            </div>
          )}
          {rivalData.topAssister && (
            <div>
              <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-1">🎯 Asistidor</p>
              <p className="text-white font-medium">{rivalData.topAssister}</p>
            </div>
          )}
          {rivalData.position && (
            <div>
              <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-1">📊 Posición tabla</p>
              <p className="text-white font-medium">{rivalData.position}</p>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {rivalData.notes && (
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5">
          <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-2">📝 Notas del scout</p>
          <p className="text-apple-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{rivalData.notes}</p>
        </div>
      )}

      {/* Auto insights */}
      {(insights.length > 0 && (rivalData.posesion || rivalData.ppda || freeText.length > 20)) && (
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-5">
          <p className="text-xs text-blue-400 uppercase tracking-wider mb-3">💡 Insights automáticos</p>
          <ul className="space-y-2">
            {insights.map((ins, i) => (
              <li key={i} className="text-sm text-apple-gray-200 leading-relaxed">{ins}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── TabAnalisis ───────────────────────────────────────────────────────────────
function TabAnalisis({ matches }: { matches: MatchData[] }) {
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))

  const xgGoalsData = sorted.map(m => ({
    name: m.rival.split(' ')[0],
    xG: m.xG,
    Goles: m.golesAFavor,
    xGA: m.golesRecibidos,
  }))

  const possessionData = sorted.map(m => ({
    name: m.rival.split(' ')[0],
    Posesión: Math.round(m.posesion),
    Pases: Math.round(m.pases_pct),
  }))

  const ppdaData = sorted.map(m => ({
    name: m.rival.split(' ')[0],
    PPDA: m.ppda,
  }))

  const attackPatternData = sorted.map(m => ({
    name: m.rival.split(' ')[0],
    'Pos. posicional': m.ataquesPositionales,
    'Contraataques': m.contraataques,
    'Balón parado': m.balonParado,
  }))

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#f9fafb',
    fontSize: 12,
  }
  const chartMargin = { top: 5, right: 10, left: -20, bottom: 0 }

  return (
    <div className="space-y-6">
      {/* xG vs Goles */}
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5">
        <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-1">xG vs Goles reales por partido</p>
        <p className="text-xs text-apple-gray-500 mb-4">Cuánto generamos vs cuánto concretamos</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={xgGoalsData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="xG" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="xG" />
            <Line type="monotone" dataKey="Goles" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="Goles" />
            <Line type="monotone" dataKey="xGA" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} name="Goles concedidos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Attack patterns */}
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5">
        <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-1">Patrones de ataque</p>
        <p className="text-xs text-apple-gray-500 mb-4">Ataques posicionales / Contraataques / Balón parado por partido</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={attackPatternData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Pos. posicional" stackId="a" fill="#16a34a" />
            <Bar dataKey="Contraataques" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Balón parado" stackId="a" fill="#9333ea" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Possession + passing */}
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5">
        <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-1">Posesión y precisión de pase</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={possessionData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis domain={[20, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={50} stroke="#4b5563" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="Posesión" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="Posesión %" />
            <Area type="monotone" dataKey="Pases" stroke="#16a34a" fill="#16a34a" fillOpacity={0.1} strokeWidth={2} name="Precisión pase %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PPDA / Pressing */}
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5">
        <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-1">Índice de pressing (PPDA)</p>
        <p className="text-xs text-apple-gray-500 mb-4">Cuanto más bajo, más intenso el pressing. &lt;9 = alto · 9–14 = moderado · &gt;14 = bloque bajo</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={ppdaData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis domain={[0, 20]} tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={9} stroke="#16a34a" strokeDasharray="3 3" label={{ value: 'Pressing alto', fill: '#16a34a', fontSize: 9 }} />
            <ReferenceLine y={14} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Bloque bajo', fill: '#f59e0b', fontSize: 9 }} />
            <Area type="monotone" dataKey="PPDA" stroke="#9333ea" fill="#9333ea" fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5 overflow-x-auto">
        <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-3">Promedios generales · Temporada 2026</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-apple-gray-100 dark:border-apple-gray-800">
              {['Métrica', 'Promedio', 'Máx', 'Mín'].map(h => (
                <th key={h} className="text-left text-xs text-apple-gray-500 font-medium pb-2 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-apple-gray-800/50">
            {[
              ['Goles/partido', avg(matches, 'golesAFavor'), Math.max(...matches.map(m => m.golesAFavor)), Math.min(...matches.map(m => m.golesAFavor))],
              ['xG/partido', avg(matches, 'xG'), Math.max(...matches.map(m => m.xG)), Math.min(...matches.map(m => m.xG))],
              ['Posesión %', avg(matches, 'posesion'), Math.max(...matches.map(m => m.posesion)), Math.min(...matches.map(m => m.posesion))],
              ['Precisión pase %', avg(matches, 'pases_pct'), Math.max(...matches.map(m => m.pases_pct)), Math.min(...matches.map(m => m.pases_pct))],
              ['Tiros/partido', avg(matches, 'tiros'), Math.max(...matches.map(m => m.tiros)), Math.min(...matches.map(m => m.tiros))],
              ['Duelos ganados %', avg(matches, 'duelos_pct'), Math.max(...matches.map(m => m.duelos_pct)), Math.min(...matches.map(m => m.duelos_pct))],
              ['PPDA', avg(matches, 'ppda'), Math.max(...matches.map(m => m.ppda)), Math.min(...matches.map(m => m.ppda))],
              ['Goles concedidos/pdo', avg(matches, 'golesRecibidos'), Math.max(...matches.map(m => m.golesRecibidos)), Math.min(...matches.map(m => m.golesRecibidos))],
              ['Pases prog./partido', avg(matches, 'pasesProgresivos'), Math.max(...matches.map(m => m.pasesProgresivos)), Math.min(...matches.map(m => m.pasesProgresivos))],
              ['Interceptaciones/pdo', avg(matches, 'interceptaciones'), Math.max(...matches.map(m => m.interceptaciones)), Math.min(...matches.map(m => m.interceptaciones))],
            ].map(([label, a, max, min]) => (
              <tr key={String(label)}>
                <td className="py-2 pr-4 text-apple-gray-300">{label}</td>
                <td className="py-2 pr-4 text-white font-medium">{typeof a === 'number' ? fmt1(a) : a}</td>
                <td className="py-2 pr-4 text-emerald-400">{typeof max === 'number' ? fmt1(max) : max}</td>
                <td className="py-2 text-red-400">{typeof min === 'number' ? fmt1(min) : min}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Video Analysis note types ────────────────────────────────────────────────
interface VideoNote {
  id: string
  date: string
  match: string
  category: string
  tags: string[]
  content: string
}

const NOTE_CATEGORIES = [
  'Pressing y presión',
  'Transiciones ofensivas',
  'Transiciones defensivas',
  'Ataque posicional',
  'Balón parado ofensivo',
  'Balón parado defensivo',
  'Defensa organizada',
  'Cambios y variantes',
  'Observación general',
]
const NOTE_TAGS = [
  'Sistema 4-4-2', 'Sistema 4-2-3-1', 'Sistema 4-3-3',
  'Línea alta', 'Bloque medio', 'Bloque bajo',
  'Juego directo', 'Combinativo', 'Vertical',
  'Doble pivote', 'Mediapunta', 'Extremos',
  'Desmarques', 'Diagonales', 'Sobrecargas',
]

// ─── TabVideo ──────────────────────────────────────────────────────────────────
function TabVideo({ matches }: { matches: MatchData[] }) {
  const STORAGE_KEY = 'lanus_video_notes'
  const [notes, setNotes] = useState<VideoNote[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
  })
  const [form, setForm] = useState({ match: '', category: NOTE_CATEGORIES[0], tags: [] as string[], content: '' })
  const [filter, setFilter] = useState('')

  const save = (n: VideoNote[]) => { setNotes(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)) }

  const addNote = () => {
    if (!form.content.trim()) return
    const n: VideoNote = { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], ...form }
    save([n, ...notes])
    setForm({ match: '', category: NOTE_CATEGORIES[0], tags: [], content: '' })
  }

  const deleteNote = (id: string) => save(notes.filter(n => n.id !== id))

  const toggleTag = (tag: string) => setForm(f => ({
    ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
  }))

  const filtered = notes.filter(n =>
    !filter || n.content.toLowerCase().includes(filter.toLowerCase()) ||
    n.category.toLowerCase().includes(filter.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
  )

  const categoryColors: Record<string, string> = {
    'Pressing y presión': 'text-orange-400 bg-orange-400/10',
    'Transiciones ofensivas': 'text-emerald-400 bg-emerald-400/10',
    'Transiciones defensivas': 'text-blue-400 bg-blue-400/10',
    'Ataque posicional': 'text-brand-green bg-brand-green/10',
    'Balón parado ofensivo': 'text-purple-400 bg-purple-400/10',
    'Balón parado defensivo': 'text-indigo-400 bg-indigo-400/10',
    'Defensa organizada': 'text-cyan-400 bg-cyan-400/10',
    'Cambios y variantes': 'text-amber-400 bg-amber-400/10',
    'Observación general': 'text-apple-gray-400 bg-apple-gray-400/10',
  }

  return (
    <div className="space-y-6">
      {/* New note form */}
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-white">Nueva nota de análisis</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Partido / contexto</label>
            <select value={form.match} onChange={e => setForm(f => ({ ...f, match: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green">
              <option value="">— Seleccionar partido —</option>
              {[...matches].sort((a, b) => b.date.localeCompare(a.date)).map(m => (
                <option key={m.id} value={`${m.date} · ${m.rival} ${m.golesAFavor}-${m.golesEnContra}`}>
                  {m.date} · {m.isHome ? '🏠' : '✈️'} {m.rival} {m.golesAFavor}-{m.golesEnContra}
                </option>
              ))}
              <option value="General">General / Sin partido específico</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Categoría</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-apple-gray-900 dark:text-white focus:outline-none focus:border-brand-green">
              {NOTE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {NOTE_TAGS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`px-2 py-1 rounded-md text-xs transition-colors ${
                  form.tags.includes(tag)
                    ? 'bg-brand-green text-white'
                    : 'bg-apple-gray-800 text-apple-gray-400 hover:text-white hover:bg-apple-gray-700'
                }`}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-apple-gray-400 uppercase tracking-wider block mb-1.5">Análisis / Observaciones</label>
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={5}
            className="w-full bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-apple-gray-500 focus:outline-none focus:border-brand-green resize-none"
            placeholder="Escribí tus conclusiones técnicas, patrones observados, puntos a corregir, fortalezas del equipo, situaciones de juego, referencias de video (ej: min 23 – transición rápida por la banda derecha)..." />
        </div>

        <button onClick={addNote}
          className="bg-brand-green hover:bg-brand-greenHover text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          Guardar nota
        </button>
      </div>

      {/* Notes list */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-apple-gray-400 uppercase tracking-wider">{notes.length} notas guardadas</p>
            <div className="flex-1" />
            <input value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-apple-gray-100 dark:bg-apple-gray-800 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-apple-gray-500 focus:outline-none focus:border-brand-green w-48"
              placeholder="Buscar notas..." />
          </div>

          {filtered.map(note => (
            <div key={note.id} className="bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[note.category] ?? 'text-apple-gray-400 bg-apple-gray-700'}`}>
                    {note.category}
                  </span>
                  {note.match && <span className="text-xs text-apple-gray-500">{note.match}</span>}
                  <span className="text-xs text-apple-gray-600">{note.date}</span>
                </div>
                <button onClick={() => deleteNote(note.id)} className="text-apple-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0">
                  Eliminar
                </button>
              </div>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 bg-apple-gray-800 text-apple-gray-400 rounded">{t}</span>
                  ))}
                </div>
              )}
              <p className="text-apple-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <div className="text-center py-16 text-apple-gray-500">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm font-medium text-apple-gray-400">Sin notas de análisis todavía</p>
          <p className="text-xs mt-1">Usá el formulario de arriba para guardar tus observaciones</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TABS = ['Resumen', 'Partidos', 'Próximo Partido', 'Análisis', 'Video & Notas'] as const
type Tab = typeof TABS[number]

export default function EquipoPage() {
  const [division, setDivision] = useState('primera')
  const [tab, setTab] = useState<Tab>('Resumen')
  const [compFilter, setCompFilter] = useState<'all' | 'liga' | 'copa' | 'internacional'>('all')

  const matches = useMemo(() => {
    const base = division === 'primera' ? LANUS_2026 : []
    return compFilter === 'all' ? base : base.filter(m => m.competition === compFilter)
  }, [division, compFilter])

  const selectedDivision = DIVISIONS.find(d => d.id === division)

  return (
    <div className="min-h-screen bg-apple-gray-50 dark:bg-[#0a0a0a] text-apple-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-4">
          <img src="/lanus-escudo.png" alt="Club Atlético Lanús" className="w-12 h-12 object-contain flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-black text-apple-gray-900 dark:text-white">Club Atlético Lanús</h1>
            <p className="text-apple-gray-500 dark:text-apple-gray-400 text-sm">Análisis colectivo del equipo · Temporada 2026</p>
          </div>
        </div>

        {/* Division selector */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {DIVISIONS.map(d => (
            <button
              key={d.id}
              onClick={() => { setDivision(d.id); setTab('Resumen') }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                division === d.id
                  ? 'bg-brand-green text-white shadow'
                  : d.hasData
                  ? 'bg-apple-gray-800 text-apple-gray-300 hover:bg-apple-gray-700'
                  : 'bg-apple-gray-900 text-apple-gray-600 cursor-default'
              }`}
            >
              {d.label}
              {!d.hasData && <span className="ml-1 opacity-50">·</span>}
            </button>
          ))}
        </div>

        {/* No data state */}
        {!selectedDivision?.hasData ? (
          <div className="text-center py-20 bg-white dark:bg-apple-gray-900 border border-apple-gray-100 dark:border-apple-gray-800 rounded-2xl">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold text-white mb-2">{selectedDivision?.label} — Sin datos cargados</h2>
            <p className="text-apple-gray-400 text-sm max-w-md mx-auto">
              Exportá los datos de Wyscout de la {selectedDivision?.label} en formato Excel y cargarlos desde la sección de Próximo Partido o agregá los datos manualmente.
            </p>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex gap-1 border-b border-apple-gray-100 dark:border-apple-gray-800 overflow-x-auto scrollbar-hide">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t
                      ? 'border-brand-green text-brand-green'
                      : 'border-transparent text-apple-gray-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div>
              {tab === 'Resumen' && <TabResumen matches={LANUS_2026} />}
              {tab === 'Partidos' && <TabPartidos matches={LANUS_2026} />}
              {tab === 'Próximo Partido' && <TabProximoPartido matches={LANUS_2026} />}
              {tab === 'Análisis' && <TabAnalisis matches={matches.length ? matches : LANUS_2026} />}
              {tab === 'Video & Notas' && <TabVideo matches={LANUS_2026} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
