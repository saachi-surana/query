'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase, ClusterWithQuestions, Reply } from '@/lib/supabase'
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
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState(cluster.summary_question)
  const [summaryEdited, setSummaryEdited] = useState(false)
  const summaryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingSummary && summaryInputRef.current) {
      summaryInputRef.current.focus()
      summaryInputRef.current.select()
    }
  }, [editingSummary])

  async function saveSummary() {
    const trimmed = summaryDraft.trim()
    if (!trimmed || trimmed === cluster.summary_question) {
      setSummaryDraft(cluster.summary_question)
      setEditingSummary(false)
      return
    }
    await supabase
      .from('clusters')
      .update({ summary_question: trimmed })
      .eq('id', cluster.id)
    setSummaryEdited(true)
    setEditingSummary(false)
  }

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
              <div className="flex items-center gap-2">
                <p className={`text-xs truncate ${muted ? 'text-slate-400' : 'text-slate-500'}`}>
                  {cluster.summary_question}
                </p>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <span className="w-4 h-4 rounded-full bg-theme-primary text-white text-[8px] font-bold flex items-center justify-center">Q</span>
                </span>
              </div>
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
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-theme-primary uppercase tracking-wider">AI Summary Question</p>
              <span className="inline-flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-theme-primary text-white text-[10px] font-bold flex items-center justify-center">Q</span>
                <span className="text-[10px] text-slate-400">{summaryEdited ? 'Edited' : 'Generated by Q'}</span>
              </span>
            </div>
            {editingSummary ? (
              <input
                ref={summaryInputRef}
                type="text"
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                onBlur={saveSummary}
                onKeyDown={(e) => { if (e.key === 'Enter') saveSummary(); if (e.key === 'Escape') { setSummaryDraft(cluster.summary_question); setEditingSummary(false) } }}
                className="w-full text-sm font-medium text-orange-900 leading-relaxed bg-white border border-theme-primary-light rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            ) : (
              <div className="flex items-start gap-1.5 group">
                <p className="text-sm font-medium text-orange-900 leading-relaxed flex-1">{cluster.summary_question}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setSummaryDraft(cluster.summary_question); setEditingSummary(true) }}
                  className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-theme-primary"
                  title="Edit summary question"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                  </svg>
                </button>
              </div>
            )}
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
