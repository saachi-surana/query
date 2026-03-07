import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Session = {
  id: string
  code: string
  title: string
  description: string | null
  moderation_enabled: boolean
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
  upvotes: number
  created_at: string
}

export type Cluster = {
  id: string
  session_id: string
  title: string
  summary_question: string
  status: 'unanswered' | 'answered'
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
