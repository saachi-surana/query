'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Session, Question, Cluster } from '@/lib/supabase'

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
  onMarkAnswered,
}: {
  question: Question
  onMarkAnswered: (id: string) => void
}) {
  const [marking, setMarking] = useState(false)

  async function handleMark() {
    setMarking(true)
    await onMarkAnswered(question.id)
    setMarking(false)
  }

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-gray-800">{question.text}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{question.is_anonymous ? 'Anonymous' : question.author_name || 'Anonymous'}</span>
          <span>·</span>
          <span>▲ {question.upvotes}</span>
        </div>
      </div>
      {question.status === 'answered' ? (
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          ✓ Answered
        </span>
      ) : (
        <button
          onClick={handleMark}
          disabled={marking}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
        >
          {marking ? <Spinner /> : '✓'} Mark
        </button>
      )}
    </div>
  )
}

function ClusterCard({
  cluster,
  onMarkClusterAnswered,
  onMarkQuestionAnswered,
  muted,
}: {
  cluster: ClusterWithQuestions
  onMarkClusterAnswered: (id: string) => void
  onMarkQuestionAnswered: (id: string) => void
  muted: boolean
}) {
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)

  async function handleMarkAll() {
    setMarking(true)
    await onMarkClusterAnswered(cluster.id)
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
                  onMarkAnswered={onMarkQuestionAnswered}
                />
              ))}
            </div>
          )}

          {/* Mark all button — only for unanswered clusters */}
          {!muted && cluster.status === 'unanswered' && (
            <button
              onClick={handleMarkAll}
              disabled={marking}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {marking && <Spinner />}
              Mark Entire Cluster as Answered
            </button>
          )}
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
  const [connected, setConnected] = useState(true)
  const [copied, setCopied] = useState(false)

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
      const [{ data: qs }, { data: cs }] = await Promise.all([
        supabase.from('questions').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
        supabase.from('clusters').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
      ])
      setQuestions(qs || [])
      setClusters(cs || [])
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
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [session])

  async function markQuestionAnswered(questionId: string) {
    await supabase.from('questions').update({ status: 'answered' }).eq('id', questionId)
  }

  async function markClusterAnswered(clusterId: string) {
    // Mark all questions in cluster
    await supabase.from('questions').update({ status: 'answered' }).eq('cluster_id', clusterId)
    // Mark cluster
    await supabase.from('clusters').update({ status: 'answered' }).eq('id', clusterId)
  }

  function copyLink() {
    navigator.clipboard.writeText(attendeeUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Build cluster+question structures
  const unansweredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'unanswered')
    .map((c) => ({ ...c, questions: questions.filter((q) => q.cluster_id === c.id) }))

  const answeredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'answered')
    .map((c) => ({ ...c, questions: questions.filter((q) => q.cluster_id === c.id) }))

  const unclusteredQuestions = questions.filter((q) => !q.cluster_id && q.status !== 'answered')

  const totalQuestions = questions.length

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
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {copied ? '✓ Copied!' : '⎘ Copy Join Link'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Empty state */}
        {totalQuestions === 0 && (
          <div className="text-center py-20 space-y-4">
            <p className="text-2xl text-gray-400">Waiting for questions...</p>
            <p className="text-gray-500 text-sm">Share your join code:</p>
            <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-gray-900">{code}</span>
              <button
                onClick={copyLink}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            <p className="text-xs text-gray-400 font-mono">{attendeeUrl}</p>
          </div>
        )}

        {/* Unanswered clusters */}
        {(unansweredClusters.length > 0 || unclusteredQuestions.length > 0) && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Unanswered Clusters
            </h2>
            {unansweredClusters.map((c) => (
              <ClusterCard
                key={c.id}
                cluster={c}
                onMarkClusterAnswered={markClusterAnswered}
                onMarkQuestionAnswered={markQuestionAnswered}
                muted={false}
              />
            ))}
          </section>
        )}

        {/* Unclustered questions */}
        {unclusteredQuestions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Unclustered Questions
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {unclusteredQuestions.map((q) => (
                <div key={q.id} className="px-5">
                  <QuestionRow question={q} onMarkAnswered={markQuestionAnswered} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Answered clusters */}
        {answeredClusters.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Answered
            </h2>
            {answeredClusters.map((c) => (
              <ClusterCard
                key={c.id}
                cluster={c}
                onMarkClusterAnswered={markClusterAnswered}
                onMarkQuestionAnswered={markQuestionAnswered}
                muted={true}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
