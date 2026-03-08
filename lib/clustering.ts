/**
 * AI Clustering Pipeline — Robust Dynamic Clustering Protocol
 * =============================================================
 *
 * CLUSTERING PROTOCOL — Edge Case Handling
 * -----------------------------------------
 *
 * 1. NEW QUESTION ARRIVES:
 *    - Clustered immediately upon submission (or upon approval if moderation is on).
 *    - The /api/cluster endpoint is called server-side after insert, not from the client.
 *    - Single-question clustering: AI decides whether to create a new cluster or join existing.
 *
 * 2. RE-CLUSTERING TRIGGER:
 *    - Automatic: triggered on every new approved question via /api/cluster POST.
 *    - Manual: host can trigger a full re-cluster via /api/cluster/recluster POST.
 *    - The recluster endpoint takes ALL unclustered approved questions and clusters them
 *      together with awareness of existing clusters.
 *
 * 3. CLUSTER WITH ANSWERED QUESTIONS:
 *    - If a cluster is marked "answered" and a new similar question arrives:
 *      -> The new question creates a NEW cluster or joins another unanswered cluster.
 *      -> Answered clusters are excluded from the AI's clustering candidates.
 *      -> Rationale: The host already addressed that topic. A new question about it
 *         likely has a different nuance and deserves fresh attention.
 *
 * 4. PARTIALLY ANSWERED CLUSTERS:
 *    - Individual questions can be marked answered within an unanswered cluster.
 *    - The cluster itself remains "unanswered" until the host explicitly marks it.
 *    - New similar questions can still join unanswered clusters even if some
 *      questions inside are individually answered.
 *
 * 5. SINGLE-QUESTION CLUSTERS:
 *    - A question that doesn't match any cluster gets its OWN cluster (create_new).
 *    - There is no "unclustered" limbo — every approved question eventually gets a cluster.
 *    - If the AI truly can't categorize it, the question stays unclustered (cluster_id = null)
 *      and appears in the "Unclustered" section. The host can manually assign it.
 *
 * 6. CLUSTER MERGING:
 *    - During re-clustering, the AI can identify clusters that should merge.
 *    - The recluster endpoint handles merging by reassigning questions and
 *      deleting empty clusters.
 *
 * 7. HOST MANUAL OVERRIDES:
 *    - If a host manually moves a question between clusters, that is respected.
 *    - Re-clustering only operates on questions with cluster_id = null (unclustered).
 *    - Full re-cluster (manual trigger) operates on ALL questions but the AI is
 *      instructed to respect the existing groupings as a strong signal.
 *
 * 8. REAL-TIME UPDATES:
 *    - Cluster changes propagate via Supabase real-time subscriptions.
 *    - All views (host, participant, presenter) subscribe to clusters table.
 *    - When cluster_id is updated on a question, all views see it immediately.
 *
 * 9. MODERATION INTERACTION:
 *    - Unapproved questions are NOT clustered.
 *    - When a question is approved, clustering is triggered for that question.
 *    - This is handled in the /api/cluster endpoint which checks approved status.
 */

import { supabase, Cluster } from './supabase'
import { aiComplete } from './ai-provider'

function hasNoAIProvider(): boolean {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const hasGemini = !!geminiKey && geminiKey !== ''
  const hasAnthropic = !!anthropicKey && anthropicKey !== 'sk-ant-placeholder'
  return !hasGemini && !hasAnthropic
}

/**
 * Cluster a single question into an existing cluster or create a new one.
 * Only considers unanswered clusters as candidates (answered clusters are excluded).
 */
export async function clusterQuestion(
  questionId: string,
  questionText: string,
  existingClusters: Pick<Cluster, 'id' | 'title' | 'summary_question'>[],
  sessionId: string,
  sessionDescription: string | null
): Promise<void> {
  if (hasNoAIProvider()) {
    return
  }

  try {
    const clusterList =
      existingClusters.length > 0
        ? existingClusters
            .map((c) => `${c.id} | ${c.title} | ${c.summary_question}`)
            .join('\n')
        : 'None yet.'

    const userPrompt = `Session context: ${sessionDescription || 'A live Q&A session.'}

New question: ${questionText}

Existing clusters (only unanswered — do NOT reference any answered clusters):
${clusterList}

Should this question join an existing cluster or start a new one?

If it fits an existing cluster respond with:
{"action": "add_to_existing", "cluster_id": "[exact id]"}

If it needs a new cluster respond with:
{"action": "create_new", "cluster_title": "[3-5 word topic title]", "summary_question": "[one clear question capturing this theme]"}

JSON only. No explanation. No markdown.`

    const rawText = (await aiComplete(
      userPrompt,
      'You are organizing questions from a live Q&A session into topic clusters. Be concise. Respond only with valid JSON.'
    )).trim()

    let parsed: {
      action: 'add_to_existing' | 'create_new'
      cluster_id?: string
      cluster_title?: string
      summary_question?: string
    }

    try {
      // Strip markdown code fences if present
      const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
      parsed = JSON.parse(jsonText)
    } catch {
      // JSON parse failed — leave question unclustered
      console.warn('Clustering: JSON parse failed for response:', rawText.slice(0, 200))
      return
    }

    if (parsed.action === 'add_to_existing' && parsed.cluster_id) {
      // Verify the cluster exists
      const exists = existingClusters.find((c) => c.id === parsed.cluster_id)
      if (!exists) return

      await supabase
        .from('questions')
        .update({ cluster_id: parsed.cluster_id })
        .eq('id', questionId)

      await updateClusterSummary(parsed.cluster_id)
    } else if (
      parsed.action === 'create_new' &&
      parsed.cluster_title &&
      parsed.summary_question
    ) {
      const { data: newCluster, error } = await supabase
        .from('clusters')
        .insert({
          session_id: sessionId,
          title: parsed.cluster_title,
          summary_question: parsed.summary_question,
          status: 'unanswered',
        })
        .select('id')
        .single()

      if (error || !newCluster) return

      await supabase
        .from('questions')
        .update({ cluster_id: newCluster.id })
        .eq('id', questionId)
    }
  } catch (err) {
    // Any error — leave question unclustered silently
    console.error('Clustering error:', err instanceof Error ? err.message : err)
    return
  }
}

export async function updateClusterSummary(clusterId: string): Promise<void> {
  if (hasNoAIProvider()) return

  try {
    const { data: questions } = await supabase
      .from('questions')
      .select('text')
      .eq('cluster_id', clusterId)

    if (!questions || questions.length === 0) return

    const questionList = questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')

    const summary = (await aiComplete(
      `Given these questions from a live Q&A:\n${questionList}\n\nWrite one clear summary question that captures the core theme across all of them. Return only the question, no explanation.`
    )).trim()

    if (summary) {
      await supabase
        .from('clusters')
        .update({ summary_question: summary })
        .eq('id', clusterId)
    }
  } catch {
    // Silently fail
  }
}

/**
 * Batch re-cluster: takes all approved unclustered questions in a session
 * and clusters them, aware of existing clusters.
 * Used for manual "Re-cluster" button or periodic batch processing.
 */
export async function batchClusterSession(
  sessionId: string,
  sessionDescription: string | null
): Promise<{ clustered: number; newClusters: number; merged: number }> {
  if (hasNoAIProvider()) {
    return { clustered: 0, newClusters: 0, merged: 0 }
  }

  // Fetch all approved unclustered questions
  const { data: unclusteredQuestions } = await supabase
    .from('questions')
    .select('id, text')
    .eq('session_id', sessionId)
    .eq('approved', true)
    .is('cluster_id', null)
    .order('created_at', { ascending: true })

  if (!unclusteredQuestions || unclusteredQuestions.length === 0) {
    return { clustered: 0, newClusters: 0, merged: 0 }
  }

  // Fetch existing unanswered clusters with their questions for context
  const { data: existingClusters } = await supabase
    .from('clusters')
    .select('id, title, summary_question')
    .eq('session_id', sessionId)
    .eq('status', 'unanswered')

  const clusters = existingClusters || []

  // If only 1 unclustered question, use single-question clustering
  if (unclusteredQuestions.length === 1) {
    const q = unclusteredQuestions[0]
    await clusterQuestion(q.id, q.text, clusters, sessionId, sessionDescription)
    return { clustered: 1, newClusters: 0, merged: 0 }
  }

  // For multiple unclustered questions, do a batch clustering call
  try {
    const clusterList = clusters.length > 0
      ? clusters.map((c) => `${c.id} | ${c.title} | ${c.summary_question}`).join('\n')
      : 'None yet.'

    const questionList = unclusteredQuestions
      .map((q, i) => `Q${i + 1} (id: ${q.id}): ${q.text}`)
      .join('\n')

    const userPrompt = `Session context: ${sessionDescription || 'A live Q&A session.'}

Unclustered questions to organize:
${questionList}

Existing clusters (unanswered only):
${clusterList}

Group these questions into clusters. Each question must be assigned to exactly one cluster.
Questions can join existing clusters (use the exact id) or form new clusters together.

Respond with a JSON array. Each element is either:
- {"question_id": "...", "action": "add_to_existing", "cluster_id": "[exact existing id]"}
- {"question_id": "...", "action": "create_new", "cluster_key": "[temp key for grouping, e.g. 'new_1']", "cluster_title": "[3-5 word title]", "summary_question": "[one clear question]"}

Questions with the same cluster_key will be placed in the same new cluster.

JSON array only. No explanation. No markdown.`

    const rawText = (await aiComplete(
      userPrompt,
      'You are organizing questions from a live Q&A session into topic clusters. Group similar questions together. Be concise. Respond only with valid JSON.'
    )).trim()

    let parsed: Array<{
      question_id: string
      action: 'add_to_existing' | 'create_new'
      cluster_id?: string
      cluster_key?: string
      cluster_title?: string
      summary_question?: string
    }>

    try {
      const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
      parsed = JSON.parse(jsonText)
    } catch {
      // If batch parse fails, fall back to individual clustering
      console.warn('Batch clustering: JSON parse failed, falling back to individual')
      let clustered = 0
      for (const q of unclusteredQuestions) {
        await clusterQuestion(q.id, q.text, clusters, sessionId, sessionDescription)
        clustered++
      }
      return { clustered, newClusters: 0, merged: 0 }
    }

    if (!Array.isArray(parsed)) {
      // Fallback to individual
      let clustered = 0
      for (const q of unclusteredQuestions) {
        await clusterQuestion(q.id, q.text, clusters, sessionId, sessionDescription)
        clustered++
      }
      return { clustered, newClusters: 0, merged: 0 }
    }

    // Process results: group new clusters by cluster_key
    const newClusterMap = new Map<string, { title: string; summary: string; questionIds: string[] }>()
    let clusteredCount = 0
    let newClustersCount = 0

    for (const item of parsed) {
      // Verify this is a real question
      const validQ = unclusteredQuestions.find((q) => q.id === item.question_id)
      if (!validQ) continue

      if (item.action === 'add_to_existing' && item.cluster_id) {
        const exists = clusters.find((c) => c.id === item.cluster_id)
        if (!exists) continue

        await supabase
          .from('questions')
          .update({ cluster_id: item.cluster_id })
          .eq('id', item.question_id)

        clusteredCount++
      } else if (item.action === 'create_new' && item.cluster_key && item.cluster_title && item.summary_question) {
        if (!newClusterMap.has(item.cluster_key)) {
          newClusterMap.set(item.cluster_key, {
            title: item.cluster_title,
            summary: item.summary_question,
            questionIds: [],
          })
        }
        newClusterMap.get(item.cluster_key)!.questionIds.push(item.question_id)
        clusteredCount++
      }
    }

    // Create new clusters and assign questions
    for (const [, clusterData] of newClusterMap) {
      const { data: newCluster, error } = await supabase
        .from('clusters')
        .insert({
          session_id: sessionId,
          title: clusterData.title,
          summary_question: clusterData.summary,
          status: 'unanswered',
        })
        .select('id')
        .single()

      if (error || !newCluster) continue

      newClustersCount++

      for (const qId of clusterData.questionIds) {
        await supabase
          .from('questions')
          .update({ cluster_id: newCluster.id })
          .eq('id', qId)
      }
    }

    // Update summaries for existing clusters that got new questions
    const existingClusterIdsUpdated = new Set<string>()
    for (const item of parsed) {
      if (item.action === 'add_to_existing' && item.cluster_id) {
        existingClusterIdsUpdated.add(item.cluster_id)
      }
    }
    for (const cId of existingClusterIdsUpdated) {
      await updateClusterSummary(cId)
    }

    return { clustered: clusteredCount, newClusters: newClustersCount, merged: 0 }
  } catch (err) {
    console.error('Batch clustering error:', err instanceof Error ? err.message : err)
    // Fallback to individual clustering
    let clustered = 0
    for (const q of unclusteredQuestions) {
      try {
        await clusterQuestion(q.id, q.text, clusters, sessionId, sessionDescription)
        clustered++
      } catch {
        // Skip individual failures
      }
    }
    return { clustered, newClusters: 0, merged: 0 }
  }
}

/**
 * Cleanup: remove empty clusters (no questions assigned).
 * Called after re-clustering or when questions are moved/deleted.
 */
export async function cleanupEmptyClusters(sessionId: string): Promise<number> {
  const { data: allClusters } = await supabase
    .from('clusters')
    .select('id')
    .eq('session_id', sessionId)

  if (!allClusters) return 0

  let removed = 0
  for (const cluster of allClusters) {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('cluster_id', cluster.id)

    if (count === 0) {
      await supabase.from('clusters').delete().eq('id', cluster.id)
      removed++
    }
  }
  return removed
}
