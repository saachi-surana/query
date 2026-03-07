'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase, Session, Question, Cluster, Reply, FaqEntry } from '@/lib/supabase'

type ClusterWithQuestions = Cluster & { questions: Question[] }

export default function ReportPage() {
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [faqs, setFaqs] = useState<FaqEntry[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sessions').select('*').eq('code', code).single()
      if (!data) { setNotFound(true); return }
      setSession(data)

      const [{ data: qs }, { data: cs }, { data: rs }, { data: fs }] = await Promise.all([
        supabase.from('questions').select('*').eq('session_id', data.id).eq('approved', true).order('upvotes', { ascending: false }),
        supabase.from('clusters').select('*').eq('session_id', data.id).order('created_at', { ascending: true }),
        supabase.from('replies').select('*').eq('session_id', data.id).order('created_at', { ascending: true }),
        supabase.from('faq_entries').select('*').eq('session_id', data.id).order('created_at', { ascending: true }),
      ])
      setQuestions(qs || [])
      setClusters(cs || [])
      setReplies(rs || [])
      setFaqs(fs || [])
    }
    load()
  }, [code])

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Session not found</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </main>
    )
  }

  const answeredQuestions = questions.filter((q) => q.status === 'answered')
  const unansweredQuestions = questions.filter((q) => q.status !== 'answered')
  const totalUpvotes = questions.reduce((s, q) => s + q.upvotes, 0)

  const unansweredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'unanswered')
    .map((c) => ({ ...c, questions: unansweredQuestions.filter((q) => q.cluster_id === c.id) }))
    .filter((c) => c.questions.length > 0)
    .sort((a, b) => b.questions.reduce((s, q) => s + q.upvotes, 0) - a.questions.reduce((s, q) => s + q.upvotes, 0))

  const answeredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'answered')
    .map((c) => ({ ...c, questions: answeredQuestions.filter((q) => q.cluster_id === c.id) }))
    .filter((c) => c.questions.length > 0)

  const unclusteredUnanswered = unansweredQuestions.filter((q) => !q.cluster_id)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <a href="/" className="text-xl font-bold text-gray-900 hover:opacity-80 transition-opacity">Query</a>
          <h1 className="text-lg font-semibold text-gray-900 mt-1">{session.title} — Session Report</h1>
          {session.description && <p className="text-sm text-gray-500 mt-0.5">{session.description}</p>}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
            <p className="text-xs text-gray-500">Total Questions</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{answeredQuestions.length}</p>
            <p className="text-xs text-gray-500">Answered</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{unansweredQuestions.length}</p>
            <p className="text-xs text-gray-500">Unanswered</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalUpvotes}</p>
            <p className="text-xs text-gray-500">Total Upvotes</p>
          </div>
        </div>

        {/* Unanswered questions */}
        {unansweredQuestions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide">
              Unanswered Questions ({unansweredQuestions.length})
            </h2>

            {unansweredClusters.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
                  <span className="text-xs text-gray-400">{c.questions.length} question{c.questions.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                  <p className="text-xs font-semibold text-blue-600">AI Summary</p>
                  <p className="text-sm text-blue-900">{c.summary_question}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {c.questions.map((q) => (
                    <div key={q.id} className="py-2 flex items-start gap-3">
                      <span className="shrink-0 font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        ▲ {q.upvotes}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{q.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {unclusteredUnanswered.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">Uncategorized</h3>
                <div className="divide-y divide-gray-100">
                  {unclusteredUnanswered.map((q) => (
                    <div key={q.id} className="py-2 flex items-start gap-3">
                      <span className="shrink-0 font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        ▲ {q.upvotes}
                      </span>
                      <p className="text-sm text-gray-800">{q.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Answered clusters summary */}
        {answeredClusters.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
              Answered Topics ({answeredClusters.length})
            </h2>
            {answeredClusters.map((c) => {
              const clusterReplies = replies.filter((r) => r.is_host && c.questions.some((q) => q.id === r.question_id))
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <h3 className="text-sm font-semibold text-gray-700">{c.title}</h3>
                    <span className="text-xs text-gray-400">{c.questions.length} question{c.questions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.summary_question}</p>
                  {clusterReplies.length > 0 && (
                    <div className="ml-4 pl-3 border-l-2 border-green-200 space-y-1">
                      {clusterReplies.map((r) => (
                        <p key={r.id} className="text-sm text-gray-700">{r.text}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {/* FAQ Library */}
        {faqs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              FAQ Library ({faqs.length})
            </h2>
            {faqs.map((f) => (
              <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">{f.cluster_title}</h3>
                <p className="text-sm font-medium text-gray-700">{f.summary_question}</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{f.answer}</p>
              </div>
            ))}
          </section>
        )}

        {/* No unanswered */}
        {unansweredQuestions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">All questions have been answered!</p>
          </div>
        )}
      </div>
    </main>
  )
}
