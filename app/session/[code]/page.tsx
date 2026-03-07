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
  onMarkAnswered,
  onMarkUnanswered,
  onReply,
}: {
  question: Question
  replies: Reply[]
  onMarkAnswered: (id: string) => void
  onMarkUnanswered?: (id: string) => void
  onReply: (questionId: string, text: string) => Promise<void>
}) {
  const [marking, setMarking] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
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
          </div>
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
  muted,
}: {
  cluster: ClusterWithQuestions
  replies: Reply[]
  onMarkClusterAnswered: (id: string) => void
  onMarkClusterUnanswered: (id: string) => void
  onMarkQuestionAnswered: (id: string) => void
  onMarkQuestionUnanswered: (id: string) => void
  onReply: (questionId: string, text: string) => Promise<void>
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
        muted ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
      }`}
    >
      {/* Card header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {muted && (
          <span className="text-green-500 text-base shrink-0">✓</span>
        )}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm ${muted ? 'text-gray-500' : 'text-gray-900'}`}>
              {cluster.title}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              muted ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'
            }`}>
              {cluster.questions.length} question{cluster.questions.length !== 1 ? 's' : ''}
            </span>
          </div>
          {!open && (
            <p className={`text-xs truncate ${muted ? 'text-gray-400' : 'text-gray-500'}`}>
              {cluster.summary_question}
            </p>
          )}
        </div>
        <ChevronIcon open={open} />
      </button>

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
    <main className="min-h-screen bg-gray-50">
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

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <a href="/" className="text-xl font-bold text-gray-900 hover:opacity-80 transition-opacity shrink-0">
            Query
          </a>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{session.title}</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-300">·</span>
              <span className="font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                {code}
              </span>
            </div>
            <button
              onClick={toggleModeration}
              title={session.moderation_enabled
                ? 'Click to turn off — questions will appear immediately'
                : 'Click to turn on — you will approve questions before they appear'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                session.moderation_enabled
                  ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {session.moderation_enabled ? 'Moderation: On' : 'Moderation: Off'}
            </button>
            <button
              onClick={exportCSV}
              disabled={questions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {codeCopied ? '✓ Copied!' : '⎘ Copy Session Code'}
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {copied ? '✓ Copied!' : '⎘ Copy Join Link'}
            </button>
          </div>
        </div>
      </header>

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
                    <QuestionRow question={q} replies={replies.filter((r) => r.question_id === q.id)} onMarkAnswered={markQuestionAnswered} onMarkUnanswered={markQuestionUnanswered} onReply={handleHostReply} />
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
                      muted={true}
                    />
                  ) : null
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
