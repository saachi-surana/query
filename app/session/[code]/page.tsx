'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Session, Question, Cluster, Reply, ClusterWithQuestions } from '@/lib/supabase'
import { ChevronIcon } from '@/components/ChevronIcon'
import { Spinner } from '@/components/Spinner'
import { QuestionRow } from '@/components/QuestionRow'
import { ClusterCard } from '@/components/ClusterCard'
import { MeshHeader } from '@/components/MeshHeader'
import { Sidebar } from '@/components/Sidebar'

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
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const [clustersOpen, setClustersOpen] = useState(true)
  const [unclusteredOpen, setUnclusteredOpen] = useState(true)
  const [answeredOpen, setAnsweredOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [reclustering, setReclustering] = useState(false)

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768)
  }, [])
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
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
            // Trigger clustering for approved questions without a cluster
            if (newQ.approved && !newQ.cluster_id) {
              fetch('/api/cluster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId: newQ.id, sessionId: session.id }),
              }).catch(() => {/* silent */})
            }
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

  async function reclusterSession() {
    if (!session || reclustering) return
    setReclustering(true)
    try {
      const res = await fetch('/api/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, mode: 'batch' }),
      })
      if (res.ok) {
        // Reload clusters and questions to reflect changes
        const [{ data: qs }, { data: cs }] = await Promise.all([
          supabase.from('questions').select('*').eq('session_id', session.id).order('created_at', { ascending: true }),
          supabase.from('clusters').select('*').eq('session_id', session.id).order('created_at', { ascending: true }),
        ])
        if (qs) setQuestions(qs)
        if (cs) setClusters(cs)
      }
    } catch {
      // Silent fail
    } finally {
      setReclustering(false)
    }
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
      setCopyToast(attendeeUrl)
      setTimeout(() => { setCopied(false); setCopyToast(null) }, 3000)
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
        <h1 className="text-2xl font-semibold text-slate-900">Session Not Found</h1>
        <p className="text-slate-500">No session with code &ldquo;{code}&rdquo;.</p>
        <button onClick={() => router.push('/')} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
          Go Home
        </button>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
        <div className="relative overflow-hidden px-4 sm:px-6 py-3 shrink-0 z-20 bg-slate-200 animate-pulse h-12" />
        <div className="flex-1 p-6 space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="h-screen flex flex-col bg-slate-50 overflow-hidden">
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
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 text-sm text-slate-700 text-center">
          This session has ended. You can still reply to questions and export data.
        </div>
      )}

      {/* Header */}
      <MeshHeader className="sticky top-0">
        <div className="relative flex items-baseline gap-4">
          <button onClick={() => setSidebarOpen((o) => !o)} className="self-center shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-theme-primary-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <a href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity shrink-0 tracking-tight">Query</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-medium truncate" style={{ color: 'var(--theme-header-text-muted)' }}>{session.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Code badge + copy icon */}
            <button
              onClick={copyLink}
              title="Copy join link"
              className="hidden sm:flex items-center gap-1.5 font-mono text-sm font-semibold px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--theme-header-badge-text)', background: 'var(--theme-header-badge-bg)' }}
            >
              {code}
              {copied ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </button>
            {/* Present mode */}
            <a
              href={`/present/${code}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--theme-header-btn-text)', border: '1px solid var(--theme-header-btn-border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-header-btn-hover-bg)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Present
            </a>
            {session.ended_at ? (
              <button
                onClick={reopenSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-500/20 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
              >
                Reopen
              </button>
            ) : (
              <button
                onClick={endSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/80 text-sm font-medium text-white hover:bg-rose-600 transition-colors"
              >
                End Session
              </button>
            )}
          </div>
        </div>
      </MeshHeader>

      {/* Mobile action bar — shows code + present on small screens */}
      <div className="flex sm:hidden items-center justify-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
        <button
          onClick={copyLink}
          className="flex-1 inline-flex items-center justify-center gap-2 font-mono text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          style={{ color: 'var(--theme-primary)', background: 'var(--theme-primary-subtle)', border: '1px solid var(--theme-primary-light)' }}
        >
          {code}
          {copied ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          )}
        </button>
        <a
          href={`/present/${code}`}
          target="_blank"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-theme-primary text-white hover:bg-theme-primary-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          Present
        </a>
      </div>

      {/* Copy toast */}
      {copyToast && (
        <div className="fixed sm:absolute sm:top-14 sm:right-4 bottom-6 sm:bottom-auto left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 z-30 animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm max-w-[90vw]">
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            <span className="truncate font-mono text-xs">{copyToast}</span>
            <button onClick={() => setCopyToast(null)} className="shrink-0 ml-1 text-white/50 hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          allSessions={allSessions}
          currentCode={code}
          expandedSeries={expandedSeries}
          setExpandedSeries={setExpandedSeries}
          activePage="session"
        />

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
                    <p className="text-sm text-slate-800">{q.text}</p>
                    <p className="text-xs text-slate-400">
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
                      className="px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200 hover:bg-red-100 transition-colors"
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
              <p className="text-3xl font-semibold text-slate-900">Your session is live</p>
              <p className="text-slate-500">Share the code below so attendees can start asking questions.</p>
            </div>

            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Join Code</p>
              <p className="font-mono text-4xl font-bold tracking-[0.3em] text-slate-900">{code}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={copyCode}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-theme-primary-light hover:text-theme-primary hover:bg-theme-primary-subtle transition-colors"
                >
                  {codeCopied ? '✓ Copied!' : 'Copy code'}
                </button>
                <button
                  onClick={copyLink}
                  className="px-4 py-2 rounded-lg bg-theme-primary text-sm font-medium text-white hover:bg-theme-primary-hover transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy join link'}
                </button>
              </div>
              <p className="text-xs text-slate-400 font-mono">{attendeeUrl}</p>
            </div>

            <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-2">
                <div className="text-2xl">1</div>
                <p className="text-sm font-medium text-slate-700">Share the code</p>
                <p className="text-xs text-slate-400">Attendees join at {typeof window !== 'undefined' ? window.location.origin : ''} with this code</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-2">
                <div className="text-2xl">2</div>
                <p className="text-sm font-medium text-slate-700">Questions cluster</p>
                <p className="text-xs text-slate-400">AI automatically groups similar questions into topics</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-2">
                <div className="text-2xl">3</div>
                <p className="text-sm font-medium text-slate-700">Answer & reply</p>
                <p className="text-xs text-slate-400">Mark clusters as answered or reply directly to questions</p>
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
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
                Unanswered Clusters
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-theme-primary-light text-theme-primary-hover">
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUnclusteredOpen((o) => !o)}
                className="flex items-center gap-2 group"
              >
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
                  Unclustered Questions
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                  {unclusteredQuestions.length}
                </span>
                <ChevronIcon open={unclusteredOpen} />
              </button>
              <button
                onClick={reclusterSession}
                disabled={reclustering}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-theme-primary text-white hover:bg-theme-primary-hover disabled:opacity-50 transition-colors"
                title="Use AI to cluster all unclustered questions"
              >
                {reclustering ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Clustering...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-cluster
                  </>
                )}
              </button>
            </div>
            {unclusteredOpen && (
              <div className="space-y-3">
                {unclusteredQuestions.map((q) => (
                  <QuestionRow key={q.id} question={q} replies={replies.filter((r) => r.question_id === q.id)} sessionId={session.id} onMarkAnswered={markQuestionAnswered} onMarkUnanswered={markQuestionUnanswered} onReply={handleHostReply} />
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
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
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
                      onClick={() => setAnsweredSubtab(answeredSubtab === 'misc' ? '' : 'misc')}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        answeredSubtab === 'misc'
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Misc ({answeredUnclusteredQuestions.length + answeredOrphanQuestions.length})
                      <ChevronIcon open={answeredSubtab === 'misc'} />
                    </button>
                  )}
                  {answeredClusters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setAnsweredSubtab(answeredSubtab === c.id ? '' : c.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        answeredSubtab === c.id
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {c.title} ({c.questions.length})
                      <ChevronIcon open={answeredSubtab === c.id} />
                    </button>
                  ))}
                </div>

                {/* Subtab content: Misc */}
                {answeredSubtab === 'misc' && (answeredUnclusteredQuestions.length > 0 || answeredOrphanQuestions.length > 0) && (
                  <div className="space-y-3">
                    {[...answeredUnclusteredQuestions, ...answeredOrphanQuestions].map((q) => (
                      <QuestionRow
                        key={q.id}
                        question={q}
                        replies={replies.filter((r) => r.question_id === q.id)}
                        sessionId={session.id}
                        onMarkAnswered={markQuestionAnswered}
                        onMarkUnanswered={markQuestionUnanswered}
                        onReply={handleHostReply}
                      />
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
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
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
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
                  {/* Row 1: Key metrics */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { label: 'Questions', value: totalQuestions, color: 'text-slate-900' },
                      { label: 'Upvotes', value: totalUps, color: 'text-theme-primary' },
                      { label: 'Answered', value: `${pctAnswered}%`, color: pctAnswered >= 75 ? 'text-green-600' : pctAnswered >= 50 ? 'text-amber-600' : 'text-rose-500' },
                      { label: 'Topics', value: unansweredClusters.length + answeredClusters.length, color: 'text-slate-900' },
                      { label: 'Replies', value: hostReplyCount, color: 'text-slate-900' },
                      { label: 'Engagement', value: engScore, color: 'text-theme-primary' },
                    ].map((m) => (
                      <div key={m.label} className="text-center space-y-0.5">
                        <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Answer progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{answeredCount} answered</span>
                      <span>{totalQuestions - answeredCount} remaining</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${pctAnswered}%` }}
                      />
                    </div>
                  </div>

                  {/* Response time */}
                  {avgResponseMin !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">Avg response time:</span>
                      <span className="font-medium text-slate-900">
                        {avgResponseMin < 1 ? '<1 min' : avgResponseMin < 60 ? `${avgResponseMin} min` : `${Math.round(avgResponseMin / 60)}h ${avgResponseMin % 60}m`}
                      </span>
                    </div>
                  )}

                  {/* Engagement gaps */}
                  {gaps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Engagement Gaps</p>
                      <p className="text-xs text-slate-500">Popular topics with no host response yet:</p>
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
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Most Upvoted</p>
                      {[...approvedQuestions].sort((a, b) => b.upvotes - a.upvotes).slice(0, 3).map((q) => (
                        <div key={q.id} className="flex items-center gap-3 text-sm">
                          <span className="shrink-0 font-mono text-xs font-bold text-theme-primary bg-theme-primary-subtle px-2 py-0.5 rounded">
                            ▲ {q.upvotes}
                          </span>
                          <p className="text-slate-700 truncate">{q.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <a href="/analytics" className="block text-center text-xs text-theme-primary hover:underline pt-1">
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
          <div className="absolute bottom-14 right-0 w-80 bg-white rounded-xl border border-slate-200 shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Session Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
            </div>

            {/* Moderation toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-700">Moderation</p>
                <p className="text-xs text-slate-400">Approve questions before they appear</p>
              </div>
              <button
                onClick={toggleModeration}
                className={`relative w-10 h-6 rounded-full transition-colors ${session.moderation_enabled ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${session.moderation_enabled ? 'translate-x-4' : ''}`} />
              </button>
            </label>

            {/* AI Suggest toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-700">AI Auto-Suggest</p>
                <p className="text-xs text-slate-400">Draft answers for new questions</p>
              </div>
              <button
                onClick={toggleAutoSuggest}
                className={`relative w-10 h-6 rounded-full transition-colors ${session.auto_suggest ? 'bg-theme-primary-subtle0' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${session.auto_suggest ? 'translate-x-4' : ''}`} />
              </button>
            </label>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <button
                onClick={() => { exportCSV(); setSettingsOpen(false) }}
                disabled={questions.length === 0}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Export CSV
              </button>
              <a
                href={`/report/${code}`}
                target="_blank"
                className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              >
                View Report
              </a>
            </div>
          </div>
        )}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors ${
            settingsOpen ? 'text-white' : 'bg-theme-primary text-white hover:bg-theme-primary-hover'
          }`}
          style={settingsOpen ? { background: 'var(--theme-mesh-base)' } : undefined}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </main>
  )
}
