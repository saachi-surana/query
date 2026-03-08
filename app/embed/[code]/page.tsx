'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase, Session, Question, Reply, Cluster, ClusterWithQuestions, Poll, WordCloud, WordCloudEntry } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'
import { PollVote } from '@/components/PollVote'
import { WordCloudSubmit } from '@/components/WordCloudSubmit'
import { WordCloudDisplay } from '@/components/WordCloudDisplay'
import { BrandOverride } from '@/components/BrandOverride'

const MAX_CHARS = 500
const DEBOUNCE_MS = 400

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function ReplyThread({
  replies,
  onReply,
}: {
  replies: Reply[]
  onReply: (text: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    await onReply(text.trim())
    setText('')
    setSubmitting(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs hover:opacity-80 transition-colors"
        style={{ color: 'var(--theme-primary)' }}
      >
        {replies.length > 0 ? `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}` : 'Reply'}
      </button>
      {open && (
        <div className="ml-4 pl-3 border-l-2 border-slate-200 space-y-2 mt-2">
          {replies.map((r) => (
            <div key={r.id} className="space-y-0.5">
              <p className="text-sm text-slate-700">{r.text}</p>
              <p className="text-xs text-slate-400">
                <span className={r.is_host ? 'font-semibold' : ''} style={r.is_host ? { color: 'var(--theme-primary)' } : undefined}>
                  {r.is_host ? '★ Host' : r.author_name || 'Anonymous'}
                </span>
                <span className="mx-1">·</span>
                {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a follow-up..."
              maxLength={500}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="px-3 py-1.5 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function EmbedPageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const code = (params.code as string).toUpperCase()
  const defaultTab = (searchParams.get('tab') as 'ask' | 'all' | 'topics') || 'ask'

  const [session, setSession] = useState<Session | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<'ask' | 'all' | 'topics'>(defaultTab)
  const [questions, setQuestions] = useState<Question[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [connected, setConnected] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [upvoted, setUpvoted] = useState(false)
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set())
  const deviceIdRef = useRef<string>('')

  // Polls
  const [activePoll, setActivePoll] = useState<Poll | null>(null)

  // Word cloud
  const [activeWordCloud, setActiveWordCloud] = useState<WordCloud | null>(null)
  const [wordCloudEntries, setWordCloudEntries] = useState<WordCloudEntry[]>([])

  // Similarity
  const [similarQuestions, setSimilarQuestions] = useState<Question[]>([])
  const debouncedText = useDebounce(questionText, DEBOUNCE_MS)

  // Initialize device ID
  useEffect(() => {
    deviceIdRef.current = getDeviceId()
  }, [])

  // Load persisted upvotes from localStorage
  useEffect(() => {
    if (!session) return
    const savedUpvotes = localStorage.getItem(`query-upvotes-${session.id}`)
    if (savedUpvotes) {
      try {
        const ids: string[] = JSON.parse(savedUpvotes)
        setUpvotedIds(new Set(ids))
      } catch { /* ignore corrupt data */ }
    }
  }, [session])

  // Load session
  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single()

      if (!data) {
        setNotFound(true)
        return
      }
      setSession(data)
    }
    loadSession()
  }, [code])

  // Load all questions + replies, subscribe
  useEffect(() => {
    if (!session) return

    async function loadData() {
      const [{ data: qs }, { data: cs }, { data: rs }] = await Promise.all([
        supabase.from('questions').select('*').eq('session_id', session!.id).order('created_at', { ascending: false }),
        supabase.from('clusters').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
        supabase.from('replies').select('*').eq('session_id', session!.id).order('created_at', { ascending: true }),
      ])
      setQuestions(qs || [])
      setClusters(cs || [])
      setReplies(rs || [])

      // Load active poll
      const { data: pollData } = await supabase
        .from('polls')
        .select('*')
        .eq('session_id', session!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      setActivePoll(pollData && pollData.length > 0 ? pollData[0] : null)

      // Load active word cloud
      const { data: wc } = await supabase
        .from('word_clouds')
        .select('*')
        .eq('session_id', session!.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (wc) {
        setActiveWordCloud(wc)
        const { data: entries } = await supabase
          .from('word_cloud_entries')
          .select('*')
          .eq('word_cloud_id', wc.id)
          .order('created_at', { ascending: true })
        setWordCloudEntries(entries || [])
      } else {
        setActiveWordCloud(null)
        setWordCloudEntries([])
      }
    }
    loadData()

    const channel = supabase
      .channel(`embed-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          setSession(payload.new as Session)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setQuestions((prev) => [payload.new as Question, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setQuestions((prev) =>
              prev.map((q) => (q.id === (payload.new as Question).id ? (payload.new as Question) : q))
            )
          } else if (payload.eventType === 'DELETE') {
            setQuestions((prev) => prev.filter((q) => q.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clusters', filter: `session_id=eq.${session.id}` },
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'replies', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReplies((prev) => [...prev, payload.new as Reply])
          } else if (payload.eventType === 'DELETE') {
            setReplies((prev) => prev.filter((r) => r.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPoll = payload.new as Poll
            if (newPoll.is_active) setActivePoll(newPoll)
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Poll
            setActivePoll((prev) => {
              if (updated.is_active) return updated
              if (prev?.id === updated.id && !updated.is_active) return null
              return prev
            })
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    // Subscribe to word cloud changes
    const wcChannel = supabase
      .channel(`embed-wc-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'word_clouds', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const wc = payload.new as WordCloud
            if (wc.is_active) {
              setActiveWordCloud(wc)
              setWordCloudEntries([])
            }
          } else if (payload.eventType === 'UPDATE') {
            const wc = payload.new as WordCloud
            if (!wc.is_active && activeWordCloud?.id === wc.id) {
              setActiveWordCloud(null)
              setWordCloudEntries([])
            } else if (wc.is_active) {
              setActiveWordCloud(wc)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(wcChannel)
    }
  }, [session])

  // Real-time subscription for word cloud entries
  useEffect(() => {
    if (!activeWordCloud) return

    const wcEntryChannel = supabase
      .channel(`embed-wc-entries-${activeWordCloud.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'word_cloud_entries', filter: `word_cloud_id=eq.${activeWordCloud.id}` },
        (payload) => {
          setWordCloudEntries((prev) => [...prev, payload.new as WordCloudEntry])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(wcEntryChannel) }
  }, [activeWordCloud?.id])

  // Similarity search (debounced)
  useEffect(() => {
    if (!session || debouncedText.trim().length < 8) {
      setSimilarQuestions([])
      return
    }

    async function searchSimilar() {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('session_id', session!.id)
        .ilike('text', `%${debouncedText.trim().split(' ').slice(0, 3).join('%')}%`)
        .neq('status', 'answered')
        .limit(3)
      setSimilarQuestions(data || [])
    }
    searchSimilar()
  }, [debouncedText, session])

  async function handleUpvote(questionId: string, fromSimilar = false) {
    const q = questions.find((q) => q.id === questionId)
    if (!q || !session) return
    const alreadyUpvoted = upvotedIds.has(questionId)
    await supabase
      .from('questions')
      .update({ upvotes: q.upvotes + (alreadyUpvoted ? -1 : 1) })
      .eq('id', questionId)
    setUpvotedIds((prev) => {
      const next = new Set(prev)
      if (alreadyUpvoted) next.delete(questionId)
      else next.add(questionId)
      localStorage.setItem(`query-upvotes-${session.id}`, JSON.stringify(Array.from(next)))
      return next
    })
    if (fromSimilar && !alreadyUpvoted) {
      setUpvoted(true)
      setQuestionText('')
      setSimilarQuestions([])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = questionText.trim()
    if (!text || !session) return

    setSubmitting(true)
    setSubmitError('')

    const { data, error } = await supabase.from('questions').insert({
      session_id: session.id,
      text,
      author_name: anonymous ? null : name.trim() || null,
      is_anonymous: anonymous,
      approved: !session.moderation_enabled,
    }).select('id').single()

    if (error) {
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    if (data) {
      // Trigger clustering (fire-and-forget)
      if (!session.moderation_enabled) {
        fetch('/api/cluster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: data.id, sessionId: session.id }),
        }).catch(() => {/* silent */})
      }
    }
    setSubmitSuccess(true)
    setSubmitting(false)
    setQuestionText('')
    setName('')
    setAnonymous(false)
    setSimilarQuestions([])
  }

  async function handleReply(questionId: string, text: string) {
    if (!session) return
    await supabase.from('replies').insert({
      question_id: questionId,
      session_id: session.id,
      text,
      author_name: anonymous ? null : name.trim() || null,
      is_host: false,
    })
  }

  function resetForm() {
    setSubmitSuccess(false)
    setUpvoted(false)
    setSubmitError('')
  }

  // Not found
  if (notFound) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 text-center space-y-3 bg-white">
        <h1 className="text-xl font-semibold text-slate-900">Session Not Found</h1>
        <p className="text-sm text-slate-500">The code &ldquo;{code}&rdquo; doesn&apos;t match any active session.</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="h-10 bg-slate-100 animate-pulse shrink-0" />
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Brand color override */}
      <BrandOverride brandColor={session.brand_color} />

      {/* Connection banner */}
      {!connected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-1.5 text-xs text-yellow-800 text-center shrink-0">
          Connection lost — trying to reconnect...
        </div>
      )}

      {/* Minimal top bar with session title + tabs */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="px-3 py-2 flex items-center gap-2">
          <h1 className="text-sm font-semibold text-slate-900 truncate flex-1">{session.title}</h1>
          {session.ended_at && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 shrink-0">
              Ended
            </span>
          )}
        </div>
        <div className="flex px-3">
          {(['ask', 'all', 'topics'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'text-theme-sidebar-active-text'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              style={tab === t ? { borderColor: 'var(--theme-primary)' } : undefined}
            >
              {t === 'ask' ? 'Ask' : t === 'all' ? 'All' : 'Topics'}
            </button>
          ))}
        </div>
      </div>

      {/* Session ended banner */}
      {session.ended_at && (
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-xs text-slate-500 text-center shrink-0">
          This session has ended. Browse questions and answers below.
        </div>
      )}

      {/* Highlighted cluster banner */}
      {session.highlighted_cluster_id && !session.ended_at && (() => {
        const highlighted = clusters.find((c) => c.id === session.highlighted_cluster_id)
        if (!highlighted) return null
        return (
          <div className="border-b px-3 py-2 text-center shrink-0" style={{ background: 'var(--theme-primary-subtle)', borderColor: 'var(--theme-primary-light)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-primary)' }}>Currently Discussing</p>
            <p className="text-xs font-medium text-slate-900 mt-0.5">{highlighted.summary_question}</p>
          </div>
        )
      })()}

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-4 space-y-3">
          {/* Active Poll */}
          {activePoll && !session.ended_at && (
            <div className="mb-3">
              <PollVote poll={activePoll} onVoted={() => {
                supabase.from('polls').select('*').eq('id', activePoll.id).single().then(({ data }) => {
                  if (data) setActivePoll(data)
                })
              }} />
            </div>
          )}

          {/* ASK TAB */}
          {tab === 'ask' && session.ended_at && (
            <div className="text-center py-10 text-slate-400">
              <p className="text-sm font-medium">This session has ended.</p>
              <p className="text-xs mt-1">You can still browse questions, topics, and answers.</p>
            </div>
          )}
          {tab === 'ask' && !session.ended_at && (
            <div className="space-y-3">
              {submitSuccess || upvoted ? (
                <div className={`rounded-xl border p-4 text-center space-y-2 ${
                  session.moderation_enabled && !upvoted
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-green-200 bg-green-50'
                }`}>
                  <div className="text-2xl">{session.moderation_enabled && !upvoted ? '⏳' : '✓'}</div>
                  <p className={`text-sm font-medium ${
                    session.moderation_enabled && !upvoted ? 'text-amber-800' : 'text-green-800'
                  }`}>
                    {upvoted
                      ? 'Thanks! Your upvote has been counted.'
                      : session.moderation_enabled
                        ? 'Your question has been submitted and is pending moderator review.'
                        : 'Your question has been submitted!'}
                  </p>
                  <button
                    onClick={resetForm}
                    className="text-xs text-green-700 underline hover:no-underline"
                  >
                    Ask another question
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={anonymous}
                      placeholder="Your name (optional)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    />
                  </div>

                  {/* Anonymous toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="rounded border-slate-300 text-theme-primary focus:ring-theme-primary"
                    />
                    <span className="text-xs text-slate-600">Ask anonymously</span>
                  </label>

                  {/* Question textarea */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">Question</label>
                    <textarea
                      value={questionText}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_CHARS) {
                          setQuestionText(e.target.value)
                        }
                      }}
                      placeholder="Type your question here..."
                      rows={3}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent resize-none"
                    />
                    <p className={`text-xs text-right ${questionText.length >= MAX_CHARS ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {questionText.length}/{MAX_CHARS}
                    </p>
                  </div>

                  {/* Similar questions */}
                  {similarQuestions.length > 0 && (
                    <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 space-y-2">
                      <p className="text-xs font-medium text-yellow-800">
                        Similar questions already asked — upvote instead?
                      </p>
                      <div className="space-y-1.5">
                        {similarQuestions.map((sq) => (
                          <div key={sq.id} className="flex items-start gap-2 bg-white rounded-lg border border-yellow-100 p-2">
                            <p className="flex-1 text-xs text-slate-700">{sq.text}</p>
                            <button
                              type="button"
                              onClick={() => handleUpvote(sq.id, true)}
                              className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                                upvotedIds.has(sq.id)
                                  ? 'bg-yellow-200 text-yellow-600 hover:bg-yellow-100'
                                  : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                              }`}
                            >
                              ▲ {sq.upvotes}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <p className="text-xs text-red-600">{submitError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !questionText.trim()}
                    className="w-full py-2 px-4 bg-theme-primary text-white rounded-lg font-medium text-sm hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {submitting ? 'Submitting…' : 'Submit Question'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Active Word Cloud — shown on Ask tab below the form */}
          {tab === 'ask' && !session.ended_at && activeWordCloud && (
            <div className="space-y-3 mt-3">
              <WordCloudSubmit
                wordCloud={activeWordCloud}
                onSubmitted={() => {}}
              />
              {wordCloudEntries.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Live Word Cloud</p>
                  <WordCloudDisplay entries={wordCloudEntries} />
                </div>
              )}
            </div>
          )}

          {/* ALL QUESTIONS TAB */}
          {tab === 'all' && (
            <div className="space-y-2">
              {questions.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm font-medium">No questions yet.</p>
                  <p className="text-xs mt-1">Be the first to ask!</p>
                </div>
              ) : (
                [...questions].filter((q) => q.approved).sort((a, b) => b.upvotes - a.upvotes).map((q) => {
                  const qReplies = replies.filter((r) => r.question_id === q.id)
                  return (
                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-start gap-2">
                      <button
                        onClick={() => handleUpvote(q.id)}
                        className={`shrink-0 flex flex-col items-center px-1.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          upvotedIds.has(q.id)
                            ? 'bg-theme-primary-light text-theme-sidebar-active-text'
                            : 'bg-slate-100 hover:bg-theme-primary-subtle text-slate-500'
                        }`}
                      >
                        <span>▲</span>
                        <span>{q.upvotes}</span>
                      </button>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-sm text-slate-900">{q.text}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-slate-300">·</span>
                            <ReplyThread replies={qReplies} onReply={(text) => handleReply(q.id, text)} />
                          </div>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              q.status === 'answered'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {q.status === 'answered' ? 'Answered' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* TOPICS TAB */}
          {tab === 'topics' && (() => {
            const approvedQs = questions.filter((q) => q.approved)
            const topicClusters: ClusterWithQuestions[] = clusters
              .filter((c) => c.status === 'unanswered')
              .map((c) => ({ ...c, questions: approvedQs.filter((q) => q.cluster_id === c.id) }))
              .filter((c) => c.questions.length > 0)
              .sort((a, b) => b.questions.reduce((s, q) => s + q.upvotes, 0) - a.questions.reduce((s, q) => s + q.upvotes, 0))
            const answeredTopics: ClusterWithQuestions[] = clusters
              .filter((c) => c.status === 'answered')
              .map((c) => ({ ...c, questions: approvedQs.filter((q) => q.cluster_id === c.id) }))
              .filter((c) => c.questions.length > 0)
            return (
              <div className="space-y-3">
                {topicClusters.length === 0 && answeredTopics.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-sm font-medium">No topics yet.</p>
                    <p className="text-xs mt-1">Questions will be grouped into topics as they come in.</p>
                  </div>
                ) : (
                  <>
                    {topicClusters.map((c) => {
                      const isHighlighted = session.highlighted_cluster_id === c.id
                      return (
                        <div key={c.id} className={`bg-white rounded-xl border p-3 space-y-1.5 ${isHighlighted ? 'ring-2' : 'border-slate-200'}`} style={isHighlighted ? { borderColor: 'var(--theme-primary-light)', ringColor: 'var(--theme-primary-light)' } : undefined}>
                          <div className="flex items-center gap-2">
                            {isHighlighted && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-theme-primary-light text-theme-sidebar-active-text">
                                Discussing Now
                              </span>
                            )}
                            <h3 className="text-xs font-semibold text-slate-900">{c.title}</h3>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-theme-primary-light text-theme-sidebar-active-text">
                              {c.questions.length}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-auto">▲ {c.questions.reduce((s, q) => s + q.upvotes, 0)}</span>
                          </div>
                          <div className="rounded-lg border px-2.5 py-1.5" style={{ background: 'var(--theme-primary-subtle)', borderColor: 'var(--theme-primary-light)' }}>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-primary)' }}>AI Summary</p>
                              <span className="inline-flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-theme-primary text-white text-[8px] font-bold flex items-center justify-center">Q</span>
                              </span>
                            </div>
                            <p className="text-xs text-slate-900 mt-0.5 italic">{c.summary_question}</p>
                          </div>
                        </div>
                      )
                    })}
                    {answeredTopics.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Answered Topics</p>
                        {answeredTopics.map((c) => (
                          <div key={c.id} className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-green-500 text-xs">✓</span>
                              <h3 className="text-xs font-semibold text-slate-500">{c.title}</h3>
                              <span className="text-[10px] text-slate-400">{c.questions.length} question{c.questions.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[10px] text-slate-400 italic">{c.summary_question}</p>
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <span className="w-3.5 h-3.5 rounded-full bg-theme-primary text-white text-[7px] font-bold flex items-center justify-center">Q</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default function EmbedPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex flex-col bg-white">
        <div className="h-10 bg-slate-100 animate-pulse shrink-0" />
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    }>
      <EmbedPageInner />
    </Suspense>
  )
}
