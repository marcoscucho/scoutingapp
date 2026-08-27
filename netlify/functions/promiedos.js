/**
 * Netlify function: GET /.netlify/functions/promiedos?path={path}
 * Fetches a Promiedos page and extracts the __NEXT_DATA__ JSON payload.
 * Used for the tabla anual (acumulada) and other standings not in FotMob.
 */
export const handler = async function (event) {
  const path = event.queryStringParameters?.path ?? 'league/liga-profesional/hc'

  try {
    const res = await fetch(`https://www.promiedos.com.ar/${path}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    })

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: `HTTP ${res.status}` }) }
    }

    const html = await res.text()
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/)
    if (!match) {
      return { statusCode: 404, body: JSON.stringify({ error: '__NEXT_DATA__ not found' }) }
    }

    const pageProps = JSON.parse(match[1])?.props?.pageProps ?? {}
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify(pageProps),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}
