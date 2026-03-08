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

// In-flight clustering requests: prevents duplicate concurrent clustering of the same question
const inFlightQuestions = new Set<string>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { questionId, sessionId, mode } = body

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
    }

    // Fetch session for description and auto_suggest setting
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('description, auto_suggest')
      .eq('id', sessionId)
      .single()

    if (sessionErr) {
      console.error('Cluster API: Failed to fetch session', sessionId, ':', sessionErr)
    }

    // ---- Batch / Re-cluster mode ----
    if (mode === 'batch') {
      console.log('Cluster API: Batch re-cluster requested for session', sessionId)
      const result = await batchClusterSession(
        sessionId,
        session?.description ?? null
      )
      // Clean up any empty clusters after batch
      const removed = await cleanupEmptyClusters(sessionId)
      console.log('Cluster API: Batch complete —', JSON.stringify({ ...result, emptyClustersRemoved: removed }))
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

    // Prevent duplicate concurrent clustering of the same question
    if (inFlightQuestions.has(questionId)) {
      console.log('Cluster API: Skipping duplicate in-flight request for question', questionId)
      return NextResponse.json({ success: true, skipped: 'already_in_flight' })
    }
    inFlightQuestions.add(questionId)

    try {
      // Fetch question text and approval status
      const { data: question, error: qErr } = await supabase
        .from('questions')
        .select('text, approved, cluster_id')
        .eq('id', questionId)
        .single()

      if (qErr || !question) {
        console.error('Cluster API: Question not found', questionId, qErr)
        return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 })
      }

      // Skip clustering for unapproved questions (moderation is on)
      if (!question.approved) {
        console.log('Cluster API: Skipping unapproved question', questionId)
        return NextResponse.json({ success: true, skipped: 'awaiting_approval' })
      }

      // Skip if already clustered (prevents duplicate clustering on re-triggers)
      if (question.cluster_id) {
        console.log('Cluster API: Question', questionId, 'already clustered in', question.cluster_id)
        return NextResponse.json({ success: true, skipped: 'already_clustered' })
      }

      // Fetch existing UNANSWERED clusters for this session
      // (Answered clusters are excluded — see clustering protocol point 3)
      const { data: clusters, error: clustersErr } = await supabase
        .from('clusters')
        .select('id, title, summary_question')
        .eq('session_id', sessionId)
        .eq('status', 'unanswered')

      if (clustersErr) {
        console.error('Cluster API: Failed to fetch existing clusters:', clustersErr)
      }

      console.log('Cluster API: Clustering question', questionId, '— text:', question.text.slice(0, 80), '— existing clusters:', (clusters || []).length)

      const result = await clusterQuestion(
        questionId,
        question.text,
        clusters || [],
        sessionId,
        session?.description ?? null
      )

      if (!result.success) {
        console.error('Cluster API: Clustering failed for question', questionId, ':', result.error)
        // Return 200 with error info so callers know what happened
        return NextResponse.json({ success: false, error: result.error })
      }

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
    } finally {
      inFlightQuestions.delete(questionId)
    }
  } catch (err) {
    console.error('Cluster API error:', err instanceof Error ? err.stack || err.message : err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
