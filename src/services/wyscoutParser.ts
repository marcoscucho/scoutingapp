// ─── Wyscout Team PDF Parser ──────────────────────────────────────────────────
// Extracts data from Wyscout team analysis PDFs.
// Uses pdfjs-dist for reliable text extraction from searchable PDFs.

import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface ZoneCellData { value: string; count: number | null }

export interface CornerKicker {
  name: string
  total: number
  left: number
  right: number
}

export interface PlayerStat {
  number: number
  name: string
  position: string
  matches: number
  totalMinutes: number
  goals: number
  assists: number
}

export interface RecentMatch {
  homeTeam: string
  homeScore: number
  awayScore: number
  awayTeam: string
  competition: string
  date: string          // DD.MM.YYYY
  isHome: boolean       // relative to the team being analyzed
  result: 'W' | 'D' | 'L'
}

export interface TeamStats {
  partidos?: number
  victorias?: number
  empates?: number
  derrotas?: number
  goles?: number
  golesContra?: number
  // Ataque
  avgXG?: number
  avgTiros?: number
  avgTirosPorteria?: number
  avgTirosPorteria_pct?: number
  ataquesPositionales?: number
  ataquesPositionalesRemate?: number
  contraataques?: number
  contraataquesRemate?: number
  balonParado?: number
  avgCorners?: number
  avgCentros?: number
  avgCentros_pct?: number
  // Posesión / pase
  avgPosesion?: number
  avgPases?: number
  avgPasesUltimoTercio_pct?: number
  pasesProgresivos?: number
  // Pressing
  avgPPDA?: number
  avgBalonesRecuperados?: number
  avgBalonesPerdidos?: number
  interceptaciones?: number
  avgDespejes?: number
  // Duelos
  avgDuelos_pct?: number
  avgDuelosAereos_pct?: number
  // Disciplina
  avgFaltas?: number
  avgAmarillas?: number
}

export interface WyscoutData {
  teamName: string
  recoveries: ZoneCellData[][] | null
  losses: ZoneCellData[][] | null
  cornersLeft: number
  cornersRight: number
  cornersGoals: number
  cornersKickers: CornerKicker[]
  teamStats: TeamStats
  players: PlayerStat[]
  recentMatches: RecentMatch[]
  fileName: string
  parsedAt: string
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

export async function extractRawPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    pages.push(strings)
  }
  return pages.join('\n')
}

// ─── Team name ────────────────────────────────────────────────────────────────

function extractTeamName(text: string): string {
  // PDF header is "I N F O R M E D E L E Q U I P O  <TeamName>"
  const m = text.match(/I\s+N\s+F\s+O\s+R\s+M\s+E\s+D\s+E\s+L\s+E\s+Q\s+U\s+I\s+P\s+O\s+([\w\s]+?)(?=\s{2}|\n)/)
  return m ? m[1].trim() : ''
}

// ─── Recent matches ───────────────────────────────────────────────────────────

function inferTeamFromMatches(raw: { homeTeam: string; awayTeam: string }[]): string {
  // El equipo analizado aparece en TODOS los partidos; el más frecuente es el nuestro.
  const freq: Record<string, number> = {}
  for (const m of raw) {
    freq[m.homeTeam] = (freq[m.homeTeam] ?? 0) + 1
    freq[m.awayTeam] = (freq[m.awayTeam] ?? 0) + 1
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

function extractRecentMatches(text: string, teamName: string): RecentMatch[] {
  const matches: RecentMatch[] = []
  // Pattern: "Team1 N – N Team2  COMPETITION   DD.MM.YYYY"
  // Team name regex usa espacio simple entre palabras para no mezclar con el encabezado
  const WORD = '[A-Za-záéíóúüñÁÉÍÓÚÜÑ.()]+'
  const TEAM = `${WORD}(?: ${WORD})*`
  const re = new RegExp(
    `(${TEAM})\\s+(\\d+)\\s+[–\\-]\\s+(\\d+)\\s+(${TEAM})\\s{2,}([A-ZÁÉÍÓÚÜÑ][A-Za-záéíóúüñÁÉÍÓÚÜÑ\\s]+?)\\s{2,}(\\d{2}\\.\\d{2}\\.\\d{4})`,
    'g'
  )
  const raw: { homeTeam: string; homeScore: number; awayScore: number; awayTeam: string; competition: string; date: string }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    raw.push({
      homeTeam: m[1].trim(),
      homeScore: parseInt(m[2]),
      awayScore: parseInt(m[3]),
      awayTeam: m[4].trim(),
      competition: m[5].trim(),
      date: m[6],
    })
  }

  // Si el nombre del equipo no se extrajo del encabezado, inferirlo de los partidos
  const effectiveName = teamName.trim().length > 0 ? teamName : inferTeamFromMatches(raw)

  for (const r of raw) {
    // Guardia explícita: string vacío matches CUALQUIER cosa → evitar falsos positivos
    const isHome = effectiveName.length > 0 && (
      r.homeTeam.toLowerCase().includes(effectiveName.toLowerCase()) ||
      effectiveName.toLowerCase().includes(r.homeTeam.toLowerCase())
    )
    const ourScore   = isHome ? r.homeScore : r.awayScore
    const theirScore = isHome ? r.awayScore : r.homeScore
    const result: 'W' | 'D' | 'L' = ourScore > theirScore ? 'W' : ourScore === theirScore ? 'D' : 'L'
    matches.push({ ...r, isHome, result })
  }
  return matches
}

// ─── Players ──────────────────────────────────────────────────────────────────

const POSITIONS = [
  'GK', 'LB', 'RB', 'CB', 'LCB', 'RCB', 'LMF', 'RMF', 'CMF', 'AMF', 'DMF',
  'LCMF', 'RCMF', 'LW', 'RW', 'CF', 'SS', 'WF', 'Midfielder', 'Forward',
  'Defender', 'Goalkeeper', 'LAMF', 'RAMF',
].join('|')

function extractPlayers(text: string): PlayerStat[] {
  const players: PlayerStat[] = []
  const posRe = new RegExp(
    `(\\d+)\\s+([A-ZÁÉÍÓÚÑa-záéíóúñ.\\s]+?)\\s+(${POSITIONS})\\s+(\\d+)\\s+(\\d+|-)\\s+(\\d+)\\s+(\\d+)'\\s+(\\d+)'\\s+(\\d+|-)\\s+(\\d+|-)`,
    'g'
  )
  let m: RegExpExecArray | null
  const seen = new Set<string>()
  while ((m = posRe.exec(text)) !== null) {
    const name = m[2].trim()
    if (seen.has(name)) continue
    seen.add(name)
    players.push({
      number: parseInt(m[1]),
      name,
      position: m[3].trim(),
      matches: parseInt(m[6]),
      totalMinutes: parseInt(m[7]),
      goals: m[9] === '-' ? 0 : parseInt(m[9]),
      assists: m[10] === '-' ? 0 : parseInt(m[10]),
    })
  }
  return players
}

// ─── Team stats ───────────────────────────────────────────────────────────────

function extractNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const raw = (m[1] ?? m[2] ?? '').replace(',', '.')
      const n = parseFloat(raw)
      if (!isNaN(n)) return n
    }
  }
  return undefined
}

function extractTeamStats(text: string): TeamStats {
  const n = (pats: RegExp[]) => extractNumber(text, pats)
  return {
    partidos:    n([/Partidos\s+(\d+)/i, /(\d+)\s+Partidos/i]),
    victorias:   n([/Victorias?\s+(\d+)/i, /(\d+)\s+Victorias?/i]),
    empates:     n([/Empates?\s+(\d+)/i, /(\d+)\s+Empates?/i]),
    derrotas:    n([/Derrotas?\s+(\d+)/i, /(\d+)\s+Derrotas?/i]),
    goles:       n([/Goles\s+a\s+favor\s+(\d+)/i, /Goles\s+marcados\s+(\d+)/i]),
    golesContra: n([/Goles\s+en\s+contra\s+(\d+)/i, /Goles\s+recibidos\s+(\d+)/i]),
    avgXG:       n([/Expected\s+Goals?\s+([\d.,]+)/i, /xG\s+([\d.,]+)/i, /\bxG\b[^\d]*([\d.,]+)/i]),
    avgPosesion: n([/Posici[oó]n\s+del\s+bal[oó]n\s+([\d.,]+)/i, /Posesi[oó]n\s+([\d.,]+)/i, /Ball\s+possession\s+([\d.,]+)/i]),
    avgPPDA:     n([/PPDA\s+([\d.,]+)/i]),
    avgPases:    n([/Pases?\s*\(%\)\s*([\d.,]+)/i, /Precisi[oó]n\s+(?:de\s+)?pase\s+([\d.,]+)/i]),
    avgTiros:    n([/Tiros\s+(\d+(?:[.,]\d+)?)/i]),
    avgTirosPorteria: n([/Tiros\s+a\s+(?:puerta|porter[ií]a)\s+(\d+(?:[.,]\d+)?)/i]),
    ataquesPositionales: n([/Ataques?\s+posicionales?\s+(\d+(?:[.,]\d+)?)/i]),
    contraataques: n([/Contraataques?\s+(\d+(?:[.,]\d+)?)/i]),
    balonParado: n([/Bal[oó]n\s+parado\s+(\d+(?:[.,]\d+)?)/i]),
    pasesProgresivos: n([/Pases?\s+progresivos?\s+(\d+(?:[.,]\d+)?)/i]),
    interceptaciones: n([/Interceptaciones?\s+(\d+(?:[.,]\d+)?)/i]),
  }
}

// ─── Helpers (re-used) ────────────────────────────────────────────────────────

function parsePct(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)%/)
  return m ? parseFloat(m[1]) : null
}

function extractZoneGrid(text: string, heading: RegExp): ZoneCellData[][] | null {
  const idx = text.search(heading)
  if (idx < 0) return null
  const section = text.slice(idx, idx + 600)
  const tokens = section.match(/\d+(?:\.\d+)?%?/g) ?? []
  const data: ZoneCellData[][] = []
  let ti = 0
  // Skip any leading non-grid tokens (e.g. page numbers before the grid starts)
  // Detect grid start: first token that is either a "%" value or followed by a "%" value
  while (ti < tokens.length && !tokens[ti].includes('%') && !tokens[ti + 1]?.includes('%')) {
    ti++
  }
  for (let row = 0; row < 3; row++) {
    const rowData: ZoneCellData[] = []
    for (let col = 0; col < 3; col++) {
      const token = tokens[ti] ?? ''
      if (token.includes('%')) {
        // Cell has a percentage: consume pct token + count token
        const pctNum = parsePct(token)
        ti++
        const countNum = parseFloat(tokens[ti] ?? '')
        ti++
        rowData.push({
          value: pctNum !== null ? `${pctNum}%` : '—',
          count: isNaN(countNum) ? null : countNum,
        })
      } else {
        // Cell has no percentage (dash in PDF): consume only the count token
        const countNum = parseFloat(token)
        ti++
        rowData.push({ value: '—', count: isNaN(countNum) ? null : countNum })
      }
    }
    data.push(rowData)
  }
  return data
}

function extractCorners(text: string): Pick<WyscoutData, 'cornersLeft' | 'cornersRight' | 'cornersGoals' | 'cornersKickers'> {
  const kickers: CornerKicker[] = []
  let cornersLeft = 0
  let cornersRight = 0
  let cornersGoals = 0

  const cornerSection = text.match(/(?:C.rneres|CÓRNERES|Corners)[\s\S]{0,2000}?Tiradores[\s\S]{0,600}/)
  if (cornerSection) {
    const s = cornerSection[0]
    const rows = s.match(/(\d+\s+[A-Za-zÁÉÍÓÚáéíóúÑñ\s.]+?)\s+(Derecha|Izquierda)\s+(\d+)\s+(\d+)\s+(\d+)/g) ?? []
    for (const row of rows) {
      const m = row.match(/(\d+)\s+(.+?)\s+(Derecha|Izquierda)\s+(\d+)\s+(\d+)\s+(\d+)/)
      if (m) {
        const total = parseInt(m[4])
        const left  = parseInt(m[5])
        const right = parseInt(m[6])
        kickers.push({ name: m[2].trim(), total, left, right })
        cornersLeft  += left
        cornersRight += right
      }
    }
  }

  const cornerGoalM = text.match(/C.rneres[\s\S]{0,1500}?Goles\s+(\d)/)
  if (cornerGoalM) cornersGoals = parseInt(cornerGoalM[1])

  return { cornersLeft, cornersRight, cornersGoals, cornersKickers: kickers }
}

// ─── PDF → images (for Claude Vision) ────────────────────────────────────────
// Renders each PDF page to a JPEG base64 string. Used by rivalry formation analysis.

export async function pdfPagesToImages(file: File, maxPages = 8, scale = 1.3): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const total = Math.min(pdf.numPages, maxPages)
  const images: string[] = []
  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, canvas, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.8).split(',')[1])
  }
  return images
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function parseWyscoutPdf(file: File): Promise<WyscoutData> {
  const text = await extractRawPdfText(file)
  const teamName      = extractTeamName(text)
  const recentMatches = extractRecentMatches(text, teamName)
  const players       = extractPlayers(text)
  const recoveries    = extractZoneGrid(text, /Recuperaciones de bal/i)
  const losses        = extractZoneGrid(text, /P.rdidas de bal/i)
  const cornerData    = extractCorners(text)
  const teamStats     = extractTeamStats(text)

  return {
    teamName,
    recoveries,
    losses,
    ...cornerData,
    teamStats,
    players,
    recentMatches,
    fileName: file.name,
    parsedAt: new Date().toISOString(),
  }
}
