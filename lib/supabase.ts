import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type Session = {
  id: string
  code: string
  title: string
  description: string | null
  moderation_enabled: boolean
  auto_suggest: boolean
  highlighted_cluster_id: string | null
  ended_at: string | null
  starts_at: string | null
  recurrence_type: string | null
  recurrence_parent_id: string | null
  recurrence_dates: string[] | null
  user_id?: string
  created_at: string
}

export type Question = {
  id: string
  session_id: string
  text: string
  author_name: string | null
  is_anonymous: boolean
  cluster_id: string | null
  status: 'pending' | 'answered'
  approved: boolean
  suggested_answer: string | null
  upvotes: number
  created_at: string
}

export type Cluster = {
  id: string
  session_id: string
  title: string
  summary_question: string
  status: 'unanswered' | 'answered'
  claimed_by: string | null
  created_at: string
}

export type FaqEntry = {
  id: string
  session_id: string
  cluster_title: string
  summary_question: string
  answer: string
  created_at: string
}

export type Reply = {
  id: string
  question_id: string
  session_id: string
  text: string
  author_name: string | null
  is_host: boolean
  created_at: string
}

export type ClusterWithQuestions = Cluster & { questions: Question[] }
