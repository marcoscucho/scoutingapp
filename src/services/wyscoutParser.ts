// ─── Wyscout Team PDF Parser ──────────────────────────────────────────────────
// Extracts zone data from Wyscout team analysis PDFs (CA Lanús format).
// Uses pdfjs-dist for reliable text extraction from searchable PDFs.

import * as pdfjsLib from 'pdfjs-dist'

// Use the bundled worker
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

export interface WyscoutData {
  // 3×3 grids: [band 0..2][third 0..2]
  // band: 0=Banda izq, 1=Centro, 2=Banda der
  // third: 0=Ter. def, 1=Ter. medio, 2=Ter. of
  recoveries: ZoneCellData[][] | null
  losses: ZoneCellData[][] | null
  cornersLeft: number
  cornersRight: number
  cornersGoals: number
  cornersKickers: CornerKicker[]
  fileName: string
  parsedAt: string
}

// Extract all text from a PDF File using pdf.js
async function extractPdfText(file: File): Promise<string> {
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

// Parse a percentage value like "10.5%" or "15%"
function parsePct(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)%/)
  return m ? parseFloat(m[1]) : null
}

// Extract the 3×3 zone grid after a section heading
// Returns null if pattern not found
function extractZoneGrid(text: string, heading: RegExp): ZoneCellData[][] | null {
  const idx = text.search(heading)
  if (idx < 0) return null
  const section = text.slice(idx, idx + 600)

  // Find all numbers (percentages and counts) in the section
  const tokens = section.match(/\d+(?:\.\d+)?%?/g) ?? []
  // Skip first 3 tokens which are column totals, then read 9 (pct, count) pairs
  const data: ZoneCellData[][] = []
  let ti = 3 // skip 3 column totals
  for (let row = 0; row < 3; row++) {
    const rowData: ZoneCellData[] = []
    for (let col = 0; col < 3; col++) {
      const pctToken = tokens[ti++] ?? ''
      const countToken = tokens[ti++] ?? ''
      const pctNum = parsePct(pctToken)
      const countNum = parseFloat(countToken)
      rowData.push({
        value: pctNum !== null ? `${pctNum}%` : '—',
        count: isNaN(countNum) ? null : countNum,
      })
    }
    data.push(rowData)
  }
  return data
}

// Extract corner kicker data
function extractCorners(text: string): Pick<WyscoutData, 'cornersLeft' | 'cornersRight' | 'cornersGoals' | 'cornersKickers'> {
  const kickers: CornerKicker[] = []
  let cornersLeft = 0
  let cornersRight = 0
  let cornersGoals = 0

  // Look for corner kicker table: Name / Foot / Corners / From left / From right
  const cornerSection = text.match(/(?:C.rneres|CÓRNERES|Corners)[\s\S]{0,2000}?Tiradores[\s\S]{0,600}/)
  if (cornerSection) {
    const s = cornerSection[0]
    // Pattern: player name followed by numbers (total corners, from left, from right)
    const rows = s.match(/(\d+\s+[A-Za-zÁÉÍÓÚáéíóúÑñ\s.]+?)\s+(Derecha|Izquierda)\s+(\d+)\s+(\d+)\s+(\d+)/g) ?? []
    for (const row of rows) {
      const m = row.match(/(\d+)\s+(.+?)\s+(Derecha|Izquierda)\s+(\d+)\s+(\d+)\s+(\d+)/)
      if (m) {
        const total = parseInt(m[4])
        const left  = parseInt(m[5])
        const right = parseInt(m[6])
        const name  = m[2].replace(/\s+/, ' ').trim()
        kickers.push({ name, total, left, right })
        cornersLeft  += left
        cornersRight += right
      }
    }
  }

  // Look for goals from corners in the jugadores (receivers) table
  // Pattern: player with xG and Goles columns after corner section
  const goalM = text.match(/(?:xG|xg)\s+([\d.]+)\s+Goles\s+(\d+)/)
  if (goalM) cornersGoals = parseInt(goalM[2])
  // Simpler: sum all "Goles" values in the corner section
  const cornerGoalM = text.match(/C.rneres[\s\S]{0,1500}?Goles\s+(\d)/)
  if (cornerGoalM) cornersGoals = parseInt(cornerGoalM[1])

  return { cornersLeft, cornersRight, cornersGoals, cornersKickers: kickers }
}

// Main entry point
export async function parseWyscoutPdf(file: File): Promise<WyscoutData> {
  const text = await extractPdfText(file)

  const recoveries = extractZoneGrid(text, /Recuperaciones de bal/i)
  const losses      = extractZoneGrid(text, /P.rdidas de bal/i)
  const cornerData  = extractCorners(text)

  return {
    recoveries,
    losses,
    ...cornerData,
    fileName: file.name,
    parsedAt: new Date().toISOString(),
  }
}
