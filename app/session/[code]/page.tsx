'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Session, Question, Cluster, Reply, ClusterWithQuestions, Poll, WordCloud, WordCloudEntry, SessionContext } from '@/lib/supabase'
import { ChevronIcon } from '@/components/ChevronIcon'
import { Spinner } from '@/components/Spinner'
import { QuestionRow } from '@/components/QuestionRow'
import { ClusterCard } from '@/components/ClusterCard'
import { MeshHeader } from '@/components/MeshHeader'
import { Sidebar } from '@/components/Sidebar'
import { PollCreate } from '@/components/PollCreate'
import { PollResults } from '@/components/PollResults'
import { WordCloudCreate } from '@/components/WordCloudCreate'
import { WordCloudDisplay } from '@/components/WordCloudDisplay'
import { BrandOverride } from '@/components/BrandOverride'
import { ReactionOverlay } from '@/components/ReactionOverlay'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { usePresence } from '@/lib/use-presence'
import { useReactions } from '@/lib/use-reactions'

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
  const [polls, setPolls] = useState<Poll[]>([])
  const [pollsOpen, setPollsOpen] = useState(true)
  const [activeWordCloud, setActiveWordCloud] = useState<WordCloud | null>(null)
  const [wordCloudEntries, setWordCloudEntries] = useState<WordCloudEntry[]>([])
  const [wordCloudOpen, setWordCloudOpen] = useState(true)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [embedModalOpen, setEmbedModalOpen] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)
  const qrCanvasRef = useRef<HTMLDivElement>(null)
  const participantCount = usePresence(session?.id ?? null, 'host')
  const { reactions } = useReactions(session?.id ?? null)

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768)
  }, [])
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const [moderationBannerDismissed, setModerationBannerDismissed] = useState(false)
  const [answeredSubtab, setAnsweredSubtab] = useState<string>('misc')
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)

  // Session context state
  const [contextEntries, setContextEntries] = useState<SessionContext[]>([])
  const [contextUploading, setContextUploading] = useState(false)
  const [contextUrl, setContextUrl] = useState('')

  // Cross-session recurring insights state
  const [recurringInsights, setRecurringInsights] = useState<{
    recurringTopics: Array<{ topic: string; sessionCount: number; totalQuestions: number; trend: 'rising' | 'falling' | 'stable' | 'new'; sessions: string[] }>
    newTopics: string[]
    consistentTopics: string[]
    totalSessions: number
    averageQuestionsPerSession: number
  } | null>(null)
  const [aiInsightsText, setAiInsightsText] = useState<string | null>(null)
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)

  const attendeeUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`

  const embedUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/embed/${code}`
      : `/embed/${code}`

  const embedSnippet = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`

  function copyEmbed() {
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setEmbedCopied(true)
      setTimeout(() => setEmbedCopied(false), 2000)
    })
  }

  // Load session
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sessions').select('*').eq('code', code).single()
      if (!data) { setNotFound(true); return }
      setSession(data)
    }
    load()
  }, [code])

  // Load recurring insights if session is part of a recurring series
  useEffect(() => {
    if (!session?.recurrence_parent_id) return
    async function loadInsights() {
      try {
        const res = await fetch('/api/cross-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session!.id, action: 'insights' }),
        })
        const data = await res.json()
        if (data.success && data.insights) {
          setRecurringInsights(data.insights)
        }
      } catch {
        // Cross-session insights are non-critical
      }
    }
    loadInsights()
  }, [session?.id, session?.recurrence_parent_id])

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

  // Load session context entries
  useEffect(() => {
    if (!session) return
    async function loadContext() {
      try {
        const { data } = await supabase
          .from('session_context')
          .select('*')
          .eq('session_id', session!.id)
          .order('created_at', { ascending: true })
        setContextEntries(data || [])
      } catch {
        // Table may not exist yet
      }
    }
    loadContext()
  }, [session])

  // Load questions and clusters
  useEffect(() => {
    if (!session) return

    async function loadData() {
      const [{ data: qs }, { data: cs }, { data: rs }, { data: ps }] = await Promise.all([
        supabase.from('questions').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
        supabase.from('clusters').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
        supabase.from('replies').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
        supabase.from('polls').select('*').eq('session_id', session!.id).order('created_at', { ascending: false }),
      ])
      setQuestions(qs || [])
      setClusters(cs || [])
      setReplies(rs || [])
      setPolls(ps || [])

      // Load active word cloud
      const { data: wcs } = await supabase
        .from('word_clouds')
        .select('*')
        .eq('session_id', session!.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (wcs) {
        setActiveWordCloud(wcs)
        const { data: entries } = await supabase
          .from('word_cloud_entries')
          .select('*')
          .eq('word_cloud_id', wcs.id)
          .order('created_at', { ascending: true })
        setWordCloudEntries(entries || [])
      } else {
        setActiveWordCloud(null)
        setWordCloudEntries([])
      }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPolls((prev) => {
              // Guard against duplicates (React 18 strict mode fires effects twice in dev)
              if (prev.some((p) => p.id === (payload.new as Poll).id)) return prev
              return [payload.new as Poll, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setPolls((prev) =>
              prev.map((p) => (p.id === (payload.new as Poll).id ? (payload.new as Poll) : p))
            )
          } else if (payload.eventType === 'DELETE') {
            setPolls((prev) => prev.filter((p) => p.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [session])

  // Real-time subscription for word cloud entries
  useEffect(() => {
    if (!activeWordCloud) return

    const wcChannel = supabase
      .channel(`wc-entries-${activeWordCloud.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'word_cloud_entries', filter: `word_cloud_id=eq.${activeWordCloud.id}` },
        (payload) => {
          setWordCloudEntries((prev) => [...prev, payload.new as WordCloudEntry])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(wcChannel) }
  }, [activeWordCloud?.id])

  async function loadActiveWordCloud() {
    if (!session) return
    const { data: wcs } = await supabase
      .from('word_clouds')
      .select('*')
      .eq('session_id', session.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (wcs) {
      setActiveWordCloud(wcs)
      const { data: entries } = await supabase
        .from('word_cloud_entries')
        .select('*')
        .eq('word_cloud_id', wcs.id)
        .order('created_at', { ascending: true })
      setWordCloudEntries(entries || [])
    } else {
      setActiveWordCloud(null)
      setWordCloudEntries([])
    }
  }

  async function closeWordCloud() {
    if (!activeWordCloud) return
    await supabase.from('word_clouds').update({ is_active: false }).eq('id', activeWordCloud.id)
    setActiveWordCloud(null)
    setWordCloudEntries([])
  }

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

  async function handleContextFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return
    setContextUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse-document', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) { alert(result.error || 'Failed to parse document'); return }
      const { error } = await supabase.from('session_context').insert({
        session_id: session.id, content_type: 'document' as const,
        content_text: result.text, file_name: result.fileName, source_url: null,
      })
      if (error) { alert('Failed to save context. Make sure the session_context table exists.'); return }
      const { data } = await supabase.from('session_context').select('*').eq('session_id', session.id).order('created_at', { ascending: true })
      setContextEntries(data || [])
    } catch { alert('Failed to upload document.') } finally { setContextUploading(false); e.target.value = '' }
  }

  async function handleAddContextUrl() {
    if (!contextUrl.trim() || !session) return
    setContextUploading(true)
    try {
      const { error } = await supabase.from('session_context').insert({
        session_id: session.id, content_type: 'url' as const,
        content_text: contextUrl.trim(), source_url: contextUrl.trim(), file_name: null,
      })
      if (error) { alert('Failed to save URL. Make sure the session_context table exists.'); return }
      setContextUrl('')
      const { data } = await supabase.from('session_context').select('*').eq('session_id', session.id).order('created_at', { ascending: true })
      setContextEntries(data || [])
    } catch { /* ignore */ } finally { setContextUploading(false) }
  }

  async function deleteContextEntry(entryId: string) {
    if (!session) return
    await supabase.from('session_context').delete().eq('id', entryId)
    setContextEntries(prev => prev.filter(e => e.id !== entryId))
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

  async function archiveQuestion(questionId: string, archived: boolean) {
    await supabase.from('questions').update({ archived }).eq('id', questionId)
  }

  async function bulkArchiveCluster(clusterId: string) {
    await supabase.from('questions').update({ archived: true }).eq('cluster_id', clusterId)
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

  async function togglePollActive(pollId: string, currentlyActive: boolean) {
    await supabase.from('polls').update({ is_active: !currentlyActive }).eq('id', pollId)
    setPolls((prev) =>
      prev.map((p) => (p.id === pollId ? { ...p, is_active: !currentlyActive } : p))
    )
  }

  async function loadPolls() {
    if (!session) return
    const { data } = await supabase.from('polls').select('*').eq('session_id', session.id).order('created_at', { ascending: false })
    setPolls(data || [])
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

  async function confirmEndSession() {
    if (!session) return
    const now = new Date().toISOString()
    await supabase.from('sessions').update({ ended_at: now }).eq('id', session.id)
    setSession({ ...session, ended_at: now })
    setEndModalOpen(false)
    router.push(`/session/${code}/report`)
  }

  async function loadDemoQuestions() {
    if (!session || loadingDemo) return
    setLoadingDemo(true)
    const DEMO_QUESTIONS = [
      'What does the interview process look like?',
      'How many rounds are in the interview process?',
      'What is the base salary for new grad engineers?',
      'Are there stock options or equity for new employees?',
      'How is the work-life balance at the company?',
      'Is remote work available for engineering roles?',
      'What is the culture like on the engineering team?',
      'Is there mentorship available for new employees?',
      'What does a typical day look like for engineers?',
      'Are there return offer opportunities for interns?',
      'How does the performance review process work?',
      'What are the biggest challenges facing the team right now?',
      'How much ownership do junior engineers get on projects?',
      'What tech stack does your team use?',
      'How quickly can new grads get promoted to senior roles?',
    ]
    await supabase.from('questions').insert(
      DEMO_QUESTIONS.map((text) => ({
        session_id: session!.id,
        text,
        author_name: null,
        is_anonymous: true,
        approved: !session!.moderation_enabled,
      }))
    )
    fetch('/api/cluster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session!.id, mode: 'batch' }),
    }).catch(() => {})
    setLoadingDemo(false)
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

  const [pinError, setPinError] = useState<string | null>(null)
  const [pinErrorQuestionId, setPinErrorQuestionId] = useState<string | null>(null)

  async function handlePin(questionId: string, pinned: boolean) {
    if (!session) return
    setPinError(null)
    setPinErrorQuestionId(null)

    if (pinned) {
      // Check max 3 pinned questions
      const pinnedCount = questions.filter((q) => q.is_pinned && q.session_id === session.id).length
      if (pinnedCount >= 3) {
        setPinError('Maximum 3 pinned questions allowed. Unpin one first.')
        setPinErrorQuestionId(questionId)
        setTimeout(() => { setPinError(null); setPinErrorQuestionId(null) }, 4000)
        return
      }
    }

    await supabase.from('questions').update({ is_pinned: pinned }).eq('id', questionId)
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
      setCopyToast('Link copied!')
      setTimeout(() => { setCopied(false); setCopyToast(null) }, 3000)
    })
  }

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  const downloadQr = useCallback(() => {
    if (!qrCanvasRef.current) return
    const canvas = qrCanvasRef.current.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `query-${code}-qr.png`
    a.click()
  }, [code])

  // Separate approved questions from pending review
  const approvedQuestions = questions.filter((q) => q.approved)
  const pendingReviewQuestions = questions.filter((q) => !q.approved)

  // Separate archived from active approved questions
  const archivedQuestions = approvedQuestions.filter((q) => q.archived === true)
  const activeApprovedQuestions = approvedQuestions.filter((q) => !q.archived)

  // Build cluster+question structures (only from active approved questions — excludes archived)
  const unansweredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'unanswered')
    .map((c) => ({ ...c, questions: activeApprovedQuestions.filter((q) => q.cluster_id === c.id) }))

  const answeredClusters: ClusterWithQuestions[] = clusters
    .filter((c) => c.status === 'answered')
    .map((c) => ({ ...c, questions: activeApprovedQuestions.filter((q) => q.cluster_id === c.id) }))

  const unclusteredQuestions = activeApprovedQuestions.filter((q) => !q.cluster_id && q.status !== 'answered')
  const answeredUnclusteredQuestions = activeApprovedQuestions.filter((q) => !q.cluster_id && q.status === 'answered')
  const answeredOrphanQuestions = activeApprovedQuestions.filter(
    (q) => q.status === 'answered' && q.cluster_id && clusters.find((c) => c.id === q.cluster_id)?.status === 'unanswered'
  )
  const hasAnswered = answeredClusters.length > 0 || answeredUnclusteredQuestions.length > 0 || answeredOrphanQuestions.length > 0

  const totalQuestions = activeApprovedQuestions.length

  // Compute which attendee session IDs have used multiple display names
  const attendeeMultipleNamesSet = new Set<string>()
  const attendeeNamesMap = new Map<string, Set<string>>()
  for (const q of questions) {
    if (q.attendee_session_id && !q.is_anonymous && q.author_name) {
      const names = attendeeNamesMap.get(q.attendee_session_id) || new Set()
      names.add(q.author_name)
      attendeeNamesMap.set(q.attendee_session_id, names)
    }
  }
  attendeeNamesMap.forEach((names, id) => {
    if (names.size > 1) attendeeMultipleNamesSet.add(id)
  })
  function hasMultipleNames(q: Question): boolean {
    return !!(q.attendee_session_id && attendeeMultipleNamesSet.has(q.attendee_session_id))
  }

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
      {/* Brand color override */}
      <BrandOverride brandColor={session.brand_color} />

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
          {session.logo_url ? (
            <div className="shrink-0 rounded-lg bg-white/95 p-1.5 flex items-center justify-center self-center">
              <img src={session.logo_url} alt="Host logo" className="h-7 max-w-[100px] object-contain" decoding="async" />
            </div>
          ) : null}
          <a href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity shrink-0 tracking-tight">Query</a>
          <span className="text-white/30 text-lg font-light select-none">/</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-medium truncate" style={{ color: 'var(--theme-header-text-muted)' }}>{session.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {participantCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {participantCount} attending
              </span>
            )}
            {/* Live question counter */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} submitted
            </span>
            {/* Copy Join Link button — very visible for demo day */}
            <button
              onClick={copyLink}
              title="Copy join link"
              className="hidden sm:flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
              style={{ color: 'var(--theme-header-badge-text)', background: 'var(--theme-header-badge-bg)' }}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  Copy Join Link
                </>
              )}
            </button>
            {/* QR code button */}
            <button
              onClick={() => setQrModalOpen(true)}
              title="Show QR code"
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--theme-header-badge-text)', background: 'var(--theme-header-badge-bg)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm14 3h.01M17 17h.01M14 14h3v3h-3v-3zm3 3h3v3h-3v-3z" /></svg>
            </button>
            {/* Embed button */}
            <button
              onClick={() => setEmbedModalOpen(true)}
              title="Embed this session"
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:opacity-80"
              style={{ color: 'var(--theme-header-badge-text)', background: 'var(--theme-header-badge-bg)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
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
                onClick={() => setEndModalOpen(true)}
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
            <span className="text-sm font-medium">{copyToast}</span>
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
              <div className="flex justify-center">
                <div className="rounded-xl border-2 p-3" style={{ borderColor: 'var(--theme-primary-light)' }}>
                  <QRCodeSVG value={attendeeUrl} size={160} level="M" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Share this QR code with your audience</p>
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

            {/* Demo mode */}
            <div className="max-w-md mx-auto text-center pt-2">
              <div className="border-t border-slate-200 pt-6 space-y-3">
                <p className="text-xs text-slate-400">No attendees yet? Try a demo.</p>
                <button
                  onClick={loadDemoQuestions}
                  disabled={loadingDemo}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:border-theme-primary-light hover:text-theme-primary hover:bg-white disabled:opacity-50 transition-colors bg-white/50"
                >
                  {loadingDemo ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading demo questions…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      Load demo questions
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-400">Loads 15 sample AMA questions · AI will cluster them automatically</p>
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
                onPin={handlePin}
                pinErrorQuestionId={pinErrorQuestionId}
                pinError={pinError}
                onArchive={archiveQuestion}
                onBulkArchive={bulkArchiveCluster}
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
                  <QuestionRow key={q.id} question={q} replies={replies.filter((r) => r.question_id === q.id)} sessionId={session.id} onMarkAnswered={markQuestionAnswered} onMarkUnanswered={markQuestionUnanswered} onReply={handleHostReply} onPin={handlePin} pinError={pinErrorQuestionId === q.id ? pinError : null} onArchive={archiveQuestion} hasMultipleNames={hasMultipleNames(q)} />
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
                        onPin={handlePin}
                        pinError={pinErrorQuestionId === q.id ? pinError : null}
                        onArchive={archiveQuestion}
                        hasMultipleNames={hasMultipleNames(q)}
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
                      onPin={handlePin}
                      pinErrorQuestionId={pinErrorQuestionId}
                      pinError={pinError}
                      onArchive={archiveQuestion}
                      sessionId={session.id}
                      muted={true}
                    />
                  ) : null
                )}
              </div>
            )}
          </section>
        )}

        {/* Archived questions */}
        {archivedQuestions.length > 0 && (
          <section className="space-y-3">
            <button
              onClick={() => setArchivedOpen((o) => !o)}
              className="flex items-center gap-2 group"
            >
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
                Archived
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-500">
                {archivedQuestions.length}
              </span>
              <ChevronIcon open={archivedOpen} />
            </button>

            {archivedOpen && (
              <div className="space-y-3">
                {archivedQuestions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    replies={replies.filter((r) => r.question_id === q.id)}
                    sessionId={session.id}
                    onMarkAnswered={markQuestionAnswered}
                    onMarkUnanswered={markQuestionUnanswered}
                    onReply={handleHostReply}
                    onArchive={archiveQuestion}
                    hasMultipleNames={hasMultipleNames(q)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Word Cloud */}
        <section className="space-y-3">
          <button
            onClick={() => setWordCloudOpen((o) => !o)}
            className="flex items-center gap-2 group"
          >
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
              Word Cloud
            </h2>
            {activeWordCloud && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Active
              </span>
            )}
            <ChevronIcon open={wordCloudOpen} />
          </button>
          {wordCloudOpen && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              {activeWordCloud ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{activeWordCloud.prompt}</p>
                    <button
                      onClick={closeWordCloud}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors"
                    >
                      Close Word Cloud
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">{wordCloudEntries.length} submission{wordCloudEntries.length !== 1 ? 's' : ''}</p>
                  <WordCloudDisplay entries={wordCloudEntries} />
                </>
              ) : (
                <WordCloudCreate sessionId={session.id} onCreated={loadActiveWordCloud} />
              )}
            </div>
          )}
        </section>

        {/* Polls */}
        <section className="space-y-3">
          <button onClick={() => setPollsOpen((o) => !o)} className="flex items-center gap-2 group">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">Polls</h2>
            {polls.length > 0 && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-theme-primary-light text-theme-primary-hover">{polls.length}</span>)}
            <ChevronIcon open={pollsOpen} />
          </button>
          {pollsOpen && (<div className="space-y-4">
            <PollCreate sessionId={session.id} onCreated={() => {/* real-time subscription handles new polls */}} />
            {polls.map((poll) => (<div key={poll.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <PollResults poll={poll} />
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => togglePollActive(poll.id, poll.is_active)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${poll.is_active ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>{poll.is_active ? 'Close Poll' : 'Reopen Poll'}</button>
                <span className={`text-xs ${poll.is_active ? 'text-emerald-500' : 'text-slate-400'}`}>{poll.is_active ? 'Active' : 'Closed'}</span>
              </div>
            </div>))}
          </div>)}
        </section>

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

        {/* Recurring Session Insights */}
        {session?.recurrence_parent_id && recurringInsights && (
          <section className="space-y-3">
            <button
              onClick={() => setInsightsOpen((o) => !o)}
              className="flex items-center gap-2 group"
            >
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Recurring Session Insights
              </h2>
              <ChevronIcon open={insightsOpen} />
            </button>
            {insightsOpen && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
                {/* Series summary */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900">{recurringInsights.totalSessions}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Sessions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-theme-primary">{recurringInsights.averageQuestionsPerSession}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Avg Questions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900">{recurringInsights.recurringTopics.length}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Topics</p>
                  </div>
                </div>

                {/* Consistent topics */}
                {recurringInsights.consistentTopics.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Consistent Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {recurringInsights.consistentTopics.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* New this session */}
                {recurringInsights.newTopics.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New This Session</p>
                    <div className="flex flex-wrap gap-1.5">
                      {recurringInsights.newTopics.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topic frequency with trends */}
                {recurringInsights.recurringTopics.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Topic Frequency</p>
                    <div className="space-y-1.5">
                      {recurringInsights.recurringTopics.slice(0, 10).map((t) => (
                        <div key={t.topic} className="flex items-center gap-2 text-sm">
                          <span className="shrink-0 w-5 text-center">
                            {t.trend === 'rising' && <span className="text-green-500" title="Rising">&#9650;</span>}
                            {t.trend === 'falling' && <span className="text-red-500" title="Falling">&#9660;</span>}
                            {t.trend === 'stable' && <span className="text-slate-400" title="Stable">&#9679;</span>}
                            {t.trend === 'new' && <svg className="w-4 h-4 text-amber-500 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                          </span>
                          <span className="text-slate-700 truncate flex-1">{t.topic}</span>
                          <span className="text-xs text-slate-400 shrink-0">{t.sessionCount}/{recurringInsights.totalSessions} sessions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  {aiInsightsText ? (
                    <div className="bg-theme-primary-subtle border border-theme-primary-light rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">AI Summary</p>
                      <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--theme-primary-hover)' }}>
                        {aiInsightsText}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        setAiInsightsLoading(true)
                        try {
                          const res = await fetch('/api/cross-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sessionId: session!.id, action: 'ai-insights' }),
                          })
                          const data = await res.json()
                          if (data.success && data.text) {
                            setAiInsightsText(data.text)
                          }
                        } catch {
                          setAiInsightsText('Unable to generate AI insights at this time.')
                        }
                        setAiInsightsLoading(false)
                      }}
                      disabled={aiInsightsLoading}
                      className="w-full px-4 py-2.5 bg-theme-primary text-white rounded-xl text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {aiInsightsLoading ? 'Generating AI Summary...' : 'Generate AI Summary'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
          </div>
        </div>
      </div>

      {/* Floating Settings Panel */}
      <div className="fixed bottom-6 right-6 z-30">
        {settingsOpen && (
          <div className="absolute bottom-14 right-0 w-80 max-h-[70vh] overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl p-5 space-y-4 animate-in slide-in-from-bottom-2">
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

            {/* Session Context */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Session Context</p>
              <p className="text-xs text-slate-400">Upload docs or add URLs for smarter AI clustering and answers.</p>

              {/* File upload */}
              <label className={`flex items-center justify-center gap-1.5 w-full px-3 py-2 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors text-sm text-slate-500 ${contextUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                {contextUploading ? 'Uploading...' : 'Upload document'}
                <input type="file" accept=".pdf,.pptx,.docx,.txt,.md" onChange={handleContextFileUpload} className="hidden" disabled={contextUploading} />
              </label>

              {/* URL input */}
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={contextUrl}
                  onChange={(e) => setContextUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-theme-primary focus:border-transparent"
                />
                <button
                  onClick={handleAddContextUrl}
                  disabled={!contextUrl.trim() || contextUploading}
                  className="px-2.5 py-1.5 bg-theme-primary text-white rounded-lg text-xs font-medium hover:bg-theme-primary-hover disabled:opacity-40 transition-colors shrink-0"
                >
                  Add
                </button>
              </div>

              {/* Existing entries */}
              {contextEntries.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {contextEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs">
                      <span className="text-slate-600 truncate mr-2">
                        {entry.content_type === 'document' ? '\u{1F4C4}' : '\u{1F517}'} {entry.file_name || entry.source_url || entry.content_type}
                      </span>
                      <button
                        onClick={() => deleteContextEntry(entry.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <button
                onClick={() => { exportCSV(); setSettingsOpen(false) }}
                disabled={questions.length === 0}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Export CSV
              </button>
              <a
                href={`/session/${code}/report`}
                className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors"
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

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setQrModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 space-y-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Scan to join</h3>
              <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none">&times;</button>
            </div>
            <div className="flex justify-center">
              <div className="rounded-xl border-2 p-4" style={{ borderColor: 'var(--theme-primary-light)' }}>
                <QRCodeSVG value={attendeeUrl} size={200} level="M" />
              </div>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold tracking-[0.2em] text-slate-900">{code}</p>
              <p className="text-xs text-slate-400 font-mono mt-1">{attendeeUrl}</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={copyLink}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-theme-primary-light hover:text-theme-primary hover:bg-theme-primary-subtle transition-colors"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <button
                onClick={downloadQr}
                className="px-4 py-2 rounded-lg bg-theme-primary text-sm font-medium text-white hover:bg-theme-primary-hover transition-colors"
              >
                Download PNG
              </button>
            </div>
            {/* Hidden canvas for PNG download */}
            <div ref={qrCanvasRef} className="hidden">
              <QRCodeCanvas value={attendeeUrl} size={400} level="M" />
            </div>
          </div>
        </div>
      )}

      {/* Embed Modal */}
      {embedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEmbedModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Embed this session</h3>
              <button onClick={() => setEmbedModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-slate-500">Paste this snippet into your website, Notion page, LMS, or any platform that supports iframes.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <code className="text-xs text-slate-700 break-all font-mono leading-relaxed">{embedSnippet}</code>
            </div>
            <div className="flex justify-end gap-3">
              <a
                href={embedUrl}
                target="_blank"
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-theme-primary-light hover:text-theme-primary hover:bg-theme-primary-subtle transition-colors"
              >
                Preview
              </a>
              <button
                onClick={copyEmbed}
                className="px-4 py-2 rounded-lg bg-theme-primary text-sm font-medium text-white hover:bg-theme-primary-hover transition-colors"
              >
                {embedCopied ? 'Copied!' : 'Copy Snippet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating emoji reactions */}
      <ReactionOverlay reactions={reactions} />

      {/* End Session confirmation modal */}
      {endModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setEndModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">End this session?</h3>
              <p className="text-sm text-slate-500">
                Attendees will no longer be able to submit questions. You&apos;ll be taken to the session report.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEndModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndSession}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
