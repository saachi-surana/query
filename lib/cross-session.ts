import { supabase } from './supabase'
import { aiComplete } from './ai-provider'

/**
 * Pull context from previous sessions in a recurring series.
 * Only runs once per session — checks for existing previous_session context.
 *
 * For each sibling session that has ended:
 * - Fetches all clusters with their titles and summary questions
 * - Fetches FAQ entries
 * - Combines into a structured text summary
 * - Saves as a single session_context entry with content_type = 'previous_session'
 */
export async function pullPreviousSessionContext(sessionId: string): Promise<number> {
  try {
    // Check if we already pulled context for this session
    const { data: existing } = await supabase
      .from('session_context')
      .select('id')
      .eq('session_id', sessionId)
      .eq('content_type', 'previous_session')
      .limit(1)

    if (existing && existing.length > 0) {
      console.log('Cross-session: Context already pulled for session', sessionId)
      return 0
    }

    // Get the current session to find its recurrence_parent_id
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('id, recurrence_parent_id, created_at')
      .eq('id', sessionId)
      .single()

    if (!currentSession?.recurrence_parent_id) {
      return 0 // Not a recurring session
    }

    // Find sibling sessions (same parent, created before this one, ended)
    const { data: siblings } = await supabase
      .from('sessions')
      .select('id, title, code, created_at, ended_at')
      .eq('recurrence_parent_id', currentSession.recurrence_parent_id)
      .not('id', 'eq', sessionId)
      .not('ended_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10) // Last 10 sessions max

    if (!siblings || siblings.length === 0) {
      return 0
    }

    // For each sibling, fetch clusters and FAQ entries
    const contextParts: string[] = []

    for (const sibling of siblings) {
      const { data: clusters } = await supabase
        .from('clusters')
        .select('title, summary_question, status')
        .eq('session_id', sibling.id)

      const { data: questions } = await supabase
        .from('questions')
        .select('text, upvotes, status')
        .eq('session_id', sibling.id)
        .eq('approved', true)
        .order('upvotes', { ascending: false })
        .limit(20)

      const { data: faqEntries } = await supabase
        .from('faq_entries')
        .select('cluster_title, summary_question, answer')
        .eq('session_id', sibling.id)

      if (!clusters?.length && !questions?.length) continue

      const date = new Date(sibling.created_at).toLocaleDateString()
      let part = `\n--- Session: "${sibling.title}" (${date}) ---\n`

      if (clusters?.length) {
        part += `Topics discussed (${clusters.length} clusters):\n`
        clusters.forEach(c => {
          part += `- ${c.title}: ${c.summary_question} [${c.status}]\n`
        })
      }

      if (questions?.length) {
        const topQuestions = questions.slice(0, 5)
        part += `Top questions by upvotes:\n`
        topQuestions.forEach(q => {
          part += `- (${q.upvotes} upvotes) ${q.text.slice(0, 100)}\n`
        })
      }

      if (faqEntries?.length) {
        part += `FAQ entries:\n`
        faqEntries.forEach(f => {
          part += `- Q: ${f.summary_question} A: ${f.answer.slice(0, 200)}\n`
        })
      }

      contextParts.push(part)
    }

    if (contextParts.length === 0) return 0

    // Combine and truncate
    let combinedContext = `Previous sessions in this recurring series (${siblings.length} sessions):\n` + contextParts.join('\n')

    if (combinedContext.length > 15000) {
      combinedContext = combinedContext.slice(0, 15000) + '\n\n[Previous session context truncated]'
    }

    // Save as session_context entry
    const { error } = await supabase
      .from('session_context')
      .insert({
        session_id: sessionId,
        content_type: 'previous_session',
        content_text: combinedContext,
        file_name: `${siblings.length} previous sessions`,
      })

    if (error) {
      console.error('Cross-session: Failed to save context:', error)
      return 0
    }

    console.log('Cross-session: Pulled context from', siblings.length, 'previous sessions for session', sessionId)
    return 1
  } catch (err) {
    console.error('Cross-session: Error pulling context:', err)
    return 0
  }
}

/**
 * Compute cross-session analytics for a recurring session series.
 * Pure data computation — no AI calls.
 */
export type RecurringInsight = {
  recurringTopics: Array<{
    topic: string
    sessionCount: number
    totalQuestions: number
    trend: 'rising' | 'falling' | 'stable' | 'new'
    sessions: string[] // session titles where this topic appeared
  }>
  newTopics: string[]
  consistentTopics: string[]
  totalSessions: number
  averageQuestionsPerSession: number
}

export async function getRecurringSessionInsights(sessionId: string): Promise<RecurringInsight | null> {
  try {
    const { data: currentSession } = await supabase
      .from('sessions')
      .select('id, recurrence_parent_id, title')
      .eq('id', sessionId)
      .single()

    if (!currentSession?.recurrence_parent_id) return null

    // Get all sessions in this series (including current)
    const { data: allSessions } = await supabase
      .from('sessions')
      .select('id, title, created_at')
      .or(`recurrence_parent_id.eq.${currentSession.recurrence_parent_id},id.eq.${currentSession.recurrence_parent_id}`)
      .order('created_at', { ascending: true })

    if (!allSessions || allSessions.length < 2) return null

    // For each session, get cluster titles and question counts
    const sessionData: Array<{
      sessionId: string
      title: string
      date: string
      topics: string[]
      questionCount: number
    }> = []

    for (const s of allSessions) {
      const { data: clusters } = await supabase
        .from('clusters')
        .select('title')
        .eq('session_id', s.id)

      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', s.id)
        .eq('approved', true)

      sessionData.push({
        sessionId: s.id,
        title: s.title,
        date: new Date(s.created_at).toLocaleDateString(),
        topics: (clusters || []).map(c => c.title.toLowerCase().trim()),
        questionCount: count || 0,
      })
    }

    // Analyze topic frequency across sessions
    const topicMap = new Map<string, { count: number; sessions: string[]; firstSeen: number; lastSeen: number }>()

    sessionData.forEach((s, index) => {
      s.topics.forEach(topic => {
        // Normalize topic for matching (fuzzy: check if any existing topic contains this or vice versa)
        let matchedTopic = topic
        for (const [existing] of topicMap) {
          if (existing.includes(topic) || topic.includes(existing) ||
              levenshteinSimilarity(existing, topic) > 0.7) {
            matchedTopic = existing // Use the existing topic name
            break
          }
        }

        const entry = topicMap.get(matchedTopic) || { count: 0, sessions: [], firstSeen: index, lastSeen: index }
        entry.count++
        entry.sessions.push(s.title)
        entry.lastSeen = index
        topicMap.set(matchedTopic, entry)
      })
    })

    const totalSessions = sessionData.length
    const currentIndex = sessionData.findIndex(s => s.sessionId === sessionId)

    // Classify topics
    const recurringTopics = Array.from(topicMap.entries())
      .map(([topic, data]) => {
        // Determine trend
        let trend: 'rising' | 'falling' | 'stable' | 'new' = 'stable'
        if (data.firstSeen === currentIndex) {
          trend = 'new'
        } else if (data.lastSeen === currentIndex && data.lastSeen - data.firstSeen >= 2) {
          // Check if frequency is increasing in recent sessions
          const recentCount = data.sessions.filter((_, i) => i >= data.sessions.length - 3).length
          const earlierCount = data.sessions.filter((_, i) => i < data.sessions.length - 3).length
          if (recentCount > earlierCount) trend = 'rising'
          else if (recentCount < earlierCount) trend = 'falling'
        }

        return {
          topic: topic.charAt(0).toUpperCase() + topic.slice(1), // Capitalize
          sessionCount: data.count,
          totalQuestions: 0, // Could be computed but expensive
          trend,
          sessions: [...new Set(data.sessions)],
        }
      })
      .sort((a, b) => b.sessionCount - a.sessionCount)

    const newTopics = recurringTopics
      .filter(t => t.trend === 'new')
      .map(t => t.topic)

    const consistentTopics = recurringTopics
      .filter(t => t.sessionCount >= Math.ceil(totalSessions * 0.7))
      .map(t => t.topic)

    const avgQuestions = sessionData.reduce((sum, s) => sum + s.questionCount, 0) / totalSessions

    return {
      recurringTopics,
      newTopics,
      consistentTopics,
      totalSessions,
      averageQuestionsPerSession: Math.round(avgQuestions),
    }
  } catch (err) {
    console.error('Cross-session insights error:', err)
    return null
  }
}

/**
 * Simple Levenshtein-based similarity score (0-1).
 * Used for fuzzy topic matching across sessions.
 */
function levenshteinSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1.0

  const costs: number[] = []
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[longer.length] = lastValue
  }
  return (longer.length - costs[longer.length]) / longer.length
}

/**
 * Generate AI-powered natural language insights about cross-session trends.
 * Uses the recurring insights data to produce a concise, actionable summary.
 */
export async function generateAIInsights(
  sessionId: string,
  insights: RecurringInsight
): Promise<string> {
  if (!insights || insights.totalSessions < 2) {
    return 'Not enough sessions to generate insights. Insights will appear after at least 2 recurring sessions.'
  }

  const topicsSummary = insights.recurringTopics
    .slice(0, 15)
    .map(t => `"${t.topic}" (appeared in ${t.sessionCount}/${insights.totalSessions} sessions, trend: ${t.trend})`)
    .join('\n')

  const prompt = `You are analyzing trends across ${insights.totalSessions} recurring Q&A sessions for a host.

Topics and their frequency:
${topicsSummary}

New topics this session: ${insights.newTopics.length > 0 ? insights.newTopics.join(', ') : 'None'}
Consistently recurring topics: ${insights.consistentTopics.length > 0 ? insights.consistentTopics.join(', ') : 'None'}
Average questions per session: ${insights.averageQuestionsPerSession}

Generate 3-5 concise, actionable insights for the host. Focus on:
1. What topics keep coming up (audience cares deeply about these)
2. What's new this session (emerging concerns)
3. What's declining (issues being resolved)
4. Actionable advice (e.g., "Consider preparing a FAQ on X since it comes up every session")

Keep each insight to 1-2 sentences. Use bullet points. Be specific about topic names.`

  try {
    const result = await aiComplete(
      prompt,
      'You are a session analytics assistant helping Q&A hosts understand audience trends across recurring events. Be concise, specific, and actionable. Do not use markdown headers — just bullet points.'
    )
    return result.trim()
  } catch (err) {
    console.error('AI insights generation failed:', err)
    return 'Unable to generate AI insights at this time.'
  }
}
