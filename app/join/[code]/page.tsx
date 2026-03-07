'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Session, Question, Reply, Cluster } from '@/lib/supabase'

type ClusterWithQuestions = Cluster & { questions: Question[] }

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
        className="text-xs text-blue-500 hover:text-violet-700 transition-colors"
      >
        {replies.length > 0 ? `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}` : 'Reply'}
      </button>
      {open && (
        <div className="ml-4 pl-3 border-l-2 border-slate-200 space-y-2 mt-2">
          {replies.map((r) => (
            <div key={r.id} className="space-y-0.5">
              <p className="text-sm text-slate-700">{r.text}</p>
              <p className="text-xs text-slate-400">
                <span className={r.is_host ? 'font-semibold text-violet-600' : ''}>
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
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<'ask' | 'all' | 'topics' | 'mine'>('ask')
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
  const [myQuestionIds, setMyQuestionIds] = useState<Set<string>>(new Set())

  // Similarity
  const [similarQuestions, setSimilarQuestions] = useState<Question[]>([])
  const debouncedText = useDebounce(questionText, DEBOUNCE_MS)

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
    }
    loadData()

    const channel = supabase
      .channel(`attendee-${session.id}`)
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
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

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
    if (!q) return
    const alreadyUpvoted = upvotedIds.has(questionId)
    await supabase
      .from('questions')
      .update({ upvotes: q.upvotes + (alreadyUpvoted ? -1 : 1) })
      .eq('id', questionId)
    setUpvotedIds((prev) => {
      const next = new Set(prev)
      if (alreadyUpvoted) next.delete(questionId)
      else next.add(questionId)
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
      setMyQuestionIds((prev) => new Set(prev).add(data.id))
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
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Session Not Found</h1>
        <p className="text-slate-500">The code &ldquo;{code}&rdquo; doesn&apos;t match any active session.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Go Back
        </button>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading…</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Connection banner */}
      {!connected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 text-center">
          Connection lost — trying to reconnect...
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <a href="/" className="text-xl font-bold text-slate-900 hover:opacity-80 transition-opacity shrink-0">
            Query
          </a>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-800 truncate">{session.title}</h1>
            {session.description && (
              <p className="text-xs text-slate-500 truncate">{session.description}</p>
            )}
          </div>
        </div>
      </header>

      {/* Session ended banner */}
      {session.ended_at && (
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-sm text-slate-600 text-center">
          This session has ended. Browse questions and answers below.
        </div>
      )}

      {/* Highlighted cluster banner */}
      {session.highlighted_cluster_id && !session.ended_at && (() => {
        const highlighted = clusters.find((c) => c.id === session.highlighted_cluster_id)
        if (!highlighted) return null
        return (
          <div className="bg-purple-50 border-b border-purple-200 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Currently Discussing</p>
            <p className="text-sm font-medium text-purple-900 mt-0.5">{highlighted.summary_question}</p>
          </div>
        )
      })()}

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex">
            {(['ask', 'all', 'topics', 'mine'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'ask' ? 'Ask' : t === 'all' ? 'All' : t === 'topics' ? 'Topics' : `Mine (${myQuestionIds.size})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ASK TAB */}
        {tab === 'ask' && session.ended_at && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">This session has ended.</p>
            <p className="text-sm mt-1">You can still browse questions, topics, and answers.</p>
          </div>
        )}
        {tab === 'ask' && !session.ended_at && (
          <div className="space-y-4">
            {submitSuccess || upvoted ? (
              <div className={`rounded-xl border p-6 text-center space-y-3 ${
                session.moderation_enabled && !upvoted
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-green-200 bg-green-50'
              }`}>
                <div className="text-3xl">{session.moderation_enabled && !upvoted ? '⏳' : '✓'}</div>
                <p className={`font-medium ${
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
                  className="text-sm text-green-700 underline hover:no-underline"
                >
                  Ask another question
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={anonymous}
                    placeholder="Your name (optional)"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  />
                </div>

                {/* Anonymous toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-600">Ask anonymously</span>
                </label>

                {/* Question textarea */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Question</label>
                  <textarea
                    value={questionText}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_CHARS) {
                        setQuestionText(e.target.value)
                      }
                    }}
                    placeholder="Type your question here..."
                    rows={4}
                    required
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  />
                  <p className={`text-xs text-right ${questionText.length >= MAX_CHARS ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                    {questionText.length}/{MAX_CHARS}
                  </p>
                </div>

                {/* Similar questions */}
                {similarQuestions.length > 0 && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 space-y-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Similar questions already asked — upvote instead?
                    </p>
                    <div className="space-y-2">
                      {similarQuestions.map((sq) => (
                        <div key={sq.id} className="flex items-start gap-3 bg-white rounded-lg border border-yellow-100 p-3">
                          <p className="flex-1 text-sm text-slate-700">{sq.text}</p>
                          <button
                            type="button"
                            onClick={() => handleUpvote(sq.id, true)}
                            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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
                  <p className="text-sm text-red-600">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !questionText.trim()}
                  className="w-full py-2.5 px-4 bg-violet-600 text-white rounded-lg font-medium text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

        {/* ALL QUESTIONS TAB */}
        {tab === 'all' && (
          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-lg font-medium">No questions yet.</p>
                <p className="text-sm mt-1">Be the first to ask!</p>
              </div>
            ) : (
              [...questions].filter((q) => q.approved).sort((a, b) => b.upvotes - a.upvotes).map((q) => {
                const qReplies = replies.filter((r) => r.question_id === q.id)
                return (
                  <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                    <button
                      onClick={() => handleUpvote(q.id)}
                      className={`shrink-0 flex flex-col items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        upvotedIds.has(q.id)
                          ? 'bg-blue-100 text-violet-600 hover:bg-violet-50'
                          : 'bg-slate-100 hover:bg-violet-50 hover:text-violet-600 text-slate-500'
                      }`}
                    >
                      <span>▲</span>
                      <span>{q.upvotes}</span>
                    </button>
                    <div className="flex-1 min-w-0 space-y-2">
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
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
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
            <div className="space-y-4">
              {topicClusters.length === 0 && answeredTopics.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-lg font-medium">No topics yet.</p>
                  <p className="text-sm mt-1">Questions will be grouped into topics as they come in.</p>
                </div>
              ) : (
                <>
                  {topicClusters.map((c) => {
                    const isHighlighted = session.highlighted_cluster_id === c.id
                    return (
                      <div key={c.id} className={`bg-white rounded-xl border p-4 space-y-2 ${isHighlighted ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          {isHighlighted && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
                              Discussing Now
                            </span>
                          )}
                          <h3 className="text-sm font-semibold text-slate-900">{c.title}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                            {c.questions.length}
                          </span>
                          <span className="text-xs text-slate-400 ml-auto">▲ {c.questions.reduce((s, q) => s + q.upvotes, 0)}</span>
                        </div>
                        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">AI Summary</p>
                          <p className="text-sm text-blue-900 mt-0.5">{c.summary_question}</p>
                        </div>
                      </div>
                    )
                  })}
                  {answeredTopics.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Answered Topics</p>
                      {answeredTopics.map((c) => (
                        <div key={c.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-green-500 text-sm">✓</span>
                            <h3 className="text-sm font-semibold text-slate-500">{c.title}</h3>
                            <span className="text-xs text-slate-400">{c.questions.length} question{c.questions.length !== 1 ? 's' : ''}</span>
                          </div>
                          <p className="text-xs text-slate-400">{c.summary_question}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}

        {/* MY QUESTIONS TAB */}
        {tab === 'mine' && (
          <div className="space-y-3">
            {myQuestionIds.size === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-lg font-medium">You haven&apos;t asked anything yet.</p>
                <p className="text-sm mt-1">
                  <button onClick={() => setTab('ask')} className="text-violet-600 hover:underline">
                    Ask a question
                  </button>
                </p>
              </div>
            ) : (
              questions
                .filter((q) => myQuestionIds.has(q.id))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((q) => {
                  const qReplies = replies.filter((r) => r.question_id === q.id)
                  const statusLabel = !q.approved ? 'Pending Review' : q.status === 'answered' ? 'Answered' : 'Pending'
                  const statusClasses = !q.approved
                    ? 'bg-amber-100 text-amber-700'
                    : q.status === 'answered'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  return (
                    <div key={q.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${!q.approved ? 'border-amber-200' : 'border-slate-200'}`}>
                      <div className="shrink-0 flex flex-col items-center px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500">
                        <span>▲</span>
                        <span>{q.upvotes}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm text-slate-900">{q.text}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'}
                            </span>
                            {q.approved && (
                              <>
                                <span className="text-xs text-slate-300">·</span>
                                <ReplyThread replies={qReplies} onReply={(text) => handleReply(q.id, text)} />
                              </>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        )}
      </div>
    </main>
  )
}
