'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Session, Cluster, Question, Reply } from '@/lib/supabase'

type ClusterWithQuestions = Cluster & { questions: Question[] }

export default function SessionReportPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [notFound, setNotFound] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState<string | null>(null)
  const [followUpText, setFollowUpText] = useState('')
  const [sendingFollowUp, setSendingFollowUp] = useState(false)
  const [sentFollowUps, setSentFollowUps] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single()
      if (!sessionData) { setNotFound(true); return }
      setSession(sessionData)

      const [{ data: qs }, { data: cs }, { data: rs }] = await Promise.all([
        supabase.from('questions').select('*').eq('session_id', sessionData.id).order('upvotes', { ascending: false }),
        supabase.from('clusters').select('*').eq('session_id', sessionData.id).order('created_at', { ascending: true }),
        supabase.from('replies').select('*').eq('session_id', sessionData.id).order('created_at', { ascending: true }),
      ])
      setQuestions(qs || [])
      setClusters(cs || [])
      setReplies(rs || [])
    }
    load()
  }, [code])

  async function sendFollowUp(clusterId: string) {
    if (!session || !followUpText.trim()) return
    setSendingFollowUp(true)
    const clusterQuestions = questions.filter((q) => q.cluster_id === clusterId && q.approved)
    await Promise.all(
      clusterQuestions.map((q) =>
        supabase.from('replies').insert({
          question_id: q.id,
          session_id: session.id,
          text: followUpText.trim(),
          author_name: null,
          is_host: true,
        })
      )
    )
    setSentFollowUps((prev) => new Set(Array.from(prev).concat(clusterId)))
    setFollowUpText('')
    setFollowUpOpen(null)
    setSendingFollowUp(false)
  }

  if (notFound) {
    return (
      <main className="h-screen flex flex-col items-center justify-center px-4 text-center space-y-4 bg-slate-50">
        <h1 className="text-2xl font-semibold text-slate-900">Session Not Found</h1>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium"
        >
          Go Home
        </button>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 animate-pulse">Loading report…</div>
      </main>
    )
  }

  const approvedQuestions = questions.filter((q) => q.approved)

  const answeredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'answered')
    .map((c) => ({ ...c, questions: approvedQuestions.filter((q) => q.cluster_id === c.id) }))
    .filter((c) => c.questions.length > 0)
    .sort((a, b) => b.questions.reduce((s, q) => s + q.upvotes, 0) - a.questions.reduce((s, q) => s + q.upvotes, 0))

  const unansweredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'unanswered')
    .map((c) => ({ ...c, questions: approvedQuestions.filter((q) => q.cluster_id === c.id) }))
    .filter((c) => c.questions.length > 0)
    .sort((a, b) => b.questions.reduce((s, q) => s + q.upvotes, 0) - a.questions.reduce((s, q) => s + q.upvotes, 0))

  const unansweredUnclustered = approvedQuestions.filter(
    (q) => !q.cluster_id && q.status !== 'answered'
  )

  const totalClusters = answeredClusters.length + unansweredClusters.length
  const totalUnansweredQuestions =
    unansweredClusters.reduce((n, c) => n + c.questions.length, 0) +
    unansweredUnclustered.length

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <button
                onClick={() => router.push(`/session/${code}`)}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1 mb-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to dashboard
              </button>
              <h1 className="text-xl font-semibold text-slate-900">{session.title}</h1>
              <p className="text-sm text-slate-400 mt-0.5">Session Report · {code}</p>
            </div>
            <div
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                session.ended_at
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              {session.ended_at
                ? 'Ended ' + new Date(session.ended_at).toLocaleDateString()
                : 'Active session'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Summary card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900 text-lg">Summary</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-3xl font-bold text-green-600">{answeredClusters.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Answered</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-rose-500">{unansweredClusters.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Unanswered</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900">{approvedQuestions.length}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Qs</p>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-center">
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-green-600">{answeredClusters.length} of {totalClusters} clusters answered</span>
              {totalUnansweredQuestions > 0 && (
                <span className="text-slate-400">
                  {' '}· {totalUnansweredQuestions} question{totalUnansweredQuestions !== 1 ? 's' : ''} never addressed
                </span>
              )}
            </p>
          </div>
          {totalClusters > 0 && (
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${totalClusters > 0 ? Math.round((answeredClusters.length / totalClusters) * 100) : 0}%` }}
              />
            </div>
          )}
        </div>

        {/* Unanswered clusters — flagged in red */}
        {(unansweredClusters.length > 0 || unansweredUnclustered.length > 0) && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-rose-600 uppercase tracking-wide">
                Unanswered Topics
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                {unansweredClusters.length + (unansweredUnclustered.length > 0 ? 1 : 0)}
              </span>
            </div>

            <div className="space-y-3">
              {unansweredClusters.map((c) => {
                const isSent = sentFollowUps.has(c.id)
                return (
                  <div
                    key={c.id}
                    className={`bg-white rounded-2xl border p-5 space-y-4 transition-colors ${
                      isSent ? 'border-green-200' : 'border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Follow-up sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Not answered
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {c.questions.reduce((s, q) => s + q.upvotes, 0)} upvotes · {c.questions.length} question{c.questions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900">{c.title}</h3>
                        <p className="text-sm text-slate-500 italic">{c.summary_question}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {c.questions.slice(0, 4).map((q) => (
                        <div key={q.id} className="flex items-start gap-2">
                          <span className="shrink-0 text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                            ▲{q.upvotes}
                          </span>
                          <p className="text-sm text-slate-700">{q.text}</p>
                        </div>
                      ))}
                      {c.questions.length > 4 && (
                        <p className="text-xs text-slate-400 pl-7">
                          +{c.questions.length - 4} more question{c.questions.length - 4 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {followUpOpen === c.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={followUpText}
                          onChange={(e) => setFollowUpText(e.target.value)}
                          placeholder="Type your follow-up answer for this topic..."
                          rows={3}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => sendFollowUp(c.id)}
                            disabled={sendingFollowUp || !followUpText.trim()}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {sendingFollowUp ? 'Sending…' : 'Send follow-up'}
                          </button>
                          <button
                            onClick={() => { setFollowUpOpen(null); setFollowUpText('') }}
                            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      !isSent && (
                        <button
                          onClick={() => { setFollowUpOpen(c.id); setFollowUpText('') }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Send follow-up
                        </button>
                      )
                    )}
                  </div>
                )
              })}

              {/* Unclustered unanswered questions */}
              {unansweredUnclustered.length > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-600">
                      Not answered
                    </span>
                    <h3 className="font-semibold text-slate-900">Unclustered Questions</h3>
                    <span className="text-xs text-slate-400">{unansweredUnclustered.length} question{unansweredUnclustered.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2">
                    {unansweredUnclustered.map((q) => (
                      <div key={q.id} className="flex items-start gap-2">
                        <span className="shrink-0 text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                          ▲{q.upvotes}
                        </span>
                        <p className="text-sm text-slate-700">{q.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Answered clusters — shown in green */}
        {answeredClusters.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wide">
                Answered Topics
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {answeredClusters.length}
              </span>
            </div>
            <div className="space-y-3">
              {answeredClusters.map((c) => {
                const hostReplies = replies.filter(
                  (r) => r.is_host && c.questions.some((q) => q.id === r.question_id)
                )
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-green-200 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Answered
                          </span>
                          <span className="text-xs text-slate-400">
                            {c.questions.reduce((s, q) => s + q.upvotes, 0)} upvotes · {c.questions.length} question{c.questions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900">{c.title}</h3>
                        <p className="text-sm text-slate-500 italic">{c.summary_question}</p>
                      </div>
                    </div>
                    {hostReplies.length > 0 && (
                      <div className="bg-green-50 rounded-xl p-3 space-y-1 border border-green-100">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Host response</p>
                        {hostReplies.map((r) => (
                          <p key={r.id} className="text-sm text-slate-700">{r.text}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {answeredClusters.length === 0 && unansweredClusters.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No clusters yet</p>
            <p className="text-sm mt-1">Questions will be grouped into topics as they come in</p>
          </div>
        )}
      </div>
    </main>
  )
}
