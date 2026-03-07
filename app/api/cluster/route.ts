import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { clusterQuestion } from '@/lib/clustering'

export async function POST(req: NextRequest) {
  try {
    const { questionId, sessionId } = await req.json()

    if (!questionId || !sessionId) {
      return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 })
    }

    // Fetch question text and approval status
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('text, approved')
      .eq('id', questionId)
      .single()

    if (qErr || !question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 })
    }

    // Skip clustering for unapproved questions (moderation is on)
    if (!question.approved) {
      return NextResponse.json({ success: true, skipped: 'awaiting_approval' })
    }

    // Fetch existing unanswered clusters for this session
    const { data: clusters } = await supabase
      .from('clusters')
      .select('id, title, summary_question')
      .eq('session_id', sessionId)
      .eq('status', 'unanswered')

    // Fetch session for description and auto_suggest setting
    const { data: session } = await supabase
      .from('sessions')
      .select('description, auto_suggest')
      .eq('id', sessionId)
      .single()

    await clusterQuestion(
      questionId,
      question.text,
      clusters || [],
      sessionId,
      session?.description ?? null
    )

    // Auto-suggest answer if enabled
    if (session?.auto_suggest) {
      const origin = req.headers.get('origin') || req.headers.get('host') || 'http://localhost:3000'
      const baseUrl = origin.startsWith('http') ? origin : `http://${origin}`
      fetch(`${baseUrl}/api/suggest-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, sessionId }),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
