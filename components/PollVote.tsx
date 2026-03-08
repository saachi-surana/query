'use client'

import { useState } from 'react'
import { supabase, Poll } from '@/lib/supabase'
import { PollResults } from './PollResults'

function getVotedPolls(): Set<string> {
  try {
    const stored = localStorage.getItem('query-voted-polls')
    if (stored) return new Set(JSON.parse(stored))
  } catch { /* ignore */ }
  return new Set()
}

function markPollVoted(pollId: string) {
  const voted = getVotedPolls()
  voted.add(pollId)
  localStorage.setItem('query-voted-polls', JSON.stringify(Array.from(voted)))
}

export function PollVote({
  poll,
  onVoted,
}: {
  poll: Poll
  onVoted: () => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasVoted, setHasVoted] = useState(() => getVotedPolls().has(poll.id))

  if (hasVoted) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <PollResults poll={poll} />
      </div>
    )
  }

  async function handleVote(e: React.FormEvent) {
    e.preventDefault()
    if (selected === null) return

    setSubmitting(true)

    const key = String(selected)
    const updatedVotes = { ...poll.votes, [key]: (poll.votes[key] || 0) + 1 }

    await supabase
      .from('polls')
      .update({ votes: updatedVotes })
      .eq('id', poll.id)

    markPollVoted(poll.id)
    setHasVoted(true)
    setSubmitting(false)
    onVoted()
  }

  return (
    <form onSubmit={handleVote} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <h4 className="text-sm font-semibold text-slate-900">{poll.question}</h4>
      <div className="space-y-2">
        {poll.options.map((option, index) => (
          <label
            key={index}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
              selected === index
                ? 'border-theme-primary bg-theme-primary-subtle'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <input
              type="radio"
              name={`poll-${poll.id}`}
              value={index}
              checked={selected === index}
              onChange={() => setSelected(index)}
              className="accent-theme-primary"
            />
            <span className="text-sm text-slate-700">{option}</span>
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={submitting || selected === null}
        className="w-full py-2.5 px-4 bg-theme-primary text-white rounded-lg font-medium text-sm hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {submitting && (
          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {submitting ? 'Voting...' : 'Vote'}
      </button>
    </form>
  )
}
