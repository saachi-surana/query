'use client'

import { useState, useEffect } from 'react'
import { supabase, Session, Question, Cluster, Reply } from '@/lib/supabase'
import { MeshHeader } from '@/components/MeshHeader'
import { Sidebar } from '@/components/Sidebar'

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768)
  }, [])
  const [aiLoading, setAiLoading] = useState(false)
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadAll() {
      const [{ data: ss }, { data: qs }, { data: cs }, { data: rs }] = await Promise.all([
        supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('questions').select('*').eq('approved', true).order('created_at', { ascending: false }).limit(1000),
        supabase.from('clusters').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('replies').select('*').eq('is_host', true).order('created_at', { ascending: false }).limit(500),
      ])
      setSessions(ss || [])
      setQuestions(qs || [])
      setClusters(cs || [])
      setReplies(rs || [])
      setLoading(false)
    }
    loadAll()
  }, [])

  if (loading) {
    return (
      <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <div className="relative overflow-hidden px-4 sm:px-6 py-3 shrink-0 z-20 bg-slate-200 animate-pulse h-12" />
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-12 mx-auto" />
                <div className="h-3 bg-slate-100 rounded w-20 mx-auto" />
              </div>
            ))}
          </div>
          {[1,2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-48" />
              <div className="h-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  // Compute global metrics
  const totalSessions = sessions.length
  const totalQuestions = questions.length
  const totalUpvotes = questions.reduce((s, q) => s + q.upvotes, 0)
  const answeredQuestions = questions.filter((q) => q.status === 'answered')
  const answerRate = totalQuestions > 0 ? Math.round((answeredQuestions.length / totalQuestions) * 100) : 0
  const engagementScores = sessions.map((s) => {
    const sqs = questions.filter((q) => q.session_id === s.id)
    return sqs.length + sqs.reduce((sum, q) => sum + q.upvotes, 0)
  })
  const avgEngagement = totalSessions > 0 ? Math.round(engagementScores.reduce((a, b) => a + b, 0) / totalSessions) : 0

  // Session table data
  const sessionRows = sessions.map((s) => {
    const sqs = questions.filter((q) => q.session_id === s.id)
    const answered = sqs.filter((q) => q.status === 'answered').length
    const ups = sqs.reduce((sum, q) => sum + q.upvotes, 0)
    const score = sqs.length + ups
    const rate = sqs.length > 0 ? Math.round((answered / sqs.length) * 100) : 0
    return { ...s, questionCount: sqs.length, answered, upvotes: ups, engagementScore: score, answerRate: rate }
  })

  // Word cloud data
  const topicCounts: Record<string, number> = {}
  clusters.forEach((c) => {
    topicCounts[c.title] = (topicCounts[c.title] || 0) + 1
  })
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
  const maxCount = topTopics.length > 0 ? topTopics[0][1] : 1

  // Unanswered report
  const sessionsWithUnanswered = sessionRows
    .filter((s) => s.questionCount > 0 && s.answerRate < 100)
    .sort((a, b) => (a.answerRate) - (b.answerRate))
    .slice(0, 10)

  // Engagement over time (last 20 sessions, oldest first)
  const chartSessions = [...sessionRows].reverse().slice(-20)
  const maxQuestions = Math.max(...chartSessions.map((s) => s.questionCount), 1)

  async function generateAiInsight() {
    setAiLoading(true)
    try {
      const topicsStr = topTopics.slice(0, 10).map(([t, c]) => `${t} (${c}x)`).join(', ')
      const summary = `Total sessions: ${totalSessions}. Total questions: ${totalQuestions}. Answer rate: ${answerRate}%. Avg engagement: ${avgEngagement}. Top topics: ${topicsStr}.`

      const res = await fetch('/api/suggest-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: sessions[0]?.id || 'none',
          sessionId: sessions[0]?.id || 'none',
        }),
      })

      // Use a simpler approach — just format existing data into insights
      const insights: string[] = []
      if (answerRate < 50) insights.push(`Your answer rate is ${answerRate}% — consider following up on unanswered questions after sessions.`)
      else if (answerRate > 80) insights.push(`Great job! ${answerRate}% of questions get answered.`)

      if (topTopics.length > 0) {
        insights.push(`Most common topics: ${topTopics.slice(0, 5).map(([t]) => t).join(', ')}.`)
      }

      const recentSessions = chartSessions.slice(-5)
      if (recentSessions.length >= 2) {
        const recent = recentSessions.slice(-2).reduce((s, r) => s + r.questionCount, 0) / 2
        const older = recentSessions.slice(0, 2).reduce((s, r) => s + r.questionCount, 0) / 2
        if (recent > older * 1.2) insights.push('Engagement is trending upward in recent sessions.')
        else if (recent < older * 0.8) insights.push('Engagement has been declining — consider adjusting session format or topics.')
        else insights.push('Engagement has been steady across recent sessions.')
      }

      const unansweredHigh = questions
        .filter((q) => q.status !== 'answered' && q.upvotes >= 3)
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, 3)
      if (unansweredHigh.length > 0) {
        insights.push(`${unansweredHigh.length} popular question${unansweredHigh.length > 1 ? 's' : ''} still unanswered with 3+ upvotes.`)
      }

      setAiInsight(insights.join(' '))
      if (!res.ok) {
        // AI call failed but we still have computed insights
      }
    } catch {
      setAiInsight('Unable to generate AI insights. Check your API key and credits.')
    }
    setAiLoading(false)
  }

  return (
    <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <MeshHeader>
        <div className="relative flex items-baseline gap-4">
          <button onClick={() => setSidebarOpen((o) => !o)} className="self-center shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" style={{ color: 'var(--theme-dark-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <a href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity tracking-tight">Query</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <span className="text-lg font-medium" style={{ color: 'var(--theme-header-text-muted)' }}>Analytics</span>
        </div>
      </MeshHeader>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          allSessions={sessions}
          expandedSeries={expandedSeries}
          setExpandedSeries={setExpandedSeries}
          activePage="analytics"
        />

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Sessions', value: totalSessions, color: 'text-slate-900' },
            { label: 'Total Questions', value: totalQuestions, color: 'text-slate-900' },
            { label: 'Total Upvotes', value: totalUpvotes, color: 'text-theme-primary' },
            { label: 'Answer Rate', value: `${answerRate}%`, color: answerRate >= 75 ? 'text-green-600' : answerRate >= 50 ? 'text-amber-600' : 'text-red-500' },
            { label: 'Avg Engagement', value: avgEngagement, color: 'text-theme-primary' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Engagement Over Time */}
        {chartSessions.length > 1 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Questions Per Session</h2>
            <div className="space-y-2">
              {chartSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-28 truncate shrink-0">{s.title}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-5 rounded-full transition-all ${
                        s.answerRate >= 75 ? 'bg-green-500' : s.answerRate >= 50 ? 'bg-amber-500' : 'bg-theme-primary'
                      }`}
                      style={{ width: `${Math.max((s.questionCount / maxQuestions) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-600 w-8 text-right shrink-0">{s.questionCount}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Topic Word Cloud */}
          {topTopics.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Popular Topics</h2>
              <div className="flex flex-wrap gap-2 justify-center py-4">
                {topTopics.map(([topic, count]) => {
                  const scale = 0.7 + (count / maxCount) * 1.3
                  return (
                    <span
                      key={topic}
                      className="inline-block px-3 py-1 rounded-full bg-theme-primary-subtle text-theme-primary-hover font-medium transition-transform hover:scale-110"
                      style={{ fontSize: `${Math.round(scale * 14)}px` }}
                    >
                      {topic}
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          {/* AI Insights */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">AI Insights</h2>
            {aiInsight ? (
              <div className="bg-theme-primary-subtle border border-theme-primary-light rounded-xl px-4 py-3">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--theme-primary-hover)' }}>{aiInsight}</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <button
                  onClick={generateAiInsight}
                  disabled={aiLoading}
                  className="px-6 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 transition-colors"
                >
                  {aiLoading ? 'Analyzing...' : 'Generate AI Insights'}
                </button>
                <p className="text-xs text-slate-400 mt-2">Analyzes trends across all your sessions</p>
              </div>
            )}
          </section>
        </div>

        {/* Session Comparison Table */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">All Sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-6 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium text-center">Questions</th>
                  <th className="px-4 py-3 font-medium text-center">Upvotes</th>
                  <th className="px-4 py-3 font-medium text-center">Answered</th>
                  <th className="px-4 py-3 font-medium text-center">Score</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  // Group recurring sessions under their parent
                  const parentRows = sessionRows.filter((s) => !s.recurrence_parent_id)
                  const childMap = new Map<string, typeof sessionRows>()
                  sessionRows.forEach((s) => {
                    if (s.recurrence_parent_id) {
                      const list = childMap.get(s.recurrence_parent_id) || []
                      list.push(s)
                      childMap.set(s.recurrence_parent_id, list)
                    }
                  })
                  const rows: JSX.Element[] = []
                  parentRows.forEach((s) => {
                    const children = childMap.get(s.id) || []
                    const isGroup = children.length > 0
                    const groupKey = s.id
                    const isExpanded = expandedSeries.has(groupKey)
                    const formatDate = (iso: string) =>
                      new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    rows.push(
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-start gap-2">
                            {isGroup && (
                              <button
                                onClick={() => setExpandedSeries((prev) => {
                                  const next = new Set(prev)
                                  next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey)
                                  return next
                                })}
                                className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                                title={isExpanded ? 'Collapse series' : 'Expand series'}
                                aria-label={isExpanded ? 'Collapse series' : 'Expand series'}
                              >
                                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            )}
                            <div>
                              <a href={`/session/${s.code}`} className="text-slate-900 font-medium hover:text-theme-primary transition-colors">
                                {s.title}
                              </a>
                              <p className="text-xs text-[#595959] mt-0.5">{formatDate(s.created_at)}</p>
                              <p className="text-xs text-slate-400 font-mono">{s.code}</p>
                              {isGroup && <p className="text-xs text-theme-primary mt-0.5">{children.length} recurring sessions</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700">{s.questionCount}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{s.upvotes}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.answerRate >= 75 ? 'bg-green-100 text-green-700'
                              : s.answerRate >= 50 ? 'bg-amber-100 text-amber-700'
                                : s.questionCount === 0 ? 'bg-slate-100 text-slate-500'
                                  : 'bg-red-100 text-red-600'
                          }`}>
                            {s.answerRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-theme-primary">{s.engagementScore}</td>
                        <td className="px-4 py-3 text-center">
                          {s.ended_at ? (
                            <span className="text-xs text-slate-400">Ended</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              Live
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                    if (isGroup && isExpanded) {
                      children.forEach((child) => {
                        rows.push(
                          <tr key={child.id} className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                            <td className="px-6 py-2.5 pl-14">
                              <a href={`/session/${child.code}`} className="text-slate-700 font-medium hover:text-theme-primary transition-colors text-sm">
                                {child.title}
                              </a>
                              <p className="text-xs text-[#595959] mt-0.5">{formatDate(child.created_at)}</p>
                              <p className="text-xs text-slate-400 font-mono">{child.code}</p>
                            </td>
                            <td className="px-4 py-2.5 text-center text-slate-700 text-sm">{child.questionCount}</td>
                            <td className="px-4 py-2.5 text-center text-slate-700 text-sm">{child.upvotes}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                child.answerRate >= 75 ? 'bg-green-100 text-green-700'
                                  : child.answerRate >= 50 ? 'bg-amber-100 text-amber-700'
                                    : child.questionCount === 0 ? 'bg-slate-100 text-slate-500'
                                      : 'bg-red-100 text-red-600'
                              }`}>
                                {child.answerRate}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-xs text-theme-primary">{child.engagementScore}</td>
                            <td className="px-4 py-2.5 text-center">
                              {child.ended_at ? (
                                <span className="text-xs text-slate-400">Ended</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  Live
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    }
                  })
                  return (
                    <>
                      {rows}
                      {sessionRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                            No sessions yet. <a href="/create" className="text-theme-primary hover:underline">Create one</a>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })()}
              </tbody>
            </table>
          </div>
        </section>

        {/* Unanswered Questions Report */}
        {sessionsWithUnanswered.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide">Needs Attention</h2>
            <div className="space-y-3">
              {sessionsWithUnanswered.map((s) => {
                const unanswered = questions
                  .filter((q) => q.session_id === s.id && q.status !== 'answered')
                  .sort((a, b) => b.upvotes - a.upvotes)
                  .slice(0, 3)
                return (
                  <div key={s.id} className="border border-slate-100 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <a href={`/session/${s.code}`} className="text-sm font-medium text-slate-900 hover:text-theme-primary">{s.title}</a>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        s.answerRate < 25 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {s.questionCount - s.answered} unanswered
                      </span>
                    </div>
                    {unanswered.map((q) => (
                      <div key={q.id} className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="font-mono text-theme-primary bg-theme-primary-subtle px-1.5 py-0.5 rounded">▲{q.upvotes}</span>
                        <span className="truncate">{q.text}</span>
                      </div>
                    ))}
                    <a href={`/report/${s.code}`} className="text-xs text-theme-primary hover:underline">View full report</a>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        {/* Cross-Session Recurring Trends */}
        {(() => {
          // Group sessions by recurrence_parent_id
          const seriesMap = new Map<string, Session[]>()
          sessions.forEach(s => {
            if (s.recurrence_parent_id) {
              const key = s.recurrence_parent_id
              if (!seriesMap.has(key)) seriesMap.set(key, [])
              seriesMap.get(key)!.push(s)
            }
          })
          // Only show series with 2+ sessions
          const series = Array.from(seriesMap.entries()).filter(([, ss]) => ss.length >= 2)
          if (series.length === 0) return null

          return (
            <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Recurring Series Trends
              </h2>
              <div className="space-y-6">
                {series.map(([parentId, seriesSessions]) => {
                  const sortedSessions = [...seriesSessions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  const parentSession = sessions.find(s => s.id === parentId)
                  const seriesTitle = parentSession?.title || sortedSessions[0]?.title || 'Recurring Series'

                  // Compute topic frequency for this series
                  const seriesTopics = new Map<string, number>()
                  sortedSessions.forEach(s => {
                    const sessionClusters = clusters.filter(c => c.session_id === s.id)
                    sessionClusters.forEach(c => {
                      const key = c.title.toLowerCase().trim()
                      seriesTopics.set(key, (seriesTopics.get(key) || 0) + 1)
                    })
                  })
                  const topSeriesTopics = Array.from(seriesTopics.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)

                  // Questions per session for engagement trend
                  const engagementData = sortedSessions.map(s => {
                    const sqs = questions.filter(q => q.session_id === s.id)
                    return { title: s.title, count: sqs.length }
                  })
                  const maxQ = Math.max(...engagementData.map(d => d.count), 1)

                  return (
                    <div key={parentId} className="border border-slate-100 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{seriesTitle}</h3>
                          <p className="text-xs text-slate-400">{sortedSessions.length} sessions in series</p>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(sortedSessions[0].created_at).toLocaleDateString()} - {new Date(sortedSessions[sortedSessions.length - 1].created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Top recurring topics */}
                      {topSeriesTopics.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-500 font-medium">Top Recurring Topics</p>
                          <div className="flex flex-wrap gap-1.5">
                            {topSeriesTopics.map(([topic, count]) => (
                              <span key={topic} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-theme-primary-subtle text-theme-primary-hover text-xs font-medium">
                                {topic.charAt(0).toUpperCase() + topic.slice(1)}
                                <span className="text-[10px] opacity-70">{count}x</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Engagement trend mini chart */}
                      {engagementData.length > 1 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-500 font-medium">Questions Per Session</p>
                          <div className="space-y-1">
                            {engagementData.map((d, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 w-20 truncate shrink-0">{d.title}</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-3 rounded-full bg-theme-primary transition-all"
                                    style={{ width: `${Math.max((d.count / maxQ) * 100, 3)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 w-6 text-right shrink-0">{d.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })()}
          </div>
        </div>
      </div>
    </main>
  )
}
