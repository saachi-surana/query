import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { clusterQuestion, batchClusterSession, cleanupEmptyClusters } from '@/lib/clustering'

/**
 * POST /api/cluster
 *
 * Two modes:
 * 1. Single question: { questionId, sessionId } — cluster one question
 * 2. Batch/re-cluster: { sessionId, mode: 'batch' } — cluster all unclustered questions
 *
 * Clustering protocol:
 * - Only approved questions are clustered
 * - Only unanswered clusters are considered as candidates
 * - Answered clusters are left untouched
 * - If moderation is on, unapproved questions are skipped
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { questionId, sessionId, mode } = body

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
    }

    // Fetch session for description and auto_suggest setting
    const { data: session } = await supabase
      .from('sessions')
      .select('description, auto_suggest')
      .eq('id', sessionId)
      .single()

    // ---- Batch / Re-cluster mode ----
    if (mode === 'batch') {
      const result = await batchClusterSession(
        sessionId,
        session?.description ?? null
      )
      // Clean up any empty clusters after batch
      const removed = await cleanupEmptyClusters(sessionId)
      return NextResponse.json({
        success: true,
        ...result,
        emptyClustersRemoved: removed,
      })
    }

    // ---- Single question mode ----
    if (!questionId) {
      return NextResponse.json({ success: false, error: 'Missing questionId' }, { status: 400 })
    }

    // Fetch question text and approval status
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('text, approved, cluster_id')
      .eq('id', questionId)
      .single()

    if (qErr || !question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 })
    }

    // Skip clustering for unapproved questions (moderation is on)
    if (!question.approved) {
      return NextResponse.json({ success: true, skipped: 'awaiting_approval' })
    }

    // Skip if already clustered (prevents duplicate clustering on re-triggers)
    if (question.cluster_id) {
      return NextResponse.json({ success: true, skipped: 'already_clustered' })
    }

    // Fetch existing UNANSWERED clusters for this session
    // (Answered clusters are excluded — see clustering protocol point 3)
    const { data: clusters } = await supabase
      .from('clusters')
      .select('id, title, summary_question')
      .eq('session_id', sessionId)
      .eq('status', 'unanswered')

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
  } catch (err) {
    console.error('Cluster API error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
