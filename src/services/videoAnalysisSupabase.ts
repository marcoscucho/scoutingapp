import { supabase } from '@/lib/supabase'
import type {
  VideoAnalysis,
  VideoAnalysisComment,
  AnalysisCategory,
  AnalysisType,
  ParsedAnalysis,
} from './videoAnalysisTypes'

export async function getVideoAnalyses(
  category: AnalysisCategory,
  type: AnalysisType
): Promise<VideoAnalysis[]> {
  const { data, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('category', category)
    .eq('type', type)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching video analyses:', error)
    return []
  }
  return data || []
}

export async function getVideoAnalysisById(id: string): Promise<VideoAnalysis | null> {
  const { data, error } = await supabase
    .from('video_analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching video analysis:', error)
    return null
  }
  return data
}

export async function createVideoAnalysis(params: {
  category: AnalysisCategory
  type: AnalysisType
  rival: string | null
  matchDay: string | null
  description: string | null
  date: string
  parsedData: ParsedAnalysis
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Debés iniciar sesión para subir análisis' }
  }

  const { data, error } = await supabase
    .from('video_analyses')
    .insert({
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      category: params.category,
      type: params.type,
      rival: params.rival,
      match_day: params.matchDay,
      description: params.description,
      date: params.date,
      parsed_data: params.parsedData,
      total_events: params.parsedData.totalEvents,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating video analysis:', error)
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

export async function deleteVideoAnalysis(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('video_analyses').delete().eq('id', id)
  if (error) {
    console.error('Error deleting video analysis:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function getComments(analysisId: string): Promise<VideoAnalysisComment[]> {
  const { data, error } = await supabase
    .from('video_analysis_comments')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching comments:', error)
    return []
  }
  return data || []
}

export async function addComment(
  analysisId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Debés iniciar sesión para comentar' }
  }

  const { error } = await supabase.from('video_analysis_comments').insert({
    analysis_id: analysisId,
    user_id: user.id,
    user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
    text,
  })

  if (error) {
    console.error('Error adding comment:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getCommentCount(analysisId: string): Promise<number> {
  const { count, error } = await supabase
    .from('video_analysis_comments')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_id', analysisId)

  if (error) return 0
  return count || 0
}
