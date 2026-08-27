/**
 * Netlify function: GET /.netlify/functions/fotmob-league?id={leagueId}
 * Proxies FotMob leagues API to avoid CORS issues in production.
 */
export const handler = async function (event) {
  const id = event.queryStringParameters?.id
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'id required' }) }
  }

  try {
    const res = await fetch(`https://www.fotmob.com/api/leagues?id=${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
        Referer: 'https://www.fotmob.com',
      },
    })
    const text = await res.text()
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: text,
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}
