import type { ParsedAnalysis, ParsedCategory, ParsedEvent, EventTimestamp, EventCoordinate } from './videoAnalysisTypes'

function getTextContent(el: Element, tag: string): string | null {
  const child = el.querySelector(tag)
  return child?.textContent?.trim() || null
}

function parseTimestamp(el: Element): EventTimestamp | null {
  const start = getTextContent(el, 'start') || el.getAttribute('start') || el.getAttribute('time')
  if (!start) return null
  return {
    start,
    end: getTextContent(el, 'end') || el.getAttribute('end') || null,
  }
}

function parseCoordinate(el: Element): EventCoordinate | null {
  const xAttr = el.getAttribute('x') ?? el.getAttribute('pos_x')
  const yAttr = el.getAttribute('y') ?? el.getAttribute('pos_y')
  if (xAttr == null || yAttr == null) return null
  const x = parseFloat(xAttr)
  const y = parseFloat(yAttr)
  if (isNaN(x) || isNaN(y)) return null
  return {
    x: Math.min(1, Math.max(0, x > 1 ? x / 100 : x)),
    y: Math.min(1, Math.max(0, y > 1 ? y / 100 : y)),
  }
}

function findCoordinates(el: Element): EventCoordinate[] {
  const coords: EventCoordinate[] = []
  const coordEl = el.querySelector('coordinates, position, point, location')
  if (coordEl) {
    const c = parseCoordinate(coordEl)
    if (c) coords.push(c)
  }
  const c = parseCoordinate(el)
  if (c) coords.push(c)
  el.querySelectorAll('coordinates, position, point, location').forEach(child => {
    const cc = parseCoordinate(child)
    if (cc) coords.push(cc)
  })
  return coords
}

function deriveHalf(timestamps: EventTimestamp[] | null): 1 | 2 | null {
  if (!timestamps || timestamps.length === 0) return null
  const first = timestamps[0].start
  const parts = first.split(':').map(Number)
  if (parts.length < 2) return null
  const minutes = parts.length === 3 ? parts[0] * 60 + parts[1] : parts[0]
  return minutes < 45 ? 1 : 2
}

function extractDescriptors(el: Element, skipTags: Set<string>): Record<string, string> {
  const descriptors: Record<string, string> = {}
  Array.from(el.children).forEach(child => {
    const tag = child.tagName.toLowerCase()
    if (skipTags.has(tag)) return
    if (child.children.length === 0 && child.textContent?.trim()) {
      descriptors[tag] = child.textContent.trim()
    }
  })
  Array.from(el.attributes).forEach(attr => {
    if (!skipTags.has(attr.name.toLowerCase()) && attr.value) {
      descriptors[attr.name] = attr.value
    }
  })
  return descriptors
}

const SKIP_TAGS = new Set([
  'name', 'nombre', 'start', 'end', 'time', 'x', 'y', 'pos_x', 'pos_y',
  'coordinates', 'position', 'point', 'location', 'player', 'jugador',
  'code', 'id', 'row', 'instance',
])

function isLeafEvent(el: Element): boolean {
  const hasDeepChildren = Array.from(el.children).some(
    c => c.children.length > 0 && !['coordinates', 'position', 'point', 'location'].includes(c.tagName.toLowerCase())
  )
  return !hasDeepChildren
}

function getEventName(el: Element): string {
  return (
    getTextContent(el, 'name') ||
    getTextContent(el, 'nombre') ||
    el.getAttribute('name') ||
    el.getAttribute('nombre') ||
    el.getAttribute('code') ||
    el.tagName
  )
}

function parseEvents(parentEl: Element): ParsedEvent[] {
  const events: ParsedEvent[] = []
  const children = Array.from(parentEl.children)

  children.forEach(el => {
    if (isLeafEvent(el)) {
      const timestamps: EventTimestamp[] = []
      const ts = parseTimestamp(el)
      if (ts) timestamps.push(ts)
      el.querySelectorAll('instance, row, event').forEach(inst => {
        const its = parseTimestamp(inst)
        if (its) timestamps.push(its)
      })

      const coords = findCoordinates(el)
      el.querySelectorAll('instance, row, event').forEach(inst => {
        const ic = parseCoordinate(inst)
        if (ic) coords.push(ic)
      })
      const player = getTextContent(el, 'player') || getTextContent(el, 'jugador') || el.getAttribute('player') || null

      events.push({
        name: getEventName(el),
        count: Math.max(1, timestamps.length || 1),
        timestamps: timestamps.length > 0 ? timestamps : null,
        coordinates: coords.length > 0 ? coords : null,
        player,
        zone: el.getAttribute('zone') || getTextContent(el, 'zone') || null,
        descriptors: extractDescriptors(el, SKIP_TAGS),
        half: deriveHalf(timestamps.length > 0 ? timestamps : null),
      })
    }
  })

  return events
}

function parseCategoriesFromRoot(root: Element): ParsedCategory[] {
  const categories: ParsedCategory[] = []
  const children = Array.from(root.children)

  children.forEach(el => {
    const subChildren = Array.from(el.children)
    if (subChildren.length === 0) return

    const name = getEventName(el)
    const hasNestedGroups = subChildren.some(c => c.children.length > 0)

    if (hasNestedGroups) {
      const events = parseEvents(el)

      subChildren.forEach(sub => {
        if (!isLeafEvent(sub) && sub.children.length > 0) {
          const subEvents = parseEvents(sub)
          if (subEvents.length > 0) {
            events.push({
              name: getEventName(sub),
              count: subEvents.reduce((sum, e) => sum + e.count, 0),
              timestamps: subEvents.flatMap(e => e.timestamps || []).length > 0
                ? subEvents.flatMap(e => e.timestamps || [])
                : null,
              coordinates: subEvents.flatMap(e => e.coordinates || []).length > 0
                ? subEvents.flatMap(e => e.coordinates || [])
                : null,
              player: null,
              zone: null,
              descriptors: {},
              half: null,
            })
          }
        }
      })

      if (events.length > 0) {
        categories.push({
          name,
          events,
          totalCount: events.reduce((sum, e) => sum + e.count, 0),
        })
      }
    } else {
      const events = parseEvents(el)
      if (events.length > 0) {
        categories.push({
          name,
          events,
          totalCount: events.reduce((sum, e) => sum + e.count, 0),
        })
      }
    }
  })

  if (categories.length === 0) {
    const events = parseEvents(root)
    if (events.length > 0) {
      categories.push({
        name: 'General',
        events,
        totalCount: events.reduce((sum, e) => sum + e.count, 0),
      })
    }
  }

  return categories
}

function extractMetadata(root: Element): Record<string, string> {
  const meta: Record<string, string> = {}
  Array.from(root.attributes).forEach(attr => {
    if (attr.value) meta[attr.name] = attr.value
  })
  return meta
}

export function parseXml(xmlString: string): ParsedAnalysis {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const errorNode = doc.querySelector('parsererror')
  if (errorNode) {
    throw new Error('XML inválido: ' + (errorNode.textContent || 'error de parseo'))
  }

  const root = doc.documentElement
  const categories = parseCategoriesFromRoot(root)
  const totalEvents = categories.reduce((sum, c) => sum + c.totalCount, 0)

  return {
    categories,
    metadata: extractMetadata(root),
    totalEvents,
  }
}

export function validateXml(xmlString: string): { valid: boolean; error?: string; eventCount?: number } {
  try {
    const result = parseXml(xmlString)
    if (result.categories.length === 0) {
      return { valid: false, error: 'No se encontraron categorías ni eventos en el archivo' }
    }
    return { valid: true, eventCount: result.totalEvents }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Error desconocido al parsear' }
  }
}
