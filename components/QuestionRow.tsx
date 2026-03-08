'use client'

import { useState } from 'react'
import { Question, Reply } from '@/lib/supabase'
import { Spinner } from './Spinner'

export function QuestionRow({
  question,
  replies,
  sessionId,
  onMarkAnswered,
  onMarkUnanswered,
  onReply,
  onPin,
  pinError,
  onArchive,
}: {
  question: Question
  replies: Reply[]
  sessionId?: string
  onMarkAnswered: (id: string) => void
  onMarkUnanswered?: (id: string) => void
  onReply: (questionId: string, text: string) => Promise<void>
  onPin?: (id: string, pinned: boolean) => void
  pinError?: string | null
  onArchive?: (id: string, archived: boolean) => void
}) {
  const [marking, setMarking] = useState(false)
  const [showReplies, setShowReplies] = useState(replies.length > 0)
  const [showAllReplies, setShowAllReplies] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const REPLY_PREVIEW_COUNT = 3
  const visibleReplies = showAllReplies ? replies : replies.slice(0, REPLY_PREVIEW_COUNT)
  const hiddenCount = replies.length - REPLY_PREVIEW_COUNT

  async function handleToggle() {
    setMarking(true)
    if (question.status === 'answered' && onMarkUnanswered) {
      await onMarkUnanswered(question.id)
    } else {
      await onMarkAnswered(question.id)
    }
    setMarking(false)
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    const text = replyText.trim()
    if (!text) return
    setSubmitting(true)
    await onReply(question.id, text)
    setReplyText('')
    setSubmitting(false)
  }

  return (
    <div className={`bg-white rounded-xl border px-4 py-3 space-y-2.5 ${question.is_pinned ? 'border-l-4 border-l-amber-400 border-t-slate-200 border-r-slate-200 border-b-slate-200 bg-amber-50/40' : 'border-slate-200'}`}>
      {/* Question text — prominent */}
      <p className="text-base leading-relaxed text-slate-900">{question.text}</p>

      {/* Pin error */}
      {pinError && (
        <p className="text-xs text-red-600 font-medium">{pinError}</p>
      )}

      {/* Meta row: upvotes, author, actions, mark button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 min-w-0">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            {question.upvotes}
          </span>
          <span className="text-slate-300">·</span>
          <span>{question.is_anonymous ? 'Anonymous' : question.author_name || 'Anonymous'}</span>
          <span className="text-slate-300">·</span>
          <button
            onClick={() => setShowReplies((o) => !o)}
            className="text-theme-primary hover:text-theme-primary-hover transition-colors font-medium"
          >
            {replies.length > 0 ? `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}` : 'Reply'}
          </button>
          {sessionId && !question.suggested_answer && question.status !== 'answered' && (
            <>
              <span className="text-slate-300">·</span>
              <button
                onClick={async () => {
                  setSuggesting(true)
                  await fetch('/api/suggest-answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId: question.id, sessionId }),
                  }).catch(() => {})
                  setSuggesting(false)
                }}
                disabled={suggesting}
                className="text-theme-primary hover:text-theme-primary-hover transition-colors disabled:opacity-50 font-medium"
              >
                {suggesting ? 'Thinking...' : 'AI Suggest'}
              </button>
            </>
          )}
        </div>
        {onPin && (
          <button
            onClick={() => onPin(question.id, !question.is_pinned)}
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${
              question.is_pinned
                ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-50'
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
            }`}
            title={question.is_pinned ? 'Unpin question' : 'Pin question'}
          >
            <svg className="w-3.5 h-3.5" fill={question.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {question.is_pinned ? 'Pinned' : 'Pin'}
          </button>
        )}
        {onArchive && (
          <button
            onClick={() => onArchive(question.id, !question.archived)}
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-colors ${
              question.archived
                ? 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600 hover:border-slate-300'
            }`}
            title={question.archived ? 'Unarchive question' : 'Archive question'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            {question.archived ? 'Unarchive' : 'Archive'}
          </button>
        )}
        {question.status === 'answered' ? (
          <button
            onClick={handleToggle}
            disabled={marking}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-green-200 disabled:opacity-50 transition-colors"
          >
            {marking ? <Spinner /> : '✓'} Answered
          </button>
        ) : (
          <button
            onClick={handleToggle}
            disabled={marking}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200 text-slate-500 hover:border-green-300 hover:text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            {marking ? <Spinner /> : '✓'} Mark
          </button>
        )}
      </div>

      {/* AI suggested answer */}
      {question.suggested_answer && (
        <div className="rounded-lg bg-theme-primary-subtle border border-theme-primary-light px-3 py-2.5 space-y-1">
          <p className="text-xs font-bold text-theme-primary uppercase tracking-wider">AI Suggested Answer</p>
          <p className="text-sm text-orange-900 leading-relaxed">{question.suggested_answer}</p>
        </div>
      )}

      {showReplies && (
        <div className="pl-3 border-l-2 border-slate-200 space-y-2">
          {visibleReplies.map((r) => (
            <div key={r.id} className="space-y-0.5">
              <p className="text-sm text-slate-700">{r.text}</p>
              <p className="text-xs text-slate-400">
                <span className={r.is_host ? 'font-semibold text-theme-primary' : ''}>
                  {r.is_host ? '★ Host' : r.author_name || 'Anonymous'}
                </span>
                <span className="mx-1">·</span>
                {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
          {!showAllReplies && hiddenCount > 0 && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="text-xs text-theme-primary hover:text-theme-primary-hover transition-colors font-medium"
            >
              Show {hiddenCount} more repl{hiddenCount === 1 ? 'y' : 'ies'} ▾
            </button>
          )}
          <form onSubmit={handleReply} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a response..."
              maxLength={500}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent"
            />
            <button
              type="submit"
              disabled={submitting || !replyText.trim()}
              className="px-3 py-1.5 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {submitting && <Spinner />}
              Send
            </button>
          </form>
          {replies.length > 0 && (
            <button
              onClick={() => { setShowReplies(false); setShowAllReplies(false) }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ▴ Collapse replies
            </button>
          )}
        </div>
      )}
    </div>
  )
}
