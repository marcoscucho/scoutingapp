import { supabase } from '@/lib/supabase'

export interface MatchResult {
  id: number
  match_date: string
  opponent: string
  was_home: boolean
  goals_for: number
  goals_against: number
  result: 'W' | 'D' | 'L'
  competition: string
}

export async function fetchFormGuide(): Promise<MatchResult[]> {
  const { data, error } = await supabase
    .from('form_guide')
    .select('*')
    .order('match_date', { ascending: false })
    .limit(10)

  if (error || !data) {
    console.warn('form_guide fetch failed:', error?.message)
    return []
  }

  return data as MatchResult[]
}

export function computeStreak(results: MatchResult[]): { type: 'W' | 'D' | 'L'; count: number } | null {
  if (!results.length) return null
  const latest = results[0].result
  let count = 0
  for (const r of results) {
    if (r.result === latest) count++
    else break
  }
  return { type: latest, count }
}
