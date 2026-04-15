import { supabase } from '@/lib/supabase'
import type { RivalData } from '@/services/rivalAnalysisService'

// Persistencia compartida (todos los usuarios ven lo mismo) para los
// análisis de rival y último partido que se cargan arrastrando archivos.
// La tabla `shared_analysis` funciona como key/value JSONB simple.

const TABLE = 'shared_analysis'
export const KEY_RIVAL = 'rival_current'
export const KEY_ULTIMO_PARTIDO = 'ultimo_partido_current'

// Cache local para respuesta inmediata antes de que responda Supabase.
const LS_PREFIX = 'shared_analysis_cache_'
const lsKey = (k: string) => `${LS_PREFIX}${k}`

function readCache(k: string): RivalData | null {
  try {
    const raw = localStorage.getItem(lsKey(k))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeCache(k: string, data: RivalData | null) {
  try {
    if (data) localStorage.setItem(lsKey(k), JSON.stringify(data))
    else localStorage.removeItem(lsKey(k))
  } catch { /* quota or private mode */ }
}

export async function loadSharedAnalysis(key: string): Promise<RivalData | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    console.warn(`[sharedAnalysis] load ${key} failed:`, error.message)
    return readCache(key)
  }
  const value = (data?.data as RivalData | undefined) ?? null
  writeCache(key, value)
  return value
}

export async function saveSharedAnalysis(key: string, data: RivalData | null): Promise<void> {
  writeCache(key, data)

  if (data === null) {
    const { error } = await supabase.from(TABLE).delete().eq('key', key)
    if (error) console.warn(`[sharedAnalysis] delete ${key} failed:`, error.message)
    return
  }

  const { error } = await supabase
    .from(TABLE)
    .upsert({ key, data, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) console.warn(`[sharedAnalysis] save ${key} failed:`, error.message)
}

export function getCachedSharedAnalysis(key: string): RivalData | null {
  return readCache(key)
}
