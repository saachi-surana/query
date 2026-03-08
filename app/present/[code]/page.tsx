'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Session, Question, Cluster, Reply } from '@/lib/supabase'

type ClusterWithQuestions = Cluster & { questions: Question[] }

function PresentQuestionCard({ question, replies }: { question: Question; replies: Reply[] }) {
  const [showReplies, setShowReplies] = useState(false)
  const qReplies = replies.filter((r) => r.question_id === question.id)

  return (
    <div
      className="rounded-2xl border bg-white p-5 space-y-2"
      style={{ borderColor: 'var(--theme-primary-light)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-lg text-slate-800 leading-relaxed flex-1">{question.text}</p>
        <div className="shrink-0 flex items-center gap-2">
          {qReplies.length > 0 && (
            <button
              onClick={() => setShowReplies((o) => !o)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium transition-colors"
              style={{ background: showReplies ? 'var(--theme-primary)' : 'var(--theme-primary-subtle)', color: showReplies ? '#fff' : 'var(--theme-primary-hover)' }}
            >
              {qReplies.length} repl{qReplies.length === 1 ? 'y' : 'ies'} {showReplies ? '▴' : '▾'}
            </button>
          )}
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium bg-slate-100 text-slate-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            {question.upvotes}
          </span>
        </div>
      </div>
      {showReplies && qReplies.length > 0 && (
        <div className="pl-4 border-l-2 space-y-1.5 mt-2" style={{ borderColor: 'var(--theme-primary-light)' }}>
          {qReplies.map((r) => (
            <div key={r.id}>
              <p className="text-base text-slate-700">{r.text}</p>
              <p className="text-xs text-slate-400">
                <span className={r.is_host ? 'font-semibold' : ''} style={r.is_host ? { color: 'var(--theme-primary)' } : undefined}>
                  {r.is_host ? '★ Host' : r.author_name || 'Anonymous'}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PresentPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [connected, setConnected] = useState(true)

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sessions').select('*').eq('code', code).single()
      if (!data) { setNotFound(true); return }
      setSession(data)
    }
    load()
  }, [code])

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

    const channel = supabase
      .channel(`present-${session.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        (payload) => { setSession(payload.new as Session) }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setQuestions((prev) => [...prev, payload.new as Question])
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReplies((prev) => [...prev, payload.new as Reply])
          } else if (payload.eventType === 'UPDATE') {
            setReplies((prev) =>
              prev.map((r) => (r.id === (payload.new as Reply).id ? (payload.new as Reply) : r))
            )
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [session])

  // Build cluster data
  const approvedQuestions = questions.filter((q) => q.approved)

  const unansweredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'unanswered')
    .map((c) => ({ ...c, questions: approvedQuestions.filter((q) => q.cluster_id === c.id && q.status !== 'answered') }))
    .filter((c) => c.questions.length > 0)
    .sort((a, b) => b.questions.reduce((s, q) => s + q.upvotes, 0) - a.questions.reduce((s, q) => s + q.upvotes, 0))

  const totalQuestions = approvedQuestions.filter((q) => q.status !== 'answered').length
  const totalUpvotes = approvedQuestions.reduce((s, q) => s + q.upvotes, 0)

  // Find highlighted cluster
  const highlightedCluster = unansweredClusters.find((c) => session?.highlighted_cluster_id === c.id)
  const otherClusters = unansweredClusters.filter((c) => c.id !== session?.highlighted_cluster_id)

  if (notFound) {
    return (
      <main className="h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-xl">Session not found</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="h-screen flex flex-col bg-slate-50">
        <div className="relative overflow-hidden px-4 sm:px-6 py-3 shrink-0 bg-slate-200 animate-pulse h-14" />
        <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="h-screen flex flex-col bg-slate-50">
      {/* Connection indicator */}
      {!connected && (
        <div className="bg-amber-500 px-4 py-1 text-xs text-center text-white font-medium shrink-0">
          Reconnecting...
        </div>
      )}

      {/* Mesh gradient header */}
      <header className="relative overflow-hidden px-4 sm:px-6 py-3 shrink-0">
        <div className="absolute inset-0 bg-theme-mesh-base" />
        <div className="absolute top-[-80%] left-[-10%] w-[40%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-1)' }} />
        <div className="absolute top-[-80%] left-[25%] w-[35%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-2)' }} />
        <div className="absolute top-[-80%] right-[10%] w-[30%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-5)' }} />
        <div className="absolute top-[-80%] right-[-10%] w-[25%] h-[300%] rounded-full blur-[40px]" style={{ background: 'var(--theme-mesh-base)' }} />

        <div className="relative flex flex-col sm:flex-row items-center sm:justify-between gap-2">
          {/* Left: branding + session title */}
          <div className="flex items-baseline gap-3 min-w-0 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white shrink-0 tracking-tight">Query</h1>
            <span className="text-white/30 text-lg font-light shrink-0">/</span>
            <h2 className="text-lg text-white/80 font-medium truncate">{session.title}</h2>
          </div>

          {/* Right: join code + URL — Kahoot-style prominent */}
          <div className="shrink-0 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-2.5 text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">Join at <span className="text-white/90">{typeof window !== 'undefined' ? window.location.host : ''}/join</span></p>
            <p className="font-mono text-4xl font-bold tracking-[0.2em] text-white leading-tight">{code}</p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {totalQuestions === 0 ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-3">
              <p className="text-4xl font-bold text-slate-700">Ask a question!</p>
              <p className="text-xl text-slate-400">Go to the link below and submit your questions</p>
            </div>
            <div className="rounded-2xl px-10 py-6 text-center space-y-2 border-2" style={{ background: 'var(--theme-primary-subtle)', borderColor: 'var(--theme-primary-light)' }}>
              <p className="text-slate-500 text-sm uppercase tracking-wider">Join Code</p>
              <p className="font-mono text-5xl font-bold tracking-[0.3em] text-slate-900">{code}</p>
              <p className="text-slate-500 text-sm font-mono">{joinUrl}</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Highlighted / Discussing cluster */}
            {highlightedCluster && (() => {
              const clusterUpvotes = highlightedCluster.questions.reduce((s, q) => s + q.upvotes, 0)
              return (
                <div
                  className="rounded-2xl border-2 p-8 transition-all"
                  style={{ background: 'var(--theme-primary-subtle)', borderColor: 'var(--theme-primary-light)' }}
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white animate-pulse"
                          style={{ background: 'var(--theme-primary)' }}
                        >
                          DISCUSSING NOW
                        </span>
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-900">{highlightedCluster.title}</h3>
                      <p className="text-lg text-slate-700 leading-relaxed">{highlightedCluster.summary_question}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-white text-slate-600 border border-slate-200">
                        {highlightedCluster.questions.length} question{highlightedCluster.questions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white" style={{ background: 'var(--theme-primary)' }}>
                        {clusterUpvotes} upvote{clusterUpvotes !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {highlightedCluster.questions.sort((a, b) => b.upvotes - a.upvotes).map((q) => (
                      <PresentQuestionCard key={q.id} question={q} replies={replies} />
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Other clusters */}
            {otherClusters.map((c) => {
              const clusterUpvotes = c.questions.reduce((s, q) => s + q.upvotes, 0)
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border p-6 transition-all"
                  style={{ background: 'var(--theme-primary-subtle)', borderColor: 'var(--theme-primary-light)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="text-2xl font-semibold text-slate-900">{c.title}</h3>
                      <p className="text-lg text-slate-600 leading-relaxed">{c.summary_question}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-white text-slate-600 border border-slate-200">
                        {c.questions.length} question{c.questions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white" style={{ background: 'var(--theme-primary)' }}>
                        {clusterUpvotes} upvote{clusterUpvotes !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {c.questions.sort((a, b) => b.upvotes - a.upvotes).map((q) => (
                      <PresentQuestionCard key={q.id} question={q} replies={replies} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Unclustered questions — shown individually */}
            {(() => {
              const unclustered = approvedQuestions
                .filter((q) => !q.cluster_id && q.status !== 'answered')
                .sort((a, b) => b.upvotes - a.upvotes)
              if (unclustered.length === 0) return null
              return (
                <>
                  {unclustered.length > 0 && unansweredClusters.length > 0 && (
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-wider pt-2">Recent Questions</p>
                  )}
                  {unclustered.map((q) => (
                    <PresentQuestionCard key={q.id} question={q} replies={replies} />
                  ))}
                </>
              )
            })()}
          </div>
        )}
      </div>
    </main>
  )
}
