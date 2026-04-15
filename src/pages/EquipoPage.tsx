import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseWyscoutPdf, type WyscoutData } from '@/services/wyscoutParser'
import { processFile, mergeRivalData, analyzePdfPages, fetchRivalSheetData, fetchUltimoPartidoData, type RivalData, type PartialRivalData, type FileSource, type PdfPageInsight, type UltimoPartidoStats } from '@/services/rivalAnalysisService'
import { extractPdfPages, type PdfPage } from '@/services/pdfImageService'
import FormationPitchCard, { FormationsGrid } from '@/components/rival/FormationPitchCard'
import { RivalComprehensiveReport } from '@/components/rival/RivalComprehensiveReport'
import { PdfPagesViewer } from '@/components/rival/PdfPagesViewer'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend, LineChart, Line, ReferenceLine,
} from 'recharts'
import { useData } from '@/context/DataContext'
import { LANUS_2026, DIVISIONS, avg, type MatchData, type Competition } from '@/data/lanus2026'
import { fetchLanusCalendar } from '@/services/fotmobService'
import { ShieldImg, CompBadge } from '@/components/ui/ShieldImg'

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
    <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-4">
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
        {m.result === 'W' ? 'G' : m.result === 'D' ? 'E' : 'P'}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <ShieldImg team={m.rival} size={16} fallbackInitials={false} />
        <p className="text-[9px] text-apple-gray-400 max-w-[48px] text-center truncate leading-none">{(() => { const p = m.rival.split(' '); return p[0].length <= 3 && p[1] ? `${p[0]} ${p[1]}` : p[0] })()}</p>
      </div>
      <div className="absolute bottom-full mb-2 hidden group-hover:flex bg-apple-gray-900 dark:bg-black text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap z-10 flex-col items-center gap-1 shadow-xl">
        <ShieldImg team={m.rival} size={28} />
        <span className="font-semibold">{m.rival}</span>
        <span>{m.golesAFavor}–{m.golesEnContra} · {m.date}</span>
        <div className="flex items-center gap-1 opacity-70">
          <CompBadge competition={m.competition} size={14} />
          <span>{COMP_LABELS[m.competition]}</span>
        </div>
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

  // Top scorers: fuente primaria = scorers/assisters por partido en LANUS_2026.
  // Si no hay datos aún, fallback a internalPlayers SOLO para jugadores cuyos
  // Partidos jugados ≤ total de partidos que Lanús jugó en 2026 (constante, no filtrado).
  // Esto evita tomar goles de fichajes recientes en sus clubes anteriores (ej: Valois = 26 > 25).
  const maxLanusMatches = LANUS_2026.length  // total real, no varía con el filtro de competición

  const topScorers = useMemo(() => {
    // Fuente primaria: datos de partidos en lanus2026.ts
    const tally: Record<string, number> = {}
    for (const m of matches) {
      for (const name of m.scorers ?? []) {
        tally[name] = (tally[name] ?? 0) + 1
      }
    }
    const fromMatches = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, goals]) => ({ name, goals }))
    if (fromMatches.length > 0) return fromMatches

    // Fallback: internalPlayers, pero solo si sus partidos ≤ lo que Lanús jugó
    // (más partidos = stats son del club anterior, no de Lanús)
    return [...internalPlayers]
      .filter(p => {
        const goals = parseFloat(p.Goles)
        const partidos = parseInt(p['Partidos jugados'] ?? p.Partidos ?? '0')
        return goals > 0 && partidos <= maxLanusMatches
      })
      .sort((a, b) => parseFloat(b.Goles) - parseFloat(a.Goles))
      .slice(0, 5)
      .map(p => ({ name: p.Jugador, goals: parseFloat(p.Goles) }))
  }, [matches, internalPlayers, maxLanusMatches])

  const topAssisters = useMemo(() => {
    // Fuente primaria: datos de partidos en lanus2026.ts
    const tally: Record<string, number> = {}
    for (const m of matches) {
      for (const name of m.assisters ?? []) {
        tally[name] = (tally[name] ?? 0) + 1
      }
    }
    const fromMatches = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, assists]) => ({ name, assists }))
    if (fromMatches.length > 0) return fromMatches

    // Fallback: internalPlayers con el mismo filtro de partidos
    return [...internalPlayers]
      .filter(p => {
        const asists = parseFloat(p.Asistencias)
        const partidos = parseInt(p['Partidos jugados'] ?? p.Partidos ?? '0')
        return asists > 0 && partidos <= maxLanusMatches
      })
      .sort((a, b) => parseFloat(b.Asistencias) - parseFloat(a.Asistencias))
      .slice(0, 5)
      .map(p => ({ name: p.Jugador, assists: parseFloat(p.Asistencias) }))
  }, [matches, internalPlayers, maxLanusMatches])

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
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-4">
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

      {/* Goleadores + Asistidores — oculto por pedido del usuario (pre-entrevista) */}
      {false && (
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-apple-gray-400 uppercase tracking-wider mb-2">Goleadores</p>
            {topScorers.length > 0 ? (
              <div className="space-y-2">
                {topScorers.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-apple-gray-500 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-apple-gray-900 dark:text-white font-medium truncate">{p.name}</span>
                        <span className="text-brand-green font-bold ml-2">{p.goals}</span>
                      </div>
                      <div className="h-1.5 bg-apple-gray-200 dark:bg-apple-gray-800 rounded-full mt-1">
                        <div
                          className="h-full bg-brand-green rounded-full"
                          style={{ width: `${Math.min(100, (p.goals / (topScorers[0]?.goals || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-apple-gray-500 italic leading-relaxed">
                Sin datos. Completar <code className="text-[10px] bg-apple-gray-100 dark:bg-apple-gray-800 px-1 rounded">scorers</code> por partido en <code className="text-[10px] bg-apple-gray-100 dark:bg-apple-gray-800 px-1 rounded">lanus2026.ts</code>.
              </p>
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
                        <span className="text-apple-gray-900 dark:text-white font-medium truncate">{p.name}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold ml-2">{p.assists}</span>
                      </div>
                      <div className="h-1.5 bg-apple-gray-200 dark:bg-apple-gray-800 rounded-full mt-1">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (p.assists / (topAssisters[0]?.assists || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-apple-gray-500 italic leading-relaxed">
                Sin datos. Completar <code className="text-[10px] bg-apple-gray-100 dark:bg-apple-gray-800 px-1 rounded">assisters</code> por partido en <code className="text-[10px] bg-apple-gray-100 dark:bg-apple-gray-800 px-1 rounded">lanus2026.ts</code>.
              </p>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

// ─── TabAnalisisPropio ─────────────────────────────────────────────────────────
function TabAnalisisPropio({ matches }: { matches: MatchData[] }) {
  return (
    <div className="space-y-10">
      <TabResumen matches={matches} />
      <div className="border-t border-apple-gray-200 dark:border-apple-gray-800" />
      <TabAnalisis matches={matches} />
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
          <div key={m.id} className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
            {/* Row summary */}
            <button
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-apple-gray-50 dark:hover:bg-apple-gray-800/50 transition-colors text-left"
            >
              <div className={`w-7 h-7 rounded-full ${resultColor(m.result)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                {m.result === 'W' ? 'G' : m.result === 'D' ? 'E' : 'P'}
              </div>
              <ShieldImg team={m.rival} size={36} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-apple-gray-900 dark:text-white font-medium text-sm">{m.isHome ? 'vs' : 'en'} {m.rival}</span>
                  <span className={`text-xs font-bold ${resultText(m.result)}`}>{m.golesAFavor}–{m.golesEnContra}</span>
                  <div className="flex items-center gap-1">
                    <CompBadge competition={m.competition} size={13} />
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: COMP_COLORS[m.competition] + '30', color: COMP_COLORS[m.competition] }}>
                      {COMP_LABELS[m.competition]}
                    </span>
                  </div>
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
              m.xG === 0 && m.tiros === 0 && m.pases === 0 ? (
                <div className="border-t border-apple-gray-200 dark:border-apple-gray-800 p-4 bg-apple-gray-50 dark:bg-apple-gray-800/60">
                  <p className="text-xs text-apple-gray-500 italic">Stats Wyscout del partido en carga — disponibles próximamente.</p>
                </div>
              ) : (
              <div className="border-t border-apple-gray-200 dark:border-apple-gray-800 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-apple-gray-50 dark:bg-apple-gray-800/60">
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
                    <p className="text-[10px] text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-apple-gray-900 dark:text-white font-medium">{value}</p>
                  </div>
                ))}
              </div>
              )
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
        <div className="flex items-center gap-3 flex-shrink-0">
          <img src="/lanus-escudo.png" alt="Lanús" className="w-10 h-10 object-contain" />
          <span className="text-apple-gray-400 dark:text-apple-gray-500 font-bold text-lg">vs</span>
          <div className="w-10 h-10 flex items-center justify-center">
            <ShieldImg team={rivalName} size={40} fallbackInitials={false} />
          </div>
        </div>
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
      <div className="flex gap-1 bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-1 w-fit">
        {(['form', 'csv', 'texto'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setInputMode(mode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              inputMode === mode ? 'bg-brand-green text-white' : 'text-apple-gray-500 dark:text-apple-gray-400 hover:text-apple-gray-900 dark:hover:text-white'
            }`}
          >
            {mode === 'form' ? '📋 Formulario' : mode === 'csv' ? '📂 CSV estadístico' : '✍️ Texto libre'}
          </button>
        ))}
      </div>

      {/* Input form */}
      {inputMode === 'form' && (
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-5 space-y-4">
          <p className="text-sm text-apple-gray-400">Subí el archivo Excel/CSV de estadísticas del rival (mismo formato que Team Stats Lanús.xlsx).</p>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-apple-gray-200 dark:border-apple-gray-700 hover:border-brand-green rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <div className="text-4xl mb-2">📂</div>
            <p className="text-apple-gray-300 group-hover:text-white text-sm font-medium">Click para subir CSV / Excel</p>
            <p className="text-apple-gray-500 text-xs mt-1">Formato Team Stats · .xlsx, .csv</p>
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
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-5 space-y-3">
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
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-5">
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
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-5">
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
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-5 grid grid-cols-2 gap-4">
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
        <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-5">
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

// ─── TabAnalisis (merged: charts + stats + detailed wyscout sections) ──────────
function TabAnalisis({ matches }: { matches: MatchData[] }) {
  const [wyscoutData, setWyscoutData] = useState<WyscoutData | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))
  const n = matches.length || 1

  // ── Totals ──
  const totGoles   = matches.reduce((s, m) => s + m.golesAFavor, 0)
  const totGC      = matches.reduce((s, m) => s + m.golesRecibidos, 0)
  const totAtaqPos = matches.reduce((s, m) => s + m.ataquesPositionales, 0)
  const totContra  = matches.reduce((s, m) => s + m.contraataques, 0)
  const totBalonP  = matches.reduce((s, m) => s + m.balonParado, 0)
  const totCentros = matches.reduce((s, m) => s + m.centros, 0)
  const totCenPrc  = matches.reduce((s, m) => s + m.centrosPrecisos, 0)
  const totPasePrg = matches.reduce((s, m) => s + m.pasesProgresivos, 0)
  const totPaseUT  = matches.reduce((s, m) => s + m.pasesUltimoTercio, 0)
  const totInterc  = matches.reduce((s, m) => s + m.interceptaciones, 0)
  const totDesp    = matches.reduce((s, m) => s + m.despejes, 0)
  const totTiros   = matches.reduce((s, m) => s + m.tiros, 0)
  const totTirosP  = matches.reduce((s, m) => s + m.tirosPorteria, 0)
  const totCorners = matches.reduce((s, m) => s + m.corners, 0)

  // ── Time series ──
  const rivalLabel = (m: MatchData) => {
    const p = m.rival.split(' ')
    return p[0].length <= 3 && p[1] ? `${p[0]} ${p[1]}` : p[0]
  }
  const series = sorted.map((m) => ({
    f: rivalLabel(m),
    posicional: m.ataquesPositionales,
    contra: m.contraataques,
    balonP: m.balonParado,
    centros: m.centros,
    cenPrx: m.centrosPrecisos,
    progresivos: m.pasesProgresivos,
    ultimoTercio: m.pasesUltimoTercio,
    interceptaciones: m.interceptaciones,
    despejes: m.despejes,
    tiros: m.tiros,
    tirosPorteria: m.tirosPorteria,
    goles: m.golesAFavor,
    golesContra: m.golesRecibidos,
    xG: m.xG,
    posesion: Math.round(m.posesion),
    pases: Math.round(m.pases_pct),
    ppda: m.ppda,
  }))

  const dark = { backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: 8, color: '#f9fafb', fontSize: 11 }
  const mg   = { top: 5, right: 8, left: -18, bottom: 0 }
  const tick = { fill: '#6b7280', fontSize: 9 }

  // Card wrapper — adaptive light/dark
  const card = 'bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none'

  function SectionHeader({ title }: { title: string }) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-5 bg-[#8C1430] dark:bg-brand-green rounded-full" />
        <h3 className="text-xs font-bold tracking-widest uppercase text-apple-gray-600 dark:text-apple-gray-300">{title}</h3>
      </div>
    )
  }

  function KpiBox({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
    return (
      <div className="bg-apple-gray-50 dark:bg-[#0f1923] border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl p-3 text-center">
        <p className={`text-2xl font-black tabular-nums ${accent ?? 'text-apple-gray-900 dark:text-white'}`}>{value}</p>
        <p className="text-[10px] text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider leading-tight mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-apple-gray-400 dark:text-apple-gray-500 mt-0.5">{sub}</p>}
      </div>
    )
  }

  // ── Stats table insight logic ──
  function getInsight(label: string, val: number): { text: string; color: string } {
    if (label === 'Goles/partido')       return val >= 1.5 ? { text: 'Efectivo', color: 'text-emerald-400' } : val >= 1 ? { text: 'Normal', color: 'text-apple-gray-400' } : { text: 'Bajo', color: 'text-red-400' }
    if (label === 'xG/partido')          return val >= 1.5 ? { text: 'Generación alta', color: 'text-emerald-400' } : val >= 1 ? { text: 'Moderado', color: 'text-apple-gray-400' } : { text: 'Por debajo', color: 'text-red-400' }
    if (label === 'Posesión %')          return val >= 55 ? { text: 'Dominante', color: 'text-emerald-400' } : val >= 45 ? { text: 'Equilibrado', color: 'text-apple-gray-400' } : { text: 'Sin pelota', color: 'text-amber-400' }
    if (label === 'Precisión pase %')    return val >= 85 ? { text: 'Alta', color: 'text-emerald-400' } : val >= 80 ? { text: 'Normal', color: 'text-apple-gray-400' } : { text: 'Baja', color: 'text-red-400' }
    if (label === 'Tiros/partido')       return val >= 14 ? { text: 'Ofensivo', color: 'text-emerald-400' } : val >= 10 ? { text: 'Normal', color: 'text-apple-gray-400' } : { text: 'Escaso', color: 'text-amber-400' }
    if (label === 'Duelos ganados %')    return val >= 52 ? { text: 'Superior', color: 'text-emerald-400' } : val >= 48 ? { text: 'Equilibrado', color: 'text-apple-gray-400' } : { text: 'Inferior', color: 'text-red-400' }
    if (label === 'PPDA')                return val < 9 ? { text: 'Pressing alto', color: 'text-emerald-400' } : val < 14 ? { text: 'Moderado', color: 'text-apple-gray-400' } : { text: 'Bloque bajo', color: 'text-amber-400' }
    if (label === 'Goles concedidos/pdo') return val <= 0.8 ? { text: 'Sólido', color: 'text-emerald-400' } : val <= 1.3 ? { text: 'Normal', color: 'text-apple-gray-400' } : { text: 'Permisivo', color: 'text-red-400' }
    if (label === 'Pases prog./partido') return val >= 50 ? { text: 'Muy progresivo', color: 'text-emerald-400' } : val >= 35 ? { text: 'Normal', color: 'text-apple-gray-400' } : { text: 'Conservador', color: 'text-amber-400' }
    if (label === 'Interceptaciones/pdo') return val >= 10 ? { text: 'Activo', color: 'text-emerald-400' } : val >= 7 ? { text: 'Normal', color: 'text-apple-gray-400' } : { text: 'Bajo', color: 'text-amber-400' }
    return { text: '—', color: 'text-apple-gray-500' }
  }

  return (
    <div className="space-y-6 text-apple-gray-900 dark:text-white">

      {/* ── xG vs Goles ── */}
      <div className={card}>
        <SectionHeader title="xG vs Goles reales por partido" />
        <p className="text-[11px] text-apple-gray-500 mb-4 -mt-2">Cuánto generamos vs cuánto concretamos</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={series} margin={mg}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
            <XAxis dataKey="f" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={dark} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="xG"         stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="xG" />
            <Line type="monotone" dataKey="goles"       stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="Goles" />
            <Line type="monotone" dataKey="golesContra" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} name="Goles concedidos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Patrones de ataque ── */}
      <div className={card}>
        <SectionHeader title="Patrones de ataque" />
        <p className="text-[11px] text-apple-gray-500 mb-4 -mt-2">Ataques posicionales / Contraataques / Balón parado</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <KpiBox label="Ataques posicionales" value={totAtaqPos} sub={`${fmt1(totAtaqPos/n)}/pdo`} />
          <KpiBox label="Contraataques"         value={totContra}  sub={`${fmt1(totContra/n)}/pdo`} />
          <KpiBox label="Balón parado"           value={totBalonP}  sub={`${fmt1(totBalonP/n)}/pdo`} />
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={series} margin={mg}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
            <XAxis dataKey="f" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={dark} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="posicional" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.4} name="Posicional"   strokeWidth={1.5} />
            <Area type="monotone" dataKey="contra"     stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} name="Contraataque" strokeWidth={1.5} />
            <Area type="monotone" dataKey="balonP"     stackId="1" stroke="#9333ea" fill="#9333ea" fillOpacity={0.4} name="Balón parado" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>

        {/* ── Zonas de ataque ── */}
        <div className="mt-5 pt-4 border-t border-apple-gray-100 dark:border-apple-gray-800">
          <p className="text-[10px] text-apple-gray-500 uppercase tracking-wider mb-3">Zonas de ataque · Temporada 2026</p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <MiniPitchZones zones={[
              { x: 54, y: 2,  w: 49, h: 20, value: '—', label: 'Banda izq.',   color: 'rgba(140,20,48,0.30)' },
              { x: 54, y: 24, w: 49, h: 20, value: '—', label: 'Carril cent.', color: 'rgba(140,20,48,0.30)' },
              { x: 54, y: 46, w: 49, h: 20, value: '—', label: 'Banda der.',   color: 'rgba(140,20,48,0.30)' },
            ]} />
            <div className="flex-1 space-y-2 min-w-[160px]">
              {[
                { label: 'Banda izquierda', value: '—', pct: 0, color: 'bg-slate-400' },
                { label: 'Carril central',  value: '—', pct: 0, color: 'bg-slate-500' },
                { label: 'Banda derecha',   value: '—', pct: 0, color: 'bg-slate-400' },
              ].map(z => (
                <div key={z.label}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-apple-gray-600 dark:text-apple-gray-400">{z.label}</span>
                    <span className="font-semibold text-apple-gray-900 dark:text-white">{z.value}</span>
                  </div>
                  <div className="h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full">
                    <div className={`h-full rounded-full ${z.color} opacity-40`} style={{ width: `${z.pct}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-apple-gray-400 dark:text-apple-gray-600 mt-2 italic">
                Datos disponibles al cargar informe PDF actualizado
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Posesión y pressing ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={card}>
          <SectionHeader title="Posesión y precisión de pase" />
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={series} margin={mg}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
              <XAxis dataKey="f" tick={tick} />
              <YAxis domain={[20, 100]} tick={tick} />
              <Tooltip contentStyle={dark} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={50} stroke="#4b5563" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="posesion" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="Posesión %" />
              <Area type="monotone" dataKey="pases"    stroke="#16a34a" fill="#16a34a" fillOpacity={0.10} strokeWidth={2} name="Precisión pase %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={card}>
          <SectionHeader title="Pressing (PPDA)" />
          <p className="text-[11px] text-apple-gray-500 mb-3 -mt-2">Más bajo = más intenso · &lt;9 alto · 9–14 moderado · &gt;14 bloque bajo</p>
          <ResponsiveContainer width="100%" height={165}>
            <AreaChart data={series} margin={mg}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
              <XAxis dataKey="f" tick={tick} />
              <YAxis domain={[0, 20]} tick={tick} />
              <Tooltip contentStyle={dark} />
              <ReferenceLine y={9}  stroke="#16a34a" strokeDasharray="3 3" label={{ value: '9', fill: '#16a34a', fontSize: 8 }} />
              <ReferenceLine y={14} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '14', fill: '#f59e0b', fontSize: 8 }} />
              <Area type="monotone" dataKey="ppda" stroke="#9333ea" fill="#9333ea" fillOpacity={0.2} strokeWidth={2} name="PPDA" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Enhanced stats table ── */}
      <div className={`${card} overflow-x-auto`}>
        <SectionHeader title="Promedios generales · Temporada 2026" />
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-apple-gray-800">
              {['Métrica', 'Promedio', 'Máx', 'Mín', 'Nivel'].map(h => (
                <th key={h} className="text-left text-[10px] text-apple-gray-500 font-semibold pb-2 pr-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-apple-gray-800/40">
            {([
              ['Goles/partido',       avg(matches, 'golesAFavor'),      Math.max(...matches.map(m => m.golesAFavor)),      Math.min(...matches.map(m => m.golesAFavor))],
              ['xG/partido',          avg(matches, 'xG'),               Math.max(...matches.map(m => m.xG)),               Math.min(...matches.map(m => m.xG))],
              ['Posesión %',          avg(matches, 'posesion'),         Math.max(...matches.map(m => m.posesion)),         Math.min(...matches.map(m => m.posesion))],
              ['Precisión pase %',    avg(matches, 'pases_pct'),        Math.max(...matches.map(m => m.pases_pct)),        Math.min(...matches.map(m => m.pases_pct))],
              ['Tiros/partido',       avg(matches, 'tiros'),            Math.max(...matches.map(m => m.tiros)),            Math.min(...matches.map(m => m.tiros))],
              ['Duelos ganados %',    avg(matches, 'duelos_pct'),       Math.max(...matches.map(m => m.duelos_pct)),       Math.min(...matches.map(m => m.duelos_pct))],
              ['PPDA',                avg(matches, 'ppda'),             Math.max(...matches.map(m => m.ppda)),             Math.min(...matches.map(m => m.ppda))],
              ['Goles concedidos/pdo', avg(matches, 'golesRecibidos'),  Math.max(...matches.map(m => m.golesRecibidos)),   Math.min(...matches.map(m => m.golesRecibidos))],
              ['Pases prog./partido', avg(matches, 'pasesProgresivos'), Math.max(...matches.map(m => m.pasesProgresivos)), Math.min(...matches.map(m => m.pasesProgresivos))],
              ['Interceptaciones/pdo', avg(matches, 'interceptaciones'), Math.max(...matches.map(m => m.interceptaciones)), Math.min(...matches.map(m => m.interceptaciones))],
            ] as [string, number, number, number][]).map(([label, a, max, min]) => {
              const ins = getInsight(label, a)
              return (
                <tr key={label}>
                  <td className="py-2 pr-3 text-apple-gray-600 dark:text-apple-gray-300 text-xs">{label}</td>
                  <td className="py-2 pr-3 text-apple-gray-900 dark:text-white font-bold tabular-nums text-sm">{fmt1(a)}</td>
                  <td className="py-2 pr-3 text-emerald-400 tabular-nums text-xs">{fmt1(max)}</td>
                  <td className="py-2 pr-3 text-red-400 tabular-nums text-xs">{fmt1(min)}</td>
                  <td className="py-2">
                    <span className={`text-[10px] font-semibold ${ins.color}`}>{ins.text}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Goles ── */}
      <div className={card}>
        <SectionHeader title="Goles · Total torneo" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <KpiBox label="Goles a favor"     value={totGoles}          accent="text-emerald-400" />
          <KpiBox label="Goles en contra"   value={totGC}             accent="text-red-400" />
          <KpiBox label="Promedio a favor"  value={fmt1(totGoles / n)} sub={`${n} partidos`} accent="text-emerald-400" />
          <KpiBox label="Promedio en contra" value={fmt1(totGC / n)}   accent="text-red-400" />
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={series} margin={mg}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
            <XAxis dataKey="f" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={dark} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="goles"       fill="#16a34a" name="A favor"   radius={[3,3,0,0]} />
            <Bar dataKey="golesContra" fill="#ef4444" name="En contra" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Aproximaciones y centros ── */}
      <div className={card}>
        <SectionHeader title="Aproximaciones y centros" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <KpiBox label="Centros totales"  value={totCentros} sub={`${fmt1(totCentros/n)}/pdo`} />
          <KpiBox label="Centros precisos" value={totCenPrc}  accent="text-emerald-400" sub={`${fmtPct(totCenPrc/Math.max(totCentros,1)*100)} precisión`} />
          <KpiBox label="Corners"           value={totCorners} sub={`${fmt1(totCorners/n)}/pdo`} />
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={series} margin={mg}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
            <XAxis dataKey="f" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={dark} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="centros" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="Centros" />
            <Line type="monotone" dataKey="cenPrx"  stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} name="Precisos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Circulaciones ── */}
      <div className={card}>
        <SectionHeader title="Circulaciones (pases progresivos)" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <KpiBox label="Pases progresivos" value={totPasePrg} sub={`${fmt1(totPasePrg/n)}/pdo`} />
          <KpiBox label="Último tercio"      value={totPaseUT}  sub={`${fmt1(totPaseUT/n)}/pdo`} />
          <KpiBox label="Máx. / partido"    value={Math.max(...matches.map(m=>m.pasesProgresivos))} accent="text-emerald-400" />
          <KpiBox label="Mín. / partido"    value={Math.min(...matches.map(m=>m.pasesProgresivos))} accent="text-amber-400" />
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={series} margin={mg}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
            <XAxis dataKey="f" tick={tick} />
            <YAxis tick={tick} />
            <Tooltip contentStyle={dark} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="progresivos"  stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2} name="Pases prog." />
            <Area type="monotone" dataKey="ultimoTercio" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} name="Último tercio" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Salidas + Recuperadas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={card}>
          <SectionHeader title="Salidas (tiros propios)" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <KpiBox label="Tiros totales" value={totTiros}  sub={`${fmt1(totTiros/n)}/pdo`} />
            <KpiBox label="A portería"    value={totTirosP} accent="text-emerald-400" sub={`${fmtPct(totTirosP/Math.max(totTiros,1)*100)} precisión`} />
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={series} margin={mg}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
              <XAxis dataKey="f" tick={tick} />
              <YAxis tick={tick} />
              <Tooltip contentStyle={dark} />
              <Bar dataKey="tiros"         fill="#6b7280" name="Tiros"      radius={[2,2,0,0]} />
              <Bar dataKey="tirosPorteria" fill="#16a34a" name="A portería" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={card}>
          <SectionHeader title="Recuperadas e interceptaciones" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <KpiBox label="Interceptaciones" value={totInterc} sub={`${fmt1(totInterc/n)}/pdo`} accent="text-emerald-400" />
            <KpiBox label="Despejes"          value={totDesp}  sub={`${fmt1(totDesp/n)}/pdo`} />
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={series} margin={mg}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" className="dark:[stroke:#374151]" />
              <XAxis dataKey="f" tick={tick} />
              <YAxis tick={tick} />
              <Tooltip contentStyle={dark} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="interceptaciones" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} name="Intercepciones" />
              <Line type="monotone" dataKey="despejes"         stroke="#6b7280" strokeWidth={2} dot={{ r: 2 }} name="Despejes" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Recuperaciones de balón (heatmap) ── */}
      {(() => {
        const recovData: ZoneCell[][] = wyscoutData?.recoveries?.map(row =>
          row.map(c => ({ value: parseFloat(c.value) || c.value, count: c.count ?? undefined }))
        ) ?? DEFAULT_RECOVERIES
        return (
          <div className={card}>
            <SectionHeader title="Recuperaciones de balón · Zonas" />
            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1.5 text-[10px] text-apple-gray-400"><span className="w-3 h-3 rounded-sm bg-emerald-500/60 inline-block" />Alta concentración</span>
              <span className="flex items-center gap-1.5 text-[10px] text-apple-gray-400"><span className="w-3 h-3 rounded-sm bg-emerald-900/40 inline-block" />Baja concentración</span>
            </div>
            <ZoneHeatmap colorMode="green" compact data={recovData} />
          </div>
        )
      })()}

      {/* ── Pérdidas de balón (heatmap) ── */}
      {(() => {
        const lossData: ZoneCell[][] = wyscoutData?.losses?.map(row =>
          row.map(c => ({ value: parseFloat(c.value) || c.value, count: c.count ?? undefined }))
        ) ?? DEFAULT_LOSSES
        return (
          <div className={card}>
            <SectionHeader title="Pérdidas de balón · Zonas" />
            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1.5 text-[10px] text-apple-gray-400"><span className="w-3 h-3 rounded-sm bg-red-900/40 inline-block" />Baja concentración</span>
              <span className="flex items-center gap-1.5 text-[10px] text-apple-gray-400"><span className="w-3 h-3 rounded-sm bg-red-500/60 inline-block" />Alta concentración</span>
            </div>
            <ZoneHeatmap colorMode="red" compact data={lossData} />
          </div>
        )
      })()}

      {/* ── Actualizar datos con informe PDF ── */}
      <div>
        {!showUpload ? (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 text-xs text-apple-gray-400 hover:text-white border border-apple-gray-200 dark:border-apple-gray-700 rounded-xl px-4 py-2.5 transition-colors hover:border-apple-gray-500"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Actualizar datos con informe PDF
          </button>
        ) : (
          <div className="space-y-2">
            <WyscoutUploadZone
              current={wyscoutData}
              onData={(d) => { setWyscoutData(d); setShowUpload(false) }}
            />
            <button
              onClick={() => setShowUpload(false)}
              className="text-xs text-apple-gray-500 hover:text-apple-gray-300 transition-colors px-2"
            >
              ← Cancelar y seguir con los datos actuales
            </button>
          </div>
        )}
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
      <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-5 space-y-4">
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
            <div key={note.id} className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl shadow-sm dark:shadow-none p-4 space-y-2">
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

// ─── Mini pitch with zone overlays ────────────────────────────────────────────
// zones: array of { x, y, w, h, value, label, color }
interface PitchZoneData { x: number; y: number; w: number; h: number; value: number | string; label: string; color: string }

function MiniPitchZones({ zones, title }: { zones: PitchZoneData[]; title?: string }) {
  const pl  = 'rgba(255,255,255,0.25)'
  const pls = 'rgba(255,255,255,0.15)'
  return (
    <div className="flex flex-col items-center gap-2">
      {title && <p className="text-[10px] text-apple-gray-400 uppercase tracking-wider">{title}</p>}
      <svg viewBox="0 0 105 68" xmlns="http://www.w3.org/2000/svg" className="w-full rounded-xl" style={{ maxWidth: 340 }}>
        {/* Background */}
        <rect x="0" y="0" width="105" height="68" fill="#163d22" rx="3" />
        {/* Zone overlays */}
        {zones.map((z, i) => (
          <g key={i}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color} rx="2" opacity="0.75" />
            <text x={z.x + z.w / 2} y={z.y + z.h / 2 - 2.5} textAnchor="middle" dominantBaseline="middle"
              fontSize="5.5" fontWeight="700" fill="white" opacity="0.95">{z.value}</text>
            <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 4} textAnchor="middle" dominantBaseline="middle"
              fontSize="3.2" fill="rgba(255,255,255,0.75)">{z.label}</text>
          </g>
        ))}
        {/* Pitch lines */}
        <rect x="2" y="2" width="101" height="64" fill="none" stroke={pl} strokeWidth="0.9" />
        <line x1="52.5" y1="2" x2="52.5" y2="66" stroke={pl} strokeWidth="0.7" />
        <circle cx="52.5" cy="34" r="9.15" fill="none" stroke={pl} strokeWidth="0.7" />
        <circle cx="52.5" cy="34" r="0.85" fill={pl} />
        <rect x="2" y="14.5" width="17" height="39" fill="none" stroke={pls} strokeWidth="0.6" />
        <rect x="2" y="24" width="6" height="20" fill="none" stroke={pls} strokeWidth="0.55" />
        <path d="M19,27.5 A9.15,9.15 0 0 1 19,40.5" fill="none" stroke={pls} strokeWidth="0.6" />
        <rect x="86" y="14.5" width="17" height="39" fill="none" stroke={pls} strokeWidth="0.6" />
        <rect x="97" y="24" width="6" height="20" fill="none" stroke={pls} strokeWidth="0.55" />
        <path d="M86,27.5 A9.15,9.15 0 0 0 86,40.5" fill="none" stroke={pls} strokeWidth="0.6" />
        <rect x="1"     y="29" width="1.5" height="10" fill="none" stroke={pl} strokeWidth="0.6" />
        <rect x="102.5" y="29" width="1.5" height="10" fill="none" stroke={pl} strokeWidth="0.6" />
        <circle cx="12" cy="34" r="0.75" fill={pls} />
        <circle cx="93" cy="34" r="0.75" fill={pls} />
      </svg>
    </div>
  )
}

// ─── Default zone data (from CA Lanús Wyscout PDF, 5 jornadas 2026) ─────────
const DEFAULT_RECOVERIES: ZoneCell[][] = [
  [{ value: 10.5, count: 9  }, { value: 14.3, count: 13 }, { value: 6.1, count: 5  }],
  [{ value: 23.3, count: 21 }, { value: 13.7, count: 12 }, { value: 4.7, count: 4  }],
  [{ value: 10.8, count: 10 }, { value: 12.3, count: 11 }, { value: 4.3, count: 4  }],
]
const DEFAULT_LOSSES: ZoneCell[][] = [
  [{ value: 6.4,  count: 7  }, { value: 15.8, count: 17 }, { value: 12.1, count: 13 }],
  [{ value: 11.0, count: 12 }, { value: 12.3, count: 13 }, { value: 10.7, count: 12 }],
  [{ value: 7.7,  count: 8  }, { value: 13.1, count: 14 }, { value: 10.8, count: 12 }],
]
const DEFAULT_CORNER_KICKERS = [
  { name: 'D. Aquino',    total: 9, left: 5, right: 4 },
  { name: 'E. Salvio',    total: 6, left: 3, right: 3 },
  { name: 'M. Sepúlveda', total: 1, left: 1, right: 0 },
]

// ─── ZoneHeatmap ──────────────────────────────────────────────────────────────
interface ZoneCell { value: string | number; count?: number }

function ZoneHeatmap({ data, colorMode, compact }: { data: ZoneCell[][]; colorMode: 'green' | 'red'; compact?: boolean }) {
  const pl  = 'rgba(255,255,255,0.28)'
  const pls = 'rgba(255,255,255,0.16)'
  const bandY  = [2, 23, 45]
  const bandH  = [21, 22, 21]
  const thirdX = [2, 36, 70]
  const thirdW = [34, 34, 33]

  return (
    <div style={{ maxWidth: compact ? 460 : 560 }} className="mx-auto space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="flex flex-col justify-around" style={{ minWidth: 50, paddingTop: 18 }}>
          {['Banda izq.', 'Centro', 'Banda der.'].map(l => (
            <p key={l} className="text-[8px] text-apple-gray-500 uppercase tracking-wide text-right leading-none py-[3px]">{l}</p>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-3 mb-1">
            {['Ter. def.', 'Ter. medio', 'Ter. of.'].map(l => (
              <p key={l} className="text-[9px] text-apple-gray-500 uppercase tracking-wide text-center">{l}</p>
            ))}
          </div>
          <svg viewBox="0 0 105 68" xmlns="http://www.w3.org/2000/svg" className="w-full rounded-xl">
            <rect x="0" y="0" width="105" height="68" fill="#163d22" rx="3" />
            {bandY.map((by, bi) =>
              thirdX.map((tx, ti) => {
                const cell: ZoneCell = data[bi]?.[ti] ?? { value: '—' }
                const num = typeof cell.value === 'number' ? cell.value : null
                const alpha = num !== null ? Math.min(0.62, num / 30) : 0.0
                const fill = colorMode === 'green'
                  ? `rgba(34,197,94,${0.07 + alpha})`
                  : `rgba(239,68,68,${0.07 + alpha})`
                const cx = tx + thirdW[ti] / 2
                const cy = by + bandH[bi] / 2
                return (
                  <g key={`${bi}-${ti}`}>
                    <rect x={tx} y={by} width={thirdW[ti]} height={bandH[bi]} fill={fill} />
                    <text x={cx} y={cy - (cell.count !== undefined ? 2.5 : 0)}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="6.5" fontWeight="800" fill="white" opacity="0.9">
                      {typeof cell.value === 'number' ? `${cell.value}%` : cell.value}
                    </text>
                    {cell.count !== undefined && (
                      <text x={cx} y={cy + 4} textAnchor="middle" dominantBaseline="middle"
                        fontSize="3.5" fill="rgba(255,255,255,0.55)">{cell.count}</text>
                    )}
                  </g>
                )
              })
            )}
            {/* Grid dashes */}
            <line x1="36" y1="2" x2="36" y2="66" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" strokeDasharray="2,2" />
            <line x1="70" y1="2" x2="70" y2="66" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" strokeDasharray="2,2" />
            <line x1="2" y1="23" x2="103" y2="23" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" strokeDasharray="2,2" />
            <line x1="2" y1="45" x2="103" y2="45" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" strokeDasharray="2,2" />
            {/* Pitch lines */}
            <rect x="2" y="2" width="101" height="64" fill="none" stroke={pl} strokeWidth="0.9" />
            <line x1="52.5" y1="2" x2="52.5" y2="66" stroke={pl} strokeWidth="0.8" />
            <circle cx="52.5" cy="34" r="9.15" fill="none" stroke={pl} strokeWidth="0.7" />
            <circle cx="52.5" cy="34" r="0.85" fill={pl} />
            <rect x="2" y="14.5" width="17" height="39" fill="none" stroke={pls} strokeWidth="0.6" />
            <rect x="2" y="24" width="6" height="20" fill="none" stroke={pls} strokeWidth="0.55" />
            <path d="M19,27.5 A9.15,9.15 0 0 1 19,40.5" fill="none" stroke={pls} strokeWidth="0.6" />
            <rect x="86" y="14.5" width="17" height="39" fill="none" stroke={pls} strokeWidth="0.6" />
            <rect x="97" y="24" width="6" height="20" fill="none" stroke={pls} strokeWidth="0.55" />
            <path d="M86,27.5 A9.15,9.15 0 0 0 86,40.5" fill="none" stroke={pls} strokeWidth="0.6" />
            <rect x="1" y="29" width="1.5" height="10" fill="none" stroke={pl} strokeWidth="0.6" />
            <rect x="102.5" y="29" width="1.5" height="10" fill="none" stroke={pl} strokeWidth="0.6" />
            <circle cx="12" cy="34" r="0.75" fill={pls} />
            <circle cx="93" cy="34" r="0.75" fill={pls} />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ─── CornerHalfPitch ──────────────────────────────────────────────────────────
function CornerHalfPitch({ side, total }: { side: 'left' | 'right'; total: number }) {
  const pl  = 'rgba(255,255,255,0.30)'
  const pls = 'rgba(255,255,255,0.16)'
  // Half pitch (attacking end): viewBox "0 0 54 68"
  // x=0 = midfield line, x=52 = goal line
  // Corners at goal-line corners: left=y≈2 (top), right=y≈66 (bottom)
  const cornerY = side === 'left' ? 2 : 66
  const arrowD  = side === 'left'
    ? 'M52,3  Q40,14 38,27'
    : 'M52,65 Q40,54 38,41'
  const nearY = side === 'left' ? 14.5 : 44
  const farY  = side === 'left' ? 44   : 14.5

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] text-apple-gray-400 uppercase tracking-wider font-semibold">
        {side === 'left' ? 'Córneres izquierdos' : 'Córneres derechos'}
      </p>
      <svg viewBox="0 0 54 68" xmlns="http://www.w3.org/2000/svg" className="w-full rounded-xl" style={{ maxWidth: 220 }}>
        <rect x="0" y="0" width="54" height="68" fill="#163d22" rx="3" />

        {/* Zone overlays inside penalty area */}
        <rect x="33" y={nearY} width="19" height="11" fill="rgba(234,179,8,0.28)"  rx="1" />
        <rect x="33" y="26"    width="19" height="16" fill="rgba(59,130,246,0.22)" rx="1" />
        <rect x="33" y={farY}  width="19" height="11" fill="rgba(168,85,247,0.22)" rx="1" />

        {/* Trajectory arrow */}
        <path d={arrowD} fill="none" stroke="rgba(255,255,255,0.50)" strokeWidth="0.9" strokeDasharray="2,1.5" />

        {/* Pitch boundary */}
        <rect x="2" y="2" width="50" height="64" fill="none" stroke={pl} strokeWidth="0.9" />

        {/* Midfield dashed marker */}
        <line x1="2" y1="2" x2="2" y2="66" stroke="rgba(255,255,255,0.16)" strokeWidth="0.5" strokeDasharray="2.5,2" />

        {/* Penalty area */}
        <rect x="33" y="14.5" width="19" height="39" fill="none" stroke={pls} strokeWidth="0.7" />

        {/* Goal box */}
        <rect x="44" y="24" width="8" height="20" fill="none" stroke={pls} strokeWidth="0.55" />

        {/* Penalty arc */}
        <path d="M33,27.5 A9.15,9.15 0 0 0 33,40.5" fill="none" stroke={pls} strokeWidth="0.6" />

        {/* Goal */}
        <rect x="52" y="29" width="2" height="10" fill="rgba(255,255,255,0.10)" stroke={pl} strokeWidth="0.6" />

        {/* Penalty spot */}
        <circle cx="44" cy="34" r="0.75" fill={pls} />

        {/* Corner flag (red dot) */}
        <circle cx="52" cy={cornerY} r="2.2" fill="#ef4444" opacity="0.9" />

        {/* Zone placeholder values */}
        <text x="42.5" y={nearY + 5.5} textAnchor="middle" dominantBaseline="middle"
          fontSize="4.5" fontWeight="700" fill="rgba(255,255,255,0.65)">—</text>
        <text x="42.5" y="34" textAnchor="middle" dominantBaseline="middle"
          fontSize="4.5" fontWeight="700" fill="rgba(255,255,255,0.65)">—</text>
        <text x="42.5" y={farY + 5.5} textAnchor="middle" dominantBaseline="middle"
          fontSize="4.5" fontWeight="700" fill="rgba(255,255,255,0.65)">—</text>

        {/* "MITAD ADVERSARIA" rotated */}
        <text x="9" y="34" textAnchor="middle" dominantBaseline="middle"
          fontSize="2.6" fill="rgba(255,255,255,0.20)" letterSpacing="0.2"
          transform="rotate(-90,9,34)">MITAD ADVERSARIA</text>
      </svg>
      <div className="flex items-center gap-3 text-[10px] text-apple-gray-500">
        <span>Total <span className="text-white font-bold">{total > 0 ? total : '—'}</span></span>
        <span className="w-px h-3 bg-apple-gray-700" />
        <span>Goles <span className="text-white font-bold">—</span></span>
      </div>
      {/* Zone legend */}
      <div className="flex gap-3 text-[9px] text-apple-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500/50 inline-block" />Palo cercano</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/50 inline-block" />Centro</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500/50 inline-block" />Palo lejano</span>
      </div>
    </div>
  )
}

// ─── WyscoutUploadZone ────────────────────────────────────────────────────────
interface WyscoutUploadProps {
  current?: WyscoutData | null
  onData: (d: WyscoutData) => void
  mode?: 'propio' | 'rival'
}

function WyscoutUploadZone({ current, onData, mode = 'propio' }: WyscoutUploadProps) {
  const [status, setStatus]   = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg]   = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processPdfFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatus('err'); setErrMsg('Solo se aceptan archivos PDF.'); return
    }
    setStatus('loading')
    try {
      const data = await parseWyscoutPdf(file)
      onData(data)
      setStatus('ok')
    } catch {
      setStatus('err')
      setErrMsg('No se pudo leer el PDF. Verificá que sea un informe de equipo válido.')
    }
  }, [onData])

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processPdfFile(file)
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processPdfFile(file)
    e.target.value = ''
  }

  const isLoading = status === 'loading'

  return (
    <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-5 bg-brand-green rounded-full" />
        <h3 className="text-xs font-bold tracking-widest uppercase text-apple-gray-600 dark:text-apple-gray-300">
          {mode === 'rival' ? 'Informe PDF del rival' : 'Actualizar con informe PDF'}
        </h3>
        {current && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-brand-green bg-brand-green/10 border border-brand-green/20 rounded-full px-2.5 py-1 font-semibold">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Datos cargados · {current.fileName}
          </span>
        )}
      </div>

      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-brand-green bg-brand-green/10'
            : 'border-apple-gray-700 hover:border-apple-gray-500 hover:bg-apple-gray-800/40'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !isLoading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onChange}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-apple-gray-400">
            <svg className="w-8 h-8 animate-spin text-brand-green" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium">Procesando PDF…</p>
            <p className="text-xs text-apple-gray-500">Extrayendo zonas, córneres y transiciones</p>
          </div>
        ) : status === 'ok' ? (
          <div className="flex flex-col items-center gap-2 text-brand-green">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm font-semibold">PDF procesado correctamente</p>
            <p className="text-xs text-apple-gray-400">Los datos de zona se actualizaron. Arrastrá otro PDF para reemplazar.</p>
          </div>
        ) : status === 'err' ? (
          <div className="flex flex-col items-center gap-2 text-red-400">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm font-semibold">Error al procesar</p>
            <p className="text-xs text-apple-gray-500">{errMsg}</p>
            <p className="text-xs text-apple-gray-600 mt-1">Hacé click para intentar con otro archivo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-apple-gray-400">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <div>
              <p className="text-sm font-semibold text-white">
                {mode === 'rival' ? 'Arrastrá el informe PDF del rival aquí' : 'Arrastrá el informe PDF del equipo aquí'}
              </p>
              <p className="text-xs text-apple-gray-500 mt-1">o hacé click para seleccionarlo</p>
            </div>
            <div className="flex gap-4 text-[10px] text-apple-gray-600 mt-1">
              <span>✓ Recuperaciones de balón</span>
              <span>✓ Pérdidas de balón</span>
              <span>✓ Córneres</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-apple-gray-600 mt-3 text-center">
        {mode === 'rival'
          ? 'Subí el informe PDF del rival. Se actualizan automáticamente las zonas de calor y córneres.'
          : 'Subí el informe de equipo (PDF). Se actualizan automáticamente las zonas de calor, córneres y transiciones. Alimentalo partido a partido.'}
      </p>
    </div>
  )
}

const RIVAL_STORAGE_KEY = 'lanus_rival_analysis_v5'
const ULTIMO_PARTIDO_STORAGE_KEY = 'lanus_ultimo_partido_v1'

// ─── summarizeExtraction ──────────────────────────────────────────────────────
// Devuelve una lista de strings legibles sobre qué datos se extrajeron de un archivo.
function summarizeExtraction(partial: PartialRivalData): string[] {
  const tags: string[] = []

  if (partial.teamName) tags.push(`Equipo: ${partial.teamName}`)

  const formations = partial.recentFormations ?? []
  if (formations.length > 0) {
    tags.push(`${formations.length} formación${formations.length > 1 ? 'es' : ''}`)
    const totalPlayers = formations.reduce((sum, f) => sum + (f.players?.length ?? 0), 0)
    if (totalPlayers > 0) tags.push(`${totalPlayers} jugadores`)
  }

  if (partial.players && partial.players.length > 0) {
    tags.push(`${partial.players.length} jugadores con stats`)
  }

  const ts = partial.teamStats
  if (ts) {
    if (ts.avgXG && ts.avgXG > 0) tags.push(`xG: ${ts.avgXG.toFixed(2)}`)
    if (ts.avgPosesion && ts.avgPosesion > 0) tags.push(`Posesión: ${ts.avgPosesion.toFixed(0)}%`)
    if (ts.avgTiros && ts.avgTiros > 0) tags.push(`Remates: ${ts.avgTiros.toFixed(1)}`)
    if (ts.avgPases && ts.avgPases > 0) tags.push(`Pases: ${ts.avgPases.toFixed(0)}`)
    if (ts.avgPPDA && ts.avgPPDA > 0) tags.push(`PPDA: ${ts.avgPPDA.toFixed(2)}`)
  }

  if (partial.recentMatches && partial.recentMatches.length > 0) {
    tags.push(`${partial.recentMatches.length} partidos`)
  }

  if (partial.recoveries) tags.push('Mapa recuperaciones')
  if (partial.losses) tags.push('Mapa pérdidas')

  const corners = (partial.cornersLeft ?? 0) + (partial.cornersRight ?? 0)
  if (corners > 0) tags.push(`${corners} córneres`)

  if (partial.tacticalNotes && partial.tacticalNotes.length > 0) tags.push('Notas tácticas')
  if (partial.fullAnalysis) tags.push('Análisis IA completo')

  if (tags.length === 0) tags.push('Sin datos reconocidos')
  return tags
}

// ─── MultiFileUploadZone ──────────────────────────────────────────────────────
interface UploadedFileState {
  file: File
  status: 'pending' | 'processing' | 'ok' | 'err'
  error?: string
  extracted?: string[]
}

interface MultiFileUploadZoneProps {
  current: RivalData | null
  onData: (d: RivalData) => void
  /** Llamado cuando se extraen páginas del PDF (imágenes session-only) */
  onPdfPages?: (pages: PdfPage[]) => void
  /** Llamado cuando Claude termina de analizar las páginas */
  onPdfInsights?: (insights: PdfPageInsight[]) => void
  /** true mientras hay insights analizándose */
  onLoadingInsights?: (loading: boolean) => void
  /** Label del título */
  label?: string
}

function MultiFileUploadZone({ current, onData, onPdfPages, onPdfInsights, onLoadingInsights, label }: MultiFileUploadZoneProps) {
  const [files, setFiles] = useState<UploadedFileState[]>([])
  const [dragging, setDragging] = useState(false)
  const [globalErr, setGlobalErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.csv'
  const TYPES_LABEL = 'PDF · Imágenes · CSV'

  const addFiles = useCallback(async (newFiles: File[]) => {
    if (!newFiles.length) return
    setGlobalErr('')

    const states: UploadedFileState[] = newFiles.map(f => ({ file: f, status: 'pending' }))
    setFiles(prev => {
      const existing = new Set(prev.map(p => p.file.name))
      return [...prev, ...states.filter(s => !existing.has(s.file.name))]
    })

    // Arrancar con los datos ya existentes como base para el merge
    const partials: PartialRivalData[] = []
    if (current) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { parsedAt: _ignored, ...existingPartial } = current
      partials.push(existingPartial)
    }

    const pdfFiles: File[] = []

    for (const state of states) {
      setFiles(prev => prev.map(p =>
        p.file.name === state.file.name ? { ...p, status: 'processing' } : p
      ))
      try {
        const partial = await processFile(state.file)
        partials.push(partial)
        const extracted = summarizeExtraction(partial)
        setFiles(prev => prev.map(p =>
          p.file.name === state.file.name ? { ...p, status: 'ok', extracted } : p
        ))
        if (state.file.name.toLowerCase().endsWith('.pdf')) {
          pdfFiles.push(state.file)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido'
        setFiles(prev => prev.map(p =>
          p.file.name === state.file.name ? { ...p, status: 'err', error: msg } : p
        ))
      }
    }

    // Fusionar datos estructurados (nuevos archivos + datos existentes)
    const newPartials = partials.slice(current ? 1 : 0) // solo los nuevos
    if (newPartials.length === 0) return
    try {
      const merged = mergeRivalData(partials)
      onData(merged)
    } catch (e) {
      setGlobalErr(e instanceof Error ? e.message : 'Error al fusionar archivos')
    }

    // Extracción de imágenes + análisis visual en background (solo PDFs)
    if (pdfFiles.length > 0 && (onPdfPages || onPdfInsights)) {
      ;(async () => {
        const allPages: PdfPage[] = []
        for (const pdf of pdfFiles) {
          try {
            const pages = await extractPdfPages(pdf)
            allPages.push(...pages)
          } catch (e) {
            console.warn('Error extrayendo páginas del PDF:', e)
          }
        }
        if (allPages.length > 0) {
          onPdfPages?.(allPages)  // imágenes disponibles de inmediato
          onLoadingInsights?.(true)
          try {
            const insights = await analyzePdfPages(allPages)
            onPdfInsights?.(insights)
          } catch (e) {
            console.warn('Error analizando páginas con IA:', e)
          } finally {
            onLoadingInsights?.(false)
          }
        }
      })()
    }
  }, [current, onData, onPdfPages, onPdfInsights, onLoadingInsights])

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  const sourceIcon = (src: FileSource) => {
    if (src.type === 'pdf') return '📄'
    if (src.type === 'image') return '🖼️'
    if (src.type === 'csv') return '📊'
    return '📎'
  }

  return (
    <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-blue-500 rounded-full" />
        <h3 className="text-xs font-bold tracking-widest uppercase text-apple-gray-600 dark:text-apple-gray-300">
          {label ?? 'Informe del rival'}
        </h3>
        {current && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1 font-semibold">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {current.sources.length} archivo{current.sources.length !== 1 ? 's' : ''} cargado{current.sources.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Archivos cargados actualmente (desde localStorage) */}
      {current && current.sources.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold tracking-widest uppercase text-apple-gray-500">
            Archivos cargados
          </p>
          <div className="flex flex-wrap gap-2">
            {current.sources.map((src, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/25 rounded-full px-2.5 py-1 font-medium"
              >
                {sourceIcon(src)}
                <span className="max-w-[200px] truncate">{src.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-apple-gray-700 hover:border-apple-gray-500 hover:bg-apple-gray-800/40'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={onChange}
        />
        <svg className="w-8 h-8 mx-auto mb-2 text-apple-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm font-semibold text-white">
          {current ? 'Agregar más archivos al análisis' : 'Arrastrá archivos aquí'}
        </p>
        <p className="text-xs text-apple-gray-500 mt-1">{TYPES_LABEL} · Podés tirar varios a la vez</p>
        <p className="text-[10px] text-apple-gray-600 mt-2">
          PDF: extrae formaciones, tarjetas, cambios y estadísticas con IA · Imágenes y CSV también soportados
        </p>
      </div>

      {/* Lista de archivos con estado y datos extraídos */}
      {files.length > 0 && (
        <div className="space-y-2.5">
          {files.map((f, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-apple-gray-400 flex-1 truncate">{f.file.name}</span>
                {f.status === 'pending' && <span className="text-apple-gray-600">En cola…</span>}
                {f.status === 'processing' && (
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analizando…
                  </span>
                )}
                {f.status === 'ok' && <span className="text-emerald-400 font-semibold">✓ Listo</span>}
                {f.status === 'err' && (
                  <span className="text-red-400 truncate max-w-[200px]" title={f.error}>✗ {f.error}</span>
                )}
              </div>
              {/* Tags de datos extraídos */}
              {f.status === 'ok' && f.extracted && f.extracted.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-0">
                  {f.extracted.map((tag, ti) => (
                    <span
                      key={ti}
                      className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {globalErr && <p className="text-xs text-red-400">{globalErr}</p>}
    </div>
  )
}

// ─── TabAnalisisRival ─────────────────────────────────────────────────────────
function TabAnalisisRival({ matches }: { matches: MatchData[] }) {
  const [rivalName, setRivalName] = useState('')
  const [nextMatch, setNextMatch] = useState<{ date: Date } | null>(null)

  // ── Datos de archivos arrastrados (PDF / imagen / CSV Wyscout) ──
  const [rivalData, setRivalDataState] = useState<RivalData | null>(() => {
    try { return JSON.parse(localStorage.getItem(RIVAL_STORAGE_KEY) ?? 'null') } catch { return null }
  })
  const setRivalData = (data: RivalData | null) => {
    setRivalDataState(data)
    if (data) localStorage.setItem(RIVAL_STORAGE_KEY, JSON.stringify(data))
    else localStorage.removeItem(RIVAL_STORAGE_KEY)
  }

  // ── Datos desde Google Sheets (estado separado, auto-carga) ──
  const [sheetsData, setSheetsData] = useState<PartialRivalData | null>(null)
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [sheetsError, setSheetsError] = useState('')

  const loadFromSheets = useCallback(async () => {
    setSheetsLoading(true)
    setSheetsError('')
    try {
      const data = await fetchRivalSheetData()
      setSheetsData(data)
    } catch (e) {
      setSheetsError(e instanceof Error ? e.message : 'Error al cargar Google Sheets')
    } finally {
      setSheetsLoading(false)
    }
  }, [])

  useEffect(() => { loadFromSheets() }, [loadFromSheets])

  // ── Rival desde calendario ──
  useEffect(() => {
    fetchLanusCalendar().then(calendar => {
      const now = new Date()
      const next = calendar.find(m => m.date >= now)
      if (next) {
        setRivalName(next.isHome ? next.awayTeam : next.homeTeam)
        setNextMatch({ date: next.date })
      }
    }).catch(() => {})
  }, [])

  // ── PDF pages (solo session) ──
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)

  // ── Promedios Lanús para comparación ──
  const lanusAvg = useMemo(() => ({
    posesion:         avg(matches, 'posesion'),
    xG:               avg(matches, 'xG'),
    ppda:             avg(matches, 'ppda'),
    pases_pct:        avg(matches, 'pases_pct'),
    tiros:            avg(matches, 'tiros'),
    tirosPorteria_pct: avg(matches, 'tirosPorteria_pct'),
    duelos_pct:       avg(matches, 'duelos_pct'),
    interceptaciones: avg(matches, 'interceptaciones'),
    faltas:           avg(matches, 'faltas'),
  }), [matches])

  // ── Derivados del Sheets ──
  const sheetMatches = sheetsData?.recentMatches ?? []
  const ts = sheetsData?.teamStats

  const derivedRecord = useMemo(() => {
    if (!sheetMatches.length) return null
    const w = sheetMatches.filter(m => m.result === 'W').length
    const d = sheetMatches.filter(m => m.result === 'D').length
    const l = sheetMatches.filter(m => m.result === 'L').length
    const gf = sheetMatches.reduce((s, m) => s + (m.isHome ? m.homeScore : m.awayScore), 0)
    const gc = sheetMatches.reduce((s, m) => s + (m.isHome ? m.awayScore : m.homeScore), 0)
    return { w, d, l, gf, gc, partidos: sheetMatches.length }
  }, [sheetMatches])

  const autoInsights = useMemo(() => {
    const ins: string[] = []
    if (!ts) return ins
    if (ts.avgPosesion !== undefined) {
      if (ts.avgPosesion < 43) ins.push('Bloque bajo — el rival cede la pelota y defiende con orden. Buscar espacios con cambios de ritmo.')
      else if (ts.avgPosesion > 55) ins.push('Equipo posesionista — presión alta y robo en campo rival son clave para quitarles el control.')
    }
    if (ts.avgPPDA !== undefined) {
      if (ts.avgPPDA < 8) ins.push('Pressing muy intenso (PPDA bajo). Salidas rápidas por banda y pases largos para evitar la trampa.')
      else if (ts.avgPPDA > 14) ins.push('Bajo nivel de pressing (PPDA alto). Espacio entre líneas disponible para mediapunta y enganches.')
    }
    if (ts.avgXG !== undefined && lanusAvg.xG > 0) {
      if (ts.avgXG > lanusAvg.xG + 0.4) ins.push(`El rival genera más xG que Lanús (${ts.avgXG.toFixed(2)} vs ${lanusAvg.xG.toFixed(2)}). Atención defensiva en el area.`)
      else if (ts.avgXG < lanusAvg.xG - 0.4) ins.push(`Lanús genera más xG que el rival (${lanusAvg.xG.toFixed(2)} vs ${ts.avgXG.toFixed(2)}). Ventaja ofensiva esperada.`)
    }
    if (ts.contraataques !== undefined && ts.contraataques > 2.5) ins.push('El rival es peligroso al contragolpe. Cuidar la transición defensiva.')
    if (ts.ataquesPositionales !== undefined && ts.balonParado !== undefined && ts.balonParado > ts.ataquesPositionales * 0.4) ins.push('Alta proporción de jugadas de balón parado — prestar especial atención a esquinas y tiros libres.')
    if (ts.avgAmarillas !== undefined && ts.avgAmarillas > 2.5) ins.push('Rival con alta cantidad de amarillas — pueden perder marca en algún momento del partido.')
    if (derivedRecord) {
      const diff = derivedRecord.gf - derivedRecord.gc
      if (diff > 4) ins.push('Diferencia de gol muy positiva en 2026 — equipo en gran momento.')
      else if (diff < -3) ins.push('Diferencia de gol negativa — equipo con dificultades ofensivas o defensivas en este período.')
    }
    return ins
  }, [ts, lanusAvg, derivedRecord])

  // ── Archivos arrastrables ──
  const rivalRecoveries: ZoneCell[][] = rivalData?.recoveries?.map(row =>
    row.map(c => ({ value: parseFloat(c.value as string) || c.value, count: c.count ?? undefined }))
  ) ?? []
  const rivalLosses: ZoneCell[][] = rivalData?.losses?.map(row =>
    row.map(c => ({ value: parseFloat(c.value as string) || c.value, count: c.count ?? undefined }))
  ) ?? []
  const hasCorners = rivalData && (rivalData.cornersLeft > 0 || rivalData.cornersRight > 0 || rivalData.cornersKickers.length > 0)

  const displayName = sheetsData?.teamName || rivalData?.teamName || rivalName

  const card = 'bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none'

  function SH({ title, right }: { title: string; right?: React.ReactNode }) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-5 bg-[#6F1929] rounded-full" />
        <h3 className="text-xs font-bold tracking-widest uppercase text-apple-gray-600 dark:text-apple-gray-300 flex-1">{title}</h3>
        {right}
      </div>
    )
  }

  function KpiBox({ label, value, accent, sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
    return (
      <div className="bg-apple-gray-50 dark:bg-[#0f1923] border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl p-3 text-center">
        <p className={`text-xl font-black tabular-nums leading-none ${accent ?? 'text-apple-gray-900 dark:text-white'}`}>{value}</p>
        {sub && <p className="text-[9px] text-apple-gray-500 mt-0.5">{sub}</p>}
        <p className="text-[10px] text-apple-gray-500 dark:text-apple-gray-400 uppercase tracking-wider leading-tight mt-1">{label}</p>
      </div>
    )
  }

  const resColor = (r: 'W' | 'D' | 'L') =>
    r === 'W' ? 'bg-emerald-500' : r === 'D' ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="space-y-6">

      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#6F1929]/15 to-transparent border border-[#6F1929]/25 rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <img src="/lanus-escudo.png" alt="Lanús" className="w-10 h-10 object-contain" />
          <span className="text-apple-gray-400 font-bold text-xl">vs</span>
          <ShieldImg team={displayName} size={40} fallbackInitials={false} />
        </div>
        <div>
          <p className="text-[10px] text-[#6F1929] dark:text-red-400 uppercase tracking-widest font-semibold">Análisis de rival</p>
          <p className="text-apple-gray-900 dark:text-white text-lg font-bold leading-tight">
            Lanús vs {displayName || '—'}
          </p>
          {nextMatch && (
            <p className="text-apple-gray-400 text-xs mt-0.5">
              {nextMatch.date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        <div className="flex-1" />
        {rivalData && (
          <button
            onClick={() => setRivalData(null)}
            className="text-xs text-apple-gray-500 hover:text-red-400 border border-apple-gray-200 dark:border-apple-gray-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            Limpiar archivos
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 1 — ARCHIVOS (formaciones, mapas, análisis IA)
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-blue-500/20 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 bg-blue-500/5 border-b border-blue-500/20 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Informes de partido</span>
          <span className="text-[10px] text-apple-gray-500 ml-1">PDF · imágenes · CSV</span>
        </div>
        <div className="p-5 space-y-5">
          <MultiFileUploadZone
            current={rivalData}
            onData={merged => {
              setRivalDataState(prev => {
                const d = { ...merged }
                localStorage.setItem(RIVAL_STORAGE_KEY, JSON.stringify(d))
                return d
              })
            }}
            onPdfPages={setPdfPages}
            onPdfInsights={ins => {
              setRivalDataState(prev => {
                if (!prev) return null
                const d = { ...prev, pdfPageInsights: ins }
                localStorage.setItem(RIVAL_STORAGE_KEY, JSON.stringify(d))
                return d
              })
            }}
            onLoadingInsights={setLoadingInsights}
          />

          {rivalData && (<>
            {/* 1. Formaciones — primero (solo si no hay fullAnalysis, que ya las incluye) */}
            {!rivalData.fullAnalysis && rivalData.recentFormations && rivalData.recentFormations.length > 0 && (
              <div>
                <SH title={`Formaciones · ${rivalData.recentFormations.length} partido${rivalData.recentFormations.length !== 1 ? 's' : ''}`} />
                <FormationsGrid formations={rivalData.recentFormations} />
              </div>
            )}

            {/* 2. Informe completo (Claude) — incluye formaciones + análisis por sección */}
            {rivalData.fullAnalysis && (
              <RivalComprehensiveReport fa={rivalData.fullAnalysis} pdfPages={pdfPages} pdfInsights={rivalData.pdfPageInsights ?? []} />
            )}

            {/* 3. Análisis IA por páginas PDF — después del informe */}
            {(loadingInsights || (rivalData.pdfPageInsights && rivalData.pdfPageInsights.length > 0)) && (
              <PdfPagesViewer
                insights={rivalData.pdfPageInsights ?? []}
                loadingInsights={loadingInsights}
              />
            )}

            {/* 4. Mapas de calor */}
            {rivalRecoveries.length > 0 && (
              <div>
                <SH title="Recuperaciones de balón" />
                <div className="flex items-center gap-4 mb-3">
                  <span className="flex items-center gap-1.5 text-[10px] text-apple-gray-400"><span className="w-3 h-3 rounded-sm bg-emerald-500/60 inline-block" />Alta concentración</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-apple-gray-400"><span className="w-3 h-3 rounded-sm bg-emerald-900/40 inline-block" />Baja</span>
                </div>
                <ZoneHeatmap colorMode="green" compact data={rivalRecoveries} />
              </div>
            )}
            {rivalLosses.length > 0 && (
              <div>
                <SH title="Pérdidas de balón" />
                <div className="flex items-center gap-4 mb-3">
                  <span className="flex items-center gap-1.5 text-[10px] text-apple-gray-400"><span className="w-3 h-3 rounded-sm bg-red-500/60 inline-block" />Alta concentración</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-apple-gray-400"><span className="w-3 h-3 rounded-sm bg-red-900/40 inline-block" />Baja</span>
                </div>
                <ZoneHeatmap colorMode="red" compact data={rivalLosses} />
              </div>
            )}

            {/* 5. Córneres */}
            {hasCorners && (() => {
              const total = rivalData.cornersLeft + rivalData.cornersRight
              const pctL = total > 0 ? Math.round((rivalData.cornersLeft / total) * 100) : 50
              const pctR = 100 - pctL
              return (
                <div>
                  <SH title="Córneres" />
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      <KpiBox label="Total" value={total} />
                      <KpiBox label="Izquierda" value={rivalData.cornersLeft} accent="text-blue-400" />
                      <KpiBox label="Derecha" value={rivalData.cornersRight} accent="text-purple-400" />
                      {rivalData.cornersGoals > 0 && <KpiBox label="Goles" value={rivalData.cornersGoals} accent="text-emerald-400" />}
                    </div>
                    {total > 0 && (
                      <div className="flex rounded-full overflow-hidden h-5">
                        <div className="bg-blue-500/80 flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${pctL}%` }}>
                          {pctL > 15 ? `${pctL}% izq` : ''}
                        </div>
                        <div className="bg-purple-500/80 flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${pctR}%` }}>
                          {pctR > 15 ? `${pctR}% der` : ''}
                        </div>
                      </div>
                    )}
                    {rivalData.cornersKickers.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-apple-gray-100 dark:border-apple-gray-800">
                        <p className="text-[10px] text-apple-gray-500 uppercase tracking-wider">Tiradores</p>
                        {rivalData.cornersKickers.map((k, i) => {
                          const maxT = rivalData.cornersKickers[0]?.total || 1
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-apple-gray-500 w-4">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-apple-gray-900 dark:text-white truncate">{k.name}</span>
                                  <span className="text-sm font-bold text-white ml-2">{k.total}</span>
                                </div>
                                <div className="h-1.5 bg-apple-gray-800 rounded-full overflow-hidden flex">
                                  <div className="h-full bg-blue-500/70" style={{ width: `${(k.left / maxT) * 100}%` }} />
                                  <div className="h-full bg-purple-500/70" style={{ width: `${(k.right / maxT) * 100}%` }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* 6. Fortalezas / debilidades / notas (IA — solo si no hay fullAnalysis) */}
            {!rivalData.fullAnalysis && (rivalData.strengths?.length > 0 || rivalData.weaknesses?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rivalData.strengths?.length > 0 && (
                  <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-3 font-bold">Fortalezas</p>
                    <ul className="space-y-2">
                      {rivalData.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-apple-gray-200 leading-relaxed flex gap-2">
                          <span className="text-emerald-400 flex-shrink-0">+</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {rivalData.weaknesses?.length > 0 && (
                  <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                    <p className="text-xs text-red-400 uppercase tracking-wider mb-3 font-bold">Debilidades</p>
                    <ul className="space-y-2">
                      {rivalData.weaknesses.map((s, i) => (
                        <li key={i} className="text-sm text-apple-gray-200 leading-relaxed flex gap-2">
                          <span className="text-red-400 flex-shrink-0">−</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {!rivalData.fullAnalysis && rivalData.tacticalNotes?.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4">
                <p className="text-xs text-amber-400 uppercase tracking-wider mb-3 font-bold">Notas tácticas</p>
                <ul className="space-y-2">
                  {rivalData.tacticalNotes.map((n, i) => (
                    <li key={i} className="text-sm text-apple-gray-200 leading-relaxed flex gap-2">
                      <span className="text-amber-400 flex-shrink-0">▸</span>{n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>)}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 2 — DATOS COLECTIVOS 2026 (Google Sheets)
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-emerald-500/20 rounded-2xl overflow-hidden">
        {/* Header de sección */}
        <div className="px-5 py-3 bg-emerald-500/5 border-b border-emerald-500/20 flex items-center gap-3">
          <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7H7v-1h6v1zm0 2H7v-1h6v1zm-2 2H7v-1h4v1zm3-9.5V3.5L18.5 8H14z"/>
          </svg>
          <div className="flex-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Datos colectivos 2026</span>
            {sheetsData?.teamName && (
              <span className="text-[10px] text-apple-gray-400 ml-2">· {sheetsData.teamName} · {sheetMatches.length} partidos</span>
            )}
          </div>
          <button
            onClick={loadFromSheets}
            disabled={sheetsLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              sheetsLoading
                ? 'text-apple-gray-500 cursor-not-allowed'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            {sheetsLoading ? (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {sheetsLoading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {/* Aviso temporal: Always Ready tiene pocos partidos 2026 */}
        {sheetsData?.teamName && /always\s*ready/i.test(sheetsData.teamName) && (
          <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
            <p className="text-[11px] text-amber-300 leading-relaxed">
              <span className="font-semibold">Nota:</span> por falta de datos, solamente se muestran partidos de Liga Bolivia 2025 y Copa Libertadores 2026.
            </p>
          </div>
        )}

        {/* Loading */}
        {sheetsLoading && !sheetsData && (
          <div className="p-10 flex flex-col items-center gap-3">
            <svg className="w-7 h-7 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs text-apple-gray-500">Cargando datos del rival desde Google Sheets…</p>
          </div>
        )}

        {/* Error */}
        {sheetsError && !sheetsData && (
          <div className="p-6">
            {sheetsError === 'NEEDS_PUBLISH' ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-amber-400">El sheet no está publicado en la web</p>
                <p className="text-xs text-apple-gray-400 leading-relaxed">
                  Para que la app pueda leer los datos, necesitás publicar la hoja como CSV:
                </p>
                <ol className="text-xs text-apple-gray-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Abrí el spreadsheet del rival en Google Sheets</li>
                  <li>Menú <span className="text-white font-semibold">Archivo → Compartir → Publicar en la web</span></li>
                  <li>Seleccioná la hoja <span className="text-white font-semibold">Rival 1</span></li>
                  <li>Formato: <span className="text-white font-semibold">Valores separados por comas (.csv)</span></li>
                  <li>Hacé click en <span className="text-white font-semibold">Publicar</span> y confirmá</li>
                </ol>
                <p className="text-[10px] text-apple-gray-500">Después de publicar, el botón Actualizar debería funcionar correctamente.</p>
                <button onClick={loadFromSheets} className="mt-1 text-xs text-blue-400 hover:text-blue-300 underline">Reintentar ahora</button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-red-400">{sheetsError}</p>
                <button onClick={loadFromSheets} className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline">Reintentar</button>
              </div>
            )}
          </div>
        )}

        {/* Contenido */}
        {sheetsData && (
          <div className="p-5 space-y-6">

            {/* ── Record + Form strip ── */}
            {derivedRecord && (
              <div>
                {/* Record */}
                <div className="flex flex-wrap items-center gap-4 mb-5 pb-5 border-b border-apple-gray-100 dark:border-apple-gray-800">
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="text-4xl font-black text-emerald-400 tabular-nums leading-none">{derivedRecord.w}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mt-1">V</p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-black text-amber-400 tabular-nums leading-none">{derivedRecord.d}</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-wider mt-1">E</p>
                    </div>
                    <div className="text-center">
                      <p className="text-4xl font-black text-red-400 tabular-nums leading-none">{derivedRecord.l}</p>
                      <p className="text-[10px] text-red-600 dark:text-red-500 uppercase tracking-wider mt-1">D</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-apple-gray-200 dark:bg-apple-gray-700 hidden sm:block" />
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-black text-apple-gray-900 dark:text-white tabular-nums">{derivedRecord.gf}</p>
                      <p className="text-[10px] text-apple-gray-500 uppercase tracking-wider mt-1">GF</p>
                    </div>
                    <div className="text-[10px] text-apple-gray-500 font-bold">:</div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-apple-gray-900 dark:text-white tabular-nums">{derivedRecord.gc}</p>
                      <p className="text-[10px] text-apple-gray-500 uppercase tracking-wider mt-1">GC</p>
                    </div>
                  </div>
                  <div className="flex-1" />
                  <p className="text-[10px] text-apple-gray-500">{derivedRecord.partidos} partidos en 2026</p>
                </div>

                {/* Form strip */}
                <div>
                  <p className="text-[10px] text-apple-gray-500 uppercase tracking-wider mb-2">Últimos resultados</p>
                  <div className="flex gap-2 flex-wrap">
                    {sheetMatches.slice(0, 10).map((m, i) => {
                      const rival = m.isHome ? m.awayTeam : m.homeTeam
                      const shortRival = rival.split(' ')[0]
                      const score = `${m.homeScore}–${m.awayScore}`
                      return (
                        <div key={i} className="group relative flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded-full ${resColor(m.result)} flex items-center justify-center text-[10px] font-bold text-white`}>
                            {m.result === 'W' ? 'G' : m.result === 'D' ? 'E' : 'P'}
                          </div>
                          <p className="text-[8px] text-apple-gray-500 max-w-[36px] text-center truncate">{shortRival}</p>
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex bg-apple-gray-900 border border-apple-gray-700 text-white text-[10px] rounded-xl px-3 py-2 whitespace-nowrap z-10 flex-col items-center gap-1 shadow-xl pointer-events-none">
                            <span className="font-semibold">{m.isHome ? `vs ${m.awayTeam}` : `en ${m.homeTeam}`}</span>
                            <span className="text-apple-gray-300">{score} · {m.date}</span>
                            <span className="text-apple-gray-500 text-[9px]">{m.competition}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── KPIs clave ── */}
            {ts && (
              <div>
                <SH title="Estadísticas promedio por partido" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ts.avgXG           !== undefined && <KpiBox label="xG / partido"         value={fmt1(ts.avgXG)}           accent="text-blue-400" />}
                  {ts.avgPosesion     !== undefined && <KpiBox label="Posesión %"            value={fmtPct(ts.avgPosesion)}   />}
                  {ts.avgPPDA         !== undefined && <KpiBox label="PPDA"                  value={fmt1(ts.avgPPDA)}          sub="↓ = más presión" />}
                  {ts.avgPases        !== undefined && <KpiBox label="Precisión pase"        value={fmtPct(ts.avgPases)}      />}
                  {ts.avgTiros        !== undefined && <KpiBox label="Tiros / partido"       value={fmt1(ts.avgTiros)}        />}
                  {ts.avgTirosPorteria_pct !== undefined && <KpiBox label="Tiros a portería %" value={fmtPct(ts.avgTirosPorteria_pct)} />}
                  {ts.avgDuelos_pct   !== undefined && <KpiBox label="Duelos ganados %"     value={fmtPct(ts.avgDuelos_pct)} />}
                  {ts.interceptaciones !== undefined && <KpiBox label="Interceptaciones"    value={fmt1(ts.interceptaciones)} />}
                  {ts.avgBalonesRecuperados !== undefined && <KpiBox label="Balones recup."  value={fmt1(ts.avgBalonesRecuperados)} accent="text-emerald-400" />}
                  {ts.avgBalonesPerdidos    !== undefined && <KpiBox label="Balones perdidos" value={fmt1(ts.avgBalonesPerdidos)}   accent="text-red-400" />}
                  {ts.avgFaltas       !== undefined && <KpiBox label="Faltas / partido"     value={fmt1(ts.avgFaltas)}       />}
                  {ts.avgAmarillas    !== undefined && <KpiBox label="Amarillas / partido"  value={fmt1(ts.avgAmarillas)}    accent="text-amber-400" />}
                </div>
              </div>
            )}

            {/* ── Perfil de ataque ── */}
            {ts && (ts.ataquesPositionales !== undefined || ts.contraataques !== undefined || ts.balonParado !== undefined) && (
              <div>
                <SH title="Perfil ofensivo" />
                <div className="space-y-3">
                  {[
                    { label: 'Ataques posicionales', value: ts.ataquesPositionales, remate: ts.ataquesPositionalesRemate, color: 'bg-blue-500' },
                    { label: 'Contraataques',         value: ts.contraataques,       remate: ts.contraataquesRemate,       color: 'bg-orange-500' },
                    { label: 'Balón parado',          value: ts.balonParado,         remate: undefined,                   color: 'bg-purple-500' },
                  ].filter(r => r.value !== undefined).map(row => {
                    const maxVal = Math.max(ts.ataquesPositionales ?? 0, ts.contraataques ?? 0, ts.balonParado ?? 0, 1)
                    const pct = Math.round(((row.value ?? 0) / maxVal) * 100)
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <p className="text-xs text-apple-gray-400 w-40 flex-shrink-0">{row.label}</p>
                        <div className="flex-1 h-2.5 bg-apple-gray-200 dark:bg-apple-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-bold text-apple-gray-900 dark:text-white w-8 text-right tabular-nums">{fmt1(row.value ?? 0)}</span>
                        {row.remate !== undefined && (
                          <span className="text-[10px] text-apple-gray-500 w-16">({fmt1(row.remate)} rem.)</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Comparación vs Lanús ── */}
            {ts && (
              <div>
                <SH title="Comparación vs Lanús" />
                <div className="space-y-2.5">
                  {[
                    { label: 'Posesión %',        lan: lanusAvg.posesion,          riv: ts.avgPosesion,          fmt: fmtPct, high: true },
                    { label: 'xG / partido',       lan: lanusAvg.xG,                riv: ts.avgXG,                fmt: fmt1,   high: true },
                    { label: 'PPDA',               lan: lanusAvg.ppda,              riv: ts.avgPPDA,              fmt: fmt1,   high: false },
                    { label: 'Precisión pase %',   lan: lanusAvg.pases_pct,         riv: ts.avgPases,             fmt: fmtPct, high: true },
                    { label: 'Tiros a portería %', lan: lanusAvg.tirosPorteria_pct, riv: ts.avgTirosPorteria_pct, fmt: fmtPct, high: true },
                    { label: 'Duelos ganados %',   lan: lanusAvg.duelos_pct,        riv: ts.avgDuelos_pct,        fmt: fmtPct, high: true },
                  ].filter(r => r.riv !== undefined && r.lan > 0).map(row => {
                    const lv = row.lan
                    const rv = row.riv as number
                    const total = lv + rv || 1
                    const lanPct = Math.round((lv / total) * 100)
                    const rivPct = 100 - lanPct
                    const lanWins = row.high ? lv >= rv : lv <= rv
                    return (
                      <div key={row.label} className="flex items-center gap-2">
                        <p className="text-[10px] text-apple-gray-400 w-36 flex-shrink-0 truncate">{row.label}</p>
                        <span className={`text-xs font-bold w-12 text-right tabular-nums ${lanWins ? 'text-emerald-400' : 'text-apple-gray-300 dark:text-apple-gray-500'}`}>
                          {row.fmt(lv)}
                        </span>
                        <div className="flex-1 flex h-2.5 rounded-full overflow-hidden gap-px bg-apple-gray-200 dark:bg-apple-gray-800">
                          <div className={`h-full ${lanWins ? 'bg-[#6F1929]' : 'bg-apple-gray-400 dark:bg-apple-gray-600'} rounded-l-full`} style={{ width: `${lanPct}%` }} />
                          <div className={`h-full ${!lanWins ? 'bg-blue-500' : 'bg-apple-gray-400 dark:bg-apple-gray-600'} rounded-r-full`} style={{ width: `${rivPct}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-12 tabular-nums ${!lanWins ? 'text-blue-400' : 'text-apple-gray-300 dark:text-apple-gray-500'}`}>
                          {row.fmt(rv)}
                        </span>
                        <div className="flex gap-1.5 flex-shrink-0 text-[9px] text-apple-gray-600">
                          <span>LAN</span><span>RIV</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Lista de partidos ── */}
            {sheetMatches.length > 0 && (
              <div>
                <SH title={`Todos los partidos 2026 · ${sheetMatches.length}`} />
                <div className="space-y-1.5">
                  {sheetMatches.map((m, i) => {
                    const rival = m.isHome ? m.awayTeam : m.homeTeam
                    return (
                      <div key={i} className="flex items-center gap-3 py-1.5 border-b border-apple-gray-100 dark:border-apple-gray-800 last:border-0">
                        <div className={`w-7 h-7 rounded-full ${resColor(m.result)} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                          {m.result === 'W' ? 'G' : m.result === 'D' ? 'E' : 'P'}
                        </div>
                        <ShieldImg team={rival} size={22} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-apple-gray-900 dark:text-white">{m.isHome ? 'vs' : 'en'} {rival}</span>
                          <span className="text-[10px] text-apple-gray-500 ml-2">{m.date}</span>
                        </div>
                        <span className={`text-xs font-bold ${m.result === 'W' ? 'text-emerald-400' : m.result === 'D' ? 'text-amber-400' : 'text-red-400'}`}>
                          {m.homeScore}–{m.awayScore}
                        </span>
                        <span className="text-[10px] text-apple-gray-500 hidden sm:block max-w-[140px] truncate">{m.competition}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Insights tácticos automáticos ── */}
            {autoInsights.length > 0 && (
              <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4">
                <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-3 font-bold">Insights automáticos</p>
                <ul className="space-y-2">
                  {autoInsights.map((ins, i) => (
                    <li key={i} className="text-sm text-apple-gray-200 leading-relaxed flex gap-2">
                      <span className="text-blue-400 flex-shrink-0 mt-0.5">▸</span>{ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sheetsError && <p className="text-xs text-red-400">{sheetsError}</p>}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── SmartDataHint ────────────────────────────────────────────────────────────
// Muestra qué datos están disponibles y qué falta en el análisis del partido.
function SmartDataHint({ data, hasLanusRecord }: { data: RivalData | null; hasLanusRecord: boolean }) {
  if (!data) return null

  interface DataField {
    label: string
    present: boolean
    hint?: string   // qué arrastrar si falta
  }

  const ts = data.teamStats
  const fields: DataField[] = [
    { label: 'Formación', present: (data.recentFormations?.length ?? 0) > 0, hint: 'PDF del partido' },
    { label: 'Jugadores', present: (data.recentFormations?.[0]?.players?.length ?? 0) > 0, hint: 'PDF del partido' },
    { label: 'xG rival', present: !!(ts?.avgXG && ts.avgXG > 0), hint: 'Datos estadísticos del rival' },
    { label: 'Posesión rival', present: !!(ts?.avgPosesion && ts.avgPosesion > 0), hint: 'Datos estadísticos del rival' },
    { label: 'Remates rival', present: !!(ts?.avgTiros && ts.avgTiros > 0), hint: 'Datos estadísticos del rival' },
    { label: 'Datos Lanús', present: hasLanusRecord, hint: 'Cargar resultados de Lanús en base de datos' },
    { label: 'Notas tácticas', present: data.tacticalNotes.length > 0, hint: 'PDF o texto del partido' },
    { label: 'Análisis IA', present: !!data.fullAnalysis, hint: 'PDF completo del partido' },
  ]

  const present = fields.filter(f => f.present).length
  const total = fields.length
  const pct = Math.round((present / total) * 100)

  const missing = fields.filter(f => !f.present)
  // Agrupar hints únicos de los campos faltantes
  const uniqueHints = [...new Set(missing.map(f => f.hint).filter(Boolean))]

  const barColor = pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none space-y-3">
      {/* Header + barra */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-purple-500 rounded-full" />
        <h3 className="text-xs font-bold tracking-widest uppercase text-apple-gray-600 dark:text-apple-gray-300 flex-1">
          Datos disponibles
        </h3>
        <span className={`text-xs font-black tabular-nums ${pct >= 75 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
          {present}/{total}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 w-full bg-apple-gray-100 dark:bg-apple-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>

      {/* Chips de campos */}
      <div className="flex flex-wrap gap-1.5">
        {fields.map((f, i) => (
          <span
            key={i}
            className={`text-[10px] rounded-full px-2 py-0.5 border font-medium ${
              f.present
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-apple-gray-100 dark:bg-apple-gray-800 text-apple-gray-500 dark:text-apple-gray-500 border-apple-gray-200 dark:border-apple-gray-700'
            }`}
          >
            {f.present ? '✓ ' : '○ '}{f.label}
          </span>
        ))}
      </div>

      {/* Sugerencias de qué arrastrar */}
      {uniqueHints.length > 0 && (
        <div className="pt-1 border-t border-apple-gray-100 dark:border-apple-gray-800/60">
          <p className="text-[10px] text-apple-gray-500 mb-1.5 font-semibold uppercase tracking-wider">Para completar:</p>
          <div className="flex flex-wrap gap-1.5">
            {uniqueHints.map((hint, i) => (
              <span key={i} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2.5 py-0.5">
                + {hint}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MatchStatsComparison ─────────────────────────────────────────────────────
// Tabla estilo SofaScore: Lanús vs Rival, con barra de dominio por métrica.

function MatchStatsComparison({
  lanusMatch,
  rivalName,
  rivalStats,
}: {
  lanusMatch: MatchData | null
  rivalName: string
  rivalStats: { avgXG?: number; avgPosesion?: number; avgTiros?: number; avgPPDA?: number; avgPases?: number } | null
}) {
  if (!lanusMatch) return null

  const lan = lanusMatch
  const lanusPoss = Math.round(lan.posesion)
  const rivalPoss = 100 - lanusPoss
  const rivalXG = rivalStats?.avgXG != null && rivalStats.avgXG > 0 ? rivalStats.avgXG : null

  type StatRow = {
    label: string
    lanus: number | null
    rival: number | null
    unit?: string
    decimals?: number
    higherBetter?: boolean
    lowerBetter?: boolean
    category?: string
  }

  const groups: { title: string; rows: StatRow[] }[] = [
    {
      title: 'Ataque',
      rows: [
        { label: 'Goles',      lanus: lan.golesAFavor,   rival: lan.golesEnContra,       higherBetter: true },
        { label: 'Remates',    lanus: lan.tiros,          rival: lan.tirosContra,          higherBetter: true },
        { label: 'Al arco',    lanus: lan.tirosPorteria,  rival: lan.tirosContraPorteria,  higherBetter: true },
        { label: 'xG',         lanus: lan.xG,             rival: rivalXG,                 higherBetter: true, decimals: 2 },
        { label: 'Córneres',   lanus: lan.corners,        rival: lan.corners_rival ?? null, higherBetter: true },
      ],
    },
    {
      title: 'Posesión',
      rows: [
        { label: 'Posesión',       lanus: lanusPoss,      rival: rivalPoss,        unit: '%' },
        { label: 'Precisión pase', lanus: lan.pases_pct,  rival: null,             higherBetter: true, unit: '%', decimals: 1 },
      ],
    },
    {
      title: 'Disciplina',
      rows: [
        { label: 'Faltas',     lanus: lan.faltas,    rival: lan.faltas_rival ?? null,    lowerBetter: true },
        { label: 'Amarillas',  lanus: lan.amarillas, rival: lan.amarillas_rival ?? null,  lowerBetter: true },
        { label: 'Rojas',      lanus: lan.rojas,     rival: null,                        lowerBetter: true },
      ],
    },
  ]

  const fmt = (v: number | null, decimals = 0, unit = '') =>
    v === null ? '—' : `${v.toFixed(decimals)}${unit}`

  // Colores de equipo
  const LANUS_COLOR = '#6F1929'
  const RIVAL_COLOR = '#4B5563'  // gris oscuro

  return (
    <div className="bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">

      {/* Header */}
      <div className="px-5 py-3 border-b border-apple-gray-200 dark:border-apple-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-4 bg-[#6F1929] rounded-full" />
          <h3 className="text-xs font-bold tracking-widest uppercase text-apple-gray-600 dark:text-apple-gray-300">
            Estadísticas del partido
          </h3>
        </div>
        <span className="text-[10px] text-apple-gray-400">{lan.date}</span>
      </div>

      {/* Team headers — bien anchos y centrados */}
      <div className="grid grid-cols-[1fr_140px_1fr] px-5 py-3.5 bg-apple-gray-50 dark:bg-apple-gray-800/30 border-b border-apple-gray-200 dark:border-apple-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: LANUS_COLOR }} />
          <span className="text-sm font-bold text-apple-gray-900 dark:text-white">Lanús</span>
        </div>
        <div />
        <div className="flex items-center gap-2.5 justify-end">
          <span className="text-sm font-bold text-apple-gray-900 dark:text-white truncate text-right">{rivalName || 'Rival'}</span>
          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: RIVAL_COLOR }} />
        </div>
      </div>

      {/* Groups */}
      {groups.map((group, gi) => {
        const visibleRows = group.rows.filter(r => r.lanus !== null || r.rival !== null)
        if (visibleRows.length === 0) return null

        return (
          <div key={gi}>
            {/* Category label */}
            <div className="px-5 pt-3 pb-1">
              <span className="text-[9px] font-bold tracking-widest uppercase text-apple-gray-400">
                {group.title}
              </span>
            </div>

            <div className="divide-y divide-apple-gray-100 dark:divide-apple-gray-800/30">
              {visibleRows.map((row, ri) => {
                const lv = row.lanus
                const rv = row.rival
                const dec = row.decimals ?? 0
                const unit = row.unit ?? ''
                const hasBoth = lv !== null && rv !== null

                let lanusPct = 50
                if (hasBoth && (lv + rv) > 0) {
                  lanusPct = Math.round((lv / (lv + rv)) * 100)
                }

                // Quién domina el stat
                const lanusWins = hasBoth
                  ? (row.lowerBetter ? lv < rv : lv > rv)
                  : null
                const isDraw = hasBoth && lv === rv

                return (
                  <div key={ri} className="grid grid-cols-[1fr_140px_1fr] items-center px-5 py-3">

                    {/* Valor Lanús */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black tabular-nums leading-none transition-colors ${
                        isDraw ? 'text-apple-gray-700 dark:text-apple-gray-200' :
                        lanusWins === true  ? 'text-apple-gray-900 dark:text-white' :
                        lanusWins === false ? 'text-apple-gray-400 dark:text-apple-gray-500' :
                        'text-apple-gray-700 dark:text-apple-gray-300'
                      }`}>
                        {fmt(lv, dec, unit)}
                      </span>
                      {lanusWins === true && !isDraw && (
                        <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="12" />
                        </svg>
                      )}
                    </div>

                    {/* Centro: label + barra */}
                    <div className="flex flex-col items-center gap-1.5 px-1">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-apple-gray-400 whitespace-nowrap">
                        {row.label}
                      </span>
                      {/* Barra de dominio */}
                      {hasBoth ? (
                        <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ background: '#E5E7EB' }}>
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${lanusPct}%`,
                              background: lanusWins === true && !isDraw
                                ? LANUS_COLOR
                                : isDraw
                                ? '#9CA3AF'
                                : '#9CA3AF',
                            }}
                          />
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${100 - lanusPct}%`,
                              background: lanusWins === false && !isDraw
                                ? RIVAL_COLOR
                                : isDraw
                                ? '#6B7280'
                                : '#6B7280',
                            }}
                          />
                        </div>
                      ) : (
                        /* Solo un equipo tiene dato: barra simple del que tiene */
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: '50%',
                              background: lv !== null ? LANUS_COLOR : RIVAL_COLOR,
                              margin: lv !== null ? '0' : 'auto 0 auto auto',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Valor Rival */}
                    <div className="flex items-center gap-2 justify-end">
                      {lanusWins === false && !isDraw && (
                        <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="12" />
                        </svg>
                      )}
                      <span className={`text-xl font-black tabular-nums leading-none transition-colors ${
                        isDraw ? 'text-apple-gray-700 dark:text-apple-gray-200' :
                        lanusWins === false ? 'text-apple-gray-900 dark:text-white' :
                        lanusWins === true  ? 'text-apple-gray-400 dark:text-apple-gray-500' :
                        'text-apple-gray-700 dark:text-apple-gray-300'
                      }`}>
                        {fmt(rv, dec, unit)}
                      </span>
                    </div>

                  </div>
                )
              })}
            </div>

            {gi < groups.length - 1 && (
              <div className="mx-5 border-t border-apple-gray-100 dark:border-apple-gray-800/60 mt-1" />
            )}
          </div>
        )
      })}

      <p className="px-5 py-2.5 text-[9px] text-apple-gray-400 border-t border-apple-gray-100 dark:border-apple-gray-800/40 mt-1">
        Datos de Lanús: base de datos 2026 · Rival: informe cargado (— = sin dato disponible)
      </p>
    </div>
  )
}

// ─── TabUltimoPartido ─────────────────────────────────────────────────────────
function TabUltimoPartido() {
  // ── Datos desde Google Sheets (primario, auto-carga) ──
  const [sheetData, setSheetData] = useState<UltimoPartidoStats | null>(null)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetError, setSheetError] = useState('')

  const loadSheet = useCallback(async () => {
    setSheetLoading(true)
    setSheetError('')
    try {
      const data = await fetchUltimoPartidoData()
      setSheetData(data)
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setSheetLoading(false)
    }
  }, [])

  useEffect(() => { loadSheet() }, [loadSheet])

  // ── Datos desde archivos arrastrados (PDF / imagen) ──
  const [matchData, setMatchDataState] = useState<RivalData | null>(() => {
    try { return JSON.parse(localStorage.getItem(ULTIMO_PARTIDO_STORAGE_KEY) ?? 'null') } catch { return null }
  })
  const setMatchData = (data: RivalData | null) => {
    setMatchDataState(data)
    if (data) localStorage.setItem(ULTIMO_PARTIDO_STORAGE_KEY, JSON.stringify(data))
    else localStorage.removeItem(ULTIMO_PARTIDO_STORAGE_KEY)
  }

  const [pdfPages, setPdfPages] = useState<PdfPage[]>([])
  const [loadingInsights, setLoadingInsights] = useState(false)

  const card = 'bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl shadow-sm dark:shadow-none'

  // Resultado del sheet para colorear
  const sheetResult: 'W' | 'D' | 'L' | null = sheetData
    ? sheetData.lanus.goals > sheetData.rival.goals ? 'W'
      : sheetData.lanus.goals === sheetData.rival.goals ? 'D' : 'L'
    : null
  const resColor = (r: 'W' | 'D' | 'L') =>
    r === 'W' ? 'text-emerald-400' : r === 'D' ? 'text-amber-400' : 'text-red-400'

  // ¿Lanús fue local? El partido en el sheet está como "Local - Visitante N:N"
  // Si el partido empieza con "Lanús" o "Lanus", Lanús fue local
  const lanusIsHome = sheetData
    ? /^lan[uú]s/i.test(sheetData.match.trim())
    : true
  // Orden de escudos: siempre local a la izquierda
  const leftTeam  = lanusIsHome ? 'Lanus' : sheetData?.rival.team ?? ''
  const rightTeam = lanusIsHome ? (sheetData?.rival.team ?? '') : 'Lanus'
  const leftGoals  = lanusIsHome ? (sheetData?.lanus.goals ?? 0) : (sheetData?.rival.goals ?? 0)
  const rightGoals = lanusIsHome ? (sheetData?.rival.goals ?? 0) : (sheetData?.lanus.goals ?? 0)

  // Formaciones del PDF (si se arrastró)
  const topFormation = matchData?.recentFormations?.[0]
  const topPlayers = topFormation?.players ?? []

  // lanOnRight=true → Lanús en la derecha (cuando juega de visitante)
  function StatRow({ label, lan, riv, higherBetter = true, fmt = (v: number) => v.toFixed(1), lanOnRight = false }: {
    label: string; lan: number; riv: number; higherBetter?: boolean; fmt?: (v: number) => string; lanOnRight?: boolean
  }) {
    if (lan === 0 && riv === 0) return null
    const total = lan + riv || 1
    const lanWins = higherBetter ? lan >= riv : lan <= riv
    // Valores visuales izquierda/derecha según perspectiva
    const leftVal  = lanOnRight ? riv : lan
    const rightVal = lanOnRight ? lan : riv
    const leftPct  = Math.round((leftVal / total) * 100)
    const rightPct = 100 - leftPct
    // Lanús siempre en granate, rival en azul
    const leftIsLanus  = !lanOnRight
    const leftWins     = leftIsLanus ? lanWins : !lanWins
    return (
      <div className="flex items-center gap-2 py-1.5 border-b border-apple-gray-100 dark:border-apple-gray-800 last:border-0">
        <span className={`text-xs font-bold tabular-nums w-10 text-right ${leftIsLanus ? (lanWins ? 'text-[#6F1929] dark:text-red-400' : 'text-apple-gray-400') : (!lanWins ? 'text-blue-400' : 'text-apple-gray-400')}`}>{fmt(leftVal)}</span>
        <div className="flex-1 flex h-2 rounded-full overflow-hidden gap-px bg-apple-gray-200 dark:bg-apple-gray-800">
          <div className={`h-full ${leftWins ? (leftIsLanus ? 'bg-[#6F1929]' : 'bg-blue-500') : 'bg-apple-gray-500 dark:bg-apple-gray-700'} rounded-l-full transition-all`} style={{ width: `${leftPct}%` }} />
          <div className={`h-full ${!leftWins ? (!leftIsLanus ? 'bg-[#6F1929]' : 'bg-blue-500') : 'bg-apple-gray-500 dark:bg-apple-gray-700'} rounded-r-full transition-all`} style={{ width: `${rightPct}%` }} />
        </div>
        <span className={`text-xs font-bold tabular-nums w-10 ${!leftIsLanus ? (lanWins ? 'text-[#6F1929] dark:text-red-400' : 'text-apple-gray-400') : (!lanWins ? 'text-blue-400' : 'text-apple-gray-400')}`}>{fmt(rightVal)}</span>
        <span className="text-[10px] text-apple-gray-500 w-36 truncate">{label}</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ══ SECCIÓN PRINCIPAL: datos del partido desde Sheets ══ */}
      <div className="border border-[#6F1929]/25 rounded-2xl overflow-hidden">
        {/* Header sección */}
        <div className="px-5 py-3 bg-[#6F1929]/10 border-b border-[#6F1929]/20 flex items-center gap-3">
          <svg className="w-4 h-4 text-[#6F1929] dark:text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7H7v-1h6v1zm0 2H7v-1h6v1zm-2 2H7v-1h4v1zm3-9.5V3.5L18.5 8H14z"/>
          </svg>
          <span className="text-xs font-bold text-[#6F1929] dark:text-red-400 uppercase tracking-wider flex-1">Último partido</span>
          {sheetData && (
            <span className="text-[10px] text-apple-gray-400">{sheetData.date} · {sheetData.competition}</span>
          )}
          <button
            onClick={loadSheet}
            disabled={sheetLoading}
            className="flex items-center gap-1 text-[10px] text-apple-gray-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <svg className={`w-3 h-3 ${sheetLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>

        {sheetLoading && !sheetData && (
          <div className="p-8 flex items-center justify-center gap-3">
            <svg className="w-5 h-5 text-[#6F1929] dark:text-red-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-apple-gray-500">Cargando datos del partido…</span>
          </div>
        )}

        {sheetError && !sheetData && (
          <div className="p-5 text-center">
            <p className="text-xs text-red-400 mb-2">{sheetError === 'NEEDS_PUBLISH' ? 'La hoja "Ultimo partido" no está publicada en la web.' : sheetError}</p>
            <button onClick={loadSheet} className="text-xs text-blue-400 underline">Reintentar</button>
          </div>
        )}

        {sheetData && (
          <div className="p-5 space-y-5">
            {/* Header partido — centrado, local a la izquierda */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center gap-1">
                  <ShieldImg team={leftTeam} size={52} />
                  <span className="text-[9px] text-apple-gray-400 uppercase tracking-wide">{lanusIsHome ? 'Lanús' : sheetData.rival.team} · Local</span>
                </div>
                <div className="text-center">
                  <p className={`text-4xl font-black tracking-tight tabular-nums leading-none ${sheetResult ? resColor(sheetResult) : 'text-white'}`}>
                    {leftGoals}–{rightGoals}
                  </p>
                  <p className="text-[10px] text-apple-gray-500 mt-1">{sheetData.duration}'</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ShieldImg team={rightTeam} size={52} />
                  <span className="text-[9px] text-apple-gray-400 uppercase tracking-wide">{lanusIsHome ? sheetData.rival.team : 'Lanús'} · Visitante</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-apple-gray-500">
                <span>{sheetData.date}</span>
                <span>·</span>
                <span>{sheetData.competition}</span>
              </div>
            </div>

            {/* Formaciones — centradas, Lanús destacado */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-[9px] text-apple-gray-500 uppercase tracking-wider mb-1">Lanús</p>
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#6F1929]/15 dark:bg-[#6F1929]/25 text-sm font-bold text-[#6F1929] dark:text-red-400 tracking-wide">
                  {sheetData.lanus.formation || '—'}
                </span>
              </div>
              <span className="text-apple-gray-300 dark:text-apple-gray-700 font-light">vs</span>
              <div className="text-center">
                <p className="text-[9px] text-apple-gray-500 uppercase tracking-wider mb-1">{sheetData.rival.team}</p>
                <span className="inline-block px-4 py-1.5 rounded-full bg-apple-gray-100 dark:bg-apple-gray-800 text-sm font-bold text-apple-gray-600 dark:text-apple-gray-300 tracking-wide">
                  {sheetData.rival.formation || '—'}
                </span>
              </div>
            </div>

            {/* Estadísticas comparadas — Lanús siempre del lado de su escudo */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-apple-gray-500 mb-2 px-0.5">
                <span className={`font-semibold ${lanusIsHome ? 'text-[#6F1929] dark:text-red-400' : 'text-blue-400'}`}>{lanusIsHome ? 'Lanús' : sheetData.rival.team}</span>
                <span className="uppercase tracking-wider">Estadísticas del partido</span>
                <span className={`font-semibold ${lanusIsHome ? 'text-blue-400' : 'text-[#6F1929] dark:text-red-400'}`}>{lanusIsHome ? sheetData.rival.team : 'Lanús'}</span>
              </div>
              <StatRow label="Posesión %" lan={sheetData.lanus.posesion} riv={sheetData.rival.posesion} fmt={v => v.toFixed(1) + '%'} lanOnRight={!lanusIsHome} />
              <StatRow label="xG" lan={sheetData.lanus.xG} riv={sheetData.rival.xG} fmt={v => v.toFixed(2)} lanOnRight={!lanusIsHome} />
              <StatRow label="Tiros" lan={sheetData.lanus.tiros} riv={sheetData.rival.tiros} lanOnRight={!lanusIsHome} />
              <StatRow label="Tiros a portería" lan={sheetData.lanus.tirosPorteria} riv={sheetData.rival.tirosPorteria} lanOnRight={!lanusIsHome} />
              <StatRow label="Precisión pase %" lan={sheetData.lanus.pasesPct} riv={sheetData.rival.pasesPct} fmt={v => v.toFixed(0) + '%'} lanOnRight={!lanusIsHome} />
              <StatRow label="Duelos ganados %" lan={sheetData.lanus.duelos_pct} riv={sheetData.rival.duelos_pct} fmt={v => v.toFixed(0) + '%'} lanOnRight={!lanusIsHome} />
              <StatRow label="Duelos aéreos %" lan={sheetData.lanus.duelosAereos_pct} riv={sheetData.rival.duelosAereos_pct} fmt={v => v.toFixed(0) + '%'} lanOnRight={!lanusIsHome} />
              <StatRow label="Corners" lan={sheetData.lanus.corners} riv={sheetData.rival.corners} fmt={v => String(Math.round(v))} lanOnRight={!lanusIsHome} />
              <StatRow label="Interceptaciones" lan={sheetData.lanus.interceptaciones} riv={sheetData.rival.interceptaciones} fmt={v => String(Math.round(v))} lanOnRight={!lanusIsHome} />
              <StatRow label="Faltas" lan={sheetData.lanus.faltas} riv={sheetData.rival.faltas} higherBetter={false} fmt={v => String(Math.round(v))} lanOnRight={!lanusIsHome} />
              <StatRow label="PPDA" lan={sheetData.lanus.ppda} riv={sheetData.rival.ppda} higherBetter={false} fmt={v => v.toFixed(1)} lanOnRight={!lanusIsHome} />
            </div>

            {/* KPIs adicionales de Lanús */}
            <div>
              <p className="text-[10px] text-apple-gray-500 uppercase tracking-wider mb-2">Lanús — detalle</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Ataques pos.', value: sheetData.lanus.ataquesPos, sub: `${sheetData.lanus.ataquePosRemate} con remate` },
                  { label: 'Contraataques', value: sheetData.lanus.contras, sub: `${sheetData.lanus.contrasRemate} con remate` },
                  { label: 'Balón parado', value: sheetData.lanus.balonParado, sub: undefined },
                  { label: 'Centros', value: sheetData.lanus.centros, sub: `${sheetData.lanus.centrosPrecisos} precisos` },
                  { label: 'Balones recup.', value: sheetData.lanus.balonesRecuperados, sub: undefined },
                  { label: 'Balones perd.', value: sheetData.lanus.balonesPerdidos, sub: undefined },
                  { label: 'Pases prog.', value: sheetData.lanus.pasesProgresivos, sub: undefined },
                  { label: 'Últ. tercio %', value: sheetData.lanus.pasesUltimoTercio_pct, sub: undefined, fmt: (v: number) => v.toFixed(0) + '%' },
                ].map(({ label, value, sub, fmt }) => (
                  <div key={label} className="bg-apple-gray-50 dark:bg-[#0f1923] border border-apple-gray-200 dark:border-apple-gray-800 rounded-xl p-2.5">
                    <p className="text-sm font-bold tabular-nums text-apple-gray-900 dark:text-white">{fmt ? fmt(value) : Math.round(value)}</p>
                    {sub && <p className="text-[9px] text-apple-gray-500 mt-0.5">{sub}</p>}
                    <p className="text-[9px] text-apple-gray-500 uppercase tracking-wide mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ SECCIÓN ARCHIVOS: PDF / imagen arrastrada ══ */}
      <div className="border border-blue-500/20 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 bg-blue-500/5 border-b border-blue-500/20 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Informe del partido</span>
          <span className="text-[10px] text-apple-gray-500">PDF · imagen</span>
          {matchData && (
            <button onClick={() => setMatchData(null)} className="ml-auto text-[10px] text-apple-gray-500 hover:text-red-400 transition-colors">
              Limpiar
            </button>
          )}
        </div>
        <div className="p-5 space-y-5">
          <MultiFileUploadZone
            current={matchData}
            onData={setMatchData}
            onPdfPages={setPdfPages}
            onPdfInsights={insights => {
              setMatchDataState(prev => {
                if (!prev) return null
                const d = { ...prev, pdfPageInsights: insights }
                localStorage.setItem(ULTIMO_PARTIDO_STORAGE_KEY, JSON.stringify(d))
                return d
              })
            }}
            onLoadingInsights={setLoadingInsights}
            label="Informe del último partido"
          />

          {matchData && (<>
            {/* Formación (canchita) — solo si no hay análisis IA (que ya incluye formaciones) */}
            {topFormation && topPlayers.length > 0 && !matchData.fullAnalysis && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 bg-[#6F1929] rounded-full" />
                  <p className="text-xs font-bold tracking-widest uppercase text-apple-gray-500">Formación · {topFormation.formation}</p>
                </div>
                <div className="flex justify-center">
                  <div className="w-full max-w-[360px]">
                    <FormationPitchCard match={topFormation} />
                  </div>
                </div>
              </div>
            )}

            {/* Análisis IA completo */}
            {matchData.fullAnalysis && (
              <RivalComprehensiveReport fa={matchData.fullAnalysis} pdfPages={pdfPages} pdfInsights={matchData.pdfPageInsights ?? []} />
            )}

            {/* Páginas PDF */}
            {(loadingInsights || (matchData.pdfPageInsights && matchData.pdfPageInsights.length > 0)) && (
              <PdfPagesViewer
                insights={matchData.pdfPageInsights ?? []}
                loadingInsights={loadingInsights}
                sectionLabel="Análisis por sección"
              />
            )}

            {/* Notas tácticas / fortalezas / debilidades */}
            {(matchData.tacticalNotes.length > 0 || matchData.strengths.length > 0 || matchData.weaknesses.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {matchData.tacticalNotes.length > 0 && (
                  <div className={`${card} p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full" />
                      <p className="text-[10px] font-bold tracking-widest uppercase text-apple-gray-500">Notas tácticas</p>
                    </div>
                    <ul className="space-y-1.5">
                      {matchData.tacticalNotes.map((n, i) => (
                        <li key={i} className="text-xs text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed flex gap-2">
                          <span className="text-blue-400 flex-shrink-0">•</span>{n}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {matchData.strengths.length > 0 && (
                  <div className={`${card} p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                      <p className="text-[10px] font-bold tracking-widest uppercase text-apple-gray-500">Lo que funcionó</p>
                    </div>
                    <ul className="space-y-1.5">
                      {matchData.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed flex gap-2">
                          <span className="text-emerald-400 flex-shrink-0">✓</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {matchData.weaknesses.length > 0 && (
                  <div className={`${card} p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-red-500 rounded-full" />
                      <p className="text-[10px] font-bold tracking-widest uppercase text-apple-gray-500">A mejorar</p>
                    </div>
                    <ul className="space-y-1.5">
                      {matchData.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed flex gap-2">
                          <span className="text-red-400 flex-shrink-0">↓</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>)}
        </div>
      </div>

    </div>
  )
}

// ─── HARDCODED DATA (kept for reference — now replaced by upload system) ────────
// (old hardcoded match data removed — replaced by upload system)


// ─── Main Page ─────────────────────────────────────────────────────────────────
const TABS = ['Análisis Propio', 'Último Partido', 'Análisis de Rival', 'Partidos'] as const
type Tab = typeof TABS[number]

export default function EquipoPage() {
  const [searchParams] = useSearchParams()
  const initialTab: Tab = (() => {
    const t = searchParams.get('tab')
    if (t === 'rival') return 'Análisis de Rival'
    if (t === 'ultimo-partido') return 'Último Partido'
    return 'Análisis Propio'
  })()
  const [division, setDivision] = useState('primera')
  const [tab, setTab] = useState<Tab>(initialTab)
  const [compFilter, setCompFilter] = useState<'all' | 'liga' | 'copa' | 'internacional'>('all')

  const matches = useMemo(() => {
    const base = division === 'primera' ? LANUS_2026 : []
    return compFilter === 'all' ? base : base.filter(m => m.competition === compFilter)
  }, [division, compFilter])

  const selectedDivision = DIVISIONS.find(d => d.id === division)

  return (
    <div className="min-h-screen bg-apple-gray-50 dark:bg-[#0a0a0a] text-apple-gray-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Division selector */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {DIVISIONS.map(d => (
            <button
              key={d.id}
              onClick={() => { setDivision(d.id); setTab('Análisis Propio') }}
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
          <div className="text-center py-20 bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl shadow-sm dark:shadow-none">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold text-white mb-2">{selectedDivision?.label} — Sin datos cargados</h2>
            <p className="text-apple-gray-400 text-sm max-w-md mx-auto">
              Exportá los datos estadísticos de la {selectedDivision?.label} en formato Excel y cargarlos desde la sección de Próximo Partido o agregá los datos manualmente.
            </p>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex gap-1 border-b border-apple-gray-200 dark:border-apple-gray-800 overflow-x-auto scrollbar-hide">
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
              {tab === 'Análisis Propio' && <TabAnalisisPropio matches={matches.length ? matches : LANUS_2026} />}
              {tab === 'Partidos' && <TabPartidos matches={LANUS_2026} />}
              {tab === 'Último Partido' && <TabUltimoPartido />}
              {tab === 'Análisis de Rival' && <TabAnalisisRival matches={LANUS_2026} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
