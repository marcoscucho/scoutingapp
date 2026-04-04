export interface FotmobMatch {
  id: string
  date: Date
  summary: string
  homeTeam: string
  awayTeam: string
  location: string
  isHome: boolean // true = Lanús es local
  competition: 'liga' | 'copa' | 'libertadores' | 'sudamericana' | 'other'
}

function parseICSDate(line: string): Date {
  // DTSTART;VALUE=DATE:20250401
  const dateOnly = line.match(/VALUE=DATE:(\d{4})(\d{2})(\d{2})/)
  if (dateOnly) {
    return new Date(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00-03:00`)
  }

  // DTSTART:20250401T220000Z (UTC) or DTSTART;TZID=...:20250401T190000
  const dtMatch = line.match(/:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/)
  if (!dtMatch) return new Date(NaN)

  const [, yr, mo, dy, hr, mn, sc, utc] = dtMatch
  const iso = `${yr}-${mo}-${dy}T${hr}:${mn}:${sc}${utc === 'Z' ? 'Z' : '-03:00'}`
  return new Date(iso)
}

// Remove emoji, flags and FotMob country codes (e.g. "AR", "BR") prepended to team names
function cleanTeamName(name: string): string {
  return name
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // strip emoji
    .replace(/^[A-Z]{2}\s+/, '') // strip leading 2-letter country code like "AR " or "BR "
    .trim()
}

function parseTeams(summary: string): { homeTeam: string; awayTeam: string } {
  // FotMob: "Lanús - River Plate" | "Racing Club - Lanús"
  const parts = summary.split(/\s*[-–—]\s*/)
  if (parts.length >= 2) {
    return {
      homeTeam: cleanTeamName(parts[0].trim()),
      awayTeam: cleanTeamName(parts.slice(1).join(' - ').trim()),
    }
  }
  return { homeTeam: cleanTeamName(summary.trim()), awayTeam: '' }
}

function isLanus(name: string): boolean {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .includes('lanus')
}

function detectCompetition(text: string): FotmobMatch['competition'] {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (t.includes('libertadores')) return 'libertadores'
  if (t.includes('copa argentina') || t.includes('copa arg')) return 'copa'
  if (t.includes('sudamericana') || t.includes('copa sudamericana')) return 'sudamericana'
  if (
    t.includes('liga profesional') ||
    t.includes('primera division') ||
    t.includes('torneo') ||
    t.includes('apertura') ||
    t.includes('clausura') ||
    t.includes('binance')
  ) return 'liga'
  return 'liga' // default for Lanús — most matches are liga
}

function parseICS(text: string): FotmobMatch[] {
  const matches: FotmobMatch[] = []
  const blocks = text.split('BEGIN:VEVENT')

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]

    const dtLine = block.match(/DTSTART[^\r\n]*/)?.[0] ?? ''
    const summary = block.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim() ?? ''
    const location = block.match(/LOCATION:([^\r\n]+)/)?.[1]?.trim() ?? ''
    const uid = block.match(/UID:([^\r\n]+)/)?.[1]?.trim() ?? String(i)
    const description = block.match(/DESCRIPTION:([^\r\n]+)/)?.[1]?.trim() ?? ''
    const categories = block.match(/CATEGORIES:([^\r\n]+)/)?.[1]?.trim() ?? ''

    if (!summary) continue
    const date = parseICSDate(dtLine)
    if (isNaN(date.getTime())) continue

    const { homeTeam, awayTeam } = parseTeams(summary)
    const isHome = isLanus(homeTeam)
    const competition = detectCompetition(`${categories} ${description} ${summary}`)

    matches.push({ id: uid, date, summary, homeTeam, awayTeam, location, isHome, competition })
  }

  return matches.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export async function fetchLanusCalendar(): Promise<FotmobMatch[]> {
  try {
    const res = await fetch('/fotmob-proxy/prod/pub/api/v2/calendar/team/10082.ics')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    return parseICS(text)
  } catch (err) {
    console.warn('FotMob calendar fetch failed:', err)
    return []
  }
}
