import { supabase, Cluster } from './supabase'
import { aiComplete, getProvider } from './ai-provider'

function hasNoAIProvider(): boolean {
  const geminiKey = process.env.GEMINI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const hasGemini = !!geminiKey && geminiKey !== ''
  const hasAnthropic = !!anthropicKey && anthropicKey !== 'sk-ant-placeholder'
  return !hasGemini && !hasAnthropic
}

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

Existing clusters:
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
  } catch {
    // Any error — leave question unclustered silently
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
