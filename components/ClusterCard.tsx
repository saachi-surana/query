'use client'

import { useState } from 'react'
import { ClusterWithQuestions, Reply } from '@/lib/supabase'
import { ChevronIcon } from './ChevronIcon'
import { Spinner } from './Spinner'
import { QuestionRow } from './QuestionRow'

export function ClusterCard({
  cluster,
  replies,
  onMarkClusterAnswered,
  onMarkClusterUnanswered,
  onMarkQuestionAnswered,
  onMarkQuestionUnanswered,
  onReply,
  onHighlight,
  onClaim,
  onSaveFaq,
  sessionId,
  highlighted,
  muted,
}: {
  cluster: ClusterWithQuestions
  replies: Reply[]
  onMarkClusterAnswered: (id: string) => void
  onMarkClusterUnanswered: (id: string) => void
  onMarkQuestionAnswered: (id: string) => void
  onMarkQuestionUnanswered: (id: string) => void
  onReply: (questionId: string, text: string) => Promise<void>
  onHighlight?: (id: string | null) => void
  onClaim?: (id: string, name: string | null) => void
  onSaveFaq?: (cluster: ClusterWithQuestions) => void
  sessionId?: string
  highlighted?: boolean
  muted: boolean
}) {
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)

  async function handleMarkAll() {
    setMarking(true)
    if (muted) {
      await onMarkClusterUnanswered(cluster.id)
    } else {
      await onMarkClusterAnswered(cluster.id)
    }
    setMarking(false)
  }

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        highlighted ? 'bg-theme-primary-subtle border-orange-300 ring-2 ring-orange-200' : muted ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center">
        <button
          className="flex-1 flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
          onClick={() => setOpen((o) => !o)}
        >
          {highlighted && (
            <span className="text-theme-primary text-base shrink-0">◉</span>
          )}
          {muted && !highlighted && (
            <span className="text-green-500 text-base shrink-0">✓</span>
          )}
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold text-sm ${highlighted ? 'text-orange-900' : muted ? 'text-slate-500' : 'text-slate-900'}`}>
                {cluster.title}
              </h3>
              {highlighted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                  Discussing Now
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                muted ? 'bg-slate-200 text-slate-500' : 'bg-theme-primary-light text-theme-primary-hover'
              }`}>
                {cluster.questions.length} question{cluster.questions.length !== 1 ? 's' : ''}
              </span>
              {cluster.claimed_by && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  {cluster.claimed_by}
                </span>
              )}
            </div>
            {!open && (
              <p className={`text-xs truncate ${muted ? 'text-slate-400' : 'text-slate-500'}`}>
                {cluster.summary_question}
              </p>
            )}
          </div>
          <ChevronIcon open={open} />
        </button>
        {onHighlight && !muted && (
          <button
            onClick={() => onHighlight(highlighted ? null : cluster.id)}
            title={highlighted ? 'Stop discussing' : 'Mark as discussing now'}
            className={`shrink-0 mr-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              highlighted
                ? 'bg-orange-200 text-orange-800 hover:bg-orange-300'
                : 'bg-slate-100 text-slate-500 hover:bg-theme-primary-light hover:text-theme-primary-hover'
            }`}
          >
            {highlighted ? 'Stop' : 'Discuss'}
          </button>
        )}
      </div>

      {/* Expanded content */}
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* AI Summary */}
          <div className="rounded-lg bg-theme-primary-subtle border border-theme-primary-light px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-theme-primary uppercase tracking-wider">✨ AI Summary Question</p>
            <p className="text-sm font-medium text-orange-900 leading-relaxed">{cluster.summary_question}</p>
          </div>

          {/* Questions */}
          {cluster.questions.length > 0 && (
            <div className="space-y-3">
              {cluster.questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  replies={replies.filter((r) => r.question_id === q.id)}
                  sessionId={sessionId}
                  onMarkAnswered={onMarkQuestionAnswered}
                  onMarkUnanswered={onMarkQuestionUnanswered}
                  onReply={onReply}
                />
              ))}
            </div>
          )}

          {/* Mark/unmark all button */}
          <button
            onClick={handleMarkAll}
            disabled={marking}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 ${
              muted
                ? 'bg-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {marking && <Spinner />}
            {muted ? 'Unmark Entire Cluster' : 'Mark Entire Cluster as Answered'}
          </button>

          {/* Claim + FAQ buttons */}
          <div className="flex gap-2">
            {onClaim && !muted && (
              <button
                onClick={() => onClaim(cluster.id, cluster.claimed_by ? null : prompt('Your name:') || null)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  cluster.claimed_by
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                {cluster.claimed_by ? `Claimed by ${cluster.claimed_by} — Release` : 'Claim this cluster'}
              </button>
            )}
            {onSaveFaq && muted && (
              <button
                onClick={() => onSaveFaq(cluster)}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:border-theme-primary-light hover:text-theme-primary hover:bg-theme-primary-subtle transition-colors"
              >
                Save as FAQ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
