'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Session, Question, Cluster, Reply } from '@/lib/supabase'

type ClusterWithQuestions = Cluster & { questions: Question[] }

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function QuestionRow({
  question,
  replies,
  sessionId,
  onMarkAnswered,
  onMarkUnanswered,
  onReply,
}: {
  question: Question
  replies: Reply[]
  sessionId?: string
  onMarkAnswered: (id: string) => void
  onMarkUnanswered?: (id: string) => void
  onReply: (questionId: string, text: string) => Promise<void>
}) {
  const [marking, setMarking] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleToggle() {
    setMarking(true)
    if (question.status === 'answered' && onMarkUnanswered) {
      await onMarkUnanswered(question.id)
    } else {
      await onMarkAnswered(question.id)
    }
    setMarking(false)
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    const text = replyText.trim()
    if (!text) return
    setSubmitting(true)
    await onReply(question.id, text)
    setReplyText('')
    setSubmitting(false)
  }

  return (
    <div className="py-2.5 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm text-gray-800">{question.text}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{question.is_anonymous ? 'Anonymous' : question.author_name || 'Anonymous'}</span>
            <span>·</span>
            <span>▲ {question.upvotes}</span>
            <span>·</span>
            <button
              onClick={() => setShowReplies((o) => !o)}
              className="text-blue-500 hover:text-blue-700 transition-colors"
            >
              {replies.length > 0 ? `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}` : 'Reply'}
            </button>
            {sessionId && !question.suggested_answer && question.status !== 'answered' && (
              <>
                <span>·</span>
                <button
                  onClick={async () => {
                    setSuggesting(true)
                    await fetch('/api/suggest-answer', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ questionId: question.id, sessionId }),
                    }).catch(() => {})
                    setSuggesting(false)
                  }}
                  disabled={suggesting}
                  className="text-purple-500 hover:text-purple-700 transition-colors disabled:opacity-50"
                >
                  {suggesting ? 'Thinking...' : 'AI Suggest'}
                </button>
              </>
            )}
          </div>
          {question.suggested_answer && (
            <div className="rounded-md bg-purple-50 border border-purple-200 px-3 py-2 space-y-1">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">AI Suggested Answer</p>
              <p className="text-sm text-purple-900">{question.suggested_answer}</p>
            </div>
          )}
        </div>
        {question.status === 'answered' ? (
          <button
            onClick={handleToggle}
            disabled={marking}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-green-200 disabled:opacity-50 transition-colors"
          >
            {marking ? <Spinner /> : '✓'} Answered
          </button>
        ) : (
          <button
            onClick={handleToggle}
            disabled={marking}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            {marking ? <Spinner /> : '✓'} Mark
          </button>
        )}
      </div>

      {showReplies && (
        <div className="ml-4 pl-3 border-l-2 border-gray-200 space-y-2">
          {replies.map((r) => (
            <div key={r.id} className="space-y-0.5">
              <p className="text-sm text-gray-700">{r.text}</p>
              <p className="text-xs text-gray-400">
                <span className={r.is_host ? 'font-semibold text-blue-600' : ''}>
                  {r.is_host ? '★ Host' : r.author_name || 'Anonymous'}
                </span>
                <span className="mx-1">·</span>
                {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
          <form onSubmit={handleReply} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a response..."
              maxLength={500}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={submitting || !replyText.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {submitting && <Spinner />}
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function ClusterCard({
  cluster,
  replies,
  onMarkClusterAnswered,
  onMarkClusterUnanswered,
  onMarkQuestionAnswered,
  onMarkQuestionUnanswered,
  onReply,
  onHighlight,
  onClaim,
  onSaveFaq,
  sessionId,
  highlighted,
  muted,
}: {
  cluster: ClusterWithQuestions
  replies: Reply[]
  onMarkClusterAnswered: (id: string) => void
  onMarkClusterUnanswered: (id: string) => void
  onMarkQuestionAnswered: (id: string) => void
  onMarkQuestionUnanswered: (id: string) => void
  onReply: (questionId: string, text: string) => Promise<void>
  onHighlight?: (id: string | null) => void
  onClaim?: (id: string, name: string | null) => void
  onSaveFaq?: (cluster: ClusterWithQuestions) => void
  sessionId?: string
  highlighted?: boolean
  muted: boolean
}) {
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)

  async function handleMarkAll() {
    setMarking(true)
    if (muted) {
      await onMarkClusterUnanswered(cluster.id)
    } else {
      await onMarkClusterAnswered(cluster.id)
    }
    setMarking(false)
  }

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        highlighted ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200' : muted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center">
        <button
          className="flex-1 flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
          onClick={() => setOpen((o) => !o)}
        >
          {highlighted && (
            <span className="text-purple-600 text-base shrink-0">◉</span>
          )}
          {muted && !highlighted && (
            <span className="text-green-500 text-base shrink-0">✓</span>
          )}
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-sm ${highlighted ? 'text-purple-900' : muted ? 'text-gray-500' : 'text-gray-900'}`}>
                {cluster.title}
              </h3>
              {highlighted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
                  Discussing Now
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                muted ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'
              }`}>
                {cluster.questions.length} question{cluster.questions.length !== 1 ? 's' : ''}
              </span>
              {cluster.claimed_by && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  {cluster.claimed_by}
                </span>
              )}
            </div>
            {!open && (
              <p className={`text-xs truncate ${muted ? 'text-gray-400' : 'text-gray-500'}`}>
                {cluster.summary_question}
              </p>
            )}
          </div>
          <ChevronIcon open={open} />
        </button>
        {onHighlight && !muted && (
          <button
            onClick={() => onHighlight(highlighted ? null : cluster.id)}
            title={highlighted ? 'Stop discussing' : 'Mark as discussing now'}
            className={`shrink-0 mr-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              highlighted
                ? 'bg-purple-200 text-purple-800 hover:bg-purple-300'
                : 'bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-700'
            }`}
          >
            {highlighted ? 'Stop' : 'Discuss'}
          </button>
        )}
      </div>

      {/* Expanded content */}
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* AI Summary */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">✨ AI Summary Question</p>
            <p className="text-sm font-medium text-blue-900 leading-relaxed">{cluster.summary_question}</p>
          </div>

          {/* Questions */}
          {cluster.questions.length > 0 && (
            <div className="divide-y divide-gray-100">
              {cluster.questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  replies={replies.filter((r) => r.question_id === q.id)}
                  sessionId={sessionId}
                  onMarkAnswered={onMarkQuestionAnswered}
                  onMarkUnanswered={onMarkQuestionUnanswered}
                  onReply={onReply}
                />
              ))}
            </div>
          )}

          {/* Mark/unmark all button */}
          <button
            onClick={handleMarkAll}
            disabled={marking}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
              muted
                ? 'bg-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {marking && <Spinner />}
            {muted ? 'Unmark Entire Cluster' : 'Mark Entire Cluster as Answered'}
          </button>

          {/* Claim + FAQ buttons */}
          <div className="flex gap-2">
            {onClaim && !muted && (
              <button
                onClick={() => onClaim(cluster.id, cluster.claimed_by ? null : prompt('Your name:') || null)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  cluster.claimed_by
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    : 'border-gray-200 text-gray-500 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                {cluster.claimed_by ? `Claimed by ${cluster.claimed_by} — Release` : 'Claim this cluster'}
              </button>
            )}
            {onSaveFaq && muted && (
              <button
                onClick={() => onSaveFaq(cluster)}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Save as FAQ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ModeratorPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [connected, setConnected] = useState(true)
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [clustersOpen, setClustersOpen] = useState(true)
  const [unclusteredOpen, setUnclusteredOpen] = useState(true)
  const [answeredOpen, setAnsweredOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [moderationBannerDismissed, setModerationBannerDismissed] = useState(false)
  const [answeredSubtab, setAnsweredSubtab] = useState<string>('misc')

  const attendeeUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`

  // Load session
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sessions').select('*').eq('code', code).single()
      if (!data) { setNotFound(true); return }
      setSession(data)
    }
    load()
  }, [code])

  // Load all sessions for sidebar
  useEffect(() => {
    async function loadSessions() {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setAllSessions(data || [])
    }
    loadSessions()
  }, [])

  // Load questions and clusters
  useEffect(() => {
    if (!session) return

    async function loadData() {
      const [{ data: qs }, { data: cs }, { data: rs }] = await Promise.all([
        supabase.from('questions').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
        supabase.from('clusters').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
        supabase.from('replies').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
      ])
      setQuestions(qs || [])
      setClusters(cs || [])
      setReplies(rs || [])
    }
    loadData()

    // Real-time subscriptions
    const channel = supabase
      .channel(`moderator-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newQ = payload.new as Question
            setQuestions((prev) => [...prev, newQ])
            // Trigger clustering
            fetch('/api/cluster', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questionId: newQ.id, sessionId: session.id }),
            }).catch(() => {/* silent */})
          } else if (payload.eventType === 'UPDATE') {
            setQuestions((prev) =>
              prev.map((q) => (q.id === (payload.new as Question).id ? (payload.new as Question) : q))
            )
          } else if (payload.eventType === 'DELETE') {
            setQuestions((prev) => prev.filter((q) => q.id !== payload.old.id))
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clusters', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setClusters((prev) => [...prev, payload.new as Cluster])
          } else if (payload.eventType === 'UPDATE') {
            setClusters((prev) =>
              prev.map((c) => (c.id === (payload.new as Cluster).id ? (payload.new as Cluster) : c))
            )
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReplies((prev) => [...prev, payload.new as Reply])
          } else if (payload.eventType === 'DELETE') {
            setReplies((prev) => prev.filter((r) => r.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [session])

  async function toggleModeration() {
    if (!session) return
    const newValue = !session.moderation_enabled
    await supabase.from('sessions').update({ moderation_enabled: newValue }).eq('id', session.id)
    setSession({ ...session, moderation_enabled: newValue })
    setModerationBannerDismissed(false)
  }

  async function toggleAutoSuggest() {
    if (!session) return
    const newValue = !session.auto_suggest
    await supabase.from('sessions').update({ auto_suggest: newValue }).eq('id', session.id)
    setSession({ ...session, auto_suggest: newValue })
  }

  async function approveQuestion(questionId: string) {
    await supabase.from('questions').update({ approved: true }).eq('id', questionId)
    // Trigger clustering for the newly approved question
    if (session) {
      fetch('/api/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, sessionId: session.id }),
      }).catch(() => {})
    }
  }

  async function dismissQuestion(questionId: string) {
    await supabase.from('questions').delete().eq('id', questionId)
  }

  async function markQuestionAnswered(questionId: string) {
    await supabase.from('questions').update({ status: 'answered' }).eq('id', questionId)
  }

  async function markQuestionUnanswered(questionId: string) {
    await supabase.from('questions').update({ status: 'pending' }).eq('id', questionId)
  }

  async function markClusterAnswered(clusterId: string) {
    await supabase.from('questions').update({ status: 'answered' }).eq('cluster_id', clusterId)
    await supabase.from('clusters').update({ status: 'answered' }).eq('id', clusterId)
  }

  async function markClusterUnanswered(clusterId: string) {
    await supabase.from('questions').update({ status: 'pending' }).eq('cluster_id', clusterId)
    await supabase.from('clusters').update({ status: 'unanswered' }).eq('id', clusterId)
  }

  async function claimCluster(clusterId: string, name: string | null) {
    await supabase.from('clusters').update({ claimed_by: name }).eq('id', clusterId)
  }

  async function saveFaqFromCluster(cluster: ClusterWithQuestions) {
    if (!session) return
    const hostReplies = replies
      .filter((r) => r.is_host && cluster.questions.some((q) => q.id === r.question_id))
      .map((r) => r.text)
    const answer = hostReplies.length > 0
      ? hostReplies.join('\n\n')
      : 'Answered during the live session.'
    await supabase.from('faq_entries').insert({
      session_id: session.id,
      cluster_title: cluster.title,
      summary_question: cluster.summary_question,
      answer,
    })
  }

  async function highlightCluster(clusterId: string | null) {
    if (!session) return
    await supabase.from('sessions').update({ highlighted_cluster_id: clusterId }).eq('id', session.id)
    setSession({ ...session, highlighted_cluster_id: clusterId })
  }

  async function endSession() {
    if (!session) return
    const now = new Date().toISOString()
    await supabase.from('sessions').update({ ended_at: now }).eq('id', session.id)
    setSession({ ...session, ended_at: now })
  }

  async function reopenSession() {
    if (!session) return
    await supabase.from('sessions').update({ ended_at: null }).eq('id', session.id)
    setSession({ ...session, ended_at: null })
  }

  async function handleHostReply(questionId: string, text: string) {
    if (!session) return
    await supabase.from('replies').insert({
      question_id: questionId,
      session_id: session.id,
      text,
      author_name: null,
      is_host: true,
    })
    await markQuestionAnswered(questionId)
  }

  function exportCSV() {
    const escapeCSV = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [['Cluster', 'Summary Question', 'Question', 'Author', 'Anonymous', 'Upvotes', 'Status', 'Replies', 'Timestamp']]
    for (const q of questions) {
      const cluster = clusters.find((c) => c.id === q.cluster_id)
      const qReplies = replies
        .filter((r) => r.question_id === q.id)
        .map((r) => `${r.is_host ? '[Host]' : (r.author_name || 'Anonymous')}: ${r.text}`)
        .join(' | ')
      rows.push([
        escapeCSV(cluster?.title || 'Unclustered'),
        escapeCSV(cluster?.summary_question || ''),
        escapeCSV(q.text),
        escapeCSV(q.is_anonymous ? 'Anonymous' : (q.author_name || 'Anonymous')),
        q.is_anonymous ? 'Yes' : 'No',
        String(q.upvotes),
        q.status,
        escapeCSV(qReplies),
        new Date(q.created_at).toISOString(),
      ])
    }
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-${code}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyLink() {
    navigator.clipboard.writeText(attendeeUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  // Separate approved questions from pending review
  const approvedQuestions = questions.filter((q) => q.approved)
  const pendingReviewQuestions = questions.filter((q) => !q.approved)

  // Build cluster+question structures (only from approved questions)
  const unansweredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'unanswered')
    .map((c) => ({ ...c, questions: approvedQuestions.filter((q) => q.cluster_id === c.id) }))

  const answeredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'answered')
    .map((c) => ({ ...c, questions: approvedQuestions.filter((q) => q.cluster_id === c.id) }))

  const unclusteredQuestions = approvedQuestions.filter((q) => !q.cluster_id && q.status !== 'answered')
  const answeredUnclusteredQuestions = approvedQuestions.filter((q) => !q.cluster_id && q.status === 'answered')
  const answeredOrphanQuestions = approvedQuestions.filter(
    (q) => q.status === 'answered' && q.cluster_id && clusters.find((c) => c.id === q.cluster_id)?.status === 'unanswered'
  )
  const hasAnswered = answeredClusters.length > 0 || answeredUnclusteredQuestions.length > 0 || answeredOrphanQuestions.length > 0

  const totalQuestions = approvedQuestions.length

  if (notFound) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Session Not Found</h1>
        <p className="text-gray-500">No session with code &ldquo;{code}&rdquo;.</p>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
          Go Home
        </button>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading…</div>
      </main>
    )
  }

  return (
    <main className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Connection banner */}
      {!connected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 text-center">
          Live updates paused — reconnecting...
        </div>
      )}

      {/* Moderation banner */}
      {session.moderation_enabled && !moderationBannerDismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-center gap-2">
          <span>
            Moderation is on — new questions will require your approval before attendees can see them.
            {pendingReviewQuestions.length > 0 && (
              <span className="font-semibold ml-1">
                {pendingReviewQuestions.length} question{pendingReviewQuestions.length !== 1 ? 's' : ''} waiting for review.
              </span>
            )}
          </span>
          <button
            onClick={() => setModerationBannerDismissed(true)}
            className="shrink-0 ml-2 w-6 h-6 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold text-base flex items-center justify-center transition-colors"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Session ended banner */}
      {session.ended_at && (
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 text-sm text-gray-700 text-center">
          This session has ended. You can still reply to questions and export data.
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen((o) => !o)} className="sm:hidden shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{session.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded">
              {code}
            </span>
            <button
              onClick={copyCode}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {codeCopied ? '✓ Copied!' : '⎘ Copy Code'}
            </button>
            <button
              onClick={copyLink}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {copied ? '✓ Copied!' : '⎘ Copy Link'}
            </button>
            {session.ended_at ? (
              <button
                onClick={reopenSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
              >
                Reopen
              </button>
            ) : (
              <button
                onClick={endSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                End Session
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} shrink-0 bg-white border-r border-gray-200 overflow-y-auto overflow-x-hidden transition-all duration-200 hidden sm:block`}>
          <div className="p-4 space-y-6 w-64">
            <a href="/" className="text-xl font-bold text-gray-900 hover:opacity-80 transition-opacity block">
              Query
            </a>

            {/* Live Sessions */}
            {(() => {
              const live = allSessions.filter((s) => !s.ended_at && (!s.starts_at || new Date(s.starts_at) <= new Date()))
              if (live.length === 0) return null
              return (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live ({live.length})
                  </p>
                  {live.map((s) => (
                    <a
                      key={s.id}
                      href={`/session/${s.code}`}
                      className={`block px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                        s.code === code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {s.title}
                      <span className="block text-xs text-gray-400 font-mono">{s.code}</span>
                    </a>
                  ))}
                </div>
              )
            })()}

            {/* Upcoming Sessions */}
            {(() => {
              const upcoming = allSessions.filter((s) => s.starts_at && new Date(s.starts_at) > new Date() && !s.ended_at)
              if (upcoming.length === 0) return null
              return (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Upcoming</p>
                  {upcoming.map((s) => (
                    <a
                      key={s.id}
                      href={`/session/${s.code}`}
                      className={`block px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                        s.code === code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {s.title}
                      <span className="block text-xs text-gray-400">
                        {new Date(s.starts_at!).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </a>
                  ))}
                </div>
              )
            })()}

            {/* Past Sessions */}
            {(() => {
              const past = allSessions.filter((s) => s.ended_at).slice(0, 10)
              if (past.length === 0) return null
              return (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Past</p>
                  {past.map((s) => (
                    <a
                      key={s.id}
                      href={`/report/${s.code}`}
                      className="block px-3 py-2 rounded-lg text-sm truncate text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      {s.title}
                      <span className="block text-xs text-gray-400 font-mono">{s.code}</span>
                    </a>
                  ))}
                </div>
              )
            })()}

            {/* Bottom links */}
            <div className="pt-4 border-t border-gray-200 space-y-1">
              <a href="/create" className="block px-3 py-2 rounded-lg text-sm text-blue-600 hover:bg-blue-50 font-medium transition-colors">
                + New Session
              </a>
              <a href="/analytics" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                Analytics
              </a>
              <div className="px-3 py-2 rounded-lg text-sm text-gray-400 cursor-default">
                Profile (coming soon)
              </div>
              <div className="px-3 py-2 rounded-lg text-sm text-gray-400 cursor-default">
                Settings (coming soon)
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Pending review queue */}
        {session.moderation_enabled && pendingReviewQuestions.length === 0 && totalQuestions > 0 && (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-center text-sm text-amber-600">
            No questions waiting for review. New questions from attendees will appear here for your approval.
          </div>
        )}
        {pendingReviewQuestions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-2">
              Pending Review
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {pendingReviewQuestions.length}
              </span>
            </h2>
            <div className="bg-white rounded-xl border border-amber-200 divide-y divide-amber-100 overflow-hidden">
              {pendingReviewQuestions.map((q) => (
                <div key={q.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm text-gray-800">{q.text}</p>
                    <p className="text-xs text-gray-400">
                      {q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => approveQuestion(q.id)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => dismissQuestion(q.id)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state — onboarding guide */}
        {totalQuestions === 0 && pendingReviewQuestions.length === 0 && (
          <div className="py-12 space-y-8">
            <div className="text-center space-y-2">
              <p className="text-3xl font-semibold text-gray-900">Your session is live</p>
              <p className="text-gray-500">Share the code below so attendees can start asking questions.</p>
            </div>

            <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 space-y-4 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Join Code</p>
              <p className="font-mono text-4xl font-bold tracking-[0.3em] text-gray-900">{code}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={copyCode}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {codeCopied ? '✓ Copied!' : 'Copy code'}
                </button>
                <button
                  onClick={copyLink}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy join link'}
                </button>
              </div>
              <p className="text-xs text-gray-400 font-mono">{attendeeUrl}</p>
            </div>

            <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center space-y-2">
                <div className="text-2xl">1</div>
                <p className="text-sm font-medium text-gray-700">Share the code</p>
                <p className="text-xs text-gray-400">Attendees join at {typeof window !== 'undefined' ? window.location.origin : ''} with this code</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center space-y-2">
                <div className="text-2xl">2</div>
                <p className="text-sm font-medium text-gray-700">Questions cluster</p>
                <p className="text-xs text-gray-400">AI automatically groups similar questions into topics</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center space-y-2">
                <div className="text-2xl">3</div>
                <p className="text-sm font-medium text-gray-700">Answer & reply</p>
                <p className="text-xs text-gray-400">Mark clusters as answered or reply directly to questions</p>
              </div>
            </div>
          </div>
        )}

        {/* Unanswered clusters */}
        {unansweredClusters.length > 0 && (
          <section className="space-y-3">
            <button
              onClick={() => setClustersOpen((o) => !o)}
              className="flex items-center gap-2 group"
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide group-hover:text-gray-700 transition-colors">
                Unanswered Clusters
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {unansweredClusters.reduce((n, c) => n + c.questions.length, 0)}
              </span>
              <ChevronIcon open={clustersOpen} />
            </button>
            {clustersOpen && unansweredClusters.map((c) => (
              <ClusterCard
                key={c.id}
                cluster={c}
                replies={replies.filter((r) => c.questions.some((q) => q.id === r.question_id))}
                onMarkClusterAnswered={markClusterAnswered}
                onMarkClusterUnanswered={markClusterUnanswered}
                onMarkQuestionAnswered={markQuestionAnswered}
                onMarkQuestionUnanswered={markQuestionUnanswered}
                onReply={handleHostReply}
                onHighlight={highlightCluster}
                onClaim={claimCluster}
                sessionId={session.id}
                highlighted={session.highlighted_cluster_id === c.id}
                muted={false}
              />
            ))}
          </section>
        )}

        {/* Unclustered questions */}
        {unclusteredQuestions.length > 0 && (
          <section className="space-y-3">
            <button
              onClick={() => setUnclusteredOpen((o) => !o)}
              className="flex items-center gap-2 group"
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide group-hover:text-gray-700 transition-colors">
                Unclustered Questions
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                {unclusteredQuestions.length}
              </span>
              <ChevronIcon open={unclusteredOpen} />
            </button>
            {unclusteredOpen && (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {unclusteredQuestions.map((q) => (
                  <div key={q.id} className="px-5">
                    <QuestionRow question={q} replies={replies.filter((r) => r.question_id === q.id)} sessionId={session.id} onMarkAnswered={markQuestionAnswered} onMarkUnanswered={markQuestionUnanswered} onReply={handleHostReply} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Answered dropdown */}
        {hasAnswered && (
          <section className="space-y-3">
            <button
              onClick={() => setAnsweredOpen((o) => !o)}
              className="flex items-center gap-2 group"
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide group-hover:text-gray-700 transition-colors">
                Answered
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {answeredClusters.reduce((n, c) => n + c.questions.length, 0) + answeredUnclusteredQuestions.length + answeredOrphanQuestions.length}
              </span>
              <ChevronIcon open={answeredOpen} />
            </button>

            {answeredOpen && (
              <div className="space-y-4">
                {/* Subtabs */}
                <div className="flex flex-wrap gap-2">
                  {(answeredUnclusteredQuestions.length > 0 || answeredOrphanQuestions.length > 0) && (
                    <button
                      onClick={() => setAnsweredSubtab('misc')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        answeredSubtab === 'misc'
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      Misc ({answeredUnclusteredQuestions.length + answeredOrphanQuestions.length})
                    </button>
                  )}
                  {answeredClusters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setAnsweredSubtab(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        answeredSubtab === c.id
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {c.title} ({c.questions.length})
                    </button>
                  ))}
                </div>

                {/* Subtab content: Misc */}
                {answeredSubtab === 'misc' && (answeredUnclusteredQuestions.length > 0 || answeredOrphanQuestions.length > 0) && (
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {[...answeredUnclusteredQuestions, ...answeredOrphanQuestions].map((q) => (
                      <div key={q.id} className="px-5">
                        <QuestionRow
                          question={q}
                          replies={replies.filter((r) => r.question_id === q.id)}
                          sessionId={session.id}
                          onMarkAnswered={markQuestionAnswered}
                          onMarkUnanswered={markQuestionUnanswered}
                          onReply={handleHostReply}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtab content: Cluster */}
                {answeredClusters.map((c) =>
                  answeredSubtab === c.id ? (
                    <ClusterCard
                      key={c.id}
                      cluster={c}
                      replies={replies.filter((r) => c.questions.some((q) => q.id === r.question_id))}
                      onMarkClusterAnswered={markClusterAnswered}
                      onMarkClusterUnanswered={markClusterUnanswered}
                      onMarkQuestionAnswered={markQuestionAnswered}
                      onMarkQuestionUnanswered={markQuestionUnanswered}
                      onReply={handleHostReply}
                      onSaveFaq={saveFaqFromCluster}
                      sessionId={session.id}
                      muted={true}
                    />
                  ) : null
                )}
              </div>
            )}
          </section>
        )}

        {/* Analytics */}
        {totalQuestions > 0 && (
          <section className="space-y-3">
            <button
              onClick={() => setAnalyticsOpen((o) => !o)}
              className="flex items-center gap-2 group"
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide group-hover:text-gray-700 transition-colors">
                Analytics
              </h2>
              <ChevronIcon open={analyticsOpen} />
            </button>
            {analyticsOpen && (() => {
              const totalUps = approvedQuestions.reduce((s, q) => s + q.upvotes, 0)
              const answeredCount = approvedQuestions.filter((q) => q.status === 'answered').length
              const pctAnswered = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
              const engScore = totalQuestions + totalUps
              const hostReplyCount = replies.filter((r) => r.is_host).length

              // Response time: avg minutes between question creation and first host reply
              const responseTimes: number[] = []
              for (const q of approvedQuestions) {
                const firstReply = replies
                  .filter((r) => r.question_id === q.id && r.is_host)
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
                if (firstReply) {
                  const mins = (new Date(firstReply.created_at).getTime() - new Date(q.created_at).getTime()) / 60000
                  if (mins >= 0) responseTimes.push(mins)
                }
              }
              const avgResponseMin = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null

              // Engagement gaps: clusters with high upvotes but no host replies
              const gaps = unansweredClusters
                .map((c) => ({
                  ...c,
                  totalUps: c.questions.reduce((s, q) => s + q.upvotes, 0),
                  hasReply: c.questions.some((q) => replies.some((r) => r.question_id === q.id && r.is_host)),
                }))
                .filter((c) => c.totalUps >= 2 && !c.hasReply)
                .sort((a, b) => b.totalUps - a.totalUps)

              return (
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                  {/* Row 1: Key metrics */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { label: 'Questions', value: totalQuestions, color: 'text-gray-900' },
                      { label: 'Upvotes', value: totalUps, color: 'text-blue-600' },
                      { label: 'Answered', value: `${pctAnswered}%`, color: pctAnswered >= 75 ? 'text-green-600' : pctAnswered >= 50 ? 'text-amber-600' : 'text-red-500' },
                      { label: 'Topics', value: unansweredClusters.length + answeredClusters.length, color: 'text-gray-900' },
                      { label: 'Replies', value: hostReplyCount, color: 'text-gray-900' },
                      { label: 'Engagement', value: engScore, color: 'text-purple-600' },
                    ].map((m) => (
                      <div key={m.label} className="text-center space-y-0.5">
                        <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Answer progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{answeredCount} answered</span>
                      <span>{totalQuestions - answeredCount} remaining</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${pctAnswered}%` }}
                      />
                    </div>
                  </div>

                  {/* Response time */}
                  {avgResponseMin !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Avg response time:</span>
                      <span className="font-medium text-gray-900">
                        {avgResponseMin < 1 ? '<1 min' : avgResponseMin < 60 ? `${avgResponseMin} min` : `${Math.round(avgResponseMin / 60)}h ${avgResponseMin % 60}m`}
                      </span>
                    </div>
                  )}

                  {/* Engagement gaps */}
                  {gaps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Engagement Gaps</p>
                      <p className="text-xs text-gray-500">Popular topics with no host response yet:</p>
                      {gaps.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-sm bg-amber-50 rounded-lg px-3 py-2">
                          <span className="font-mono text-xs font-bold text-amber-700">▲{c.totalUps}</span>
                          <span className="text-amber-900 truncate">{c.title}: {c.summary_question}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top questions */}
                  {approvedQuestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Most Upvoted</p>
                      {[...approvedQuestions].sort((a, b) => b.upvotes - a.upvotes).slice(0, 3).map((q) => (
                        <div key={q.id} className="flex items-center gap-3 text-sm">
                          <span className="shrink-0 font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            ▲ {q.upvotes}
                          </span>
                          <p className="text-gray-700 truncate">{q.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <a href="/analytics" className="block text-center text-xs text-blue-600 hover:underline pt-1">
                    View global analytics
                  </a>
                </div>
              )
            })()}
          </section>
        )}
          </div>
        </div>
      </div>

      {/* Floating Settings Panel */}
      <div className="fixed bottom-6 right-6 z-30">
        {settingsOpen && (
          <div className="absolute bottom-14 right-0 w-80 bg-white rounded-xl border border-gray-200 shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Session Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
            </div>

            {/* Moderation toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">Moderation</p>
                <p className="text-xs text-gray-400">Approve questions before they appear</p>
              </div>
              <button
                onClick={toggleModeration}
                className={`relative w-10 h-6 rounded-full transition-colors ${session.moderation_enabled ? 'bg-amber-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${session.moderation_enabled ? 'translate-x-4' : ''}`} />
              </button>
            </label>

            {/* AI Suggest toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">AI Auto-Suggest</p>
                <p className="text-xs text-gray-400">Draft answers for new questions</p>
              </div>
              <button
                onClick={toggleAutoSuggest}
                className={`relative w-10 h-6 rounded-full transition-colors ${session.auto_suggest ? 'bg-purple-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${session.auto_suggest ? 'translate-x-4' : ''}`} />
              </button>
            </label>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <button
                onClick={() => { exportCSV(); setSettingsOpen(false) }}
                disabled={questions.length === 0}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Export CSV
              </button>
              <a
                href={`/report/${code}`}
                target="_blank"
                className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                View Report
              </a>
              <a
                href={`/present/${code}`}
                target="_blank"
                className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Present Mode
              </a>
            </div>
          </div>
        )}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
            settingsOpen ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </main>
  )
}
