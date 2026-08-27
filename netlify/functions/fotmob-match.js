/**
 * Netlify function: GET /.netlify/functions/fotmob-match?matchId={id}
 * Proxies FotMob matchDetails API to avoid CORS issues in production.
 */
export const handler = async function (event) {
  const matchId = event.queryStringParameters?.matchId
  if (!matchId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'matchId required' }) }
  }

  try {
    const res = await fetch(`https://www.fotmob.com/api/matchDetails?matchId=${matchId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    })
    const text = await res.text()
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: text,
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}
