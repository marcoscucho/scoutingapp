/**
 * Netlify function: GET /.netlify/functions/apifootball?endpoint=/fixtures&team=446&season=2026
 * Proxies API-Football requests, injecting the API key from env.
 */
export const handler = async function (event) {
  const endpoint = event.queryStringParameters?.endpoint
  if (!endpoint) {
    return { statusCode: 400, body: JSON.stringify({ error: 'endpoint required' }) }
  }

  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API_FOOTBALL_KEY not configured' }) }
  }

  // Build query string from all params except 'endpoint'
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(event.queryStringParameters || {})) {
    if (key !== 'endpoint') params.set(key, value)
  }
  const qs = params.toString()
  const url = `https://v3.football.api-sports.io${endpoint}${qs ? '?' + qs : ''}`

  try {
    const res = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
        'Accept': 'application/json',
      },
    })
    const text = await res.text()
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=120',
      },
      body: text,
    }
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'API-Football request failed', details: err.message }),
    }
  }
}
