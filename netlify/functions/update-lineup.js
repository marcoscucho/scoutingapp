/**
 * Netlify function: POST /.netlify/functions/update-lineup
 * Scrapes the last Lanús lineup from FotMob via Firecrawl and updates Supabase.
 * Env vars required:
 *   FIRECRAWL_API_KEY      — Firecrawl API key
 *   VITE_SUPABASE_URL      — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (for writes bypassing RLS)
 */

const POSITION_COORDS = [
  [50, 90], // GK
  [18, 72], // RB
  [38, 72], // CB
  [62, 72], // CB
  [82, 72], // LB
  [20, 50], // MF
  [50, 50], // MF
  [80, 50], // MF
  [20, 25], // FW
  [50, 18], // FW (striker)
  [80, 25], // FW
]

export const handler = async function (event) {
  // Allow POST (manual button) and GET/undefined (scheduled trigger)
  if (event.httpMethod && !['GET', 'POST'].includes(event.httpMethod)) {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!FIRECRAWL_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing environment variables' }),
    }
  }

  // 1. Scrape FotMob via Firecrawl
  let matchData
  try {
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.fotmob.com/teams/10082/matches/lanus',
        formats: ['json'],
        jsonOptions: {
          prompt:
            'Extract the most recent completed match for Lanús. Return: startingPlayers (array of {name, number, position}), formation (string), matchDate (string), opponent (string), score (string).',
        },
        waitFor: 8000,
        proxy: 'stealth',
      }),
    })

    const scrapeJson = await scrapeRes.json()
    matchData = scrapeJson?.data?.json

    if (!matchData || !matchData.startingPlayers?.length) {
      throw new Error('No lineup data in Firecrawl response')
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Firecrawl scrape failed', detail: String(err) }),
    }
  }

  // 2. Map players to pitch coordinates
  const rows = matchData.startingPlayers.slice(0, 11).map((p, i) => ({
    number: p.number,
    name: p.name,
    position: p.position,
    x: POSITION_COORDS[i][0],
    y: POSITION_COORDS[i][1],
    formation: matchData.formation || '4-3-3',
    match_date: matchData.matchDate
      ? new Date(matchData.matchDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    opponent: matchData.opponent || '',
    result: matchData.score || '',
  }))

  // 3. Replace all rows in Supabase
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }

  // Delete existing
  await fetch(`${SUPABASE_URL}/rest/v1/ultimo_once?id=gt.0`, {
    method: 'DELETE',
    headers,
  })

  // Insert new
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/ultimo_once`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  })

  if (!insertRes.ok) {
    const err = await insertRes.text()
    return { statusCode: 500, body: JSON.stringify({ error: 'Supabase insert failed', detail: err }) }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      formation: matchData.formation,
      opponent: matchData.opponent,
      result: matchData.score,
    }),
  }
}
