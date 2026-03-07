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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [allSessions, setAllSessions] = useState<Session[]>([])

  useEffect(() => {
    async function load() {
      const [{ data }, { data: ss }] = await Promise.all([
        supabase.from('sessions').select('*').eq('code', code).single(),
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      if (!data) { setNotFound(true); return }
      setSession(data)
      setAllSessions(ss || [])

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
        <p className="text-slate-500">Session not found</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
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

  const liveSessions = allSessions.filter((s) => !s.ended_at && (!s.starts_at || new Date(s.starts_at) <= new Date()))
  const upcomingSessions = allSessions.filter((s) => s.starts_at && new Date(s.starts_at) > new Date() && !s.ended_at)
  const pastSessions = allSessions.filter((s) => s.ended_at).slice(0, 10)

  return (
    <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="relative overflow-hidden px-4 sm:px-6 py-3 shrink-0 z-20">
        <div className="absolute inset-0 bg-theme-mesh-base" />
        <div className="absolute top-[-80%] left-[-10%] w-[40%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-1)' }} />
        <div className="absolute top-[-80%] left-[25%] w-[35%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-2)' }} />
        <div className="absolute top-[-80%] right-[10%] w-[30%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-5)' }} />
        <div className="absolute top-[-80%] right-[-10%] w-[25%] h-[300%] rounded-full blur-[40px]" style={{ background: 'var(--theme-mesh-base)' }} />
        <div className="relative flex items-baseline gap-3">
          <button onClick={() => setSidebarOpen((o) => !o)} className="self-center shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" style={{ color: 'var(--theme-dark-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <a href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity tracking-tight">Query</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <a href="/analytics" className="text-lg font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--theme-header-text-muted)' }}>Analytics</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <span className="text-lg font-medium truncate" style={{ color: 'var(--theme-header-text)' }}>{session.title}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} shrink-0 bg-theme-sidebar-bg border-r border-theme-sidebar-border overflow-y-auto overflow-x-hidden transition-all duration-200`}>
          <div className="p-4 space-y-6 w-64">
            {liveSessions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[0.8125rem] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live ({liveSessions.length})
                </p>
                {liveSessions.map((s) => (
                  <a key={s.id} href={`/session/${s.code}`} className="block px-3 py-2.5 rounded-lg text-[0.9375rem] leading-snug font-medium truncate text-theme-sidebar-text hover:bg-theme-sidebar-hover-bg transition-colors">
                    {s.title}
                    <span className="block text-xs text-slate-500 font-mono mt-0.5">{s.code}</span>
                  </a>
                ))}
              </div>
            )}

            {upcomingSessions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[0.8125rem] font-bold text-theme-primary uppercase tracking-wider">Upcoming</p>
                {upcomingSessions.map((s) => (
                  <a key={s.id} href={`/session/${s.code}`} className="block px-3 py-2.5 rounded-lg text-[0.9375rem] leading-snug font-medium truncate text-theme-sidebar-text hover:bg-theme-sidebar-hover-bg transition-colors">
                    {s.title}
                    <span className="block text-xs text-slate-500 mt-0.5">{new Date(s.starts_at!).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </a>
                ))}
              </div>
            )}

            {pastSessions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[0.8125rem] font-bold text-slate-400 uppercase tracking-wider">Past</p>
                {pastSessions.map((s) => (
                  <a
                    key={s.id}
                    href={`/report/${s.code}`}
                    className={`block px-3 py-2.5 rounded-lg text-[0.9375rem] leading-snug truncate transition-colors ${
                      s.code === code ? 'bg-theme-sidebar-active-bg text-theme-sidebar-active-text font-medium' : 'text-slate-400 hover:bg-theme-sidebar-hover-bg'
                    }`}
                  >
                    {s.title}
                    <span className="block text-xs text-slate-400 font-mono mt-0.5">{s.code}</span>
                  </a>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-theme-sidebar-divider space-y-1">
              <a href="/create" className="block px-3 py-2.5 rounded-lg text-[0.9375rem] text-theme-sidebar-active-text hover:bg-theme-sidebar-hover-bg font-semibold transition-colors">+ New Session</a>
              <a href="/analytics" className="block px-3 py-2.5 rounded-lg text-[0.9375rem] text-theme-sidebar-text hover:bg-theme-sidebar-hover-bg font-medium transition-colors">Analytics</a>
              <div className="px-3 py-2.5 rounded-lg text-[0.9375rem] text-slate-400 cursor-default">Profile (coming soon)</div>
              <div className="px-3 py-2.5 rounded-lg text-[0.9375rem] text-slate-400 cursor-default">Settings (coming soon)</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8">
            {/* Back button + description */}
            <div className="space-y-2">
              <a href="/analytics" className="inline-flex items-center gap-1.5 text-sm text-theme-primary hover:text-theme-primary-hover transition-colors font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Analytics
              </a>
              {session.description && <p className="text-sm text-slate-500">{session.description}</p>}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{questions.length}</p>
                <p className="text-xs text-slate-500">Total Questions</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{answeredQuestions.length}</p>
                <p className="text-xs text-slate-500">Answered</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{unansweredQuestions.length}</p>
                <p className="text-xs text-slate-500">Unanswered</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-theme-primary">{totalUpvotes}</p>
                <p className="text-xs text-slate-500">Total Upvotes</p>
              </div>
            </div>

            {/* Unanswered questions */}
            {unansweredQuestions.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide">
                  Unanswered Questions ({unansweredQuestions.length})
                </h2>

                {unansweredClusters.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{c.title}</h3>
                      <span className="text-xs text-slate-400">{c.questions.length} question{c.questions.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="rounded-lg bg-theme-primary-subtle border border-theme-primary-light px-3 py-2">
                      <p className="text-xs font-semibold text-theme-primary">AI Summary</p>
                      <p className="text-sm text-orange-900">{c.summary_question}</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {c.questions.map((q) => (
                        <div key={q.id} className="py-2 flex items-start gap-3">
                          <span className="shrink-0 font-mono text-xs font-bold text-theme-primary bg-theme-primary-subtle px-2 py-0.5 rounded">
                            ▲ {q.upvotes}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">{q.text}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {unclusteredUnanswered.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">Uncategorized</h3>
                    <div className="divide-y divide-gray-100">
                      {unclusteredUnanswered.map((q) => (
                        <div key={q.id} className="py-2 flex items-start gap-3">
                          <span className="shrink-0 font-mono text-xs font-bold text-theme-primary bg-theme-primary-subtle px-2 py-0.5 rounded">
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
                    <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <h3 className="text-sm font-semibold text-slate-700">{c.title}</h3>
                        <span className="text-xs text-slate-400">{c.questions.length} question{c.questions.length !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm text-gray-600">{c.summary_question}</p>
                      {clusterReplies.length > 0 && (
                        <div className="ml-4 pl-3 border-l-2 border-green-200 space-y-1">
                          {clusterReplies.map((r) => (
                            <p key={r.id} className="text-sm text-slate-700">{r.text}</p>
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
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  FAQ Library ({faqs.length})
                </h2>
                {faqs.map((f) => (
                  <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">{f.cluster_title}</h3>
                    <p className="text-sm font-medium text-slate-700">{f.summary_question}</p>
                    <p className="text-sm text-gray-600 bg-slate-50 rounded-lg px-3 py-2">{f.answer}</p>
                  </div>
                ))}
              </section>
            )}

            {/* No unanswered */}
            {unansweredQuestions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg font-medium">All questions have been answered!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
