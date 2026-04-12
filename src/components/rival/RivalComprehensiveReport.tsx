// ─── RivalComprehensiveReport ─────────────────────────────────────────────────
// Muestra el análisis completo de un rival extraído por Claude desde PDF Wyscout.
// Secciones: Formaciones · Fase Defensiva · Ataque · Finalización · Balón Parado · Análisis Táctico

import type { WyscoutFullAnalysis, DuelPlayer, ShotPlayer, GoalSections, PitchZoneMap, PdfPageInsight } from '@/services/rivalAnalysisService'
import type { PdfPage } from '@/services/pdfImageService'
import { FormationsGrid } from './FormationPitchCard'

// ─── Helpers para imágenes PDF ───────────────────────────────────────────────

/** Devuelve la página PDF más relevante para una sección dado sus keywords */
function findPdfPage(
  keywords: string[],
  insights: PdfPageInsight[],
  pages: PdfPage[],
): { page: PdfPage; insight: PdfPageInsight } | null {
  const lk = keywords.map(k => k.toLowerCase())

  // Primero por sectionType exacto
  const byType = insights.find(i => {
    const t = (i.sectionType ?? '').toLowerCase()
    return lk.some(k => t.includes(k))
  })
  if (byType) {
    const page = pages.find(p => p.pageNum === byType.pageNum)
    if (page) return { page, insight: byType }
  }

  // Luego por title / description
  const byTitle = insights.find(i => {
    const text = `${i.insight.title} ${i.insight.description}`.toLowerCase()
    return lk.some(k => text.includes(k))
  })
  if (byTitle) {
    const page = pages.find(p => p.pageNum === byTitle.pageNum)
    if (page) return { page, insight: byTitle }
  }

  return null
}

/** Muestra la imagen PDF del informe para una sección, con sus insights */
function PdfSectionViz({
  keywords,
  pages,
  insights,
  label,
}: {
  keywords: string[]
  pages: PdfPage[]
  insights: PdfPageInsight[]
  label?: string
}) {
  if (!pages.length && !insights.length) return null
  const match = findPdfPage(keywords, insights, pages)
  if (!match && !pages.length) return null

  // Si hay match con imagen: mostrar imagen + insights
  if (match?.page) {
    const { page, insight } = match
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-violet-500/20 bg-violet-950/10">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-violet-500/15">
          <div className="w-1 h-3.5 bg-violet-500 rounded-full" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
            {label ?? 'Del informe'}
          </span>
        </div>
        <div className="flex flex-col lg:flex-row">
          {/* Imagen de la página */}
          <div className="lg:w-[48%] bg-black/20 p-3 flex items-start justify-center">
            <img
              src={page.dataUrl}
              alt={insight.insight.title}
              className="max-w-full h-auto rounded-lg shadow"
              style={{ maxHeight: 400, objectFit: 'contain' }}
            />
          </div>
          {/* Insights de esa página */}
          <div className="lg:flex-1 p-4 space-y-2">
            <p className="text-xs font-bold text-apple-gray-900 dark:text-white">{insight.insight.title}</p>
            {insight.insight.description && (
              <p className="text-[11px] text-apple-gray-500 dark:text-apple-gray-400 leading-relaxed">
                {insight.insight.description}
              </p>
            )}
            {insight.insight.bullets.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {insight.insight.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                    <span className="text-[11px] text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {insight.insight.keyNumbers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-apple-gray-800/40">
                {insight.insight.keyNumbers.map((kn, i) => (
                  <div key={i} className="bg-apple-gray-50 dark:bg-[#0f1923] border border-apple-gray-800 rounded-lg px-2.5 py-1.5 text-center min-w-[52px]">
                    <p className="text-sm font-black text-white tabular-nums">{kn.value}</p>
                    <p className="text-[9px] text-apple-gray-500 uppercase tracking-wider">{kn.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Sin imagen pero con insight solo: mostrar solo texto
  const insightOnly = findPdfPage(keywords, insights, [])
  if (!insightOnly) return null
  return null // sin imagen, el PdfPagesViewer ya cubre esto
}

// ─── Helpers visuales ────────────────────────────────────────────────────────

const card = 'bg-white dark:bg-apple-gray-900 border border-apple-gray-200 dark:border-apple-gray-800 rounded-2xl shadow-sm dark:shadow-none p-5'

function SectionTitle({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-1 h-5 ${accent} rounded-full`} />
      <h3 className="text-xs font-bold tracking-widest uppercase text-apple-gray-600 dark:text-apple-gray-300">
        {children}
      </h3>
    </div>
  )
}

function Bar({ pct, color = 'bg-blue-500' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-apple-gray-200 dark:bg-apple-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

// ─── Chart: barras horizontales genérico ─────────────────────────────────────

interface HBarItem {
  label: string
  value: number
  value2?: number   // barra secundaria (p.ej. perdidos)
  badge?: string | number
  badgeColor?: string
}

function HBarChart({
  items,
  maxVal,
  color1 = '#3b82f6',
  color2,
  label1,
  label2,
  unit = '',
}: {
  items: HBarItem[]
  maxVal?: number
  color1?: string
  color2?: string
  label1?: string
  label2?: string
  unit?: string
}) {
  if (items.length === 0) return <p className="text-xs text-apple-gray-400 italic">Sin datos</p>
  const max = maxVal ?? Math.max(...items.map(i => Math.max(i.value, i.value2 ?? 0)), 1)
  const BAR_H = 10
  const ROW_H = 28
  const LABEL_W = 90
  const RIGHT_W = 44
  const CHART_W = 200
  const svgW = LABEL_W + CHART_W + RIGHT_W
  const svgH = items.length * ROW_H + (label1 ? 20 : 4)
  const offsetY = label1 ? 20 : 4

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="text-[9px]" style={{ minWidth: Math.min(svgW, 300) }}>
        {label1 && label2 && (
          <>
            <rect x={LABEL_W} y={2} width={12} height={8} rx={2} fill={color1} />
            <text x={LABEL_W + 16} y={10} fill="currentColor" className="fill-apple-gray-400" fontSize={8}>{label1}</text>
            <rect x={LABEL_W + 70} y={2} width={12} height={8} rx={2} fill={color2} />
            <text x={LABEL_W + 86} y={10} fill="currentColor" className="fill-apple-gray-400" fontSize={8}>{label2}</text>
          </>
        )}
        {items.map((item, i) => {
          const y = offsetY + i * ROW_H
          const bar1W = (item.value / max) * CHART_W
          const bar2W = item.value2 != null ? (item.value2 / max) * CHART_W : 0
          return (
            <g key={i}>
              {/* Label */}
              <text
                x={LABEL_W - 4}
                y={y + BAR_H / 2 + (color2 ? -2 : 4)}
                textAnchor="end"
                fontSize={9}
                className="fill-apple-gray-700 dark:fill-apple-gray-200"
                fill="currentColor"
              >
                {item.label.length > 12 ? item.label.slice(0, 12) + '…' : item.label}
              </text>
              {/* Barra 1 */}
              <rect x={LABEL_W} y={y} width={Math.max(bar1W, 2)} height={BAR_H} rx={3} fill={color1} opacity={0.85} />
              {/* Barra 2 */}
              {color2 && item.value2 != null && (
                <rect x={LABEL_W} y={y + BAR_H + 2} width={Math.max(bar2W, 2)} height={BAR_H} rx={3} fill={color2} opacity={0.7} />
              )}
              {/* Valor */}
              <text
                x={LABEL_W + bar1W + 4}
                y={y + BAR_H / 2 + 3}
                fontSize={9}
                className="fill-apple-gray-500"
                fill="currentColor"
              >
                {item.value}{unit}{item.badge != null ? ` · ${item.badge}` : ''}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Chart: duelos (stacked ganados/perdidos) ─────────────────────────────────

function DuelsChart({ players, title }: { players: DuelPlayer[]; title: string }) {
  if (players.length === 0) return null
  const top = players.slice(0, 8)
  const items: HBarItem[] = top.map(p => ({
    label: p.name,
    value: p.won,
    value2: p.lost,
    badge: `${p.pct.toFixed(0)}%`,
  }))
  const maxVal = Math.max(...top.map(p => p.won + (p.lost ?? 0)), 1)

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 mb-2 font-semibold">{title}</p>
      <HBarChart
        items={items}
        maxVal={maxVal}
        color1="#10b981"
        color2="#f87171"
        label1="Ganados"
        label2="Perdidos"
      />
    </div>
  )
}

// ─── Chart: tiros por jugador ─────────────────────────────────────────────────

function ShotsPlayerChart({ players }: { players: ShotPlayer[] }) {
  if (players.length === 0) return null
  const top = players.slice(0, 10)
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 mb-2 font-semibold">Tiros por jugador</p>
      <div className="w-full overflow-x-auto">
        <svg
          width="100%"
          viewBox={`0 0 340 ${top.length * 30 + 10}`}
          style={{ minWidth: 280 }}
        >
          {top.map((p, i) => {
            const maxShots = Math.max(...top.map(x => x.shots), 1)
            const LABEL_W = 90
            const CHART_W = 160
            const y = i * 30 + 6
            const shotsW = (p.shots / maxShots) * CHART_W
            const onTargetW = (p.onTarget / maxShots) * CHART_W
            return (
              <g key={i}>
                <text x={LABEL_W - 4} y={y + 8} textAnchor="end" fontSize={9} className="fill-apple-gray-700 dark:fill-apple-gray-200" fill="currentColor">
                  {p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name}
                </text>
                {/* Total shots */}
                <rect x={LABEL_W} y={y} width={Math.max(shotsW, 2)} height={10} rx={3} fill="#f59e0b" opacity={0.4} />
                {/* On target */}
                <rect x={LABEL_W} y={y} width={Math.max(onTargetW, 2)} height={10} rx={3} fill="#f59e0b" opacity={0.9} />
                {/* Goles dot */}
                {p.goals > 0 && (
                  <circle cx={LABEL_W + onTargetW + 8} cy={y + 5} r={5} fill="#10b981" />
                )}
                {p.goals > 0 && (
                  <text x={LABEL_W + onTargetW + 8} y={y + 9} textAnchor="middle" fontSize={7} fill="white" fontWeight="bold">{p.goals}</text>
                )}
                {/* Stats text */}
                <text x={LABEL_W + shotsW + (p.goals > 0 ? 20 : 4)} y={y + 8} fontSize={8} className="fill-apple-gray-400" fill="currentColor">
                  {p.shots}t · {p.onTarget}ap{p.xG != null ? ` · ${p.xG.toFixed(1)}xG` : ''}
                </text>
              </g>
            )
          })}
          {/* Leyenda */}
          <rect x={90} y={top.length * 30 + 2} width={12} height={8} rx={2} fill="#f59e0b" opacity={0.4} />
          <text x={106} y={top.length * 30 + 9} fontSize={8} className="fill-apple-gray-400" fill="currentColor">Total tiros</text>
          <rect x={160} y={top.length * 30 + 2} width={12} height={8} rx={2} fill="#f59e0b" opacity={0.9} />
          <text x={176} y={top.length * 30 + 9} fontSize={8} className="fill-apple-gray-400" fill="currentColor">Al arco</text>
          <circle cx={230} cy={top.length * 30 + 6} r={5} fill="#10b981" />
          <text x={240} y={top.length * 30 + 9} fontSize={8} className="fill-apple-gray-400" fill="currentColor">Gol</text>
        </svg>
      </div>
    </div>
  )
}

// ─── Chart: córneres / tiros libres (semipitch) ───────────────────────────────

function SetPieceViz({
  title,
  total,
  left,
  right,
  goals,
}: {
  title: string
  total: number
  left: number
  right: number
  goals: number
}) {
  if (total === 0) return null
  const pctLeft = total > 0 ? Math.round((left / total) * 100) : 0
  const pctRight = 100 - pctLeft

  // Mini pitch top-view (vista desde arriba, zona de área)
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 font-semibold">{title}</p>
      <svg viewBox="0 0 200 110" className="w-full max-w-[220px]" style={{ background: 'transparent' }}>
        {/* Cesped */}
        <rect x={0} y={0} width={200} height={110} rx={4} fill="#1a3a1a" />
        {/* Líneas campo */}
        <rect x={10} y={5} width={180} height={100} rx={2} fill="none" stroke="#2d5c2d" strokeWidth={1.5} />
        {/* Área grande */}
        <rect x={40} y={5} width={120} height={55} fill="none" stroke="#2d5c2d" strokeWidth={1} />
        {/* Área chica */}
        <rect x={70} y={5} width={60} height={22} fill="none" stroke="#2d5c2d" strokeWidth={1} />
        {/* Arco */}
        <rect x={82} y={1} width={36} height={6} rx={1} fill="#3d6b3d" stroke="#4a8a4a" strokeWidth={1} />
        {/* Punto penal */}
        <circle cx={100} cy={38} r={2} fill="#2d5c2d" />

        {/* Flecha izquierda */}
        {left > 0 && (
          <g>
            <line x1={10} y1={105} x2={60} y2={20} stroke="#60a5fa" strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
            <polygon points="60,20 52,26 62,28" fill="#60a5fa" opacity={0.8} />
            <rect x={2} y={88} width={28} height={14} rx={3} fill="#1e3a5f" opacity={0.85} />
            <text x={16} y={99} textAnchor="middle" fontSize={9} fill="#93c5fd" fontWeight="bold">{pctLeft}%</text>
          </g>
        )}

        {/* Flecha derecha */}
        {right > 0 && (
          <g>
            <line x1={190} y1={105} x2={140} y2={20} stroke="#f97316" strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
            <polygon points="140,20 148,28 138,26" fill="#f97316" opacity={0.8} />
            <rect x={170} y={88} width={28} height={14} rx={3} fill="#4a1a05" opacity={0.85} />
            <text x={184} y={99} textAnchor="middle" fontSize={9} fill="#fb923c" fontWeight="bold">{pctRight}%</text>
          </g>
        )}

        {/* Stats overlay */}
        <rect x={72} y={60} width={56} height={34} rx={4} fill="#0f1f0f" opacity={0.85} />
        <text x={100} y={74} textAnchor="middle" fontSize={10} fill="white" fontWeight="bold">{total}</text>
        <text x={100} y={84} textAnchor="middle" fontSize={7} fill="#86efac">total</text>
        {goals > 0 && (
          <>
            <text x={100} y={93} textAnchor="middle" fontSize={8} fill="#4ade80" fontWeight="bold">{goals} gol{goals > 1 ? 'es' : ''}</text>
          </>
        )}
      </svg>
      <div className="flex gap-4 text-xs text-apple-gray-500">
        <span className="text-blue-400 font-semibold">Izq {left}</span>
        <span className="text-orange-400 font-semibold">Der {right}</span>
        {goals > 0 && <span className="text-emerald-400 font-semibold">{goals} gol{goals > 1 ? 'es' : ''}</span>}
      </div>
    </div>
  )
}

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  const v = String(value)
  const fontSize = v.length > 6 ? 'text-sm' : v.length > 4 ? 'text-base' : 'text-lg'
  return (
    <div className="bg-apple-gray-50 dark:bg-apple-gray-800 rounded-xl p-3 text-center">
      <p className={`${fontSize} font-bold leading-tight ${accent ?? 'text-apple-gray-900 dark:text-white'}`}>{value}</p>
      <p className="text-[9px] text-apple-gray-400 uppercase tracking-wider mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

// ─── Tabla genérica ───────────────────────────────────────────────────────────

interface TableCol<T> {
  label: string
  key: keyof T
  render?: (v: unknown, row: T) => React.ReactNode
  className?: string
}

function DataTable<T extends Record<string, unknown>>({ cols, rows }: { cols: TableCol<T>[]; rows: T[] }) {
  if (rows.length === 0) return <p className="text-xs text-apple-gray-400 italic">Sin datos</p>
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-apple-gray-200 dark:border-apple-gray-800">
            {cols.map(c => (
              <th key={String(c.key)} className={`pb-2 text-left font-semibold text-apple-gray-400 uppercase tracking-wider pr-3 ${c.className ?? ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-apple-gray-100 dark:border-apple-gray-800/50 last:border-0">
              {cols.map(c => (
                <td key={String(c.key)} className={`py-2 pr-3 text-apple-gray-900 dark:text-apple-gray-100 ${c.className ?? ''}`}>
                  {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── GoalMouthViz: arco con zonas de disparo ─────────────────────────────────

function GoalMouthViz({ gs }: { gs: GoalSections }) {
  // Zonas en orden: top row (TL TC TR), mid row (ML MC MR), bot row (BL BC BR)
  const sections: (keyof Omit<GoalSections, 'missed'>)[] = [
    'topLeft', 'topCenter', 'topRight',
    'midLeft', 'midCenter', 'midRight',
    'botLeft', 'botCenter', 'botRight',
  ]
  const maxShots = Math.max(...sections.map(k => gs[k].shots), 1)

  function zoneColor(shots: number, goals: number): string {
    if (shots === 0) return 'rgba(255,255,255,0.04)'
    const intensity = shots / maxShots
    if (goals > 0) {
      // Rojo para zonas con goles
      const alpha = 0.25 + intensity * 0.55
      return `rgba(239,68,68,${alpha.toFixed(2)})`
    }
    // Naranja/amarillo para disparos al arco sin gol
    const alpha = 0.15 + intensity * 0.45
    return `rgba(251,146,60,${alpha.toFixed(2)})`
  }

  // Coordenadas del SVG: goal width=200, height=120
  // 3 cols × 3 rows dentro del arco
  const GW = 200; const GH = 100
  const POST = 8   // grosor del poste
  const CW = (GW - POST * 2) / 3
  const CH = GH / 3
  const X0 = POST; const Y0 = 0

  const colX = [X0, X0 + CW, X0 + CW * 2]
  const rowY = [Y0, Y0 + CH, Y0 + CH * 2]

  const totalOnTarget = sections.reduce((s, k) => s + gs[k].shots, 0)
  const totalGoals = sections.reduce((s, k) => s + gs[k].goals, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 mb-1">
        <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 font-semibold">Mapa del arco</p>
        <div className="flex gap-3 text-[9px] text-apple-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block bg-orange-400/60" />al arco
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block bg-red-500/70" />gol
          </span>
        </div>
      </div>

      <svg viewBox={`-2 -2 ${GW + 4} ${GH + 30}`} className="w-full max-w-xs">
        {/* Fondo del arco (césped) */}
        <rect x={-2} y={-2} width={GW + 4} height={GH + 30} fill="#111827" rx={4} />

        {/* Zonas internas (3×3) */}
        {sections.map((key, i) => {
          const col = i % 3; const row = Math.floor(i / 3)
          const x = colX[col]; const y = rowY[row]
          const d = gs[key]
          return (
            <g key={key}>
              <rect
                x={x} y={y}
                width={CW - 0.5} height={CH - 0.5}
                fill={zoneColor(d.shots, d.goals)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={0.5}
              />
              {d.shots > 0 && (
                <>
                  <text x={x + CW / 2} y={y + CH / 2 - 2} textAnchor="middle" fontSize={11} fontWeight="700" fill="white">
                    {d.shots}
                  </text>
                  {d.goals > 0 && (
                    <text x={x + CW / 2} y={y + CH / 2 + 10} textAnchor="middle" fontSize={8} fill="#4ade80" fontWeight="700">
                      {d.goals}G
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })}

        {/* Marco del arco (postes y travesaño) */}
        {/* Poste izquierdo */}
        <rect x={0} y={0} width={POST} height={GH} fill="#d1d5db" rx={1} />
        {/* Poste derecho */}
        <rect x={GW - POST} y={0} width={POST} height={GH} fill="#d1d5db" rx={1} />
        {/* Travesaño */}
        <rect x={0} y={0} width={GW} height={POST * 0.7} fill="#d1d5db" rx={1} />
        {/* Red (fondo) */}
        <rect x={POST} y={POST * 0.7} width={GW - POST * 2} height={GH - POST * 0.7} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.8} />

        {/* Línea de gol */}
        <line x1={0} y1={GH} x2={GW} y2={GH} stroke="#6b7280" strokeWidth={1.5} />

        {/* Área fuera del arco (afuera) */}
        <rect x={0} y={GH + 1} width={GW} height={24} fill="#0f172a" />
        {gs.missed > 0 && (
          <>
            <text x={GW / 2} y={GH + 15} textAnchor="middle" fontSize={10} fill="#6b7280">
              {gs.missed} fuera del arco
            </text>
          </>
        )}

        {/* Totales */}
        <text x={POST + 2} y={GH - 4} fontSize={7} fill="rgba(255,255,255,0.4)">
          {totalOnTarget} al arco · {totalGoals} goles
        </text>
      </svg>
    </div>
  )
}

// ─── PitchHeatmap: cancha con zonas coloreadas ────────────────────────────────

function PitchHeatmap({
  title,
  zones,
  valueKey = 'count',
  showWonLost = false,
  accentColor = '#3b82f6',
}: {
  title: string
  zones: PitchZoneMap
  valueKey?: 'count' | 'won' | 'lost'
  showWonLost?: boolean
  accentColor?: string
}) {
  const keys: (keyof PitchZoneMap)[] = [
    'atkLeft', 'atkCenter', 'atkRight',
    'midLeft', 'midCenter', 'midRight',
    'defLeft', 'defCenter', 'defRight',
  ]
  const values = keys.map(k => {
    const z = zones[k]
    if (showWonLost) return z.won ?? 0
    return z[valueKey as keyof typeof z] as number ?? 0
  })
  const maxVal = Math.max(...values, 1)

  const W = 180; const H = 120
  const CW = W / 3; const CH = H / 3

  const rowLabels = ['Ataque', 'Mediocampo', 'Defensa']

  function hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }

  function cellColor(val: number): string {
    if (val === 0) return 'rgba(255,255,255,0.03)'
    const intensity = val / maxVal
    const { r, g, b } = hexToRgb(accentColor)
    const alpha = 0.1 + intensity * 0.65
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 mb-2 font-semibold">{title}</p>
      <svg viewBox={`-22 -4 ${W + 26} ${H + 8}`} className="w-full max-w-[220px]">
        {/* Fondo */}
        <rect x={-22} y={-4} width={W + 26} height={H + 8} fill="#0f1f0f" rx={4} />

        {/* Líneas de cancha */}
        <rect x={0} y={0} width={W} height={H} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
        {/* Línea medio campo */}
        <line x1={0} y1={H / 3} x2={W} y2={H / 3} stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} strokeDasharray="3,2" />
        <line x1={0} y1={H * 2 / 3} x2={W} y2={H * 2 / 3} stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} strokeDasharray="3,2" />
        {/* Columnas */}
        <line x1={W / 3} y1={0} x2={W / 3} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} strokeDasharray="3,2" />
        <line x1={W * 2 / 3} y1={0} x2={W * 2 / 3} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} strokeDasharray="3,2" />

        {/* Zonas coloreadas */}
        {keys.map((key, i) => {
          const col = i % 3; const row = Math.floor(i / 3)
          const x = col * CW; const y = row * CH
          const z = zones[key]
          const val = showWonLost ? (z.won ?? 0) : (z[valueKey as keyof typeof z] as number ?? 0)

          return (
            <g key={key}>
              <rect x={x + 0.5} y={y + 0.5} width={CW - 1} height={CH - 1} fill={cellColor(val)} />
              {val > 0 && (
                <text x={x + CW / 2} y={y + CH / 2 + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="white">
                  {val}
                </text>
              )}
              {showWonLost && (z.lost ?? 0) > 0 && (
                <text x={x + CW / 2} y={y + CH / 2 + 13} textAnchor="middle" fontSize={7} fill="#f87171">
                  -{z.lost}
                </text>
              )}
            </g>
          )
        })}

        {/* Labels filas (a la izquierda) */}
        {rowLabels.map((lbl, i) => (
          <text key={i} x={-2} y={i * CH + CH / 2 + 3} textAnchor="end" fontSize={6} fill="rgba(255,255,255,0.3)">
            {lbl}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ─── Sección: Formaciones usadas ──────────────────────────────────────────────

function FormacionesUsadas({ fa }: { fa: WyscoutFullAnalysis }) {
  if (fa.formationUsage.length === 0) return null
  const max = Math.max(...fa.formationUsage.map(f => f.pct))
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {fa.formationUsage.map(f => (
        <div key={f.formation} className="flex items-center gap-2 bg-apple-gray-50 dark:bg-apple-gray-800 rounded-xl px-3 py-2">
          <span className="text-sm font-bold text-apple-gray-900 dark:text-white">{f.formation}</span>
          <div className="w-16 h-1.5 bg-apple-gray-200 dark:bg-apple-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(f.pct / max) * 100}%` }} />
          </div>
          <span className="text-xs text-apple-gray-500">{f.pct}%</span>
        </div>
      ))}
    </div>
  )
}

// ─── Sección: Análisis Táctico ────────────────────────────────────────────────

function AnalisisTactico({ fa }: { fa: WyscoutFullAnalysis }) {
  const hasContent = fa.tacticalNotes.length > 0 || fa.strengths.length > 0 || fa.weaknesses.length > 0 || fa.keyPlayers.length > 0
  if (!hasContent) return null

  return (
    <div className={card}>
      <SectionTitle accent="bg-indigo-500">Análisis Táctico</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {fa.keyPlayers.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 mb-3 font-semibold">Jugadores clave</p>
            <div className="flex flex-wrap gap-2">
              {fa.keyPlayers.map(p => (
                <span key={p} className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {fa.tacticalNotes.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 mb-3 font-semibold">Sistema de juego</p>
            <ul className="space-y-1.5">
              {fa.tacticalNotes.map((n, i) => (
                <li key={i} className="flex gap-2 text-xs text-apple-gray-700 dark:text-apple-gray-300">
                  <span className="text-blue-400 flex-shrink-0">•</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fa.strengths.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-emerald-500 mb-3 font-semibold">Fortalezas</p>
            <ul className="space-y-1.5">
              {fa.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-apple-gray-700 dark:text-apple-gray-300">
                  <span className="text-emerald-400 flex-shrink-0">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fa.weaknesses.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-red-500 mb-3 font-semibold">Debilidades</p>
            <ul className="space-y-1.5">
              {fa.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-xs text-apple-gray-700 dark:text-apple-gray-300">
                  <span className="text-red-400 flex-shrink-0">−</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Wrappers que agregan imagen PDF a cada sección ──────────────────────────

interface WithPdfProps {
  fa: WyscoutFullAnalysis
  pdfPages: PdfPage[]
  pdfInsights: PdfPageInsight[]
}

function EstadisticasGeneralesWithPdf({ fa, pdfPages, pdfInsights }: WithPdfProps) {
  const s = fa.overallStats
  const hasStats = Object.values(s).some(v => v != null)
  if (!hasStats && !pdfPages.length && !pdfInsights.length) return null
  return (
    <div className={card}>
      <SectionTitle accent="bg-teal-500">Estadísticas Generales</SectionTitle>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {s.partidos    != null && <StatPill label="Partidos"   value={s.partidos} />}
        {s.victorias   != null && <StatPill label="Victorias"  value={s.victorias} accent="text-emerald-400" />}
        {s.empates     != null && <StatPill label="Empates"    value={s.empates} accent="text-amber-400" />}
        {s.derrotas    != null && <StatPill label="Derrotas"   value={s.derrotas} accent="text-red-400" />}
        {s.goles       != null && <StatPill label="Goles"      value={s.goles} accent="text-emerald-400" />}
        {s.golesContra != null && <StatPill label="En contra"  value={s.golesContra} accent="text-red-400" />}
        {s.avgXG       != null && <StatPill label="xG prom."   value={s.avgXG.toFixed(2)} />}
        {s.avgPosesion != null && <StatPill label="Posesión"   value={`${s.avgPosesion.toFixed(1)}%`} />}
        {s.avgPPDA     != null && <StatPill label="PPDA"       value={s.avgPPDA.toFixed(2)} />}
        {s.shotsTotal  != null && <StatPill label="Tiros"      value={s.shotsTotal} />}
        {s.shotsOnTargetPct != null && <StatPill label="Al arco %" value={`${s.shotsOnTargetPct.toFixed(0)}%`} />}
      </div>
      <PdfSectionViz keywords={['stat', 'general', 'resumen', 'overview', 'posesion', 'ppda']} pages={pdfPages} insights={pdfInsights} label="Estadísticas del informe" />
    </div>
  )
}

function FaseDefensivaWithPdf({ fa, pdfPages, pdfInsights }: WithPdfProps) {
  const { defensiveDuels, aerialDuels } = fa
  const hasData = defensiveDuels.totalWon > 0 || defensiveDuels.totalLost > 0 ||
    aerialDuels.totalWon > 0 || defensiveDuels.topPlayers.length > 0
  if (!hasData && !pdfInsights.some(i => ['duels', 'heatmap'].includes(i.sectionType ?? ''))) return null

  return (
    <div className={card}>
      <SectionTitle accent="bg-orange-500">Fase Defensiva</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(defensiveDuels.totalWon > 0 || defensiveDuels.topPlayers.length > 0) && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div><p className="text-xl font-black text-white">{defensiveDuels.totalWon}</p><p className="text-[10px] text-emerald-400 uppercase">Ganados</p></div>
              <div><p className="text-xl font-black text-white">{defensiveDuels.totalLost}</p><p className="text-[10px] text-red-400 uppercase">Perdidos</p></div>
            </div>
            <DuelsChart players={defensiveDuels.topPlayers} title="Duelos defensivos" />
          </div>
        )}
        {(aerialDuels.totalWon > 0 || aerialDuels.topPlayers.length > 0) && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div><p className="text-xl font-black text-white">{aerialDuels.totalWon}</p><p className="text-[10px] text-emerald-400 uppercase">Ganados</p></div>
              <div><p className="text-xl font-black text-white">{aerialDuels.totalLost}</p><p className="text-[10px] text-red-400 uppercase">Perdidos</p></div>
            </div>
            <DuelsChart players={aerialDuels.topPlayers} title="Duelos aéreos" />
          </div>
        )}
      </div>
      <PdfSectionViz keywords={['duel', 'defensiv', 'aéreo', 'aerial', 'recuper', 'intercept']} pages={pdfPages} insights={pdfInsights} label="Del informe · Fase defensiva" />
    </div>
  )
}

function AtaqueWithPdf({ fa, pdfPages, pdfInsights }: WithPdfProps) {
  const { crosses, dribbles, highRecoveries } = fa
  const hasData = crosses.total > 0 || dribbles.total > 0 || highRecoveries.length > 0
  if (!hasData) return null
  return (
    <div className={card}>
      <SectionTitle accent="bg-violet-500">Ataque · Centros y Regates</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {crosses.total > 0 && (
          <div className="space-y-3">
            <div className="flex gap-4 items-end">
              <div><p className="text-xl font-black text-white">{crosses.total}</p><p className="text-[10px] text-apple-gray-400 uppercase">Centros</p></div>
              <div><p className="text-xl font-black text-white">{crosses.successful}</p><p className="text-[10px] text-emerald-400 uppercase">Precisos</p></div>
              <div><p className="text-xl font-black text-white">{crosses.pct.toFixed(0)}%</p><p className="text-[10px] text-apple-gray-400 uppercase">Precisión</p></div>
            </div>
            <HBarChart items={crosses.topCrossers.slice(0,6).map(p=>({label:p.name,value:p.successful,value2:p.total-p.successful,badge:`${p.pct.toFixed(0)}%`}))} color1="#8b5cf6" color2="#4b2a8c" label1="Precisos" label2="Fallados" unit="" />
          </div>
        )}
        {dribbles.total > 0 && (
          <div className="space-y-3">
            <div className="flex gap-4 items-end">
              <div><p className="text-xl font-black text-white">{dribbles.total}</p><p className="text-[10px] text-apple-gray-400 uppercase">Regates</p></div>
              <div><p className="text-xl font-black text-white">{dribbles.successful}</p><p className="text-[10px] text-emerald-400 uppercase">Exitosos</p></div>
              <div><p className="text-xl font-black text-white">{dribbles.pct.toFixed(0)}%</p><p className="text-[10px] text-apple-gray-400 uppercase">% éxito</p></div>
            </div>
            <HBarChart items={dribbles.topDribblers.slice(0,6).map(p=>({label:p.name,value:p.successful,value2:p.total-p.successful,badge:`${p.pct.toFixed(0)}%`}))} color1="#f59e0b" color2="#92400e" label1="Exitosos" label2="Fallados" unit="" />
          </div>
        )}
      </div>
      {highRecoveries.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 mb-2 font-semibold">Recuperaciones en campo rival</p>
          <div className="flex flex-wrap gap-2">
            {highRecoveries.slice(0,8).map((p,i)=>(
              <div key={i} className="flex items-center gap-1.5 bg-apple-gray-50 dark:bg-apple-gray-800 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-bold text-white">{p.count}</span>
                <span className="text-[10px] text-apple-gray-400">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <PdfSectionViz keywords={['centro', 'cross', 'regate', 'dribl', 'ataque', 'transici', 'heatmap', 'calor']} pages={pdfPages} insights={pdfInsights} label="Del informe · Ataque" />
    </div>
  )
}

function FinalizacionWithPdf({ fa }: Pick<WithPdfProps, 'fa'>) {
  const { shots } = fa
  const hasData = shots.total > 0 || shots.byPlayer.length > 0
  if (!hasData) return null

  return (
    <div className={card}>
      <SectionTitle accent="bg-yellow-500">Finalización</SectionTitle>
      {shots.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatPill label="Tiros" value={shots.total} />
          <StatPill label="Al arco %" value={`${shots.pct.toFixed(0)}%`} />
          {shots.xG != null && <StatPill label="xG" value={shots.xG.toFixed(2)} />}
          <StatPill label="Goles" value={shots.goals} accent="text-emerald-400" />
        </div>
      )}
      {shots.byPlayer.length > 0 && (
        <div className="max-w-sm">
          <ShotsPlayerChart players={shots.byPlayer} />
        </div>
      )}
      {shots.byType.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 font-semibold">Por tipo</p>
          {shots.byType.map((t, i) => {
            const maxCount = Math.max(...shots.byType.map(x => x.count), 1)
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-apple-gray-600 dark:text-apple-gray-300 w-24 flex-shrink-0 truncate">{t.type}</span>
                <div className="flex-1 h-1.5 bg-apple-gray-100 dark:bg-apple-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                </div>
                <span className="text-[10px] text-apple-gray-500 w-20 text-right flex-shrink-0 tabular-nums">
                  {t.count}t · {t.goals}g{t.xG != null ? ` · ${t.xG.toFixed(1)}xG` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BalonParadoWithPdf({ fa }: Pick<WithPdfProps, 'fa'>) {
  const { corners, freeKicks } = fa
  const hasData = corners.total > 0 || freeKicks.total > 0
  if (!hasData) return null

  return (
    <div className={card}>
      <SectionTitle accent="bg-pink-500">Balón Parado</SectionTitle>

      {/* Stats en pills compactos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {corners.total > 0 && <StatPill label="Córneres" value={corners.total} />}
        {corners.goals > 0 && <StatPill label="Goles córner" value={corners.goals} accent="text-emerald-400" />}
        {freeKicks.total > 0 && <StatPill label="Tiros libres" value={freeKicks.total} />}
        {freeKicks.goals > 0 && <StatPill label="Goles TL" value={freeKicks.goals} accent="text-emerald-400" />}
      </div>

      {/* Lado preferido como texto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {corners.total > 0 && (
          <div className="bg-apple-gray-50 dark:bg-apple-gray-800 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 font-semibold mb-1">Córneres</p>
            <p className="text-xs text-apple-gray-700 dark:text-apple-gray-200">
              Izq <span className="font-bold text-blue-400">{corners.left}</span> · Der <span className="font-bold text-orange-400">{corners.right}</span>
            </p>
          </div>
        )}
        {freeKicks.total > 0 && (
          <div className="bg-apple-gray-50 dark:bg-apple-gray-800 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-apple-gray-400 font-semibold mb-1">Tiros libres</p>
            <p className="text-xs text-apple-gray-700 dark:text-apple-gray-200">
              Izq <span className="font-bold text-blue-400">{freeKicks.left}</span> · Der <span className="font-bold text-orange-400">{freeKicks.right}</span>
            </p>
          </div>
        )}
      </div>

      {/* Ejecutores */}
      {(corners.kickers.length > 0 || freeKicks.kickers.length > 0) && (
        <div className="max-w-sm">
          {corners.kickers.length > 0 && (
            <HBarChart
              items={corners.kickers.slice(0,5).map(k => ({ label: k.name, value: k.left + k.right, badge: `I${k.left} D${k.right}` }))}
              color1="#ec4899"
              unit=""
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Placeholder: Ataques desde las bandas ───────────────────────────────────

interface AttackZone { pct: number; xG: number; count: number }
interface AttacksByFlank { left: AttackZone; center: AttackZone; right: AttackZone }

function AttackZoneSVG({ data, matchesAnalyzed = 1, pdfPage }: {
  data?: AttacksByFlank
  matchesAnalyzed?: number
  pdfPage?: { dataUrl: string }
}) {
  // Si hay imagen del PDF, mostrarla directamente
  if (pdfPage) {
    return (
      <img src={pdfPage.dataUrl} alt="Ataques desde las bandas" className="w-full rounded-lg" style={{ maxHeight: 260, objectFit: 'contain' }} />
    )
  }

  // Valores placeholder o datos reales
  const zones = data ?? {
    left:   { pct: 33, xG: 0.12, count: Math.round(matchesAnalyzed * 3.2) },
    center: { pct: 34, xG: 0.18, count: Math.round(matchesAnalyzed * 3.5) },
    right:  { pct: 33, xG: 0.14, count: Math.round(matchesAnalyzed * 3.3) },
  }

  const W = 220; const H = 130
  const zoneW = W / 3
  const maxXG = Math.max(zones.left.xG, zones.center.xG, zones.right.xG, 0.01)
  const arrowH = (xG: number) => 25 + (xG / maxXG) * 50

  function zone(idx: number, z: AttackZone, label: string, color: string) {
    const x = idx * zoneW + zoneW / 2
    const ah = arrowH(z.xG)
    const arrowY = H - 18 - ah

    return (
      <g key={idx}>
        {/* Zona coloreada */}
        <rect x={idx * zoneW + 1} y={H * 0.28} width={zoneW - 2} height={H * 0.55}
          fill={color} opacity={0.08 + (z.pct / 100) * 0.14} rx="2" />

        {/* Flecha */}
        <line x1={x} y1={H - 18} x2={x} y2={arrowY + 10} stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        <polygon
          points={`${x},${arrowY} ${x - 7},${arrowY + 14} ${x + 7},${arrowY + 14}`}
          fill={color} opacity="0.9"
        />

        {/* Stats */}
        <rect x={idx * zoneW + 4} y={H - 15} width={zoneW - 8} height={13} rx="3" fill="rgba(0,0,0,0.5)" />
        <text x={x} y={H - 8} textAnchor="middle" fontSize="8" fontWeight="700" fill="white">{z.pct}%</text>

        {/* xG */}
        <text x={x} y={arrowY - 4} textAnchor="middle" fontSize="7" fill={color} opacity="0.85" fontWeight="600">
          {z.xG.toFixed(2)} xG
        </text>

        {/* Label zona */}
        <text x={x} y={H * 0.28 - 3} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.35)">{label}</text>
      </g>
    )
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px]">
      {/* Fondo cancha */}
      <rect width={W} height={H} rx="6" fill="#0d2a18" />

      {/* Líneas cancha simplificadas */}
      <rect x="4" y="4" width={W - 8} height={H - 8} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" rx="3" />
      <line x1={zoneW} y1="4" x2={zoneW} y2={H - 4} stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" strokeDasharray="3,2" />
      <line x1={zoneW * 2} y1="4" x2={zoneW * 2} y2={H - 4} stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" strokeDasharray="3,2" />

      {/* Área chica arriba */}
      <rect x={W * 0.33} y="4" width={W * 0.34} height={H * 0.18} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />

      {/* Zonas */}
      {zone(0, zones.left, 'Izq', '#60a5fa')}
      {zone(1, zones.center, 'Centro', '#a78bfa')}
      {zone(2, zones.right, 'Der', '#fb923c')}

      {/* Badge "placeholder" si no hay datos */}
      {!data && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.2)">
          placeholder · datos disponibles al cargar informe
        </text>
      )}
    </svg>
  )
}

function AtaquesBandasSection({ pdfPages, pdfInsights }: { pdfPages: PdfPage[]; pdfInsights: PdfPageInsight[] }) {
  // Buscar página del PDF que muestre ataques desde las bandas / heat map / flancos
  const keywords = ['banda', 'flank', 'ataque', 'peligros', 'attack', 'heatmap', 'calor']
  const match = pdfPages.length > 0
    ? (() => {
        const lk = keywords.map(k => k.toLowerCase())
        const byType = pdfInsights.find(i => {
          const t = (i.sectionType ?? '').toLowerCase()
          const txt = `${i.insight.title} ${i.insight.description}`.toLowerCase()
          return t === 'heatmap' || lk.some(k => t.includes(k) || txt.includes(k))
        })
        if (byType) {
          const page = pdfPages.find(p => p.pageNum === byType.pageNum)
          if (page) return { page, insight: byType }
        }
        return null
      })()
    : null

  return (
    <div className={card}>
      <SectionTitle accent="bg-sky-500">Ataques desde las bandas</SectionTitle>
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex-shrink-0 w-full sm:w-auto">
          <AttackZoneSVG pdfPage={match?.page} />
        </div>
        <div className="flex-1 space-y-3">
          {match?.insight ? (
            <>
              <p className="text-xs font-bold text-apple-gray-900 dark:text-white">{match.insight.insight.title}</p>
              {match.insight.insight.description && (
                <p className="text-[11px] text-apple-gray-500 leading-relaxed">{match.insight.insight.description}</p>
              )}
              {match.insight.insight.bullets.length > 0 && (
                <ul className="space-y-1">
                  {match.insight.insight.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                      <span className="text-[11px] text-apple-gray-700 dark:text-apple-gray-300 leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-apple-gray-600 dark:text-apple-gray-400">Distribución por zona</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {(['Izquierda', 'Centro', 'Derecha'] as const).map((lbl, i) => (
                  <div key={i} className="bg-apple-gray-50 dark:bg-apple-gray-800 rounded-lg p-2">
                    <p className="text-base font-bold text-apple-gray-900 dark:text-white">—</p>
                    <p className="text-[9px] text-apple-gray-400 uppercase mt-0.5">{lbl}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-apple-gray-400 italic">Disponible al subir informe con datos de zonas de ataque</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface RivalReportProps {
  fa: WyscoutFullAnalysis
  /** Páginas del PDF renderizadas (session-only, pueden estar vacías) */
  pdfPages?: PdfPage[]
  /** Insights por página generados por Claude */
  pdfInsights?: PdfPageInsight[]
}

export function RivalComprehensiveReport({ fa, pdfPages = [], pdfInsights = [] }: RivalReportProps) {
  return (
    <div className="space-y-4">

      {/* ── 1. Canchitas por partido (primero, lo más visual) ── */}
      {fa.recentFormations.length > 0 && (
        <div className={card}>
          <SectionTitle accent="bg-blue-500">
            Formaciones por partido
            {fa.formationUsage.length > 0 && (
              <span className="ml-3 flex flex-wrap gap-2 font-normal">
                {fa.formationUsage.map(f => (
                  <span key={f.formation} className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5 font-bold tracking-wide">
                    {f.formation} · {f.pct}%
                  </span>
                ))}
              </span>
            )}
          </SectionTitle>
          <FormationsGrid formations={fa.recentFormations} />
        </div>
      )}

      {/* ── 2. Análisis táctico (fortalezas / debilidades / jugadores clave) ── */}
      <AnalisisTactico fa={fa} />

      {/* ── 3. Fase defensiva ── */}
      <FaseDefensivaWithPdf fa={fa} pdfPages={pdfPages} pdfInsights={pdfInsights} />

      {/* ── 4. Ataque · Centros y Regates ── */}
      <AtaqueWithPdf fa={fa} pdfPages={pdfPages} pdfInsights={pdfInsights} />

      {/* ── 5. Finalización ── */}
      <FinalizacionWithPdf fa={fa} />

      {/* ── 6. Balón parado ── */}
      <BalonParadoWithPdf fa={fa} />

    </div>
  )
}
