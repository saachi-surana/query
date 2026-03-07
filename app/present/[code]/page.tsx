'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Session, Question, Cluster } from '@/lib/supabase'

type ClusterWithQuestions = Cluster & { questions: Question[] }

export default function PresentPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
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
      const [{ data: qs }, { data: cs }] = await Promise.all([
        supabase.from('questions').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
        supabase.from('clusters').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
      ])
      setQuestions(qs || [])
      setClusters(cs || [])
    }
    loadData()

    const channel = supabase
      .channel(`present-${session.id}`)
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

  if (notFound) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-xl">Session not found</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Connection indicator */}
      {!connected && (
        <div className="bg-yellow-600 px-4 py-1 text-xs text-center text-yellow-100">
          Reconnecting...
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Query</h1>
          <span className="text-gray-500">|</span>
          <h2 className="text-lg text-gray-300 truncate">{session.title}</h2>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Questions</span>
            <span className="font-mono font-bold text-blue-400 text-lg">{totalQuestions}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Upvotes</span>
            <span className="font-mono font-bold text-blue-400 text-lg">{totalUpvotes}</span>
          </div>
          <div className="bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="text-gray-400 text-xs">JOIN</span>
            <span className="font-mono text-xl font-bold tracking-widest text-white">{code}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col px-8 py-6">
        {totalQuestions === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-3">
              <p className="text-4xl font-bold text-gray-300">Ask a question!</p>
              <p className="text-xl text-gray-500">Go to the link below and submit your questions</p>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl px-10 py-6 text-center space-y-2">
              <p className="text-gray-500 text-sm uppercase tracking-wider">Join Code</p>
              <p className="font-mono text-5xl font-bold tracking-[0.3em] text-white">{code}</p>
              <p className="text-gray-500 text-sm font-mono">{joinUrl}</p>
            </div>
          </div>
        ) : (
          /* Cluster cards */
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {unansweredClusters.map((c, i) => {
              const clusterUpvotes = c.questions.reduce((s, q) => s + q.upvotes, 0)
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-6 transition-all ${
                    i === 0
                      ? 'bg-blue-950/50 border-blue-800 scale-100'
                      : 'bg-gray-900/50 border-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3">
                        {i === 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                            TOP
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{c.title}</h3>
                      </div>
                      <p className={`font-medium leading-relaxed ${i === 0 ? 'text-xl text-white' : 'text-lg text-gray-300'}`}>
                        {c.summary_question}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-center gap-1 bg-gray-800 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-500">Questions</span>
                      <span className="font-mono font-bold text-lg text-white">{c.questions.length}</span>
                      <span className="text-xs text-gray-500">Upvotes</span>
                      <span className="font-mono font-bold text-lg text-blue-400">{clusterUpvotes}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Unclustered count */}
            {(() => {
              const unclustered = approvedQuestions.filter((q) => !q.cluster_id && q.status !== 'answered')
              if (unclustered.length === 0) return null
              return (
                <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-4 text-center">
                  <p className="text-sm text-gray-500">
                    + {unclustered.length} question{unclustered.length !== 1 ? 's' : ''} being categorized...
                  </p>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Footer with join info */}
      <footer className="border-t border-gray-800 px-8 py-3 flex items-center justify-between text-sm text-gray-500">
        <span>Powered by Query</span>
        <span className="font-mono">{joinUrl}</span>
      </footer>
    </main>
  )
}
