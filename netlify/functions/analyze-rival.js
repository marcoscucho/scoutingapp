/**
 * Netlify Function: POST /.netlify/functions/analyze-rival
 *
 * Acepta dos formatos:
 *   A) { model, max_tokens, messages }  → proxy directo a Anthropic (nuevo)
 *   B) { type, content, mimeType }       → formato legacy para imágenes/CSV
 */

const LEGACY_PROMPT = `Sos un analista de fútbol profesional. Analizá el contenido provisto sobre un equipo de fútbol y extraé TODA la información disponible.

Devolvé ÚNICAMENTE JSON válido con esta estructura (usá null para campos no encontrados, arrays vacíos si no hay datos):

{
  "teamName": "nombre del equipo o null",
  "teamStats": {
    "partidos": número o null,
    "victorias": número o null,
    "empates": número o null,
    "derrotas": número o null,
    "goles": número o null,
    "golesContra": número o null,
    "avgXG": número decimal o null,
    "avgPosesion": número (porcentaje como 58.3, no 0.583) o null,
    "avgPPDA": número decimal o null,
    "avgPases": número (porcentaje como 84.2) o null,
    "avgTiros": número decimal o null
  },
  "players": [
    { "name": "apellido nombre", "position": "GK/CB/LB/RB/CMF/DMF/AMF/LW/RW/CF/SS", "goals": número, "assists": número, "matches": número, "number": número o null }
  ],
  "recentMatches": [
    { "homeTeam": "nombre", "homeScore": número, "awayScore": número, "awayTeam": "nombre", "competition": "nombre liga/copa", "date": "DD.MM.YYYY", "isHome": boolean, "result": "W" o "D" o "L" }
  ],
  "tacticalNotes": ["nota táctica concisa 1", "nota táctica concisa 2"],
  "strengths": ["fortaleza observable 1", "fortaleza 2"],
  "weaknesses": ["debilidad observable 1", "debilidad 2"],
  "formation": "4-3-3 o la formación que se observe, null si no hay datos"
}

Para recentMatches, "isHome" y "result" son SIEMPRE desde la perspectiva del equipo analizado (teamName).
Respondé SOLO con JSON válido, sin markdown, sin explicaciones adicionales.`

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en las variables de entorno de Netlify.' })
    }
  }

  let body
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) }
  }

  let anthropicBody

  if (body.messages) {
    // ── Formato A: proxy directo (modelo + mensajes ya construidos) ──
    anthropicBody = {
      model: body.model ?? 'claude-sonnet-4-6',
      max_tokens: body.max_tokens ?? 8192,
      messages: body.messages,
    }
  } else {
    // ── Formato B: legacy (type + content) ──
    const { type, content, mimeType } = body

    if (!type || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan campos: type y content son requeridos' }) }
    }

    let messageContent
    if (type === 'image') {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const mediaType = validTypes.includes(mimeType) ? mimeType : 'image/jpeg'
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: content } },
        { type: 'text', text: LEGACY_PROMPT }
      ]
    } else {
      const truncated = typeof content === 'string' ? content.slice(0, 50000) : String(content)
      messageContent = `${LEGACY_PROMPT}\n\nCONTENIDO DEL ARCHIVO:\n${truncated}`
    }

    anthropicBody = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: messageContent }],
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(anthropicBody),
    })

    if (!response.ok) {
      const errText = await response.text()
      return { statusCode: 502, body: JSON.stringify({ error: `Error API Claude: ${response.status}`, detail: errText }) }
    }

    const data = await response.json()

    // Para formato A: devolver la respuesta completa de Anthropic
    if (body.messages) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    }

    // Para formato B: extraer y parsear JSON de la respuesta
    const text = data?.content?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Claude no devolvió JSON válido', raw: text.slice(0, 500) }) }
    }

    let parsed
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return { statusCode: 500, body: JSON.stringify({ error: 'JSON malformado en respuesta de Claude' }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno', detail: String(err) })
    }
  }
}
