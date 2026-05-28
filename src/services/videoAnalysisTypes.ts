export interface EventTimestamp {
  start: string
  end: string | null
}

export interface EventCoordinate {
  x: number
  y: number
}

export interface ParsedEvent {
  name: string
  count: number
  timestamps: EventTimestamp[] | null
  coordinates: EventCoordinate[] | null
  player: string | null
  zone: string | null
  descriptors: Record<string, string>
  half: 1 | 2 | null
}

export interface ParsedCategory {
  name: string
  events: ParsedEvent[]
  totalCount: number
}

export interface ParsedAnalysis {
  categories: ParsedCategory[]
  metadata: Record<string, string>
  totalEvents: number
}

export type AnalysisCategory =
  | 'primera' | 'reserva' | '4ta' | '5ta' | '6ta'
  | '7ma' | '8va' | '9na' | 'pre9na' | 'femenino'

export type AnalysisType = 'partido' | 'entrenamiento'

export const CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  primera: 'Primera',
  reserva: 'Reserva',
  '4ta': '4ta',
  '5ta': '5ta',
  '6ta': '6ta',
  '7ma': '7ma',
  '8va': '8va',
  '9na': '9na',
  pre9na: 'Pre-9na',
  femenino: 'Femenino',
}

export const ALL_CATEGORIES: AnalysisCategory[] = [
  'primera', 'reserva', '4ta', '5ta', '6ta', '7ma', '8va', '9na', 'pre9na', 'femenino',
]

export interface VideoAnalysis {
  id: string
  user_id: string
  user_name: string
  category: AnalysisCategory
  type: AnalysisType
  rival: string | null
  match_day: string | null
  description: string | null
  date: string
  parsed_data: ParsedAnalysis
  total_events: number
  created_at: string
}

export interface VideoAnalysisComment {
  id: string
  analysis_id: string
  user_id: string
  user_name: string
  text: string
  created_at: string
}
