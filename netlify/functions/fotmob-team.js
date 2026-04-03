/**
 * Netlify function: GET /.netlify/functions/fotmob-team?teamId={id}
 * Proxies FotMob team API to avoid CORS issues in production.
 */
exports.handler = async function (event) {
  const teamId = event.queryStringParameters?.teamId
  if (!teamId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'teamId required' }) }
  }

  try {
    const res = await fetch(`https://www.fotmob.com/api/teams?id=${teamId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
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
