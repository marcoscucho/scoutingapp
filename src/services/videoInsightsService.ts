import type { ParsedAnalysis, ParsedCategory } from './videoAnalysisTypes'

function pct(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

function sectorDistribution(category: ParsedCategory): string | null {
  const right = category.events.filter(e => /derech/i.test(e.name))
  const left = category.events.filter(e => /izquierd/i.test(e.name))
  const center = category.events.filter(e => /centr/i.test(e.name))

  if (right.length === 0 && left.length === 0 && center.length === 0) return null

  const rCount = right.reduce((s, e) => s + e.count, 0)
  const lCount = left.reduce((s, e) => s + e.count, 0)
  const cCount = center.reduce((s, e) => s + e.count, 0)
  const total = rCount + lCount + cCount
  if (total === 0) return null

  const max = Math.max(rCount, lCount, cCount)
  const maxLabel = max === rCount ? 'derecho' : max === lCount ? 'izquierdo' : 'central'
  const maxPct = pct(max, total)

  if (maxPct >= 50) {
    return `El ${maxPct}% de "${category.name}" se concentra en sector ${maxLabel}`
  }
  return null
}

function dominanceInsight(category: ParsedCategory): string | null {
  if (category.events.length < 2) return null
  const total = category.totalCount
  if (total === 0) return null

  for (const event of category.events) {
    const p = pct(event.count, total)
    if (p >= 65) {
      return `"${event.name}" predominante en "${category.name}" (${p}%)`
    }
  }
  return null
}

function effectivenessInsight(category: ParsedCategory): string | null {
  const attempts = category.events.filter(e => /intent|tiro|remate|disparo|shot/i.test(e.name))
  const successes = category.events.filter(e => /gol|acierto|éxito|conversión|goal|score/i.test(e.name))

  if (attempts.length === 0 || successes.length === 0) return null

  const attCount = attempts.reduce((s, e) => s + e.count, 0)
  const sucCount = successes.reduce((s, e) => s + e.count, 0)

  if (attCount === 0) return null
  const ratio = pct(sucCount, attCount)
  return `Efectividad en "${category.name}": ${sucCount} de ${attCount} (${ratio}%)`
}

function halfComparison(category: ParsedCategory): string | null {
  const first = category.events.filter(e => e.half === 1)
  const second = category.events.filter(e => e.half === 2)

  if (first.length === 0 || second.length === 0) return null

  const firstCount = first.reduce((s, e) => s + e.count, 0)
  const secondCount = second.reduce((s, e) => s + e.count, 0)
  const total = firstCount + secondCount
  if (total === 0) return null

  const diff = Math.abs(firstCount - secondCount)
  if (pct(diff, total) < 20) return null

  const dominant = firstCount > secondCount ? '1er tiempo' : '2do tiempo'
  const domCount = Math.max(firstCount, secondCount)
  return `"${category.name}": mayor actividad en ${dominant} (${pct(domCount, total)}%)`
}

function imbalanceAlert(category: ParsedCategory): string | null {
  if (category.events.length < 3) return null
  const total = category.totalCount
  if (total === 0) return null

  for (const event of category.events) {
    const p = pct(event.count, total)
    if (p >= 75) {
      return `Desbalance en "${category.name}": "${event.name}" acapara el ${p}%`
    }
  }
  return null
}

export function generateInsights(analysis: ParsedAnalysis): string[] {
  const insights: string[] = []

  for (const cat of analysis.categories) {
    const sector = sectorDistribution(cat)
    if (sector) insights.push(sector)

    const dominance = dominanceInsight(cat)
    if (dominance) insights.push(dominance)

    const effectiveness = effectivenessInsight(cat)
    if (effectiveness) insights.push(effectiveness)

    const half = halfComparison(cat)
    if (half) insights.push(half)

    const imbalance = imbalanceAlert(cat)
    if (imbalance && !dominance) insights.push(imbalance)
  }

  if (insights.length === 0) {
    insights.push(`Análisis con ${analysis.totalEvents} eventos en ${analysis.categories.length} categorías`)
  }

  return insights
}
