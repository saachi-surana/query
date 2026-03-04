'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Session, Question } from '@/lib/supabase'

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

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<'ask' | 'all'>('ask')
  const [questions, setQuestions] = useState<Question[]>([])
  const [connected, setConnected] = useState(true)

  // Form state
  const [name, setName] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [upvoted, setUpvoted] = useState(false)

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

  // Load all questions + subscribe
  useEffect(() => {
    if (!session) return

    async function loadQuestions() {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('session_id', session!.id)
        .order('created_at', { ascending: false })
      setQuestions(data || [])
    }
    loadQuestions()

    const channel = supabase
      .channel(`attendee-questions-${session.id}`)
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

  async function handleUpvote(questionId: string) {
    const q = questions.find((q) => q.id === questionId)
    if (!q) return
    await supabase
      .from('questions')
      .update({ upvotes: q.upvotes + 1 })
      .eq('id', questionId)
    setUpvoted(true)
    setQuestionText('')
    setSimilarQuestions([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = questionText.trim()
    if (!text || !session) return

    setSubmitting(true)
    setSubmitError('')

    const { error } = await supabase.from('questions').insert({
      session_id: session.id,
      text,
      author_name: anonymous ? null : name.trim() || null,
      is_anonymous: anonymous,
    })

    if (error) {
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setSubmitSuccess(true)
    setSubmitting(false)
    setQuestionText('')
    setName('')
    setAnonymous(false)
    setSimilarQuestions([])
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
        <h1 className="text-2xl font-semibold text-gray-900">Session Not Found</h1>
        <p className="text-gray-500">The code &ldquo;{code}&rdquo; doesn&apos;t match any active session.</p>
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
        <div className="animate-pulse text-gray-400">Loading…</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Connection banner */}
      {!connected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 text-center">
          Connection lost — trying to reconnect...
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <a href="/" className="text-xl font-bold text-gray-900 hover:opacity-80 transition-opacity shrink-0">
            Query
          </a>
          <h1 className="text-lg font-semibold text-gray-800 truncate">{session.title}</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex">
            {(['ask', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'ask' ? 'Ask a Question' : 'All Questions'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ASK TAB */}
        {tab === 'ask' && (
          <div className="space-y-4">
            {submitSuccess || upvoted ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
                <div className="text-3xl">✓</div>
                <p className="font-medium text-green-800">
                  {upvoted ? 'Thanks! Your upvote has been counted.' : 'Your question has been submitted!'}
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
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={anonymous}
                    placeholder="Your name (optional)"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  />
                </div>

                {/* Anonymous toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Ask anonymously</span>
                </label>

                {/* Question textarea */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Question</label>
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
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className={`text-xs text-right ${questionText.length >= MAX_CHARS ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
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
                          <p className="flex-1 text-sm text-gray-700">{sq.text}</p>
                          <button
                            type="button"
                            onClick={() => handleUpvote(sq.id)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-yellow-100 hover:bg-yellow-200 rounded-md text-xs font-medium text-yellow-800 transition-colors"
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
                  className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-medium">No questions yet.</p>
                <p className="text-sm mt-1">Be the first to ask!</p>
              </div>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  <p className="text-sm text-gray-900">{q.text}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {q.is_anonymous ? 'Anonymous' : q.author_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">▲ {q.upvotes}</span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        q.status === 'answered'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {q.status === 'answered' ? 'Answered' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}
